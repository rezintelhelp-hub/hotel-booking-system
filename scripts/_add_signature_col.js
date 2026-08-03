const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`ALTER TABLE property_owners ADD COLUMN IF NOT EXISTS signature_data_url TEXT`);
  await p.query(`ALTER TABLE account_contract_settings ADD COLUMN IF NOT EXISTS signature_data_url TEXT`);
  console.log('signature_data_url columns ensured');
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
