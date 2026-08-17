// Backfill script — Charles House (account 273) Channex-imported bookings
// only. For each booking:
//   - If stripe_payment_method_id set + card_last4 null → fetch card
//     metadata from Stripe, populate card_last4/brand/exp/country/funding.
//   - If ota_payment_collect null → fetch from Channex, populate.
// Idempotent — reads current row before each write; skips already-filled
// bookings.
//
// Usage:
//   node scripts/_ch_channex_backfill.js         # dry-run
//   node scripts/_ch_channex_backfill.js --live  # actually write
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

const LIVE = process.argv.includes('--live');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const conn = await pg.query(`
    SELECT credentials FROM gas_sync_connections
     WHERE account_id = 273 AND adapter_code = 'channex'
     ORDER BY id DESC LIMIT 1
  `);
  const chxApiKey = conn.rows[0]?.credentials?.apiKey || process.env.CHANNEX_API_KEY;
  if (!chxApiKey) { console.log('No Channex API key'); process.exit(1); }

  const pc = await pg.query(`
    SELECT credentials FROM payment_configurations
     WHERE account_id = 273 AND provider = 'stripe' AND is_enabled = true
     LIMIT 1
  `);
  const stripeSecret = pc.rows[0]?.credentials?.secret_key;
  const stripe = stripeSecret ? Stripe(stripeSecret) : null;

  const bookings = await pg.query(`
    SELECT b.id, b.channex_booking_id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.arrival_date, b.stripe_payment_method_id,
           b.card_last4, b.card_brand, b.card_exp_month, b.card_exp_year,
           b.card_country, b.card_funding, b.ota_payment_collect
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273
       AND b.channex_booking_id IS NOT NULL
     ORDER BY b.arrival_date DESC
  `);

  console.log(`[ch-channex-backfill] ${LIVE ? 'LIVE' : 'DRY-RUN'} — ${bookings.rows.length} Charles House Channex bookings\n`);

  let stripeUpdated = 0, channexUpdated = 0, skipped = 0, errors = 0;

  for (const b of bookings.rows) {
    const name = String(b.guest).trim();
    const needStripeMeta = !!b.stripe_payment_method_id && !b.card_last4;
    const needCollectFlag = !b.ota_payment_collect;
    if (!needStripeMeta && !needCollectFlag) {
      console.log(`  [SKIP]   #${b.id} ${name} — all fields already populated`);
      skipped++;
      continue;
    }

    let stripeSet = {};
    if (needStripeMeta && stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(b.stripe_payment_method_id);
        const c = pm?.card || {};
        if (c.last4) stripeSet.card_last4 = c.last4;
        if (c.brand) stripeSet.card_brand = c.brand;
        if (c.exp_month) stripeSet.card_exp_month = c.exp_month;
        if (c.exp_year) stripeSet.card_exp_year = c.exp_year;
        if (c.country) stripeSet.card_country = c.country;
        if (c.funding) stripeSet.card_funding = c.funding;
      } catch (e) {
        console.error(`  [stripe-err] #${b.id}: ${e.message}`);
        errors++;
      }
    }

    let collectSet = null;
    if (needCollectFlag) {
      try {
        const r = await fetch(`https://app.channex.io/api/v1/bookings/${b.channex_booking_id}`, {
          headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
        });
        const body = await r.json();
        const attrs = body?.data?.attributes || {};
        const val = String(attrs.payment_collect || '').toLowerCase().trim();
        if (val) collectSet = val;
      } catch (e) {
        console.error(`  [channex-err] #${b.id}: ${e.message}`);
        errors++;
      }
    }

    const cardFields = Object.entries(stripeSet);
    const willUpdateStripe = cardFields.length > 0;
    const willUpdateCollect = !!collectSet;

    if (!willUpdateStripe && !willUpdateCollect) {
      console.log(`  [SKIP]   #${b.id} ${name} — nothing to update (probe returned empty)`);
      skipped++;
      continue;
    }

    const parts = [];
    if (willUpdateStripe) parts.push('card ' + (stripeSet.card_brand||'?') + ' ****' + (stripeSet.card_last4||'????') + ' exp ' + (stripeSet.card_exp_month||'?') + '/' + (stripeSet.card_exp_year||'?') + ' (' + (stripeSet.card_country||'?') + ' ' + (stripeSet.card_funding||'?') + ')');
    if (willUpdateCollect) parts.push('payment_collect=' + collectSet);

    if (!LIVE) {
      console.log(`  [DRY]    #${b.id} ${name} → ${parts.join('  |  ')}`);
      if (willUpdateStripe) stripeUpdated++;
      if (willUpdateCollect) channexUpdated++;
      continue;
    }

    try {
      const setClauses = [];
      const vals = [b.id];
      let i = 2;
      for (const [k, v] of cardFields) { setClauses.push(`${k} = $${i++}`); vals.push(v); }
      if (collectSet) { setClauses.push(`ota_payment_collect = $${i++}`); vals.push(collectSet); }
      setClauses.push('updated_at = NOW()');
      await pg.query(`UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $1`, vals);
      console.log(`  [UPDATE] #${b.id} ${name} → ${parts.join('  |  ')}`);
      if (willUpdateStripe) stripeUpdated++;
      if (willUpdateCollect) channexUpdated++;
    } catch (e) {
      console.error(`  [db-err] #${b.id}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n[ch-channex-backfill] done — ${LIVE ? 'updated' : 'would update'}  stripe-meta=${stripeUpdated}  channex-collect=${channexUpdated}  skipped=${skipped}  errors=${errors}`);
  if (!LIVE) console.log('(dry-run — re-run with --live to actually write)');
  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
