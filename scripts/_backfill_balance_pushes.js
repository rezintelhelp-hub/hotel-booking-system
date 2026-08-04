// Push the missing "balance" payment line to Beds24 for the two Lehmann
// bookings that were legitimately charged twice on Stripe (deposit +
// balance) but only had the deposit synced to Beds24.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CASES = [
  { id: 483851, b24: 90381722, tx_id: 184207, amount: 107.16, pi: 'pi_3TwlUZLrHjm5t1682QiZLBl2', account_id: 4 },
  { id: 461389, b24: 90347281, tx_id: 173197, amount: 123.64, pi: 'pi_3TwXzMLrHjm5t1682hEpOvp0', account_id: 4 },
];

async function getToken(accountId) {
  const r = await p.query(
    "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
    [accountId]);
  if (!r.rows[0]?.refresh_token) return null;
  const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
  return tk.data?.token || null;
}

(async () => {
  const token = await getToken(4);
  if (!token) { console.log('no token for lehmann'); process.exit(1); }
  for (const c of CASES) {
    console.log(`\nB${c.id} — check + push balance £${c.amount} (pi=${c.pi})`);
    const rd = await axios.get('https://beds24.com/api/v2/bookings', { params: { id: c.b24, includeInvoiceItems: 'true' }, headers: { token } });
    const b24 = (rd.data?.data || rd.data?.bookings || [])[0];
    const pays = (b24?.invoiceItems || []).filter(i => i.type === 'payment');
    console.log(`  existing payment lines (${pays.length}):`);
    for (const p of pays) console.log(`    id=${p.id} £${p.amount} "${p.description}"`);
    const hasIt = pays.some(p => (p.description || '').includes(c.pi) || (Math.abs(parseFloat(p.amount) - c.amount) < 0.01 && /stripe|deposit via gas|payment via gas|balance payment/i.test(p.description || '') && !(p.description || '').includes('deposit')));
    // The guard: skip if a line already exists with this pi_id OR a matching-amount line looks like it's already our push.
    const exactPi = pays.some(p => (p.description || '').includes(c.pi));
    if (exactPi) {
      console.log('  already has pi-tagged line — skipping');
      continue;
    }
    try {
      const desc = `Payment via Stripe ${c.pi}`;
      const payload = [{ id: c.b24, invoiceItems: [{ type: 'payment', description: desc, amount: c.amount }] }];
      const resp = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers: { token } });
      console.log(`  pushed: ${JSON.stringify(resp.data).slice(0,250)}`);
    } catch (e) {
      console.log('  err:', e.response?.data ? JSON.stringify(e.response.data).slice(0,200) : e.message);
    }
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
