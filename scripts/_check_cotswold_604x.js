// Check Cotswolds bookings 604123 + 604095 — payment landed in GAS but
// nothing posted to Beds24. Cotswolds uses its own OAuth (Style B), not
// Steve's master token. This dumps: GAS booking state, payment_transactions
// rows, sync_errors, then hits Beds24 with the account's own token to
// list invoice items so we can see the delta.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const IDS = [604123, 604095];

async function getAccountToken(accountId) {
  const r = await p.query(
    `SELECT id, adapter_code, refresh_token, updated_at
       FROM gas_sync_connections
      WHERE account_id = $1
        AND adapter_code IN ('beds24','beds24-marketplace')
        AND refresh_token IS NOT NULL
      ORDER BY id DESC LIMIT 1`, [accountId]);
  const row = r.rows[0];
  if (!row?.refresh_token) return { ok: false, err: 'no refresh_token on gas_sync_connections' };
  try {
    const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: row.refresh_token } });
    return { ok: true, token: tk.data?.token, adapter: row.adapter_code };
  } catch (e) {
    return { ok: false, err: 'token exchange failed: ' + (e.response?.data ? JSON.stringify(e.response.data) : e.message) };
  }
}

const _tokenCache = new Map();
async function getCachedToken(accountId) {
  if (_tokenCache.has(accountId)) return _tokenCache.get(accountId);
  const t = await getAccountToken(accountId);
  _tokenCache.set(accountId, t);
  return t;
}

(async () => {
  for (const id of IDS) {
    console.log(`\n═══════════ GAS B${id} ═══════════`);
    const bk = await p.query(`
      SELECT b.id, b.beds24_booking_id, b.currency, b.grand_total, b.balance_amount, b.sync_errors,
             b.guest_first_name AS first_name, b.guest_last_name AS last_name, b.status, b.created_at,
             p.account_id, p.beds24_property_id, p.name AS prop_name
        FROM bookings b
        LEFT JOIN properties p ON p.id = b.property_id
       WHERE b.id = $1 LIMIT 1`, [id]);
    const row = bk.rows[0];
    if (!row) { console.log('  ❌ not found in GAS'); continue; }
    console.log(`  Guest: ${row.first_name} ${row.last_name}  status=${row.status}  currency=${row.currency}`);
    console.log(`  Property: ${row.prop_name}  acct=${row.account_id}  beds24_prop=${row.beds24_property_id}`);
    console.log(`  beds24_booking_id: ${row.beds24_booking_id || '(none)'}`);
    console.log(`  grand_total=${row.grand_total}  balance_amount=${row.balance_amount}`);
    if (row.sync_errors) console.log(`  ⚠ sync_errors: ${JSON.stringify(row.sync_errors).slice(0, 400)}`);

    const pt = await p.query(`
      SELECT id, transaction_type, amount, status, payment_gateway, gateway_transaction_id,
             description, created_at
        FROM payment_transactions
       WHERE booking_id = $1
       ORDER BY id ASC`, [id]);
    console.log(`  ── payment_transactions (${pt.rows.length}) ──`);
    for (const t of pt.rows) {
      console.log(`    id=${t.id} type=${t.transaction_type} amt=${t.amount} status=${t.status} gw=${t.payment_gateway} pi=${t.gateway_transaction_id || '-'} "${(t.description||'').slice(0,60)}"`);
    }

    if (!row.beds24_booking_id) { console.log('  ↳ no beds24_booking_id — booking never propagated to Beds24; nothing to reconcile there'); continue; }

    const tk = await getCachedToken(row.account_id);
    if (!tk.ok) { console.log(`  ❌ ${tk.err}`); continue; }
    console.log(`  ✓ got account token via ${tk.adapter}`);
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        params: { id: row.beds24_booking_id, includeInvoiceItems: 'true' },
        headers: { token: tk.token }
      });
      const b24 = (resp.data?.data || resp.data?.bookings || [])[0];
      if (!b24) { console.log('  ⚠ Beds24 returned no booking for that id'); continue; }
      const items = b24.invoiceItems || [];
      const pays = items.filter(i => i.type === 'payment');
      const charges = items.filter(i => i.type !== 'payment');
      console.log(`  ── Beds24 charges (${charges.length}) ──`);
      for (const c of charges) console.log(`    id=${c.id} type=${c.type} amt=${c.amount} "${(c.description||'').slice(0,60)}"`);
      console.log(`  ── Beds24 payments (${pays.length}) ──`);
      for (const pmt of pays) console.log(`    id=${pmt.id} amt=${pmt.amount} "${(pmt.description||'').slice(0,60)}"`);
      const totalPaid = pays.reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      const gasPaid = pt.rows.filter(t => t.status === 'succeeded' && (t.transaction_type === 'payment' || t.transaction_type === 'charge')).reduce((s, x) => s + parseFloat(x.amount || 0), 0);
      console.log(`  Δ  Beds24 paid=${totalPaid.toFixed(2)}   GAS paid=${gasPaid.toFixed(2)}   missing=${(gasPaid - totalPaid).toFixed(2)}`);
    } catch (e) {
      console.log('  ❌ Beds24 API:', e.response?.status, e.response?.data ? JSON.stringify(e.response.data).slice(0,300) : e.message);
    }
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
