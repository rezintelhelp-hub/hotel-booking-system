require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='properties' AND column_name IN ('facilities','check_in_time','check_out_time','house_rules','phone','timezone','description') ORDER BY column_name`);
  console.log(JSON.stringify(cols.rows, null, 2));
  await p.end();
})();
