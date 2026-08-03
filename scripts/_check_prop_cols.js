const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='properties' AND (column_name ILIKE '%country%' OR column_name ILIKE '%address%' OR column_name ILIKE '%city%') ORDER BY 1`);
  console.log(c.rows.map(x=>x.column_name).join(', '));
  await p.end();
})();
