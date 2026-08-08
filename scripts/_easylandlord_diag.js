// Diagnostic dump for EasyLandlord's sheet inbox rows so we can see
// exactly why the status chip + thread grouping aren't rendering.
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const r = await p.query(`
    SELECT id, thread_id, direction, from_name, subject, status, conversation_type,
           replied_at, created_at,
           metadata->>'sheet_status' AS sheet_status,
           metadata->>'sheet_row' AS sheet_row,
           metadata->'column_map'->>'status' AS map_status_col,
           SUBSTRING(body FROM 1 FOR 60) AS body_preview
      FROM inbox_messages
     WHERE channel = 'google_sheets' AND account_id = 230
     ORDER BY thread_id, created_at`);

  console.log('total rows:', r.rows.length);
  console.log('unique threads:', new Set(r.rows.map(x => x.thread_id)).size);
  console.log('');
  // How many have sheet_status populated vs blank vs null
  const withStatus = r.rows.filter(x => x.sheet_status && x.sheet_status.trim());
  const blankStatus = r.rows.filter(x => x.sheet_status === '');
  const nullStatus = r.rows.filter(x => x.sheet_status == null);
  console.log(`sheet_status: ${withStatus.length} populated / ${blankStatus.length} blank / ${nullStatus.length} null`);
  console.log(`column_map.status mapped: ${r.rows.filter(x => x.map_status_col).length} / ${r.rows.length}`);
  console.log(`conversation_type distribution:`);
  const ct = {};
  for (const row of r.rows) { ct[row.conversation_type || 'NULL'] = (ct[row.conversation_type || 'NULL'] || 0) + 1; }
  console.log(' ', JSON.stringify(ct));
  console.log('');
  console.log('per-row:');
  for (const row of r.rows) {
    const t8 = (row.thread_id || '').slice(-8);
    console.log(`  id=${row.id} t=…${t8} dir=${row.direction} conv=${row.conversation_type} row=${row.sheet_row} status='${row.sheet_status || '(blank)'}' mapH=${row.map_status_col} replied=${row.replied_at ? 'Y' : '-'} subj="${(row.subject || '').slice(0, 40)}"`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
