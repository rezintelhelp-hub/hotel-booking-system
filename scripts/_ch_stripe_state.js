require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  console.log('=== Charles House Stripe state (all storage) ===\n');
  const acct = await pg.query(`SELECT id, name, stripe_account_id, stripe_secret_key IS NOT NULL AS has_direct_secret FROM accounts WHERE id = 273`);
  console.log('accounts row #273:');
  console.log(`  stripe_account_id (Connect):  ${acct.rows[0].stripe_account_id || '(null)'}`);
  console.log(`  stripe_secret_key set:        ${acct.rows[0].has_direct_secret}`);

  const pc = await pg.query(`SELECT id, property_id, credentials FROM payment_configurations WHERE account_id = 273 AND provider = 'stripe' AND is_enabled = true`);
  console.log(`\npayment_configurations (${pc.rows.length} rows):`);
  for (const r of pc.rows) {
    const c = r.credentials || {};
    console.log(`  pc#${r.id} property=${r.property_id}`);
    console.log(`    credentials.stripe_account_id: ${c.stripe_account_id || '(missing)'}   ← this is Stripe Connect`);
    console.log(`    credentials.account_id:        ${c.account_id || '(missing)'}          ← also Stripe Connect alt name`);
    console.log(`    credentials.secret_key set:    ${!!c.secret_key}                       ← this is direct API`);
    console.log(`    credentials.publishable_key:   ${c.publishable_key ? c.publishable_key.slice(0,25)+'...' : '(missing)'}`);
    console.log(`    credentials.token (OAuth):     ${c.token || c.access_token ? 'YES' : '(missing)'}`);
    console.log(`    All keys in credentials:       ${Object.keys(c).join(', ')}`);
  }

  // Try to derive her acct_id from her existing secret_key
  const c = pc.rows[0]?.credentials || {};
  if (c.secret_key) {
    console.log(`\nCan we derive her acct_id from her secret_key?`);
    try {
      const s = Stripe(c.secret_key);
      const a = await s.accounts.retrieve();
      console.log(`  YES → her Stripe account id is: ${a.id}`);
      console.log(`  Business name: ${a.business_profile?.name || a.settings?.dashboard?.display_name || '?'}`);
      console.log(`  Country: ${a.country}`);
      console.log(`  Type: ${a.type}   (standard/express/custom — if 'standard' + we own the key, it's direct API not Connect)`);
    } catch (e) {
      console.log(`  NO — ${e.message}`);
    }
  }

  await pg.end();
})();

// Extended — check properties.stripe_account_id (added later)
(async () => {
  const pg = new (require('pg')).Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('\n=== properties.stripe_account_id for Charles House property (id=1134) ===');
  const p = await pg.query(`SELECT id, name, stripe_account_id, stripe_secret_key IS NOT NULL AS has_secret FROM properties WHERE id = 1134`);
  console.table(p.rows);
  await pg.end();
})();
