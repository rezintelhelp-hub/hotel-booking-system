// (1) Verify 2 under-count bookings against Stripe — 1 charge or 2?
// (2) Fix 7 clean doubles — delete the un-tagged "Deposit via GAS" line so
//     only the pi-tagged "Payment via Stripe" remains.
// Idempotent. NEVER deletes anything unless the description is exactly the
// un-tagged legacy pattern AND another line exists with the same amount +
// pi-id in description.
require('dotenv').config();
const axios = require('axios');
const Stripe = require('stripe');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UNDER = [
  { id: 483851, name: 'Brianne Murphy' },
  { id: 461389, name: 'Paul Olson' },
];
const DOUBLES = [
  { id: 557737, name: 'Cynthia Gabrielides #557737' },
  { id: 557712, name: 'Cynthia Gabrielides #557712' },
  { id: 556652, name: 'Keith Brown' },
  { id: 552765, name: 'Giorgio Chiri' },
  { id: 547544, name: 'Cynthia Gabrielides #547544' },
  { id: 541607, name: 'Jamie Grunwald' },
];

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
async function bookingRow(id) {
  const r = await p.query(`SELECT b.id, b.beds24_booking_id, b.grand_total, b.stripe_payment_intent_id, b.property_id, p.account_id, pc.credentials->>'secret_key' AS sk FROM bookings b LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN payment_configurations pc ON pc.property_id = b.property_id AND pc.provider='stripe' AND pc.is_enabled=true WHERE b.id = $1 LIMIT 1`, [id]);
  return r.rows[0];
}
async function readB24(token, b24id) {
  const rd = await axios.get('https://beds24.com/api/v2/bookings', { params: { id: b24id, includeInvoiceItems: 'true' }, headers: { token } });
  const b24 = (rd.data?.data || rd.data?.bookings || [])[0];
  return (b24?.invoiceItems || []);
}

(async () => {
  console.log('=== (1) STRIPE VERIFY — under-count cases ===\n');
  for (const c of UNDER) {
    const row = await bookingRow(c.id);
    console.log(`B${c.id} ${c.name} — pi=${row.stripe_payment_intent_id} — GAS grand £${row.grand_total}`);
    // GAS payment_transactions
    const pt = await p.query(`SELECT id, transaction_type, amount, gateway_transaction_id, status FROM payment_transactions WHERE booking_id = $1 ORDER BY id`, [c.id]);
    console.log(`  GAS ledger (${pt.rows.length}):`);
    for (const t of pt.rows) console.log(`    tx${t.id} ${t.transaction_type} £${t.amount} status=${t.status} gw=${t.gateway_transaction_id}`);
    if (!row.sk) { console.log('  no per-property stripe secret — skipping stripe check'); continue; }
    const stripe = new Stripe(row.sk);
    try {
      const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
      console.log(`  Stripe PI status=${pi.status} amount=£${(pi.amount/100).toFixed(2)} customer=${pi.customer}`);
      if (pi.customer) {
        const list = await stripe.paymentIntents.list({ customer: pi.customer, limit: 20 });
        console.log(`  Customer has ${list.data.length} PIs total`);
        for (const o of list.data) console.log(`    ${o.id} £${(o.amount/100).toFixed(2)} status=${o.status}`);
      }
    } catch (e) { console.log('  stripe err:', e.message); }
    console.log('');
    await _sleep(500);
  }

  console.log('\n=== (2) DELETE UN-TAGGED DUPES ===\n');
  for (const c of DOUBLES) {
    const row = await bookingRow(c.id);
    const token = await getToken(row.account_id);
    if (!token) { console.log(`B${c.id}: no token`); continue; }
    const items = await readB24(token, row.beds24_booking_id);
    const pays = items.filter(i => i.type === 'payment');
    const pi = row.stripe_payment_intent_id;
    // Guard: only delete when we have BOTH an un-tagged legacy line AND a
    // pi-tagged line with the same amount. If either is missing, skip.
    const legacy = pays.find(x => /^(deposit|payment)\s+via\s+gas$/i.test((x.description || '').trim()));
    const tagged = pi ? pays.find(x => (x.description || '').includes(pi)) : null;
    if (!legacy || !tagged) {
      console.log(`B${c.id} ${c.name}: skip — legacy=${!!legacy} tagged=${!!tagged} (guard tripped, ${pays.length} lines)`);
      for (const p of pays) console.log(`    id=${p.id} £${p.amount} "${p.description}"`);
      continue;
    }
    if (Math.abs(parseFloat(legacy.amount) - parseFloat(tagged.amount)) > 0.01) {
      console.log(`B${c.id} ${c.name}: skip — legacy £${legacy.amount} != tagged £${tagged.amount}`);
      continue;
    }
    console.log(`B${c.id} ${c.name}: deleting legacy item id=${legacy.id} "${legacy.description}" £${legacy.amount}`);
    try {
      const payload = [{ id: row.beds24_booking_id, invoiceItems: [{ id: legacy.id, _delete: true }] }];
      const resp = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers: { token } });
      console.log(`  response: ${JSON.stringify(resp.data).slice(0, 200)}`);
    } catch (e) {
      console.log(`  err: ${e.response?.data ? JSON.stringify(e.response.data).slice(0,200) : e.message}`);
    }
    await _sleep(700);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
