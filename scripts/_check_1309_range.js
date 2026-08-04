const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT to_char(date,'YYYY-MM-DD') AS date, is_available, is_blocked, standard_price, cm_price FROM room_availability WHERE room_id = 1309 AND date >= '2026-10-03' AND date < '2026-10-24' ORDER BY date`);
  console.log('Room 1309 3-24 Oct:');
  for (const d of r.rows) console.log(`  ${d.date}: avail=${d.is_available} blocked=${d.is_blocked} std=${d.standard_price} cm=${d.cm_price}`);
  const b = await p.query(`SELECT id, guest_first_name, guest_last_name, status, arrival_date, departure_date FROM bookings WHERE bookable_unit_id = 1309 AND arrival_date <= '2026-10-24' AND departure_date > '2026-10-03'`);
  console.log('\nBookings overlapping:', JSON.stringify(b.rows, null, 2));
  await p.end();
})();
