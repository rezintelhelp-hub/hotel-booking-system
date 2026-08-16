// Total value of Charles House Expedia bookings without a real payment_transactions row.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.arrival_date, b.grand_total, b.currency, b.payment_status,
           b.stripe_payment_method_id,
           (SELECT COUNT(*)::int FROM payment_transactions pt
             WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded')) AS tx_count,
           (SELECT COALESCE(SUM(pt.amount)::numeric, 0) FROM payment_transactions pt
             WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded')
               AND pt.transaction_type IN ('deposit','balance','payment','charge','capture')) AS ledger_paid
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273
       AND b.arrival_date >= CURRENT_DATE - INTERVAL '180 days'
       AND b.status IN ('confirmed','pending')
       AND LOWER(COALESCE(b.booking_source,'')) = 'expedia'
     ORDER BY b.arrival_date
  `);

  let totalGross = 0, totalUncollected = 0, uncollectedCount = 0;
  console.log('id     | guest                    | arrival    | total   | ledger  | status');
  console.log('-------|--------------------------|------------|---------|---------|-------');
  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const paid = parseFloat(row.ledger_paid || 0);
    const uncollected = +(gt - paid).toFixed(2);
    totalGross += gt;
    if (uncollected > 0.01) { totalUncollected += uncollected; uncollectedCount++; }
    console.log(`${row.id} | ${row.guest.padEnd(24)} | ${row.arrival_date.toISOString().slice(0,10)} | £${gt.toFixed(2).padStart(6)} | £${paid.toFixed(2).padStart(6)} | ${row.payment_status}`);
  }
  console.log(`\n=== SUMMARY (Charles House Expedia bookings, past 180 days) ===`);
  console.log(`Total bookings:              ${r.rows.length}`);
  console.log(`Total gross value:           £${totalGross.toFixed(2)}`);
  console.log(`Uncollected (no ledger row): ${uncollectedCount} bookings, £${totalUncollected.toFixed(2)}`);
  console.log(`\nNOTE: "uncollected in GAS" ≠ "unpaid" — Expedia may have remitted these`);
  console.log(`      via monthly EFT that GAS's ledger doesn't reflect. Barbara's`);
  console.log(`      Expedia payout statement is the source of truth for what she was paid.`);

  await pg.end();
})();
