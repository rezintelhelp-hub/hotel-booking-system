const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Lehmann bookings created between wf flip-off (2 Aug 21:06) and now
  const bk = await p.query(`
    SELECT b.id, b.guest_first_name, b.guest_last_name, b.guest_email, b.arrival_date, b.created_at
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 4 AND b.created_at BETWEEN '2026-08-02 21:00' AND NOW()
     ORDER BY b.created_at DESC`);
  console.log(`Lehmann bookings created during workflow-off window: ${bk.rows.length}`);
  for (const r of bk.rows) console.log(`  B${r.id}: ${r.guest_first_name} ${r.guest_last_name} <${r.guest_email}> — arrival ${r.arrival_date?.toISOString?.().slice(0,10)} — created ${r.created_at?.toISOString?.()}`);
  // For each, check if wf42 or wf43 has any run row
  for (const b of bk.rows) {
    const r = await p.query(`SELECT id, workflow_id, status FROM workflow_runs WHERE booking_id = $1 AND workflow_id IN (42,43)`, [b.id]);
    console.log(`  B${b.id}: ${r.rows.length} workflow run rows — ${JSON.stringify(r.rows.map(x=>({wf:x.workflow_id,s:x.status})))}`);
  }
  await p.end();
})();
