require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const rooms = await p.query(`SELECT bu.id, bu.name FROM bookable_units bu JOIN properties p ON p.id = bu.property_id WHERE p.account_id = 273 ORDER BY bu.id`);
  for (const r of rooms.rows) {
    const last = await p.query(`SELECT MAX(date::text) AS last_date, COUNT(*) AS cnt FROM room_availability WHERE room_id = $1 AND standard_price IS NOT NULL AND standard_price > 0`, [r.id]);
    console.log(`Room ${r.id} ${r.name}: last priced date = ${last.rows[0].last_date} · rows=${last.rows[0].cnt}`);
  }
  await p.end();
})();
