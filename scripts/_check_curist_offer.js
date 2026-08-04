const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, discount_type, discount_value, min_nights, max_nights, active FROM offers WHERE account_id = 197 ORDER BY id`);
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
