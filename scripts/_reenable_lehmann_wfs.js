const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`UPDATE workflows SET is_active = true, updated_at = NOW() WHERE id IN (42, 43) RETURNING id, name, is_active, trigger_type`);
  console.log('Re-enabled:', JSON.stringify(r.rows, null, 2));
  // Also resume paused runs so the queued follow-ups actually fire
  const runs = await p.query(`UPDATE workflow_runs SET status = 'scheduled' WHERE workflow_id IN (42, 43) AND status = 'paused' RETURNING id, workflow_id, booking_id, scheduled_at`);
  console.log(`\nResumed ${runs.rows.length} paused runs`);
  for (const r of runs.rows) console.log(`  run #${r.id} — wf${r.workflow_id} on B${r.booking_id} scheduled ${r.scheduled_at?.toISOString?.() || r.scheduled_at}`);
  await p.end();
})();
