const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const bu = await p.query(`SELECT id, name FROM bookable_units WHERE property_id = 535 ORDER BY id`);
  console.log('Units on prop 535:', JSON.stringify(bu.rows, null, 2));
  for (const u of bu.rows) {
    const ra = await p.query(`SELECT date, is_available, is_blocked, standard_price, cm_price FROM room_availability WHERE room_id = $1 AND date = '2026-10-05'`, [u.id]);
    console.log(`\nUnit ${u.id} (${u.name}) room_availability on 5 Oct 2026:`, JSON.stringify(ra.rows, null, 2));
    const bk = await p.query(`SELECT id, guest_first_name, guest_last_name, status, arrival_date, departure_date, channex_booking_id FROM bookings WHERE bookable_unit_id = $1 AND arrival_date <= '2026-10-05' AND departure_date > '2026-10-05'`, [u.id]);
    console.log(`Overlapping bookings on 5 Oct:`, JSON.stringify(bk.rows, null, 2));
  }
  await p.end();
})();
