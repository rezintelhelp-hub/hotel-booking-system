require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const ids = [361667, 333012, 402774, 282952];
  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || b.guest_last_name AS guest,
           b.grand_total, b.deposit_paid, b.balance_amount, b.payment_status,
           b.square_payment_id, b.square_location_id,
           (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.booking_id = b.id) AS tx_count
      FROM bookings b WHERE b.id = ANY($1::int[]) ORDER BY b.id
  `, [ids]);
  console.log('id     | guest              | total  | dep_paid | bal   | pmt_status | square_payment_id                 | tx rows');
  console.log('-------|--------------------|--------|----------|-------|------------|-----------------------------------|--------');
  for (const row of r.rows) {
    console.log(`${row.id} | ${String(row.guest).padEnd(18)} | $${String(row.grand_total).padStart(6)} | $${String(row.deposit_paid || '0').padStart(7)} | $${String(row.balance_amount).padStart(5)} | ${String(row.payment_status).padEnd(10)} | ${String(row.square_payment_id || '(null)').padEnd(33)} | ${row.tx_count}`);
  }
  await pg.end();
})();
