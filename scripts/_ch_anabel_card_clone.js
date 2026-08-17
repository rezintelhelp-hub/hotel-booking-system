// One-shot — force the Channex → Charles House Stripe clone for Anabel
// Voysey's booking, so we can see what card type she has (VCC vs guest
// personal). Then we know if it's likely to charge or not.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const Stripe = require('stripe');

const LIVE = process.argv.includes('--live');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const bk = await pg.query(`SELECT id, channex_booking_id, guest_first_name, guest_last_name, stripe_payment_method_id FROM bookings WHERE id = 638850`);
  const b = bk.rows[0];
  if (!b) { console.log('booking not found'); process.exit(1); }
  console.log(`Booking 638850 · ${b.guest_first_name} ${b.guest_last_name}`);
  console.log(`Channex ID: ${b.channex_booking_id}`);
  console.log(`Current stripe_payment_method_id: ${b.stripe_payment_method_id || '(null)'}`);

  const conn = await pg.query(`SELECT credentials FROM gas_sync_connections WHERE account_id = 273 AND adapter_code = 'channex' ORDER BY id DESC LIMIT 1`);
  const chxApiKey = conn.rows[0]?.credentials?.apiKey;

  const pc = await pg.query(`SELECT credentials FROM payment_configurations WHERE account_id = 273 AND provider = 'stripe' AND is_enabled = true LIMIT 1`);
  const stripeSecret = pc.rows[0]?.credentials?.secret_key;
  const stripe = Stripe(stripeSecret);

  // 1. Get token from Channex platform
  console.log(`\nStep 1: get platform pm token from Channex...`);
  const r = await fetch(`https://app.channex.io/api/v1/bookings/${b.channex_booking_id}/stripe_payment_method`, {
    method: 'POST', headers: { 'user-api-key': chxApiKey, 'Content-Type': 'application/json' }
  });
  const body = await r.json();
  // Channex returns token as EITHER a string OR an object {id: 'pm_...'}
  const _rawTok = body?.data?.token || body?.token || null;
  const platformPm = typeof _rawTok === 'string' ? _rawTok : (_rawTok?.id || null);
  console.log(`  Channex response: HTTP ${r.status}, platform_pm=${platformPm}`);

  if (!platformPm) { console.log('No platform pm — aborting'); process.exit(0); }

  // 2. Clone from Channex platform Stripe account into Charles House's Stripe
  // (using their direct secret_key — not Stripe Connect)
  console.log(`\nStep 2: clone into Charles House Stripe...`);
  if (!LIVE) {
    console.log(`  [DRY-RUN] would clone ${platformPm} into Charles House's Stripe account`);
    process.exit(0);
  }

  try {
    const cloned = await stripe.paymentMethods.create({ payment_method: platformPm });
    console.log(`  Cloned pm: ${cloned.id}`);
    console.log(`  Card: ${cloned.card?.brand} ****${cloned.card?.last4} ${cloned.card?.country}/${cloned.card?.funding} exp ${cloned.card?.exp_month}/${cloned.card?.exp_year}`);

    await pg.query(`
      UPDATE bookings SET
        stripe_payment_method_id = $2,
        card_brand = $3, card_last4 = $4,
        card_exp_month = $5, card_exp_year = $6,
        card_country = $7, card_funding = $8,
        updated_at = NOW()
      WHERE id = $1
    `, [
      b.id, cloned.id,
      cloned.card?.brand || null, cloned.card?.last4 || null,
      cloned.card?.exp_month || null, cloned.card?.exp_year || null,
      cloned.card?.country || null, cloned.card?.funding || null,
    ]);
    console.log(`  Saved to booking ${b.id}`);
  } catch (e) {
    console.log(`  Clone FAILED: ${e.message}`);
    if (e.raw) console.log(`  raw: ${JSON.stringify(e.raw).slice(0,200)}`);
  }

  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
