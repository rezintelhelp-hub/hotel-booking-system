require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='bookable_units' AND (column_name ILIKE '%desc%' OR column_name ILIKE '%content%' OR column_name ILIKE '%about%' OR column_name ILIKE '%_ml') ORDER BY column_name`);
  console.log('bookable_units description-like cols:', cols.rows.map(r=>r.column_name).join(', '));
  const r = await p.query(`SELECT id, name FROM bookable_units WHERE id IN (2302,2303,2304,2305)`);
  for (const room of r.rows) {
    const full = await p.query(`SELECT * FROM bookable_units WHERE id = $1`, [room.id]);
    const cs = Object.entries(full.rows[0]).filter(([k,v]) => v && typeof v === 'string' && v.length > 50 && (k.includes('desc') || k.includes('content') || k.includes('about')));
    console.log(`\n${room.name} (id ${room.id}) — long text fields:`);
    for (const [k, v] of cs) console.log(`  ${k}: ${v.slice(0, 200)}${v.length > 200 ? '...' : ''}`);
    // Also check JSONB _ml fields
    for (const [k, v] of Object.entries(full.rows[0])) {
      if (k.endsWith('_ml') && v && typeof v === 'object') {
        const en = v.en || v['en'] || Object.values(v)[0];
        if (en && typeof en === 'string' && en.length > 30) console.log(`  ${k}: ${en.slice(0, 200)}${en.length > 200 ? '...' : ''}`);
      }
    }
  }
  // Also property level
  const prop = await p.query(`SELECT * FROM properties WHERE id = 1134`);
  console.log('\n=== Property description fields ===');
  for (const [k, v] of Object.entries(prop.rows[0])) {
    if (v && typeof v === 'string' && v.length > 50 && (k.includes('desc') || k.includes('content') || k.includes('about'))) {
      console.log(`  ${k}: ${v.slice(0, 200)}`);
    }
    if (k.endsWith('_ml') && v && typeof v === 'object') {
      const en = v.en || Object.values(v)[0];
      if (en && typeof en === 'string' && en.length > 30) console.log(`  ${k}: ${en.slice(0, 200)}`);
    }
  }
  await p.end();
})();
