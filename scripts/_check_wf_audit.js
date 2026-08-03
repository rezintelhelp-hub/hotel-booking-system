const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, workflow_id, from_active, to_active, changed_by_account_id, source, payload_fields, created_at FROM workflow_status_history WHERE workflow_id IN (42,43) ORDER BY created_at DESC LIMIT 20`);
  console.log('Audit for wf42+43:');
  for (const h of r.rows) console.log(`  #${h.id} wf${h.workflow_id} ${h.from_active}→${h.to_active} by acct=${h.changed_by_account_id||'?'} src=${h.source} payload=${JSON.stringify(h.payload_fields)} at ${h.created_at?.toISOString?.()}`);
  await p.end();
})();
