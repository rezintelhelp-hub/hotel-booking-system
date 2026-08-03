const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, guest_first_name, guest_last_name, num_adults, num_children, total_guests, arrival_date, departure_date FROM bookings WHERE guest_last_name ILIKE '%poullain%' OR guest_first_name ILIKE '%jose%' ORDER BY id DESC LIMIT 5`);
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
