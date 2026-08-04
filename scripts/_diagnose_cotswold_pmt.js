// Diagnose Beds24 payment state for the two Cotswold bookings Amy Harding.
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const IDS = [564245, 564313];

async function getToken(accountId) {
  const r = await p.query(
    "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
    [accountId]);
  if (!r.rows[0]?.refresh_token) return null;
  const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
  return tk.data?.token || null;
}

(async () => {
  for (const id of IDS) {
    const bk = await p.query(`SELECT b.id, b.beds24_booking_id, b.currency, p.account_id FROM bookings b LEFT JOIN properties p ON p.id = b.property_id WHERE b.id = $1 LIMIT 1`, [id]);
    const row = bk.rows[0];
    if (!row) { console.log(`B${id} not found`); continue; }
    console.log(`\n=== B${id} (beds24=${row.beds24_booking_id}) acct=${row.account_id} ===`);
    const token = await getToken(row.account_id);
    if (!token) { console.log('  no token'); continue; }
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        params: { id: row.beds24_booking_id, includeInvoiceItems: 'true' },
        headers: { token }
      });
      const b24 = (resp.data?.data || resp.data?.bookings || [])[0];
      if (!b24) { console.log('  beds24 returned no booking'); continue; }
      const items = b24.invoiceItems || [];
      const pays = items.filter(i => i.type === 'payment');
      const charges = items.filter(i => i.type !== 'payment');
      console.log(`  Charges (${charges.length}):`);
      for (const c of charges) console.log(`    id=${c.id} type=${c.type} amount=${c.amount} desc="${c.description}"`);
      console.log(`  Payment lines (${pays.length}):`);
      for (const pmt of pays) console.log(`    id=${pmt.id} amount=${pmt.amount} desc="${pmt.description}"`);
    } catch (e) {
      console.log('  Beds24 API error:', e.response?.data ? JSON.stringify(e.response.data).slice(0,200) : e.message);
    }
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
