// Why didn't runSquareAudit catch Julie/Kate/Alex? Check the fields the
// query relies on: payment_method='square' AND square_payment_id IS NOT NULL
// AND (grand_total - deposit_amount) > 0.01.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const r = await pg.query(`
    SELECT id, guest_first_name, guest_last_name, arrival_date,
           grand_total, deposit_amount, balance_amount,
           payment_method, payment_status,
           square_payment_id, square_customer_id, square_card_id,
           (grand_total::numeric - COALESCE(deposit_amount::numeric, 0)) AS q1_balance,
           CASE
             WHEN payment_method = 'square' AND square_payment_id IS NOT NULL
                  AND square_card_id IS NULL AND arrival_date >= CURRENT_DATE
                  AND status IN ('confirmed','pending')
                  AND (COALESCE(grand_total::numeric,0) - COALESCE(deposit_amount::numeric,0)) > 0.01
             THEN 'YES-caught' ELSE 'NO-missed' END AS q1_fires
      FROM bookings
     WHERE id IN (657262, 567420, 667062, 499860, 500713, 521723, 521749, 676941, 218239, 402829)
     ORDER BY id
  `);
  console.log('booking_id | pm       | sq_payment_id     | sq_customer_id | sq_card | grand | deposit | balance | q1_bal | q1_fires');
  console.log('-----------|----------|-------------------|----------------|---------|-------|---------|---------|--------|-----------');
  for (const row of r.rows) {
    console.log(
      `${String(row.id).padEnd(10)} | ${String(row.payment_method || '(null)').padEnd(8)} | ${String(row.square_payment_id || '(null)').padEnd(17).slice(0,17)} | ${String(row.square_customer_id || '(null)').padEnd(14).slice(0,14)} | ${row.square_card_id ? 'yes' : '(null)'.padEnd(7)} | ${String(row.grand_total).padEnd(5)} | ${String(row.deposit_amount || '(null)').padEnd(7)} | ${String(row.balance_amount || '(null)').padEnd(7)} | ${String(row.q1_balance).padEnd(6)} | ${row.q1_fires}`
    );
  }
  await pg.end();
})();
