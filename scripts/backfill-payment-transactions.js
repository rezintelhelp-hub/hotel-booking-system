/**
 * Phase 2 Commit 1 — payment_transactions backfill (one-off, idempotent).
 *
 * Synthesises payment_transactions rows for historical bookings where the
 * money clearly moved (deposit_paid / balance_paid_at) but no ledger row
 * was written at the time. Phase 2 endpoints assume every charge has a
 * tx row — this fills in the legacy gap.
 *
 * Idempotent: only inserts where no matching row already exists.
 *
 * Usage:
 *   node scripts/backfill-payment-transactions.js --dry-run   (preview only)
 *   node scripts/backfill-payment-transactions.js             (live)
 *
 * Sister script to scripts/backfill-guests.js (Phase 1).
 */

require('dotenv').config();
const { Client } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : '✏️  LIVE backfill');
  console.log('');

  // -------------------------------------------------------------------
  // Phase 1: deposit charges
  // Bookings with deposit_paid > 0 (or deposit_amount > 0 + deposit_paid_at set)
  // and NO existing payment_transactions row for this booking with
  // transaction_type='deposit'. Synthesise one.
  // -------------------------------------------------------------------
  console.log('=== Phase 1: deposit charges ===');
  const depositSelect = `
    SELECT b.id, b.deposit_paid, b.deposit_amount, b.deposit_paid_at,
           b.currency, b.stripe_payment_intent_id,
           p.account_id
    FROM bookings b
    LEFT JOIN properties p ON p.id = b.property_id
    WHERE COALESCE(b.deposit_paid, b.deposit_amount) > 0
      AND (b.deposit_paid_at IS NOT NULL OR b.payment_status IN ('deposit_paid', 'paid'))
      AND NOT EXISTS (
        SELECT 1 FROM payment_transactions t
         WHERE t.booking_id = b.id AND t.transaction_type IN ('deposit', 'charge')
      )
  `;
  const depositRows = (await c.query(depositSelect)).rows;
  console.log(`  candidates: ${depositRows.length}`);

  if (DRY_RUN) {
    console.log('  (dry-run — sample of up to 5)');
    console.table(depositRows.slice(0, 5).map(r => ({
      booking_id: r.id,
      amount: r.deposit_paid || r.deposit_amount,
      currency: r.currency,
      pi: r.stripe_payment_intent_id ? r.stripe_payment_intent_id.slice(0, 16) + '…' : null,
      paid_at: r.deposit_paid_at
    })));
  } else {
    let inserted = 0;
    for (const r of depositRows) {
      await c.query(
        `INSERT INTO payment_transactions
           (booking_id, account_id, transaction_type, amount, currency,
            payment_gateway, gateway_transaction_id, status,
            initiated_at, completed_at, created_at)
         VALUES ($1, $2, 'deposit', $3, $4, $5, $6, 'completed', $7, $7, $7)`,
        [
          r.id,
          r.account_id || null,
          r.deposit_paid || r.deposit_amount,
          r.currency || 'GBP',
          r.stripe_payment_intent_id ? 'stripe' : 'manual',
          r.stripe_payment_intent_id || null,
          r.deposit_paid_at || new Date()
        ]
      );
      inserted++;
    }
    console.log(`  inserted: ${inserted}`);
  }

  // -------------------------------------------------------------------
  // Phase 2: balance charges
  // Bookings with balance_paid_at set (post-deposit completion of the
  // remaining balance) and no existing 'balance' tx row.
  // -------------------------------------------------------------------
  console.log('');
  console.log('=== Phase 2: balance charges ===');
  const balanceSelect = `
    SELECT b.id, b.balance_amount, b.grand_total, b.deposit_paid,
           b.balance_paid_at, b.currency, b.stripe_payment_intent_id,
           p.account_id
    FROM bookings b
    LEFT JOIN properties p ON p.id = b.property_id
    WHERE b.balance_paid_at IS NOT NULL
      AND COALESCE(b.balance_amount, b.grand_total - COALESCE(b.deposit_paid, 0)) > 0
      AND NOT EXISTS (
        SELECT 1 FROM payment_transactions t
         WHERE t.booking_id = b.id AND t.transaction_type = 'balance'
      )
  `;
  const balanceRows = (await c.query(balanceSelect)).rows;
  console.log(`  candidates: ${balanceRows.length}`);

  if (DRY_RUN) {
    console.log('  (dry-run — sample of up to 5)');
    console.table(balanceRows.slice(0, 5).map(r => ({
      booking_id: r.id,
      amount: r.balance_amount || (Number(r.grand_total || 0) - Number(r.deposit_paid || 0)),
      currency: r.currency,
      paid_at: r.balance_paid_at
    })));
  } else {
    let inserted = 0;
    for (const r of balanceRows) {
      const amount = r.balance_amount || (Number(r.grand_total || 0) - Number(r.deposit_paid || 0));
      if (!(amount > 0)) continue;
      await c.query(
        `INSERT INTO payment_transactions
           (booking_id, account_id, transaction_type, amount, currency,
            payment_gateway, gateway_transaction_id, status,
            initiated_at, completed_at, created_at)
         VALUES ($1, $2, 'balance', $3, $4, $5, $6, 'completed', $7, $7, $7)`,
        [
          r.id,
          r.account_id || null,
          amount,
          r.currency || 'GBP',
          r.stripe_payment_intent_id ? 'stripe' : 'manual',
          r.stripe_payment_intent_id || null,
          r.balance_paid_at
        ]
      );
      inserted++;
    }
    console.log(`  inserted: ${inserted}`);
  }

  // -------------------------------------------------------------------
  // Final state
  // -------------------------------------------------------------------
  console.log('');
  console.log('=== Final state ===');
  const final = await c.query(`
    SELECT
      (SELECT COUNT(*)::int FROM payment_transactions) AS total,
      (SELECT COUNT(*)::int FROM payment_transactions WHERE transaction_type = 'deposit') AS deposit_rows,
      (SELECT COUNT(*)::int FROM payment_transactions WHERE transaction_type = 'balance') AS balance_rows,
      (SELECT COUNT(*)::int FROM bookings WHERE deposit_paid > 0) AS bookings_with_deposit_paid,
      (SELECT COUNT(*)::int FROM bookings WHERE balance_paid_at IS NOT NULL) AS bookings_with_balance_paid
  `);
  console.table(final.rows);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
