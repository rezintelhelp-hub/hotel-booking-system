// Dig into Charles House Channex + Stripe setup — what's actually
// configured vs what SHOULD be configured for VCC pass-through.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  console.log('=== CHARLES HOUSE (acct 273) — payment_configurations FULL CREDENTIALS ===');
  const pc = await pg.query(`
    SELECT id, account_id, property_id, provider, is_enabled, credentials
      FROM payment_configurations WHERE account_id = 273
  `);
  for (const r of pc.rows) {
    console.log(`\npc#${r.id} acct=${r.account_id} prop=${r.property_id} provider=${r.provider} enabled=${r.is_enabled}`);
    console.log('  credentials keys:', Object.keys(r.credentials || {}));
    // Show non-secret credential shape only
    const c = r.credentials || {};
    console.log('    stripe_account_id:      ', c.stripe_account_id || '(missing)');
    console.log('    account_id:             ', c.account_id || '(missing)');
    console.log('    publishable_key:        ', c.publishable_key ? '(set — ' + String(c.publishable_key).slice(0,20) + '...)' : '(missing)');
    console.log('    secret_key:             ', c.secret_key ? '(set — ' + String(c.secret_key).slice(0,10) + '...)' : '(missing)');
    console.log('    charges_enabled:        ', c.charges_enabled ?? '(not stored)');
    console.log('    country:                ', c.country || '(not stored)');
    console.log('    (raw JSON dump below)');
    console.log('   ', JSON.stringify(r.credentials, (k, v) => typeof v === 'string' && v.startsWith('sk_') ? '[REDACTED]' : v));
  }

  console.log('\n=== CHARLES HOUSE — gas_sync_connections (Channex) ===');
  const conn = await pg.query(`
    SELECT id, account_id, gas_property_id, adapter_code, is_active,
           credentials, sync_state
      FROM gas_sync_connections
     WHERE account_id = 273 AND adapter_code = 'channex'
  `);
  for (const r of conn.rows) {
    console.log(`\nconn#${r.id} acct=${r.account_id} prop=${r.gas_property_id} adapter=${r.adapter_code} active=${r.is_active}`);
    console.log('  credentials keys:', Object.keys(r.credentials || {}));
    console.log('    apiKey:              ', r.credentials?.apiKey ? '(set)' : '(missing)');
    console.log('    channex_property_id: ', r.credentials?.channex_property_id || '(missing)');
    console.log('    hotel_id:            ', r.credentials?.hotel_id || '(missing)');
    console.log('    webhook_id:          ', r.credentials?.webhook_id || '(missing)');
    console.log('    stripe_tokenization: ', r.credentials?.stripe_tokenization ?? '(not tracked)');
    if (r.sync_state) console.log('  sync_state:', JSON.stringify(r.sync_state).slice(0,400));
  }

  console.log('\n=== The account row itself — Stripe columns ===');
  const a = await pg.query(`SELECT id, name, stripe_account_id, stripe_secret_key IS NOT NULL AS has_secret,
                                    stripe_publishable_key IS NOT NULL AS has_pub, stripe_charges_enabled
                              FROM accounts WHERE id = 273`);
  console.table(a.rows);

  console.log('\n=== A random Charles House Expedia booking — full stripe fields ===');
  const bk = await pg.query(`
    SELECT id, channex_booking_id, stripe_customer_id, stripe_payment_method_id,
           stripe_setup_intent_id, stripe_charge_id
      FROM bookings
     WHERE id = 571931
  `);
  console.table(bk.rows);

  await pg.end();
})();
