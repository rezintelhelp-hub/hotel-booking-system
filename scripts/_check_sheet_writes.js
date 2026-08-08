// Check whether the sheet-writeback actually left evidence in the DB.
// existing_sheet_reply is stamped on the ORIGINAL sheet row by
// writeReplyToClientSheet after a successful Google Sheets API write, so
// its presence proves the write happened; its absence means either the
// write failed or was never attempted.
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const r = await p.query(`
    SELECT id, subject, replied_at,
           metadata->>'sheet_status' AS sheet_status,
           metadata->>'existing_sheet_reply' AS existing_reply,
           metadata->>'sheet_row' AS sheet_row
      FROM inbox_messages
     WHERE account_id = 230 AND channel = 'google_sheets' AND direction = 'out'
       AND (replied_at IS NOT NULL
            OR metadata->>'existing_sheet_reply' IS NOT NULL
            OR metadata->>'sheet_status' IS NOT NULL)
     ORDER BY replied_at DESC NULLS LAST, id DESC`);

  console.log(`rows with any writeback evidence: ${r.rows.length}`);
  for (const row of r.rows) {
    console.log(`  id=${row.id} row=${row.sheet_row} replied_at=${row.replied_at} status='${row.sheet_status || '-'}' existing_reply="${(row.existing_reply || '').slice(0, 80)}${row.existing_reply && row.existing_reply.length > 80 ? '…' : ''}" subj="${(row.subject || '').slice(0, 40)}"`);
  }

  // Also check: was the recent reply from Steve (id 4399) followed by a
  // metadata update on the original?
  const orig = await p.query(`
    SELECT id, replied_at, metadata->>'existing_sheet_reply' AS existing_reply
      FROM inbox_messages WHERE id = 3957`);
  console.log('\noriginal row 3957 (Contact Forms):');
  console.log(' ', JSON.stringify(orig.rows[0], null, 2));

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
