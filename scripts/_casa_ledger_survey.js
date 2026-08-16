// Survey the ledger for all 14 of Steve's Casa Magnolia bookings.
// Shows exactly which ones have a real Square payment on the booking
// but no payment_transactions row (the SQUARE_LEDGER_MISSING pattern
// that hides paid money from Payment Ops).
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const ids = [361667, 333012, 500713, 657262, 676941, 521749, 521723, 402774, 402829, 282952, 567420, 667062, 499860, 432238];
  const r = await pg.query(`
    SELECT b.id,
           b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.grand_total, b.deposit_amount, b.deposit_paid, b.balance_amount,
           b.payment_status, b.payment_method, b.currency,
           b.square_payment_id, b.square_customer_id, b.square_card_id,
           b.square_location_id,
           p.account_id,
           (SELECT COUNT(*) FROM payment_transactions pt
             WHERE pt.booking_id = b.id) AS tx_all,
           (SELECT COUNT(*) FROM payment_transactions pt
             WHERE pt.booking_id = b.id
               AND pt.gateway_transaction_id = b.square_payment_id) AS tx_matched
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE b.id = ANY($1::int[])
     ORDER BY b.arrival_date
  `, [ids]);

  console.log('id     | guest                    | total    | dep_paid | bal      | sq_payment_id                     | tx | match | action');
  console.log('-------|--------------------------|----------|----------|----------|-----------------------------------|-----|-------|--------------------');
  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const dep = parseFloat(row.deposit_paid || 0);
    const bal = parseFloat(row.balance_amount || 0);
    const guest = String(row.guest).trim().slice(0, 24);
    const sqPid = row.square_payment_id || '(null)';
    const tx = parseInt(row.tx_all);
    const matched = parseInt(row.tx_matched);
    let action;
    if (row.square_payment_id && matched === 0) action = 'BACKFILL ledger row';
    else if (row.square_payment_id && matched > 0) action = 'ledger OK';
    else if (dep > 0 && !row.square_payment_id) action = 'PAID no sq_id (?)';
    else if (bal > 0.01) action = '(has balance owed)';
    else action = '(nothing paid)';
    console.log(`${row.id} | ${guest.padEnd(24)} | $${gt.toFixed(2).padStart(7)} | $${dep.toFixed(2).padStart(7)} | $${bal.toFixed(2).padStart(7)} | ${sqPid.padEnd(33)} | ${String(tx).padEnd(2)} | ${String(matched).padEnd(5)} | ${action}`);
  }
  await pg.end();
})();
