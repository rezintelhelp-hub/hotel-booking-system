const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, email FROM accounts WHERE name ILIKE '%mornington%'`);
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
