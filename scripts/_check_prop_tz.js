require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, timezone, phone FROM properties WHERE id = 1134`);
  console.log(JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
