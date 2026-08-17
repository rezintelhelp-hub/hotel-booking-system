// One-shot — fire the stranded auto-charge for Lehmann #576638 Ryan Scott.
// Cron won't touch past arrivals (arrival_date >= CURRENT_DATE gate). His
// arrival was 2026-08-07 (10 days ago). Same shape as what the cron would
// do: idempotency belts, ledger-derived outstanding, off_session charge,
// ledger row + booking update on success.
//
// Usage:
//   node scripts/_charge_ryan_576638.js         # dry-run
//   node scripts/_charge_ryan_576638.js --live  # actually charge
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

const LIVE = process.argv.includes('--live');
const BOOKING_ID = 576638;

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const bk = await pg.query(`
    SELECT b.*, p.account_id, p.name AS property_name, a.name AS account_name,
           pc.credentials as payment_config_credentials
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
      LEFT JOIN payment_configurations pc ON (pc.property_id = b.property_id OR (pc.property_id IS NULL AND pc.account_id = p.account_id)) AND pc.provider = 'stripe' AND pc.is_enabled = true
     WHERE b.id = $1
  `, [BOOKING_ID]);
  if (bk.rows.length === 0) { console.log('Booking not found'); process.exit(1); }
  const b = bk.rows[0];

  console.log(`Booking #${b.id}: ${b.guest_first_name} ${b.guest_last_name}`);
  console.log(`  Account: ${b.account_name} (id=${b.account_id})   Property: ${b.property_name}`);
  console.log(`  Arrival: ${b.arrival_date.toISOString().slice(0,10)}   Grand: ${b.currency} ${b.grand_total}   Balance: ${b.balance_amount}`);
  console.log(`  Card: pm=${b.stripe_payment_method_id}   customer=${b.stripe_customer_id}`);
  console.log(`  last_charge_error: ${b.last_charge_error}`);

  if (!b.stripe_payment_method_id) { console.log('❌ No pm on file'); process.exit(1); }

  // Idempotency: prior successful stripe charges
  const prior = await pg.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM payment_transactions
      WHERE booking_id = $1 AND payment_gateway = 'stripe' AND status IN ('completed','succeeded')
        AND transaction_type IN ('deposit','balance','payment','charge','capture')`,
    [BOOKING_ID]);
  const alreadyPaid = parseFloat(prior.rows[0]?.paid || 0);
  const grand = parseFloat(b.grand_total || 0);
  const outstanding = Math.max(0, Math.round((grand - alreadyPaid) * 100) / 100);
  console.log(`  Ledger already paid: ${alreadyPaid.toFixed(2)}   Outstanding: ${outstanding.toFixed(2)}`);

  if (outstanding <= 0.005) { console.log('✅ Already fully paid — nothing to do'); process.exit(0); }

  const secretKey = b.payment_config_credentials?.secret_key || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) { console.log('❌ No Stripe secret key'); process.exit(1); }
  const stripe = Stripe(secretKey);
  const currency = (b.currency || 'usd').toLowerCase();

  if (!LIVE) {
    console.log(`\n[DRY-RUN] would charge ${currency.toUpperCase()} ${outstanding.toFixed(2)} on pm=${b.stripe_payment_method_id}`);
    console.log('  Re-run with --live to actually charge');
    await pg.end(); process.exit(0);
  }

  console.log(`\n[LIVE] Charging ${currency.toUpperCase()} ${outstanding.toFixed(2)}...`);
  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(outstanding * 100),
      currency,
      customer: b.stripe_customer_id || undefined,
      payment_method: b.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Manual balance charge — booking ${BOOKING_ID} ${b.guest_first_name} ${b.guest_last_name} (post-fix backfill 2026-08-17)`,
      metadata: {
        booking_id: String(BOOKING_ID),
        account_id: String(b.account_id),
        type: 'balance_payment_backfill',
        note: 'alreadyPaid-bug victim, past arrival, manual charge script'
      }
    }, { idempotencyKey: `backfill-${BOOKING_ID}-${new Date().toISOString().slice(0,10)}` });

    if (pi.status !== 'succeeded') {
      console.log(`⚠ PaymentIntent status: ${pi.status}   pi=${pi.id}`);
      console.log(`  last_payment_error: ${pi.last_payment_error?.message || 'none'}`);
      process.exit(1);
    }
    console.log(`✅ Charge SUCCEEDED — pi=${pi.id}   charge=${pi.latest_charge || '?'}`);

    // Update booking
    await pg.query(`
      UPDATE bookings
         SET payment_status = 'paid',
             balance_amount = 0,
             balance_paid_at = NOW(),
             stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
             stripe_charge_id = COALESCE(stripe_charge_id, $3),
             last_charge_error = NULL,
             last_charge_error_code = NULL,
             last_charge_error_at = NULL,
             updated_at = NOW()
       WHERE id = $1
    `, [BOOKING_ID, pi.id, pi.latest_charge || null]);
    console.log(`  Booking updated (payment_status=paid, balance=0, error cleared)`);

    // Ledger row
    await pg.query(`
      INSERT INTO payment_transactions (
        booking_id, account_id, transaction_type, amount, currency,
        payment_gateway, gateway_transaction_id, status,
        payment_method_type, completed_at, description
      ) VALUES ($1, $2, 'balance', $3, $4, 'stripe', $5, 'completed', 'card', NOW(), $6)
      ON CONFLICT DO NOTHING
    `, [BOOKING_ID, b.account_id, outstanding, currency.toUpperCase(), pi.id,
        `Backfill balance charge · alreadyPaid-bug victim · pi=${pi.id}`]);
    console.log(`  Ledger row inserted`);
  } catch (e) {
    console.log(`❌ Charge FAILED: ${e.message}`);
    if (e.code) console.log(`  code: ${e.code}   decline_code: ${e.decline_code || '-'}`);
  }

  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
