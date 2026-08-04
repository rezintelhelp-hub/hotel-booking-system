require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='properties' AND (column_name ILIKE '%desc%' OR column_name ILIKE '%content%' OR column_name ILIKE '%about%' OR column_name ILIKE '%_ml' OR column_name ILIKE '%intro%')`);
  console.log('properties desc-like cols:', cols.rows.map(r=>r.column_name).join(', '));
  const full = await p.query(`SELECT * FROM properties WHERE id = 1134`);
  console.log('\nAll long/JSONB fields on prop 1134:');
  for (const [k, v] of Object.entries(full.rows[0])) {
    if (v && typeof v === 'string' && v.length > 40) console.log(`  ${k} (str, ${v.length}c): ${v.slice(0, 150)}`);
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      const en = v.en || (typeof v === 'object' ? Object.values(v)[0] : null);
      if (en && typeof en === 'string' && en.length > 30) console.log(`  ${k} (JSONB en, ${en.length}c): ${en.slice(0, 150)}`);
    }
  }
  await p.end();
})();
