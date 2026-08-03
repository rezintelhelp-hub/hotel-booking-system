const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const bk = await p.query(`SELECT b.id, b.guest_first_name, b.guest_last_name, b.guest_email, b.arrival_date, b.created_at FROM bookings b JOIN properties p ON p.id = b.property_id WHERE p.account_id = 4 AND b.created_at > NOW() - INTERVAL '48 hours' ORDER BY b.created_at DESC LIMIT 10`);
  console.log('Recent Lehmann bookings (48h):');
  for (const r of bk.rows) console.log(`  B${r.id}: ${r.guest_first_name} ${r.guest_last_name} <${r.guest_email}> — arrival ${r.arrival_date?.toISOString?.().slice(0,10)} — created ${r.created_at?.toISOString?.()}`);
  // What runs did fire for these
  const runs = await p.query(`SELECT workflow_id, booking_id, status, created_at FROM workflow_runs WHERE booking_id IN (SELECT b.id FROM bookings b JOIN properties p ON p.id = b.property_id WHERE p.account_id = 4 AND b.created_at > NOW() - INTERVAL '48 hours') ORDER BY created_at DESC LIMIT 20`);
  console.log('\nWorkflow runs on those bookings:');
  for (const r of runs.rows) console.log(`  wf${r.workflow_id} on B${r.booking_id}: ${r.status} at ${r.created_at?.toISOString?.()}`);
  await p.end();
})();
