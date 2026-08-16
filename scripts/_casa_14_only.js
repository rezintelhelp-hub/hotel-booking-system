// Only the 14 booking IDs Steve pasted. No broader query, no assumptions.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const ids = [432238, 499860, 667062, 567420, 282952, 402829, 402774, 521749, 521723, 676941, 657262, 500713, 333012, 361667];
  const r = await pg.query(`
    SELECT b.id, b.guest_first_name, b.guest_last_name,
           b.arrival_date, b.grand_total, b.balance_amount,
           b.square_card_id, b.square_customer_id, b.square_payment_id,
           b.payment_status,
           (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.booking_id = b.id AND pt.status = 'completed') AS tx_count
      FROM bookings b
     WHERE b.id = ANY($1::int[])
     ORDER BY b.arrival_date
  `, [ids]);

  console.log('┌────────┬─────────────────────────┬────────────┬──────────┬──────────┬──────────┬────────────────────┐');
  console.log('│ ID     │ Guest                   │ Arrives    │ Total    │ Owed     │ Card?    │ Action             │');
  console.log('├────────┼─────────────────────────┼────────────┼──────────┼──────────┼──────────┼────────────────────┤');
  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const bal = row.balance_amount === null ? gt : parseFloat(row.balance_amount);
    const hasCard = !!row.square_card_id;
    const hasDeposit = !!row.square_payment_id || parseInt(row.tx_count) > 0;
    const name = `${row.guest_first_name || ''} ${row.guest_last_name || ''}`.trim().slice(0, 23);
    const arr = row.arrival_date.toISOString().slice(0,10);
    let action;
    if (bal <= 0.01) action = 'PAID — nothing to do';
    else if (hasCard) action = 'Cron will auto-charge';
    else if (hasDeposit) action = 'SEND CAPTURE LINK';
    else action = 'MANUAL CHASE (no tx)';
    console.log(`│ ${String(row.id).padEnd(6)} │ ${name.padEnd(23)} │ ${arr} │ $${gt.toFixed(2).padStart(7)} │ $${bal.toFixed(2).padStart(7)} │ ${(hasCard ? 'YES' : 'NO').padEnd(8)} │ ${action.padEnd(18)} │`);
  }
  console.log('└────────┴─────────────────────────┴────────────┴──────────┴──────────┴──────────┴────────────────────┘');
  await pg.end();
})();
