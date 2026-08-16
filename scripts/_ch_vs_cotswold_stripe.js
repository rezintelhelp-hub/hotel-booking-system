// Emergency check — is 571931's charge routing to the wrong Stripe
// account? Compare Charles House vs Cotswolds Retreats Stripe config.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Both accounts
  const accts = await pg.query(`
    SELECT id, name, stripe_account_id, stripe_secret_key IS NOT NULL AS has_secret,
           square_status
      FROM accounts
     WHERE name ILIKE '%charles house%' OR name ILIKE '%cotswold%'
     ORDER BY name
  `);
  console.log('=== ACCOUNTS ===');
  for (const a of accts.rows) {
    console.log(`  id=${a.id}  name="${a.name}"`);
    console.log(`     stripe_account_id (Connect): ${a.stripe_account_id || '(null)'}`);
    console.log(`     stripe_secret_key set:       ${a.has_secret}`);
    console.log(`     square_status:               ${a.square_status || '(null)'}`);
  }

  // 571931 booking + property + account
  console.log('\n=== BOOKING 571931 lineage ===');
  const b = await pg.query(`
    SELECT b.id, b.property_id, b.stripe_customer_id, b.stripe_payment_method_id,
           p.name AS property_name, p.account_id, a.name AS account_name,
           a.stripe_account_id AS acct_stripe, p.stripe_secret_key IS NOT NULL AS prop_has_secret
      FROM bookings b JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.id = 571931
  `);
  console.table(b.rows);

  // payment_configurations for both accounts
  console.log('\n=== payment_configurations for Charles House + Cotswolds ===');
  const pc = await pg.query(`
    SELECT pc.id, pc.account_id, pc.property_id, pc.provider,
           pc.credentials->>'stripe_account_id' AS creds_stripe_acct,
           pc.credentials->>'account_id' AS creds_account_id,
           pc.is_enabled
      FROM payment_configurations pc
      JOIN accounts a ON a.id = pc.account_id
     WHERE a.name ILIKE '%charles house%' OR a.name ILIKE '%cotswold%'
     ORDER BY pc.account_id, pc.id
  `);
  for (const r of pc.rows) {
    console.log(`  pc#${r.id}  acct=${r.account_id}  prop=${r.property_id || '(null)'}  provider=${r.provider}  connect_acct=${r.creds_stripe_acct || r.creds_account_id || '(null)'}  enabled=${r.is_enabled}`);
  }

  // Which Stripe account owns pm_1U12SEKcKXdYSUjNYuzmEw59 in reality?
  console.log('\n=== bookings that reference the same PM as 571931 ===');
  const dup = await pg.query(`
    SELECT b.id, b.property_id, p.name AS property_name, p.account_id, a.name AS account_name,
           b.guest_first_name, b.guest_last_name, b.arrival_date, b.grand_total,
           b.stripe_payment_method_id, b.stripe_customer_id
      FROM bookings b JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.stripe_payment_method_id = (SELECT stripe_payment_method_id FROM bookings WHERE id = 571931)
     ORDER BY b.id
  `);
  console.table(dup.rows);

  await pg.end();
})();
