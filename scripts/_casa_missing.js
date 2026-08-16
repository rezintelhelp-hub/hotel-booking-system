require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const ids = [500713, 521723, 521749, 676941];
  const r = await pg.query(`
    SELECT id, guest_first_name, guest_last_name, arrival_date, grand_total, balance_amount,
           status, payment_status, payment_method, square_customer_id, square_card_id,
           (SELECT string_agg(pt.payment_gateway || ':' || pt.status || ':' || pt.transaction_type || ':' || pt.amount, ' | ') FROM payment_transactions pt WHERE pt.booking_id = bookings.id) AS all_tx
      FROM bookings WHERE id = ANY($1::int[]) ORDER BY id
  `, [ids]);
  console.table(r.rows);
  await pg.end();
})();
