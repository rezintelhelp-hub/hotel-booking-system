// One-off backfill: for every confirmed Beds24-linked booking that has
// a real GAS-side Stripe/Enigma/Worldpay payment, hit the new admin
// endpoint /api/admin/bookings/:id/sync-beds24-payment which calls the
// idempotent syncBeds24PaymentItem helper. The helper computes the
// delta and pushes only what Beds24 is missing (or short-circuits with
// {skipped:'in-sync'} when they already agree).
//
// Auth: we mint a temporary master admin session (steve@rezintel account
// id=1), use it for the backfill, then delete it. Staggered 1s per
// booking. Cotswolds first (account_id=95) then the rest.
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE = process.env.SYNC_BASE || 'https://admin.gas.travel';

(async () => {
  // 1. Mint a short-lived master admin session
  const token = 'backfill-' + crypto.randomBytes(24).toString('hex');
  await p.query(
    `INSERT INTO account_sessions (account_id, token, expires_at, created_at, ip_address, user_agent)
     VALUES (1, $1, NOW() + INTERVAL '2 hours', NOW(), 'localhost', 'backfill-script')`,
    [token]
  );
  console.log('Minted temp master session (expires 2h).');

  try {
    // 2. Candidate bookings — Cotswolds first, rest by paid-recency
    const cands = await p.query(`
      SELECT b.id, p.account_id, a.name AS account_name,
             TRIM(COALESCE(b.guest_first_name,'')||' '||COALESCE(b.guest_last_name,'')) AS guest,
             MAX(pt.completed_at) AS last_paid
        FROM bookings b
        JOIN properties p ON p.id = b.property_id
        JOIN accounts a ON a.id = p.account_id
        JOIN payment_transactions pt ON pt.booking_id = b.id
       WHERE b.beds24_booking_id IS NOT NULL
         AND b.status = 'confirmed'
         AND b.payment_status IN ('paid','partial_paid','partial','charged')
         AND pt.status IN ('completed','succeeded')
         AND pt.payment_gateway IN ('stripe','enigma_proxy','worldpay')
       GROUP BY b.id, p.account_id, a.name, b.guest_first_name, b.guest_last_name
       ORDER BY (p.account_id = 95) DESC, MAX(pt.completed_at) DESC NULLS LAST
    `);
    console.log(`Candidates: ${cands.rows.length}`);

    let pushed = 0, inSync = 0, skipped = 0, failed = 0;
    for (let i = 0; i < cands.rows.length; i++) {
      const b = cands.rows[i];
      process.stdout.write(`[${i + 1}/${cands.rows.length}] GAS-${b.id} acct ${b.account_id} ${b.account_name.padEnd(28).slice(0,28)} ${b.guest.slice(0,26).padEnd(26)}… `);
      try {
        const r = await axios.post(
          `${BASE}/api/admin/bookings/${b.id}/sync-beds24-payment`,
          {},
          {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 30 * 1000,
          }
        );
        const res = r.data?.result || {};
        if (res.pushed || res.ok) {
          pushed++;
          console.log(`PUSHED  gas=${res.gas || '?'} beds24-prev=${res.beds24 || '?'} sent=${res.pushed || '?'}`);
        } else if (res.skipped === 'in-sync') {
          inSync++;
          console.log(`in-sync  gas=${res.gas} beds24=${res.beds24}`);
        } else {
          skipped++;
          console.log(`skipped  ${res.skipped || 'unknown'}${res.error ? ' — ' + res.error : ''}`);
        }
      } catch (e) {
        failed++;
        console.log(`FAIL  ${e.response?.status || ''} ${e.response?.data?.error || e.message}`);
      }
      await new Promise(x => setTimeout(x, 1000)); // 1s per booking
    }

    console.log(`\n=== DONE ===`);
    console.log(`  Pushed:   ${pushed}`);
    console.log(`  In-sync:  ${inSync}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Failed:   ${failed}`);
  } finally {
    // 3. Clean up the temp session
    await p.query('DELETE FROM account_sessions WHERE token = $1', [token]);
    console.log('Cleaned up temp session.');
    await p.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
