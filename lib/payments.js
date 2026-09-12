// Central payment-write primitive for GAS. Every path that records a
// payment against a booking (booking-create, tier auto-charge, manual
// add-payment, refund, webhook handlers, offline mark-paid) MUST go
// through recordBookingPayment. Enforces:
//
//   1. Idempotency — gateway_transaction_id + booking_id UNIQUE gate.
//      Kills the duplicate-post class (Host Havana Jennifer / Payton
//      2026-08-01/02 pattern — two paths posted the same Stripe pi
//      in the same minute with different descriptions).
//
//   2. Consistent state — deposit_paid + balance_amount +
//      payment_status + deposit_paid_at + balance_paid_at all
//      recomputed from the FULL set of completed payments after the
//      insert, not from a delta. If two paths race, the second sees
//      the first's insert and the aggregate is still correct.
//
//   3. Mandatory Beds24 sync — syncBeds24PaymentItem is AWAITED after
//      the transaction commits (not fire-and-forget). Errors surface
//      into bookings.sync_errors. Kills the missing-tier-push class
//      (Host Havana Miner / Margaret 2026-09-06/10 — tier_3 charged
//      in Stripe, never landed in Beds24 because the tier cron never
//      called the sync helper).
//
// Migration philosophy: existing 25+ INSERT INTO payment_transactions
// sites get refactored one caller at a time. Each caller replaced by a
// single recordBookingPayment() call. This module is the ONE place the
// filter list ('deposit'/'balance'/'tier_N'/'charge'/etc.) is
// authoritative — future gateway or tier types add here and every
// caller picks them up automatically.

'use strict';

const VALID_TRANSACTION_TYPES = new Set([
  'deposit', 'balance', 'charge', 'capture', 'payment', 'refund', 'other',
  // Tier-schedule types — tier_N for arbitrary N. Explicit list here so
  // the helper accepts them; the primitive itself uses LIKE 'tier_%'
  // when it queries payment_transactions later so tier_4 / tier_5 etc.
  // don't need code changes when a client picks a longer schedule.
  'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5'
]);

/**
 * Record a payment against a booking + push to Beds24 in one transaction.
 *
 * @param {Pool} pool - pg Pool
 * @param {number} bookingId - bookings.id
 * @param {Object} opts
 * @param {number} opts.amount - required, > 0. In booking currency.
 * @param {string} [opts.currency] - defaults to bookings.currency.
 * @param {string} opts.transaction_type - deposit|balance|tier_N|charge|capture|payment|refund|other.
 * @param {string} opts.gateway - stripe|square|worldpay|manual|cash|bank_transfer|cheque|card_guarantee|beds24_import|channex_import.
 * @param {string} [opts.gateway_transaction_id] - idempotency key (Stripe pi_id, Square payment id, etc). Strongly encouraged.
 * @param {string} [opts.method] - payment_method_type column (cash/phone/bank_transfer/cheque/card_guarantee/card/other).
 * @param {string} [opts.description] - optional freeform.
 * @param {string} [opts.status] - defaults 'completed'. Use 'pending' / 'failed' for non-terminal states.
 * @param {number} [opts.gateway_fee] - optional fee amount.
 * @param {number} [opts.net_amount] - optional net amount (amount - gateway_fee).
 * @param {number} [opts.account_id] - optional; resolved from booking if omitted.
 * @param {boolean} [opts.syncToBeds24=true] - if false, skips the Beds24 push (use for imports FROM Beds24).
 * @param {Function} [opts.syncBeds24PaymentItem] - the sync helper. Injected so this module doesn't depend on server.js.
 * @returns {Promise<{success, transaction_id, already_recorded, booking_status, sync_result?}>}
 */
