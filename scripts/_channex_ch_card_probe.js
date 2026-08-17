// Read-only probe against Channex API — for each Charles House Expedia
// booking that's Channex-imported, ask Channex what they hold for it
// (booking payload + stripe_payment_method endpoint). Also query Stripe
// for the pm_ token we have on file to see the card metadata (last4,
// brand, exp) that we're missing in the DB.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

const LIMIT = parseInt(process.argv[2] || '99', 10);

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Charles House Channex connection + Stripe secret key
  const conn = await pg.query(`
    SELECT credentials FROM gas_sync_connections
     WHERE account_id = 273 AND adapter_code = 'channex'
     ORDER BY id DESC LIMIT 1
  `);
  if (conn.rows.length === 0) { console.log('No active Channex connection for Charles House'); process.exit(1); }
  const chxApiKey = conn.rows[0].credentials?.apiKey || process.env.CHANNEX_API_KEY;
  if (!chxApiKey) { console.log('No Channex API key'); process.exit(1); }

  const pc = await pg.query(`
    SELECT credentials FROM payment_configurations
     WHERE account_id = 273 AND provider = 'stripe' AND is_enabled = true
     LIMIT 1
  `);
  const stripeSecret = pc.rows[0]?.credentials?.secret_key;
  const stripe = stripeSecret ? Stripe(stripeSecret) : null;

  // Bookings to probe
  const bookings = await pg.query(`
    SELECT b.id, b.channex_booking_id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.arrival_date, b.grand_total, b.currency, b.balance_amount,
           b.stripe_payment_method_id, b.stripe_setup_intent_id, b.stripe_customer_id
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273
       AND LOWER(COALESCE(b.booking_source,'')) = 'expedia'
       AND b.channex_booking_id IS NOT NULL
     ORDER BY b.arrival_date DESC
     LIMIT $1
  `, [LIMIT]);

  for (const bk of bookings.rows) {
    console.log(`\n───────────────────────────────────────────────`);
    console.log(`Booking #${bk.id} — ${String(bk.guest).trim()} — arrival ${bk.arrival_date.toISOString().slice(0,10)} — ${bk.currency} ${bk.grand_total}`);
    console.log(`Channex ID: ${bk.channex_booking_id}`);

    // 1. Channex booking payload — get top-level to see what data they hold
    try {
      const r = await fetch(`https://staging.channex.io/api/v1/bookings/${bk.channex_booking_id}`, {
        headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
      });
      // Try production if staging 404s
      let body;
      if (r.status === 404 || !r.ok) {
        const r2 = await fetch(`https://app.channex.io/api/v1/bookings/${bk.channex_booking_id}`, {
          headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
        });
        body = await r2.json();
        console.log(`  Channex booking GET  → HTTP ${r2.status} (production)`);
      } else {
        body = await r.json();
        console.log(`  Channex booking GET  → HTTP ${r.status} (staging)`);
      }
      const attrs = body?.data?.attributes || body?.attributes || {};
      const meta = attrs.meta || {};
      const paymentCollect = attrs.payment_collect || meta.payment_collect || meta.payment_type || '(not set)';
      const paymentCharge = meta.payment_charge ?? '(not set)';
      const paymentType = meta.payment_type || '(not set)';
      const rawSnippet = String(attrs.raw_message || '').slice(0, 300);
      console.log(`  attrs.payment_collect: ${paymentCollect}`);
      console.log(`  meta.payment_charge:   ${paymentCharge}`);
      console.log(`  meta.payment_type:     ${paymentType}`);
      if (rawSnippet) console.log(`  raw_message preview:   ${rawSnippet.replace(/\s+/g,' ')}...`);
    } catch (e) {
      console.log(`  Channex booking GET → ERROR: ${e.message}`);
    }

    // 2. Channex stripe_payment_method endpoint — the one our webhook uses
    try {
      const r = await fetch(`https://app.channex.io/api/v1/bookings/${bk.channex_booking_id}/stripe_payment_method`, {
        method: 'POST',
        headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
      });
      const body = await r.json();
      console.log(`  Channex stripe_payment_method POST → HTTP ${r.status}`);
      const token = body?.data?.token || body?.token || null;
      if (token) console.log(`  → platform pm token: ${token}`);
      if (body?.errors) console.log(`  → errors: ${JSON.stringify(body.errors).slice(0,180)}`);
    } catch (e) {
      console.log(`  Channex stripe_payment_method POST → ERROR: ${e.message}`);
    }

    // 3. Stripe lookup on the pm_ we already have on the booking
    if (bk.stripe_payment_method_id && stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(bk.stripe_payment_method_id);
        console.log(`  Stripe pm ${bk.stripe_payment_method_id.slice(0,20)}... → brand=${pm.card?.brand} last4=${pm.card?.last4} exp=${pm.card?.exp_month}/${pm.card?.exp_year} funding=${pm.card?.funding} country=${pm.card?.country}`);
      } catch (e) {
        console.log(`  Stripe pm retrieve → ERROR: ${e.message}`);
      }
    } else if (bk.stripe_payment_method_id) {
      console.log(`  Stripe pm ${bk.stripe_payment_method_id.slice(0,20)}... — no secret_key so can't query`);
    }
  }

  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
