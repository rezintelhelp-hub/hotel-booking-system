require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // account 197 = Steve's gîtes (per memory)
  const acct = await pg.query(`SELECT id, name, stripe_account_id, stripe_secret_key IS NOT NULL AS has_secret FROM accounts WHERE id = 197`);
  console.log('=== accounts row #197 ===');
  console.log(acct.rows[0]);

  const pc = await pg.query(`
    SELECT pc.id, pc.property_id, p.name AS property_name, pc.credentials
      FROM payment_configurations pc
      LEFT JOIN properties p ON p.id = pc.property_id
     WHERE pc.account_id = 197 AND pc.provider = 'stripe' AND pc.is_enabled = true
     ORDER BY pc.id
  `);
  console.log(`\n=== payment_configurations for gîtes (${pc.rows.length} rows) ===`);
  for (const r of pc.rows) {
    const c = r.credentials || {};
    console.log(`\npc#${r.id} — property=${r.property_id} "${r.property_name}"`);
    console.log(`  stripe_account_id: ${c.stripe_account_id || '(missing)'}`);
    console.log(`  publishable_key:   ${c.publishable_key ? c.publishable_key.slice(0,25)+'...' : '(missing)'}`);
    console.log(`  secret_key set:    ${!!c.secret_key}`);
    console.log(`  connected_at:      ${c.connected_at || '(never OAuth)'}`);

    // Retrieve account from Stripe using the secret key
    if (c.secret_key) {
      try {
        const s = Stripe(c.secret_key);
        const a = await s.accounts.retrieve();
        console.log(`  → Stripe says: acct_id=${a.id}, business="${a.business_profile?.name || a.settings?.dashboard?.display_name || '?'}", country=${a.country}`);
      } catch (e) {
        console.log(`  → Stripe error: ${e.message}`);
      }
    }
  }

  // Properties on this account for reference
  const props = await pg.query(`SELECT id, name FROM properties WHERE account_id = 197 ORDER BY id LIMIT 20`);
  console.log(`\n=== properties on account 197 (first 20) ===`);
  console.table(props.rows);
  await pg.end();
})();
