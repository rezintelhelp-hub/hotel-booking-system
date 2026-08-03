const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const owners = await p.query(`SELECT id, account_id, name, address, postcode, city, siret, is_active, created_at, updated_at FROM property_owners ORDER BY id`);
  console.log('OWNERS:', JSON.stringify(owners.rows, null, 2));
  const props = await p.query(`SELECT id, name, owner_id FROM properties WHERE account_id = 197`);
  console.log('\nPROPERTIES (acct 197):', JSON.stringify(props.rows, null, 2));
  await p.end();
})();
