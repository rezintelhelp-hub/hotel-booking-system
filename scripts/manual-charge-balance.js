/**
 * Manual balance-payment charge for a single booking, used for catching up
 * bookings the auto-charge cron missed (the `=` vs `<=` bug at server.js:96168).
 *
 * Usage: node scripts/manual-charge-balance.js <booking_id>
 *
 * Behaviour:
 *   - Looks up the booking, confirms balance > 0 and payment_status != 'paid'
 *   - Resolves the Stripe key via the same priority order the cron uses
 *     (payment_configurations > property > account > env)
 *   - Creates a PaymentIntent off_session=true confirm=true with an
 *     idempotency key based on booking_id + date — re-running same day
 *     cannot double-charge
 *   - On success: updates booking to payment_status='paid', balance_amount=0,
 *     stamps stripe_payment_intent_id and stripe_charge_id
 *
 * Read-after-write: prints the updated booking row.
 */

require('dotenv').config();
const { Client } = require('pg');

const bookingId = parseInt(process.argv[2]);
if (!bookingId) {
  console.error('Usage: node scripts/manual-charge-balance.js <booking_id>');
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const r = await c.query(`
    SELECT b.id, b.guest_first_name, b.guest_last_name, b.guest_email,
           b.payment_method, b.payment_status, b.status,
           b.grand_total, b.balance_amount, b.currency,
           b.stripe_payment_method_id, b.stripe_payment_intent_id, b.stripe_setup_intent_id,
           b.arrival_date::text AS arrival, b.bookable_unit_id, b.property_id,
           p.account_id, p.currency AS property_currency, p.name AS property_name,
           COALESCE(pc.credentials->>'secret_key', p.stripe_secret_key, a.stripe_secret_key) AS stripe_key
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN accounts a ON a.id = p.account_id
    LEFT JOIN payment_configurations pc ON (pc.property_id = b.property_id OR (pc.property_id IS NULL AND pc.account_id = p.account_id)) AND pc.provider='stripe' AND pc.is_enabled = true
    WHERE b.id = $1
  `, [bookingId]);

  if (r.rows.length === 0) { console.error('booking not found'); process.exit(1); }
  const b = r.rows[0];
  const stripeKey = b.stripe_key || process.env.STRIPE_SECRET_KEY;

  console.log('booking:', { id: b.id, guest: `${b.guest_first_name} ${b.guest_last_name}`, balance: b.balance_amount, payment_status: b.payment_status, has_pm: !!b.stripe_payment_method_id });

  if (b.payment_status === 'paid') { console.error('SKIP: already paid'); process.exit(0); }
  if (Number(b.balance_amount) <= 0) { console.error('SKIP: balance is 0'); process.exit(0); }
  if (!b.stripe_payment_method_id) { console.error('SKIP: no Stripe payment method on file'); process.exit(0); }
  if (!stripeKey) { console.error('SKIP: no Stripe key configured'); process.exit(1); }
  if (b.payment_method && ['card_guarantee','pay_at_property','bank_transfer'].includes(b.payment_method)) {
    console.error(`SKIP: payment_method=${b.payment_method} should not be auto-charged`); process.exit(0);
  }

  const stripe = require('stripe')(stripeKey);
  const guestName = `${b.guest_first_name} ${b.guest_last_name}`.trim();
  const chargeCurrency = (b.currency || b.property_currency || 'eur').toLowerCase();

  // Resolve / create the Stripe customer for this booking's payment method
  let stripeCustomerId = null;
  if (b.stripe_payment_intent_id) {
    try {
      const orig = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
      stripeCustomerId = orig.customer;
    } catch (e) { /* ignore */ }
  }
  if (!stripeCustomerId) {
    // Pull the PM to find the attached customer
    try {
      const pm = await stripe.paymentMethods.retrieve(b.stripe_payment_method_id);
      stripeCustomerId = pm.customer;
    } catch (e) { /* ignore */ }
  }
  if (!stripeCustomerId) {
    // Create one
    const cus = await stripe.customers.create({
      name: guestName, email: b.guest_email,
      payment_method: b.stripe_payment_method_id,
      metadata: { booking_id: String(b.id) }
    });
    stripeCustomerId = cus.id;
    console.log('created customer:', stripeCustomerId);
  } else {
    console.log('reusing customer:', stripeCustomerId);
  }

  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `balance-${b.id}-manual-${today}`;
  console.log(`charging €${b.balance_amount} ${chargeCurrency} with idempotency_key=${idempotencyKey}`);

  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: Math.round(Number(b.balance_amount) * 100),
      currency: chargeCurrency,
      customer: stripeCustomerId,
      payment_method: b.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Balance payment for booking ${b.id} - ${guestName} - Check-in ${b.arrival}`,
      metadata: {
        booking_id: String(b.id),
        account_id: String(b.account_id),
        type: 'balance_payment',
        manual_remediation: 'cron_missed_charge'
      }
    }, { idempotencyKey });
  } catch (e) {
    console.error('Stripe charge FAILED:', e.message, e.code || '', e.decline_code || '');
    process.exit(1);
  }

  console.log('Stripe response:', { id: pi.id, status: pi.status, amount: pi.amount/100, currency: pi.currency, last_err: pi.last_payment_error?.message });

  if (pi.status === 'succeeded') {
    const charge = pi.latest_charge;
    await c.query(`
      UPDATE bookings
      SET payment_status='paid', balance_amount=0, balance_paid_at=NOW(),
          stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $2),
          stripe_charge_id = COALESCE(stripe_charge_id, $3),
          payment_notes = COALESCE(payment_notes,'') || E'\\nManual catch-up charge via scripts/manual-charge-balance.js on ' || NOW()::text,
          updated_at = NOW()
      WHERE id = $1
    `, [b.id, pi.id, charge]);
    const after = await c.query(`SELECT id, payment_status, balance_amount, balance_paid_at, stripe_payment_intent_id, stripe_charge_id FROM bookings WHERE id=$1`, [b.id]);
    console.log('DB after:', after.rows[0]);
    console.log(`✅ booking ${b.id} CHARGED €${pi.amount/100} ${pi.currency} — pi=${pi.id} charge=${charge}`);
  } else {
    console.error(`❌ status=${pi.status} — DB NOT updated. Investigate.`);
    process.exit(1);
  }

  await c.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
