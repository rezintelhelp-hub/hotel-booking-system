const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, guest_first_name, guest_last_name, guest_email, num_adults, num_children, total_guests, arrival_date, departure_date FROM bookings WHERE guest_email = 'poullain.jose@orange.fr' ORDER BY id DESC`);
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
