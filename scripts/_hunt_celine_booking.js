const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // 1. Identify bookings ID columns
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND (column_name ILIKE '%booking_id%' OR column_name ILIKE '%external%' OR column_name ILIKE '%ota%' OR column_name ILIKE '%channex%' OR column_name ILIKE '%ref%') ORDER BY ordinal_position");
  console.log('booking-ref columns:', cols.rows.map(r => r.column_name).join(', '));

  // 2. Direct search by guest name + arrival
  const b = await p.query(`
    SELECT id, guest_first_name, guest_last_name, guest_email, arrival_date, departure_date,
           property_id, bookable_unit_id, status, booking_source, channex_booking_id,
           beds24_booking_id, created_at
    FROM bookings
    WHERE (guest_first_name ILIKE 'leroyer' OR guest_last_name ILIKE 'leroyer' OR guest_last_name ILIKE 'leroyer%')
       OR arrival_date = '2026-08-03'
    ORDER BY created_at DESC LIMIT 10
  `);
  console.log('\nbookings matching by name OR arrival 2026-08-03:', b.rows.length);
  b.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  // 3. Find the Gite Julie Anne property
  const prop = await p.query("SELECT id, name, account_id FROM properties WHERE name ILIKE '%julie%' OR name ILIKE '%gite%'");
  console.log('\nproperty matches for "julie"/"gite":');
  prop.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  // 4. Channex tables
  const t = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%channex%' ORDER BY table_name");
  console.log('\nchannex tables:'); t.rows.forEach(r => console.log(' ', r.table_name));
  await p.end();
})();
