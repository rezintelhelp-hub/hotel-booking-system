// Generic — fire the stranded auto-charge for one or more booking IDs.
// Same shape as _charge_ryan_576638.js but takes IDs from argv so we can
// batch backfill the alreadyPaid-bug victims without waiting for the
// hourly cron.
//
// Usage:
//   node scripts/_charge_stranded.js 223885 496417              # dry-run
//   node scripts/_charge_stranded.js 223885 496417 --live       # actually charge
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

const LIVE = process.argv.includes('--live');
const IDS = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
if (IDS.length === 0) { console.log('usage: node scripts/_charge_stranded.js <bookingId> [<bookingId> ...] [--live]'); process.exit(1); }

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  for (const BOOKING_ID of IDS) {
    console.log(`\n────────────────────────────────────────`);
    const bk = await pg.query(`
      SELECT b.*, p.account_id, p.name AS property_name, a.name AS account_name,
             pc.credentials as payment_config_credentials
        FROM bookings b
        JOIN properties p ON p.id = b.property_id
        JOIN accounts a ON a.id = p.account_id
        LEFT JOIN payment_configurations pc ON (pc.property_id = b.property_id OR (pc.property_id IS NULL AND pc.account_id = p.account_id)) AND pc.provider = 'stripe' AND pc.is_enabled = true
       WHERE b.id = $1
    `, [BOOKING_ID]);
    if (bk.rows.length === 0) { console.log(`#${BOOKING_ID}: NOT FOUND`); continue; }
    const b = bk.rows[0];

    const name = `${b.guest_first_name} ${b.guest_last_name}`;
    console.log(`#${BOOKING_ID} · ${name} · ${b.account_name}`);
    console.log(`  arrival=${b.arrival_date.toISOString().slice(0,10)}  total=${b.currency} ${b.grand_total}  balance=${b.balance_amount}`);

    if (!b.stripe_payment_method_id) { console.log(`  ❌ No card on file — skip`); continue; }

    const prior = await pg.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM payment_transactions
        WHERE booking_id = $1 AND payment_gateway = 'stripe' AND status IN ('completed','succeeded')
          AND transaction_type IN ('deposit','balance','payment','charge','capture')`,
      [BOOKING_ID]);
    const alreadyPaid = parseFloat(prior.rows[0]?.paid || 0);
    const grand = parseFloat(b.grand_total || 0);
    const outstanding = Math.max(0, Math.round((grand - alreadyPaid) * 100) / 100);
    console.log(`  ledger paid=${alreadyPaid.toFixed(2)}  outstanding=${outstanding.toFixed(2)}`);
    if (outstanding <= 0.005) { console.log(`  ✅ Already fully paid`); continue; }

    const secretKey = b.payment_config_credentials?.secret_key || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) { console.log(`  ❌ No Stripe secret key`); continue; }
    const currency = (b.currency || 'gbp').toLowerCase();

    if (!LIVE) { console.log(`  [DRY] would charge ${currency.toUpperCase()} ${outstanding.toFixed(2)}`); continue; }

    const stripe = Stripe(secretKey);
    try {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(outstanding * 100),
        currency,
        customer: b.stripe_customer_id || undefined,
        payment_method: b.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Balance charge — booking ${BOOKING_ID} ${name} (backfill after alreadyPaid-bug fix 2026-08-17)`,
        metadata: { booking_id: String(BOOKING_ID), account_id: String(b.account_id), type: 'balance_payment_backfill' }
      }, { idempotencyKey: `backfill-${BOOKING_ID}-${new Date().toISOString().slice(0,10)}` });

      if (pi.status !== 'succeeded') {
        console.log(`  ⚠ status=${pi.status}  pi=${pi.id}  err=${pi.last_payment_error?.message || 'none'}`);
        continue;
      }
      console.log(`  ✅ SUCCEEDED — pi=${pi.id}`);

      await pg.query(`
        UPDATE bookings
           SET payment_status='paid', balance_amount=0, balance_paid_at=NOW(),
               stripe_payment_intent_id=COALESCE(stripe_payment_intent_id, $2),
               stripe_charge_id=COALESCE(stripe_charge_id, $3),
               last_charge_error=NULL, last_charge_error_code=NULL, last_charge_error_at=NULL,
               updated_at=NOW()
         WHERE id=$1
      `, [BOOKING_ID, pi.id, pi.latest_charge || null]);
      await pg.query(`
        INSERT INTO payment_transactions (booking_id, account_id, transaction_type, amount, currency,
          payment_gateway, gateway_transaction_id, status, payment_method_type, completed_at, description)
        VALUES ($1, $2, 'balance', $3, $4, 'stripe', $5, 'completed', 'card', NOW(), $6)
        ON CONFLICT DO NOTHING
      `, [BOOKING_ID, b.account_id, outstanding, currency.toUpperCase(), pi.id,
          `Balance backfill · alreadyPaid-bug victim · pi=${pi.id}`]);
      console.log(`  → booking updated, ledger row inserted, error cleared`);
    } catch (e) {
      console.log(`  ❌ FAILED: ${e.message}   code=${e.code || '-'}   decline=${e.decline_code || '-'}`);
    }
  }
  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
