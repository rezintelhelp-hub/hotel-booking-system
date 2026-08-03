const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const owners = await p.query(`SELECT id, account_id, name, is_active, created_at, updated_at FROM property_owners ORDER BY id`);
  console.log('EVERY owner row (including inactive):', JSON.stringify(owners.rows, null, 2));
  await p.end();
})();
