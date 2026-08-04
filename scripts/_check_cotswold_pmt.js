const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Find bookings by beds24_booking_id
  const b = await p.query(`SELECT id, guest_first_name, guest_last_name, beds24_booking_id, grand_total, deposit_amount, stripe_payment_intent_id, status FROM bookings WHERE beds24_booking_id IN ('90887847','90887433') OR id::text IN ('90887847','90887433')`);
  console.log('Bookings:', JSON.stringify(b.rows, null, 2));
  for (const bk of b.rows) {
    // Payment transactions
    const pt = await p.query(`SELECT id, transaction_type, amount, currency, status, gateway_transaction_id, payment_gateway, created_at FROM payment_transactions WHERE booking_id = $1 ORDER BY id`, [bk.id]);
    console.log(`\nB${bk.id} payment_transactions (${pt.rows.length}):`, JSON.stringify(pt.rows, null, 2));
  }
  await p.end();
})();
