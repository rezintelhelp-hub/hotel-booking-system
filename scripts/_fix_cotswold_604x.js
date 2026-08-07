// One-shot fix: push the missing Stripe deposit lines to Beds24 for
// GAS bookings 604123 and 604095 (Fran Melville, Cotswolds acct 95).
// Mirrors syncBeds24PaymentItem: 1 GET to confirm still missing, then
// POST one payment line per unmatched GAS transaction with pi_id in
// the description so future runs match definitively.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const IDS = [604123, 604095];

const _tokenCache = new Map();
async function getToken(accountId) {
  if (_tokenCache.has(accountId)) return _tokenCache.get(accountId);
  const r = await p.query(
    `SELECT refresh_token FROM gas_sync_connections
      WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace')
        AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1`, [accountId]);
  if (!r.rows[0]?.refresh_token) throw new Error('no refresh_token');
  const tk = await axios.get('https://beds24.com/api/v2/authentication/token',
    { headers: { refreshToken: r.rows[0].refresh_token } });
  _tokenCache.set(accountId, tk.data?.token);
  return tk.data?.token;
}

(async () => {
  for (const id of IDS) {
    console.log(`\n═══ GAS B${id} ═══`);
    const bk = await p.query(`
      SELECT b.id, b.beds24_booking_id, p.account_id, p.beds24_property_id
        FROM bookings b JOIN properties p ON p.id = b.property_id
       WHERE b.id = $1`, [id]);
    if (!bk.rows[0]) { console.log('  ❌ not found'); continue; }
    const { beds24_booking_id, account_id } = bk.rows[0];
    if (!beds24_booking_id) { console.log('  ⚠ no beds24_booking_id — skipping'); continue; }

    const gasTx = await p.query(`
      SELECT id, amount::numeric AS amount, gateway_transaction_id
        FROM payment_transactions
       WHERE booking_id = $1
         AND transaction_type IN ('deposit','balance','charge','capture','payment')
         AND status IN ('completed','succeeded')
         AND amount::numeric > 0.005
       ORDER BY created_at`, [id]);
    console.log(`  GAS transactions: ${gasTx.rows.length}`);
    if (!gasTx.rows.length) { console.log('  ⚠ no GAS payments'); continue; }

    const token = await getToken(account_id);
    const readResp = await axios.get('https://beds24.com/api/v2/bookings', {
      params: { id: beds24_booking_id, includeInvoiceItems: 'true' }, headers: { token }
    });
    const b24 = (readResp.data?.data || readResp.data?.bookings || [])[0];
    const existingPayments = (b24?.invoiceItems || []).filter(i => i.type === 'payment');
    console.log(`  Beds24 existing payments: ${existingPayments.length}`);

    for (const tx of gasTx.rows) {
      const amt = Math.round(parseFloat(tx.amount) * 100) / 100;
      const piId = String(tx.gateway_transaction_id || '').trim();
      const alreadyThere = existingPayments.find(x =>
        (piId && (x.description || '').includes(piId)) ||
        (Math.round(parseFloat(x.amount || 0) * 100) / 100 === amt
          && /stripe|deposit via gas|payment via gas/i.test(x.description || ''))
      );
      if (alreadyThere) { console.log(`  ↺ tx=${tx.id} already synced (beds24 item ${alreadyThere.id})`); continue; }
      const desc = piId ? `Payment via Stripe ${piId}` : 'Payment via Stripe';
      const payload = [{ id: parseInt(beds24_booking_id), invoiceItems: [{ type: 'payment', description: desc, amount: amt }] }];
      try {
        const resp = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers: { token } });
        const ok = Array.isArray(resp.data) && resp.data[0]?.success;
        const newId = resp.data?.[0]?.new?.invoiceItems?.[0]?.id;
        console.log(`  ${ok ? '✓' : '✗'} pushed £${amt}  desc="${desc}"  beds24_item=${newId || '-'}`);
      } catch (e) {
        console.log(`  ✗ push failed: ${e.response?.status} ${e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message}`);
      }
      await new Promise(r => setTimeout(r, 800));
    }
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
