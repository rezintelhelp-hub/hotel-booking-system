require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Ryan Aines any bookings/attempts
  const r = await p.query(`SELECT id, guest_first_name, guest_last_name, guest_email, arrival_date, departure_date, status, payment_status, bookable_unit_id, booking_source, created_at FROM bookings WHERE guest_first_name ILIKE 'ryan%' AND guest_last_name ILIKE '%aines%' ORDER BY id DESC LIMIT 5`);
  console.log('Ryan Aines bookings:', JSON.stringify(r.rows, null, 2));
  // All bookings overlapping Feb 12-15 2027 on unit 2221 (Spruce Glen B based on B536429)
  const overlap = await p.query(`SELECT id, guest_first_name, guest_last_name, status, arrival_date, departure_date, booking_source, created_at FROM bookings WHERE bookable_unit_id = 2221 AND arrival_date < '2027-02-15' AND departure_date > '2027-02-12' ORDER BY id`);
  console.log('\nBookings overlapping unit 2221 Feb 12-15 2027:', JSON.stringify(overlap.rows, null, 2));
  await p.end();
})();
