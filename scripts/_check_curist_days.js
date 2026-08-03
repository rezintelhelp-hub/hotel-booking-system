const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, checkin_days_of_week FROM shop_products WHERE id = 33`);
  console.log(JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
