// READ-ONLY sweep — RESCOPED to GAS-direct bookings only.
// Filters:
//   - booking_source IN ('direct','gas','website','manual') OR NULL (older
//     direct bookings before source was populated)
//   - stripe_payment_intent_id IS NOT NULL (real GAS-owned Stripe charge)
//   - status = 'confirmed'
//   - beds24_booking_id IS NOT NULL (Beds24-connected account)
//   - created in last 14 days
// Compares GAS payment_transactions sum vs Beds24 invoiceItems sum.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
const _tokenCache = {};
async function getToken(accountId) {
  if (_tokenCache[accountId] !== undefined) return _tokenCache[accountId];
  const r = await p.query(
    "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
    [accountId]);
  if (!r.rows[0]?.refresh_token) { _tokenCache[accountId] = null; return null; }
  try {
    const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
    _tokenCache[accountId] = tk.data?.token || null;
  } catch (_) { _tokenCache[accountId] = null; }
  return _tokenCache[accountId];
}

(async () => {
  const bks = await p.query(`
    SELECT b.id, b.beds24_booking_id, b.grand_total, b.status, b.created_at,
           b.booking_source, b.stripe_payment_intent_id,
           p.account_id, a.name AS acct_name,
           b.guest_first_name || ' ' || b.guest_last_name AS guest
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      LEFT JOIN accounts a ON a.id = p.account_id
     WHERE b.beds24_booking_id IS NOT NULL
       AND b.status = 'confirmed'
       AND b.stripe_payment_intent_id IS NOT NULL
       AND (b.booking_source IS NULL OR LOWER(b.booking_source) IN ('direct','gas','website','manual','gas-direct'))
       AND b.created_at > NOW() - INTERVAL '14 days'
     ORDER BY b.created_at DESC`);
  console.log(`Scanning ${bks.rows.length} GAS-direct Stripe-charged Beds24-connected bookings from last 14 days\n`);

  const issues = [];
  for (const bk of bks.rows) {
    const token = await getToken(bk.account_id);
    if (!token) continue;
    const g = await p.query(`SELECT COALESCE(SUM(amount::numeric), 0) AS s FROM payment_transactions WHERE booking_id = $1 AND transaction_type IN ('deposit','balance','charge','capture','payment') AND status IN ('completed','succeeded') AND payment_gateway = 'stripe'`, [bk.id]);
    const gasSum = Math.round(parseFloat(g.rows[0].s) * 100) / 100;
    let b24Sum = 0, lineCount = 0;
    try {
      const rd = await axios.get('https://beds24.com/api/v2/bookings', { params: { id: bk.beds24_booking_id, includeInvoiceItems: 'true' }, headers: { token } });
      const b24 = (rd.data?.data || rd.data?.bookings || [])[0];
      const pays = (b24?.invoiceItems || []).filter(i => i.type === 'payment');
      b24Sum = Math.round(pays.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) * 100) / 100;
      lineCount = pays.length;
    } catch (e) {
      console.log(`  B${bk.id} err: ${e.response?.status || e.message}`);
      await _sleep(1500);
      continue;
    }
    const diff = Math.round((gasSum - b24Sum) * 100) / 100;
    const flag = diff !== 0 ? '⚠️' : '✓';
    if (diff !== 0) issues.push({ id: bk.id, b24: bk.beds24_booking_id, acct: bk.acct_name, guest: bk.guest, src: bk.booking_source, gasSum, b24Sum, diff, lineCount });
    console.log(`${flag} B${bk.id} b24=${bk.beds24_booking_id} src=${bk.booking_source||'null'} ${bk.acct_name} ${bk.guest}: GAS £${gasSum} · Beds24 £${b24Sum} (${lineCount}) · diff £${diff}`);
    await _sleep(600);
  }
  console.log(`\n=== Summary: ${issues.length} mismatches out of ${bks.rows.length} bookings ===`);
  for (const i of issues) console.log(`  B${i.id} (b24=${i.b24}) src=${i.src||'null'} ${i.acct} ${i.guest}: GAS £${i.gasSum} vs Beds24 £${i.b24Sum} (${i.lineCount}) — diff £${i.diff}`);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
