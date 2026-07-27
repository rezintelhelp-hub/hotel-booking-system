// Backfill Hostfully leads for direct GAS bookings that never got
// pushed. Steve 2026-07-27: GAS-487704 (Lianne Buchanan / Togari Cottage,
// £19,626 direct booking) was invisible in Hostfully because no code
// path called HostfullyAdapter.createLead. Wiring landed in commit that
// added pushBookingToHostfully helper + /api/public/book +
// /api/admin/bookings hooks; this script closes the retro gap.
//
// Criteria for candidates:
//   - booking has beds24_booking_id NULL (not a Beds24 sourced booking —
//     Hostfully accounts don't use Beds24)
//   - booking.property is on a Hostfully-connected account
//   - status = 'confirmed'
//   - booking_source NOT 'hostfully' (we didn't originate it from Hostfully)
//   - hostfully_lead_uid IS NULL (helper is idempotent but skip early to
//     save API calls)
//   - created within the last 12 months (older probably manually handled)
//
// Mints a temp master admin session, staggers 2s per booking (Hostfully
// Public API rate limit is 60 req/min per API key), cleans up on exit.
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE = process.env.SYNC_BASE || 'https://admin.gas.travel';

(async () => {
  const token = 'backfill-hf-' + crypto.randomBytes(20).toString('hex');
  await p.query(
    `INSERT INTO account_sessions (account_id, token, expires_at, created_at, ip_address, user_agent)
     VALUES (1, $1, NOW() + INTERVAL '2 hours', NOW(), 'localhost', 'hostfully-backfill')`,
    [token]
  );
  console.log('Minted temp master session (2h TTL).');

  try {
    const cands = await p.query(`
      SELECT b.id, b.guest_first_name, b.guest_last_name, b.arrival_date,
             b.grand_total, b.booking_source, p.name AS property_name,
             p.account_id, a.name AS account_name
        FROM bookings b
        JOIN properties p ON p.id = b.property_id
        JOIN accounts a ON a.id = p.account_id
       WHERE b.status = 'confirmed'
         AND b.beds24_booking_id IS NULL
         AND b.hostfully_lead_uid IS NULL
         AND COALESCE(b.booking_source, '') <> 'hostfully'
         AND b.created_at > NOW() - INTERVAL '12 months'
         AND EXISTS (
           SELECT 1 FROM gas_sync_connections c
             JOIN gas_sync_properties sp ON sp.connection_id = c.id
            WHERE c.account_id = p.account_id
              AND c.adapter_code = 'hostfully'
              AND c.status = 'connected'
              AND sp.gas_property_id = b.property_id
         )
       ORDER BY b.arrival_date ASC
    `);
    console.log(`Candidates: ${cands.rows.length}`);
    if (cands.rows.length === 0) { console.log('Nothing to backfill.'); return; }

    let pushed = 0, skipped = 0, failed = 0;
    for (let i = 0; i < cands.rows.length; i++) {
      const b = cands.rows[i];
      const guest = `${b.guest_first_name || ''} ${b.guest_last_name || ''}`.trim();
      const arr = String(b.arrival_date).slice(0, 10);
      process.stdout.write(`[${i + 1}/${cands.rows.length}] GAS-${b.id} · acct ${b.account_id} ${b.account_name.slice(0, 22).padEnd(22)} · ${b.property_name.slice(0, 22).padEnd(22)} · ${arr} · ${guest.slice(0, 24).padEnd(24)}… `);
      try {
        const r = await axios.post(
          `${BASE}/api/admin/bookings/${b.id}/push-hostfully`,
          {},
          {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 30 * 1000,
          }
        );
        const res = r.data?.result || {};
        if (res.success) { pushed++; console.log(`PUSHED  lead=${res.hostfully_lead_uid || '?'}`); }
        else if (res.skipped) { skipped++; console.log(`skipped  ${res.skipped}`); }
        else { failed++; console.log(`FAIL  ${res.error || 'unknown'}`); }
      } catch (e) {
        failed++;
        console.log(`ERR  ${e.response?.status || ''} ${e.response?.data?.error || e.message}`);
      }
      await new Promise(x => setTimeout(x, 2000)); // 2s between calls — Hostfully limit is 60/min
    }
    console.log(`\n=== DONE ===\n  Pushed:  ${pushed}\n  Skipped: ${skipped}\n  Failed:  ${failed}`);
  } finally {
    await p.query('DELETE FROM account_sessions WHERE token = $1', [token]);
    console.log('Cleaned up temp session.');
    await p.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
