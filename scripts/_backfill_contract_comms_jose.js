// One-shot backfill: log the contract_sent event that fired for Jose
// Poullain BEFORE the comms-logging code shipped (commit f36ed100).
// Idempotent — checks for an existing contract_sent row on this booking
// first so re-running does nothing.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const BOOKING_ID = 539597;
const ACCOUNT_ID = 197;
const GUEST_EMAIL = 'poullain.jose@orange.fr';
(async () => {
  const g = await p.query(`SELECT id FROM guests WHERE account_id = $1 AND lower(email) = lower($2) LIMIT 1`, [ACCOUNT_ID, GUEST_EMAIL]);
  let guestId = g.rows[0]?.id;
  if (!guestId) {
    const ins = await p.query(`INSERT INTO guests (account_id, email, recognised_at, last_seen_at) VALUES ($1, lower($2), NOW(), NOW()) ON CONFLICT (account_id, email) DO UPDATE SET last_seen_at = NOW() RETURNING id`, [ACCOUNT_ID, GUEST_EMAIL]);
    guestId = ins.rows[0].id;
    console.log('Created guest row #' + guestId);
  } else console.log('Guest #' + guestId);

  const dupe = await p.query(`SELECT id FROM guest_communications WHERE booking_id = $1 AND event_type = 'contract_sent'`, [BOOKING_ID]);
  if (dupe.rows[0]) { console.log('Already logged as #' + dupe.rows[0].id + ' — noop'); await p.end(); return; }

  const c = await p.query(`SELECT id, sign_token, sent_at FROM contract_instances WHERE booking_id = $1 ORDER BY id DESC LIMIT 1`, [BOOKING_ID]);
  const ci = c.rows[0];
  if (!ci) { console.error('no contract_instance for booking ' + BOOKING_ID); process.exit(1); }
  const signUrl = 'https://admin.gas.travel/contract/sign/' + ci.sign_token;

  const subject = 'Votre contrat de location — 5 Rte Des Thermes — Ussat — merci de le signer';
  const body = `<p>Backfilled log entry (contract sent 2026-08-03).</p><p><a href="${signUrl}">${signUrl}</a></p>`;
  const r = await p.query(
    `INSERT INTO guest_communications (guest_id, booking_id, channel, direction, event_type, subject, body, status, sent_at, metadata)
     VALUES ($1, $2, 'email', 'outbound', 'contract_sent', $3, $4, 'sent', $5, $6::jsonb)
     RETURNING id`,
    [guestId, BOOKING_ID, subject, body, ci.sent_at || new Date(), JSON.stringify({ contract_id: ci.id, sign_url: signUrl, backfilled: true })]);
  console.log('Logged as guest_communications #' + r.rows[0].id);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
