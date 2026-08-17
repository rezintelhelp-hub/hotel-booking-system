// Probe Channex for gross vs net amounts + commission for every Charles
// House Expedia booking. Also pull Anabel Voysey's card (we have no pm
// locally) via Channex clone + Stripe fetch. And profile Lisa Smith's
// card (US Visa credit) with all Stripe metadata for BIN identification.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const conn = await pg.query(`SELECT credentials FROM gas_sync_connections WHERE account_id = 273 AND adapter_code = 'channex' ORDER BY id DESC LIMIT 1`);
  const chxApiKey = conn.rows[0]?.credentials?.apiKey || process.env.CHANNEX_API_KEY;

  const pc = await pg.query(`SELECT credentials FROM payment_configurations WHERE account_id = 273 AND provider = 'stripe' AND is_enabled = true LIMIT 1`);
  const stripe = pc.rows[0]?.credentials?.secret_key ? Stripe(pc.rows[0].credentials.secret_key) : null;

  const bookings = await pg.query(`
    SELECT b.id, b.channex_booking_id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.grand_total, b.balance_amount, b.currency, b.ota_payment_collect,
           b.stripe_payment_method_id, b.card_brand, b.card_last4, b.card_country, b.card_funding
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273 AND LOWER(COALESCE(b.booking_source,'')) = 'expedia'
       AND b.channex_booking_id IS NOT NULL
     ORDER BY b.arrival_date DESC
  `);

  console.log(`\n═══ Charles House Expedia — GROSS vs NET + COMMISSION + CARD PROFILE ═══\n`);
  console.log('id      | guest                    | collect  | grand   | ch.charge | ch.comm  | delta  | card');
  console.log('--------|--------------------------|----------|---------|-----------|----------|--------|----------------');

  const grossNetMismatches = [];
  for (const b of bookings.rows) {
    // Channex booking details
    let paymentCharge = null, paymentCommission = null, rawPreview = '';
    try {
      const r = await fetch(`https://app.channex.io/api/v1/bookings/${b.channex_booking_id}`, {
        headers: { 'user-api-key': chxApiKey }
      });
      const body = await r.json();
      const attrs = body?.data?.attributes || {};
      const meta = attrs.meta || {};
      paymentCharge = meta.payment_charge ?? null;
      paymentCommission = meta.payment_commission ?? meta.commission ?? null;
      // Try to fetch commission from raw_message JSON (Expedia payload)
      if (paymentCommission == null && attrs.raw_message) {
        try {
          const parsed = JSON.parse(attrs.raw_message);
          const comm = parsed?.compensation?.commissionableRateAmount
                    ?? parsed?.compensation?.amount
                    ?? parsed?.expediaCollect?.compensation
                    ?? null;
          if (comm) paymentCommission = comm;
        } catch(_){}
        rawPreview = String(attrs.raw_message).slice(0, 200).replace(/\s+/g,' ');
      }
    } catch (e) {
      console.log(`  [chx-err] #${b.id}: ${e.message}`);
    }

    // Stripe card details (BIN / brand / country / funding / exp)
    let cardMeta = null;
    if (b.stripe_payment_method_id && stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(b.stripe_payment_method_id);
        cardMeta = pm?.card || null;
      } catch(_){}
    }

    const gross = parseFloat(b.grand_total || 0);
    const chargeMinor = paymentCharge ? parseFloat(paymentCharge) / 100 : null;   // Channex sends minor units
    const delta = chargeMinor != null ? (gross - chargeMinor).toFixed(2) : '?';

    const cardStr = cardMeta
      ? `${cardMeta.brand} ****${cardMeta.last4} ${cardMeta.country}/${cardMeta.funding} exp ${cardMeta.exp_month}/${cardMeta.exp_year}`
      : '(no pm)';

    console.log(`${String(b.id).padEnd(7)} | ${String(b.guest).trim().padEnd(24)} | ${String(b.ota_payment_collect||'?').padEnd(8)} | ${b.currency||''} ${String(gross.toFixed(2)).padStart(4)} | ${chargeMinor != null ? b.currency + ' ' + String(chargeMinor.toFixed(2)).padStart(4) : '(null)   '} | ${paymentCommission ?? '(null)  '} | ${delta.padStart(6)} | ${cardStr}`);

    if (chargeMinor != null && Math.abs(gross - chargeMinor) > 0.01) {
      grossNetMismatches.push({ id: b.id, guest: b.guest, gross, net: chargeMinor });
    }
  }

  console.log('');
  if (grossNetMismatches.length === 0) {
    console.log('✅ All bookings: our grand_total = Channex payment_charge. Safe to use grand_total for VCC charge.');
  } else {
    console.log(`⚠️  ${grossNetMismatches.length} bookings where grand_total ≠ Channex payment_charge:`);
    for (const m of grossNetMismatches) console.log(`   #${m.id} ${m.guest} — gross=${m.gross} net=${m.net}`);
  }

  // Anabel Voysey card — clone from Channex if we don't have one locally
  console.log(`\n═══ ANABEL VOYSEY #638850 — fetch card from Channex ═══`);
  const anabel = bookings.rows.find(b => b.id === 638850);
  if (anabel && !anabel.stripe_payment_method_id) {
    try {
      // Get token from Channex
      const r = await fetch(`https://app.channex.io/api/v1/bookings/${anabel.channex_booking_id}/stripe_payment_method`, {
        method: 'POST', headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
      });
      const body = await r.json();
      const platformPm = body?.data?.token || body?.token || null;
      console.log(`  Channex platform pm: ${platformPm}`);
      if (platformPm && stripe) {
        // Retrieve without cloning (safer for a probe — don't attach to our account yet)
        console.log(`  (Note: this pm lives in the Channex platform Stripe account, not queryable with our key.)`);
        console.log(`  To see card details, our Channex webhook must clone it — that will happen on next Channex update to this booking.`);
      }
    } catch(e) {
      console.log(`  ERROR: ${e.message}`);
    }
  } else if (anabel?.stripe_payment_method_id) {
    console.log(`  Anabel actually DOES have a pm now: ${anabel.stripe_payment_method_id}`);
  }

  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
