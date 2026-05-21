// Backfill bookings.stripe_customer_id for bookings that have a SetupIntent
// but never had the customer ID saved.
//
// Background: prior to the 2026-05-21 fix, the booking-creation path saved
// stripe_setup_intent_id + stripe_payment_method_id but not stripe_customer_id.
// That left the auto-charge cron looking up the customer at charge time via
// "create customer from PM" — which fails with "PM already attached" because
// the SetupIntent had already attached the PM to a customer. Symptom: pending
// tier never charged, no error logged, owner never emailed.
//
// This backfill closes the gap: for every non-cancelled booking with a
// SetupIntent and no cached customer, retrieve the SetupIntent and write its
// customer back to the bookings row. After this runs once, the auto-charge
// cron hits the cached-customer fast path and charges cleanly.
//
// Usage:
//   node scripts/backfill-stripe-customers.js          # dry run, prints diffs
//   node scripts/backfill-stripe-customers.js --apply  # writes
//
// Idempotent: only touches rows where stripe_customer_id IS NULL.

require('dotenv').config();
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // All candidate bookings + the Stripe key the booking belongs to.
  const r = await c.query(`
    SELECT b.id, b.stripe_setup_intent_id, b.stripe_payment_method_id,
           b.stripe_customer_id, b.property_id, b.guest_email,
           COALESCE(
             (pc.credentials->>'secret_key'),
             p.stripe_secret_key,
             a.stripe_secret_key
           ) AS stripe_key
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN accounts a ON a.id = p.account_id
    LEFT JOIN payment_configurations pc ON (pc.property_id = p.id OR (pc.property_id IS NULL AND pc.account_id = p.account_id))
      AND pc.provider = 'stripe' AND pc.is_enabled = true
    WHERE b.stripe_setup_intent_id IS NOT NULL
      AND b.stripe_customer_id IS NULL
      AND b.status NOT IN ('cancelled', 'rejected')
    ORDER BY b.id
  `);

  console.log(`Found ${r.rows.length} candidate bookings\n`);
  console.log(APPLY ? '=== APPLY MODE — will write ===' : '=== DRY RUN — no writes (pass --apply to commit) ===\n');

  let resolved = 0, missingKey = 0, siNoCustomer = 0, errors = 0;

  for (const row of r.rows) {
    const stripeKey = row.stripe_key || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.log(`  booking ${row.id}: no Stripe key for property ${row.property_id} → skip`);
      missingKey++;
      continue;
    }
    try {
      const stripe = require('stripe')(stripeKey);
      const si = await stripe.setupIntents.retrieve(row.stripe_setup_intent_id);
      if (!si.customer) {
        console.log(`  booking ${row.id}: SetupIntent ${row.stripe_setup_intent_id} has no customer → skip`);
        siNoCustomer++;
        continue;
      }
      if (APPLY) {
        await c.query('UPDATE bookings SET stripe_customer_id=$1 WHERE id=$2 AND stripe_customer_id IS NULL', [si.customer, row.id]);
        console.log(`  ✓ booking ${row.id}: saved customer ${si.customer}`);
      } else {
        console.log(`  [dry] booking ${row.id}: would save customer ${si.customer}`);
      }
      resolved++;
    } catch (e) {
      console.log(`  ✗ booking ${row.id}: ${e.message}`);
      errors++;
    }
  }

  console.log('\nSummary:');
  console.log(`  Resolved/saved: ${resolved}`);
  console.log(`  No Stripe key:  ${missingKey}`);
  console.log(`  SI no customer: ${siNoCustomer}`);
  console.log(`  Errors:         ${errors}`);
  await c.end();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
