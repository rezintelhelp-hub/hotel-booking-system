// One-shot heal: push booking 1199442's Stripe deposit onto Beds24 booking
// 93120103 (Cotswold Retreats / Sagar Taank £777). Uses native fetch to
// avoid the axios ESM dance.

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const BOOKING_ID = 1199442;

async function main() {
  const b = await pool.query(`
    SELECT b.id, b.beds24_booking_id, b.currency,
           p.account_id, p.beds24_property_id
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE b.id = $1`, [BOOKING_ID]);
  const row = b.rows[0];
  if (!row) throw new Error('booking not found');
  console.log('booking:', row);

  const gasTx = await pool.query(`
    SELECT id, amount::numeric AS amount, gateway_transaction_id, payment_gateway, transaction_type
      FROM payment_transactions
     WHERE booking_id = $1
       AND (transaction_type IN ('deposit','balance','charge','capture','payment') OR transaction_type LIKE 'tier_%')
       AND status IN ('completed','succeeded')
       AND amount::numeric > 0.005
       AND (payment_gateway IS NULL OR payment_gateway NOT IN ('beds24_import','channex_import'))
     ORDER BY created_at`, [BOOKING_ID]);
  console.log('GAS transactions to sync:', gasTx.rows.length);
  gasTx.rows.forEach(t => console.log(' - ', t));

  const conn = await pool.query(
    "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
    [row.account_id]);
  if (!conn.rows[0]?.refresh_token) throw new Error('no refresh token for account ' + row.account_id);

  const tkResp = await fetch('https://beds24.com/api/v2/authentication/token', {
    method: 'GET',
    headers: { refreshToken: conn.rows[0].refresh_token }
  });
  const tkData = await tkResp.json();
  const token = tkData?.token;
  if (!token) throw new Error('token exchange failed: ' + JSON.stringify(tkData).slice(0, 300));
  console.log('access token acquired (length', token.length + ')');

  const readResp = await fetch(`https://beds24.com/api/v2/bookings?id=${row.beds24_booking_id}&includeInvoiceItems=true`, {
    headers: { token }
  });
  const readData = await readResp.json();
  const beds24Booking = (readData?.data || readData?.bookings || [])[0];
  if (!beds24Booking) throw new Error('beds24 booking not found: ' + JSON.stringify(readData).slice(0, 300));
  const existingPayments = (beds24Booking.invoiceItems || []).filter(i => i.type === 'payment');
  console.log('existing payments on beds24:', existingPayments.length);
  existingPayments.forEach(p => console.log(' - ', { id: p.id, amount: p.amount, description: p.description }));

  const headers = { 'Content-Type': 'application/json', token };
  const claimed = new Set();
  for (const tx of gasTx.rows) {
    const amt = Math.round(parseFloat(tx.amount) * 100) / 100;
    const piId = String(tx.gateway_transaction_id || '').trim();

    let match = piId ? existingPayments.find(p =>
      !claimed.has(p.id) && (p.description || '').includes(piId)
    ) : null;
    if (!match) {
      const legacyRe = /stripe|deposit via gas|payment via gas|bank transfer\s*\(gas\)|balance payment/i;
      match = existingPayments.find(p =>
        !claimed.has(p.id)
        && Math.round((parseFloat(p.amount) || 0) * 100) / 100 === amt
        && legacyRe.test(p.description || '')
      );
    }
    if (match) {
      claimed.add(match.id);
      console.log('SKIP tx', tx.id, '- matched beds24 item', match.id);
      continue;
    }

    const desc = piId ? `Payment via Stripe ${piId}` : 'Payment via Stripe';
    const payload = [{ id: parseInt(row.beds24_booking_id), invoiceItems: [{ type: 'payment', description: desc, amount: amt }] }];
    const pushResp = await fetch('https://beds24.com/api/v2/bookings', {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    const pushData = await pushResp.json();
    const ok = Array.isArray(pushData) && pushData[0]?.success;
    const newId = pushData?.[0]?.new?.invoiceItems?.[0]?.id;
    console.log('PUSH tx', tx.id, '£' + amt, '-> beds24 item', newId, 'ok=' + ok);
    if (!ok) console.log('  response:', JSON.stringify(pushData).slice(0, 400));
  }

  await pool.query(`UPDATE bookings SET beds24_last_payment_sync_at = NOW() WHERE id = $1`, [BOOKING_ID]);
  console.log('sync marker updated');
}

main().catch(e => {
  console.error('HEAL FAILED:', e.message);
  process.exit(1);
}).finally(() => pool.end());
