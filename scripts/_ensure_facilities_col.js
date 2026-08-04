require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]'::jsonb");
  await p.query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(10)");
  const cols = await p.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='properties' AND column_name IN ('facilities','check_out_time') ORDER BY column_name`);
  console.log('Confirmed:', JSON.stringify(cols.rows, null, 2));
  await p.end();
})();
