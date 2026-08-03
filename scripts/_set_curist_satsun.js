const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`UPDATE shop_products SET checkin_days_of_week = '0,6', event_duration_nights = 21, updated_at = NOW() WHERE id = 33`);
  const r = await p.query(`SELECT id, name, checkin_days_of_week, event_duration_nights FROM shop_products WHERE id = 33`);
  console.log('Updated:', JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
