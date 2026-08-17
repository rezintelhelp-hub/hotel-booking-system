require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.booking_source, b.arrival_date, b.grand_total, b.balance_amount, b.currency,
           b.stripe_payment_method_id IS NOT NULL AS has_pm,
           b.card_brand, b.card_last4, b.card_exp_month, b.card_exp_year, b.card_country, b.card_funding,
           b.ota_payment_collect,
           b.status, b.payment_status
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273 AND b.channex_booking_id IS NOT NULL
       AND b.arrival_date >= CURRENT_DATE
     ORDER BY b.arrival_date
  `);
  const rows = r.rows;
  const withCard = rows.filter(b => b.has_pm);
  const withoutCard = rows.filter(b => !b.has_pm);
  console.log(`\nCharles House Channex — FUTURE arrivals only (${rows.length} bookings)\n`);
  console.log('── ✅ HAS CARD ──');
  for (const b of withCard) {
    const arr = b.arrival_date.toISOString().slice(0,10);
    const name = String(b.guest).trim().padEnd(28);
    const src = String(b.booking_source||'?').padEnd(9);
    const bal = `${b.currency||'?'} ${parseFloat(b.balance_amount||0).toFixed(2)}`.padStart(9);
    const card = b.card_brand ? `${b.card_brand} ****${b.card_last4||'?'} (${b.card_country||'?'} ${b.card_funding||'?'})` : '(no metadata)';
    const collect = b.ota_payment_collect || '?';
    console.log(`  #${b.id} ${name} ${src} ${arr}  bal=${bal}  collect=${collect.padEnd(8)} card=${card}`);
  }
  console.log('\n── 🚨 NO CARD ──');
  for (const b of withoutCard) {
    const arr = b.arrival_date.toISOString().slice(0,10);
    const name = String(b.guest).trim().padEnd(28);
    const src = String(b.booking_source||'?').padEnd(9);
    const bal = `${b.currency||'?'} ${parseFloat(b.balance_amount||0).toFixed(2)}`.padStart(9);
    const collect = b.ota_payment_collect || '?';
    console.log(`  #${b.id} ${name} ${src} ${arr}  bal=${bal}  collect=${collect.padEnd(8)}`);
  }
  console.log(`\nSummary: ${rows.length} future  ·  ${withCard.length} with card  ·  ${withoutCard.length} WITHOUT card`);
  await pg.end();
})();
