const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`UPDATE offers SET active = false, updated_at = NOW() WHERE id = 5305 RETURNING id, name, active`);
  console.log('Deactivated:', JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
