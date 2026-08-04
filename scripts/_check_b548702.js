require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function getToken(accountId) {
  const r = await p.query("SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1", [accountId]);
  if (!r.rows[0]?.refresh_token) return null;
  const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
  return tk.data?.token || null;
}
(async () => {
  const bk = await p.query(`SELECT b.id, b.guest_first_name, b.guest_last_name, b.grand_total, b.subtotal, b.accommodation_price, b.discount_amount, b.tax_amount, b.currency, b.beds24_booking_id, p.account_id FROM bookings b LEFT JOIN properties p ON p.id = b.property_id WHERE b.id = 548702`);
  console.log('B548702 (GAS):', JSON.stringify(bk.rows[0], null, 2));
  // Extras
  const ex = await p.query(`SELECT * FROM booking_extras WHERE booking_id = 548702 ORDER BY id`);
  console.log('\nbooking_extras:', JSON.stringify(ex.rows, null, 2));
  // Taxes
  const tx = { rows: [] }; //
  console.log('\nbooking_taxes:', JSON.stringify(tx.rows, null, 2));
  // Payment tx
  const pt = await p.query(`SELECT id, transaction_type, amount, status, gateway_transaction_id FROM payment_transactions WHERE booking_id = 548702 ORDER BY id`);
  console.log('\npayment_transactions:', JSON.stringify(pt.rows, null, 2));
  // Beds24 side
  const token = await getToken(bk.rows[0].account_id);
  if (token) {
    const rd = await axios.get('https://beds24.com/api/v2/bookings', { params: { id: bk.rows[0].beds24_booking_id, includeInvoiceItems: 'true' }, headers: { token } });
    const b24 = (rd.data?.data || rd.data?.bookings || [])[0];
    console.log('\nBeds24 top-level fields:', JSON.stringify({ price: b24?.price, taxCode: b24?.taxCode, apiSourceId: b24?.apiSourceId, status: b24?.status }, null, 2));
    console.log('\nBeds24 invoiceItems:');
    for (const i of (b24?.invoiceItems || [])) console.log(`  id=${i.id} type=${i.type} amount=${i.amount} desc="${i.description}"`);
  }
  await p.end();
})();
