const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Any runs on Lehmann workflows that got skipped or errored between the flip-off (2 Aug 21:06) and now
  const skipped = await p.query(`
    SELECT id, workflow_id, booking_id, step_index, status, channel, target_email, subject, error, sent_at, created_at
      FROM workflow_runs
     WHERE workflow_id IN (42, 43)
       AND status IN ('skipped', 'failed', 'error')
       AND created_at > '2026-08-02 21:00'
     ORDER BY created_at DESC`);
  console.log(`Runs skipped/failed in the flip window: ${skipped.rows.length}`);
  for (const r of skipped.rows) console.log(`  #${r.id} wf${r.workflow_id} B${r.booking_id} step ${r.step_index} — ${r.status} — ${r.subject || r.channel} — ${r.error || ''}`);

  // Also — any paused runs whose next_run_at IS PAST already? Those should have fired but didn't.
  const overdue = await p.query(`SELECT id, workflow_id, booking_id, step_index, status, next_run_at FROM workflow_runs WHERE workflow_id IN (42, 43) AND status = 'paused' AND next_run_at < NOW()`);
  console.log(`\nOverdue paused runs: ${overdue.rows.length}`);
  for (const r of overdue.rows) console.log(`  #${r.id} wf${r.workflow_id} B${r.booking_id} step ${r.step_index} — next_run_at ${r.next_run_at?.toISOString?.()} (PAST)`);
  await p.end();
})();
