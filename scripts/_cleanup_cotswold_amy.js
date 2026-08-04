// Cotswold Amy Harding cleanup — self-contained (no server auth).
//   B564245 (b24=90887433): push missing £791 line via the same logic
//     syncBeds24PaymentItem uses, inline.
//   B564313 (b24=90887847): delete the un-tagged "Deposit via GAS" £911
//     line (Beds24 item id 166485907), leaving the pi-tagged one.
// Idempotent — safe to re-run.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getToken(accountId) {
  const r = await p.query(
    "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
    [accountId]);
  if (!r.rows[0]?.refresh_token) return null;
  const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
  return tk.data?.token || null;
}

async function readInvoiceItems(token, beds24Id) {
  const rd = await axios.get('https://beds24.com/api/v2/bookings', { params: { id: beds24Id, includeInvoiceItems: 'true' }, headers: { token } });
  const b24 = (rd.data?.data || rd.data?.bookings || [])[0];
  return (b24?.invoiceItems || []);
}

(async () => {
  const acctId = 95;
  const token = await getToken(acctId);
  if (!token) { console.log('No Beds24 token — aborting'); process.exit(1); }

  // === (2) DELETE duplicate on B564313 ===
  const B24_313 = 90887847;
  const DUPE_ITEM_ID = 166485907; // "Deposit via GAS" £911 — the un-tagged one
  console.log(`\n[cleanup] Deleting Beds24 invoiceItem id=${DUPE_ITEM_ID} on booking ${B24_313}`);
  // Beds24 v2 deletes items via _delete flag in the invoiceItems array
  try {
    const payload = [{ id: B24_313, invoiceItems: [{ id: DUPE_ITEM_ID, _delete: true }] }];
    const resp = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers: { token } });
    console.log('  response:', JSON.stringify(resp.data).slice(0, 400));
  } catch (e) {
    console.log('  _delete failed:', e.response?.data ? JSON.stringify(e.response.data).slice(0,300) : e.message);
    // Fallback: try the 'delete' property
    try {
      const payload2 = [{ id: B24_313, invoiceItems: [{ id: DUPE_ITEM_ID, delete: true }] }];
      const resp2 = await axios.post('https://beds24.com/api/v2/bookings', payload2, { headers: { token } });
      console.log('  fallback response:', JSON.stringify(resp2.data).slice(0, 400));
    } catch (e2) {
      console.log('  fallback also failed:', e2.response?.data ? JSON.stringify(e2.response.data).slice(0,300) : e2.message);
    }
  }
  const post313 = (await readInvoiceItems(token, B24_313)).filter(i => i.type === 'payment');
  console.log(`  Beds24 payment lines after: ${post313.length}`);
  for (const p of post313) console.log(`    id=${p.id} £${p.amount} "${p.description}"`);

  // === (1) BACKFILL missing payment on B564245 ===
  const B24_245 = 90887433;
  const AMT_245 = 791.00;
  const PI_245 = 'pi_3U0NWzJyYJyte3iL0TpJwwwj';
  console.log(`\n[cleanup] Backfilling £${AMT_245} payment line on B564245 (b24=${B24_245})`);
  // Check first — sync helper is idempotent, don't double-push
  const existing = (await readInvoiceItems(token, B24_245)).filter(i => i.type === 'payment');
  console.log(`  Existing payment lines: ${existing.length}`);
  for (const p of existing) console.log(`    id=${p.id} £${p.amount} "${p.description}"`);
  const hasIt = existing.some(p => (p.description || '').includes(PI_245) || (Math.abs(parseFloat(p.amount) - AMT_245) < 0.01 && /stripe|deposit via gas|payment via gas/i.test(p.description || '')));
  if (hasIt) {
    console.log('  already has a matching payment — skipping');
  } else {
    try {
      const desc = `Payment via Stripe ${PI_245}`;
      const payload = [{ id: B24_245, invoiceItems: [{ type: 'payment', description: desc, amount: AMT_245 }] }];
      const resp = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers: { token } });
      console.log('  push response:', JSON.stringify(resp.data).slice(0, 400));
    } catch (e) {
      console.log('  push failed:', e.response?.data ? JSON.stringify(e.response.data).slice(0,300) : e.message);
    }
  }
  const post245 = (await readInvoiceItems(token, B24_245)).filter(i => i.type === 'payment');
  console.log(`  Beds24 payment lines after: ${post245.length}`);
  for (const p of post245) console.log(`    id=${p.id} £${p.amount} "${p.description}"`);

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
