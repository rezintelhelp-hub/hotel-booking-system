const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, account_id, name, address, postcode, city, country, phone, email, siret, tourist_let_reg, iban, updated_at FROM property_owners WHERE id = 1`);
  console.log(JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
