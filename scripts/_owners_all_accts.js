const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const owners = await p.query(`SELECT id, account_id, name, address, postcode, city, is_active, created_at FROM property_owners ORDER BY id DESC LIMIT 10`);
  console.log('ALL OWNERS (latest 10):', JSON.stringify(owners.rows, null, 2));
  await p.end();
})();