async function recordBookingPayment(pool, bookingId, opts) {
  if (!bookingId) throw new Error('recordBookingPayment: bookingId required');
  const amount = Number(opts.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`recordBookingPayment: amount must be > 0 (got ${opts.amount})`);
  }
  const transaction_type = String(opts.transaction_type || '').toLowerCase();
  const isTier = /^tier_\d+$/.test(transaction_type);
  if (!VALID_TRANSACTION_TYPES.has(transaction_type) && !isTier) {
    throw new Error(`recordBookingPayment: invalid transaction_type '${transaction_type}'`);
  }
  const gateway = String(opts.gateway || 'manual').toLowerCase();
  const gatewayTxId = opts.gateway_transaction_id ? String(opts.gateway_transaction_id) : null;
  const method = opts.method ? String(opts.method) : null;
  const description = opts.description ? String(opts.description) : null;
  const status = String(opts.status || 'completed').toLowerCase();
  const syncToBeds24 = opts.syncToBeds24 !== false; // default true
  const syncFn = opts.syncBeds24PaymentItem;

  // Idempotency gate — before we open a transaction, cheap SELECT for a
  // prior row with the same gateway_transaction_id. When the ID is null
  // (rare — pure manual payments with no gateway ref) we cannot dedupe
  // this way. Operators should hit the UI's "already recorded?" check
  // if they double-click.
  if (gatewayTxId) {
    const exist = await pool.query(
      `SELECT id, transaction_type, amount, status
         FROM payment_transactions
        WHERE booking_id = $1
          AND gateway_transaction_id = $2
          AND status IN ('completed','succeeded')
        LIMIT 1`,
      [bookingId, gatewayTxId]
    );
    if (exist.rows[0]) {
      return {
        success: true,
        already_recorded: true,
        transaction_id: exist.rows[0].id,
        message: `Payment ${gatewayTxId} already recorded on booking ${bookingId}`
      };
    }
  }

  // Resolve booking row for currency + account_id fallback + status roll-up
  const bkRow = await pool.query(
    `SELECT b.id, b.currency, b.grand_total, b.deposit_amount, b.deposit_paid,
            b.payment_status, b.balance_paid_at, b.deposit_paid_at,
            p.account_id
       FROM bookings b LEFT JOIN properties p ON p.id = b.property_id
      WHERE b.id = $1`,
    [bookingId]
  );
  if (!bkRow.rows[0]) throw new Error(`recordBookingPayment: booking ${bookingId} not found`);
  const booking = bkRow.rows[0];
  const currency = (opts.currency || booking.currency || 'GBP').toUpperCase();
  const accountId = opts.account_id || booking.account_id || null;
  const grandTotal = parseFloat(booking.grand_total || 0);

  const client = await pool.connect();
  let insertedId = null;
  try {
    await client.query('BEGIN');

    // INSERT the row
    const ins = await client.query(
      `INSERT INTO payment_transactions (
         booking_id, account_id, transaction_type, amount, currency,
         payment_gateway, gateway_transaction_id, payment_method_type,
         status, description, gateway_fee, net_amount,
         completed_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 CASE WHEN $9 IN ('completed','succeeded') THEN NOW() ELSE NULL END,
                 NOW(), NOW())
       RETURNING id`,
      [bookingId, accountId, transaction_type, amount, currency, gateway,
       gatewayTxId, method, status, description,
       opts.gateway_fee ?? null, opts.net_amount ?? null]
    );
    insertedId = ins.rows[0].id;

    // Recompute booking state from ALL completed payments (not delta).
    // Delta math races when two paths write in the same second — the
    // second write's delta uses stale deposit_paid. Sum-from-scratch is
    // race-safe: whichever transaction commits second sees the first
    // one's insert and the aggregate is correct.
    const agg = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid
         FROM payment_transactions
        WHERE booking_id = $1
          AND status IN ('completed','succeeded')
          AND (payment_gateway IS NULL OR payment_gateway NOT IN ('beds24_import','channex_import'))
          AND transaction_type <> 'refund'`,
      [bookingId]
    );
    const totalPaid = parseFloat(agg.rows[0].total_paid);
    const depositAmount = parseFloat(booking.deposit_amount || 0);
    const newBalance = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

    // Payment status ladder — never downgrade a booking that's already
    // fully paid (e.g. if a refund posts after full payment, keep status
    // for now — refund handling is a separate concern the primitive
    // doesn't need to solve on day one).
    let newStatus = booking.payment_status || 'pending';
    let setDepositAt = false;
    let setBalanceAt = false;
    if (totalPaid >= grandTotal && grandTotal > 0) {
      newStatus = 'paid';
      if (!booking.balance_paid_at) setBalanceAt = true;
      if (!booking.deposit_paid_at) setDepositAt = true;
    } else if (depositAmount > 0 && totalPaid >= depositAmount) {
      if (booking.payment_status !== 'paid' && booking.payment_status !== 'fully_paid') {
        newStatus = 'deposit_paid';
      }
      if (!booking.deposit_paid_at) setDepositAt = true;
    } else if (totalPaid > 0) {
      // Some money in, no deposit threshold crossed. Keep 'paid' /
      // 'fully_paid' / 'deposit_paid' if we're already there (e.g. a
      // late refund landed).
      if (!['paid', 'fully_paid', 'deposit_paid'].includes(booking.payment_status)) {
        newStatus = 'partial_paid';
      }
    }

    await client.query(
      `UPDATE bookings
          SET deposit_paid = $2,
              balance_amount = $3,
              payment_status = $4,
              deposit_paid_at = CASE WHEN $5::boolean THEN NOW() ELSE deposit_paid_at END,
              balance_paid_at = CASE WHEN $6::boolean THEN NOW() ELSE balance_paid_at END,
              payment_chase_status = CASE WHEN $3::numeric = 0 THEN 'paid' ELSE payment_chase_status END,
              updated_at = NOW()
        WHERE id = $1`,
      [bookingId, totalPaid, newBalance, newStatus, setDepositAt, setBalanceAt]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // AFTER commit: push the payment line to Beds24. Awaited (not
  // fire-and-forget) so upstream callers see failure. The sync helper
  // is idempotent (advisory lock + pi-id matching) so a retry on
  // failure never creates duplicates.
  let syncResult = null;
  if (syncToBeds24 && typeof syncFn === 'function') {
    try {
      syncResult = await syncFn(bookingId);
    } catch (syncErr) {
      // Persist to sync_errors so operator can retry from the UI. Do NOT
      // throw — the payment is already recorded in GAS + Stripe; failing
      // the whole call would strand the guest with an unpaid-looking
      // booking. Marker so the /admin/bookings/:id/sync-beds24-payment
      // manual retry can be triggered.
      await pool.query(
        `UPDATE bookings SET sync_errors = COALESCE(sync_errors, '') || $1, updated_at = NOW() WHERE id = $2`,
        [`[recordBookingPayment sync ${new Date().toISOString()}] tx=${insertedId} — ${syncErr.message}\n`, bookingId]
      ).catch(() => {});
      syncResult = { success: false, error: syncErr.message };
    }
  }

  return {
    success: true,
    already_recorded: false,
    transaction_id: insertedId,
    sync_result: syncResult
  };
}

module.exports = { recordBookingPayment, VALID_TRANSACTION_TYPES };
