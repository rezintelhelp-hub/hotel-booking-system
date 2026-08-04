const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Check bookings columns first
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name IN ('booking_source','source','origin','channel','channex_booking_id','beds24_booking_id') ORDER BY column_name`);
  console.log('Source cols:', cols.rows.map(r=>r.column_name).join(', '));
  const b = await p.query(`SELECT id, guest_first_name, guest_last_name, booking_source, channex_booking_id, beds24_booking_id, grand_total, stripe_payment_intent_id, created_at, arrival_date FROM bookings WHERE id = 553314`);
  console.log('\nB553314:', JSON.stringify(b.rows[0], null, 2));
  const pt = await p.query(`SELECT id, transaction_type, amount, currency, status, gateway_transaction_id, payment_gateway, created_at FROM payment_transactions WHERE booking_id = 553314 ORDER BY id`);
  console.log('\nPayment transactions:', JSON.stringify(pt.rows, null, 2));
  await p.end();
})();
