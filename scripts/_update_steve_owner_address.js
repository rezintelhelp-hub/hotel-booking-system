const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`
    UPDATE property_owners
       SET address = $1, postcode = $2, city = $3, country = $4, updated_at = NOW()
     WHERE id = 1
     RETURNING id, name, address, postcode, city, country`,
    ['43 Beacon Crescent', 'GU26 6UG', 'Hindhead', 'United Kingdom']);
  console.log('Updated:', JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
