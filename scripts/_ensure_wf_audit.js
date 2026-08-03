const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`
    CREATE TABLE IF NOT EXISTS workflow_status_history (
      id SERIAL PRIMARY KEY,
      workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      account_id INTEGER,
      from_active BOOLEAN,
      to_active BOOLEAN NOT NULL,
      changed_by_account_id INTEGER,
      source VARCHAR(60),
      payload_fields TEXT,
      changed_at TIMESTAMP DEFAULT NOW()
    )`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_wsh_workflow ON workflow_status_history(workflow_id, changed_at DESC)`);
  console.log('workflow_status_history table ensured');
  // Confirm current state of wf42 + wf43
  const wfs = await p.query(`SELECT id, name, is_active, updated_at FROM workflows WHERE id IN (42, 43)`);
  console.log('\nwf42+43 current state:', JSON.stringify(wfs.rows, null, 2));
  await p.end();
})();
