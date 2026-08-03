const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'workflow_runs' ORDER BY ordinal_position`);
  console.log('cols:', cols.rows.map(r=>r.column_name).join(', '));
  const paused = await p.query(`SELECT * FROM workflow_runs WHERE workflow_id IN (42,43) AND status = 'paused' ORDER BY id LIMIT 20`);
  console.log(`\nPaused runs on wf42/43: ${paused.rows.length}`);
  for (const r of paused.rows) console.log('  ', JSON.stringify(r).slice(0, 400));
  await p.end();
})();
