require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`UPDATE properties SET timezone = 'Europe/London', updated_at = NOW() WHERE id = 1134 RETURNING id, name, timezone`);
  console.log('Updated:', JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
