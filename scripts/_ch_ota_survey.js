// Charles House Windsor (account 273) OTA booking survey — is 571931
// a one-off decline or a pattern? Look at last 90 days.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Find Charles House account
  const acct = await pg.query(`SELECT id, name FROM accounts WHERE name ILIKE '%charles house%' LIMIT 1`);
  if (acct.rows.length === 0) { console.log('Charles House not found'); process.exit(0); }
  const accountId = acct.rows[0].id;
  console.log(`Account: ${acct.rows[0].name} (id=${accountId})\n`);

  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.booking_source, b.api_source,
           b.arrival_date, b.departure_date,
           b.grand_total, b.deposit_amount, b.balance_amount, b.currency,
           b.payment_status, b.payment_method,
           b.stripe_payment_method_id IS NOT NULL AS has_pm,
           b.stripe_charge_id IS NOT NULL AS has_charged,
           b.last_charge_error, b.last_charge_error_code, b.last_charge_error_at,
           (SELECT COUNT(*)::int FROM payment_transactions pt
             WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded')) AS paid_tx,
           (SELECT COALESCE(SUM(pt.amount)::numeric, 0) FROM payment_transactions pt
             WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded')
               AND pt.transaction_type IN ('deposit','balance','payment','charge','capture')) AS paid_sum
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = $1
       AND b.arrival_date >= CURRENT_DATE - INTERVAL '90 days'
       AND b.status IN ('confirmed','pending')
       AND LOWER(COALESCE(b.booking_source,'')) IN ('expedia','booking','booking.com','airbnb','agoda','vrbo','hostelworld')
     ORDER BY b.arrival_date DESC
  `, [accountId]);

  console.log(`Found ${r.rows.length} OTA bookings on Charles House (last 90 days)\n`);

  // Bucket by outcome
  const buckets = { paid: [], has_pm_unpaid: [], no_pm_unpaid: [], declined: [] };
  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const paidSum = parseFloat(row.paid_sum || 0);
    const owed = +(gt - paidSum).toFixed(2);
    if (row.last_charge_error) {
      buckets.declined.push({ ...row, owed });
    } else if (owed <= 0.01 || row.payment_status === 'paid') {
      buckets.paid.push({ ...row, owed });
    } else if (row.has_pm) {
      buckets.has_pm_unpaid.push({ ...row, owed });
    } else {
      buckets.no_pm_unpaid.push({ ...row, owed });
    }
  }

  console.log(`── Declined (${buckets.declined.length}) ──`);
  for (const b of buckets.declined) {
    console.log(`  #${b.id} ${b.guest.padEnd(28)} ${b.arrival_date.toISOString().slice(0,10)}  src=${b.booking_source.padEnd(10)}  owed=${b.currency} ${b.owed}`);
    console.log(`      err_code=${b.last_charge_error_code}  when=${b.last_charge_error_at?.toISOString?.() || '-'}`);
    console.log(`      err="${(b.last_charge_error || '').slice(0, 180)}"`);
  }

  console.log(`\n── Has PM, still unpaid (would be charged if we clicked "Take payment now") (${buckets.has_pm_unpaid.length}) ──`);
  for (const b of buckets.has_pm_unpaid) {
    console.log(`  #${b.id} ${b.guest.padEnd(28)} ${b.arrival_date.toISOString().slice(0,10)}  src=${b.booking_source.padEnd(10)}  owed=${b.currency} ${b.owed}  status=${b.payment_status}`);
  }

  console.log(`\n── No PM, unpaid (pure OTA prepaid or handoff) (${buckets.no_pm_unpaid.length}) ──`);
  for (const b of buckets.no_pm_unpaid.slice(0, 10)) {
    console.log(`  #${b.id} ${b.guest.padEnd(28)} ${b.arrival_date.toISOString().slice(0,10)}  src=${b.booking_source.padEnd(10)}  owed=${b.currency} ${b.owed}  status=${b.payment_status}`);
  }
  if (buckets.no_pm_unpaid.length > 10) console.log(`  ... and ${buckets.no_pm_unpaid.length - 10} more`);

  console.log(`\n── Paid (${buckets.paid.length}) ──`);
  for (const b of buckets.paid.slice(0, 10)) {
    console.log(`  #${b.id} ${b.guest.padEnd(28)} ${b.arrival_date.toISOString().slice(0,10)}  src=${b.booking_source.padEnd(10)}  paid=${b.currency} ${parseFloat(b.paid_sum).toFixed(2)}`);
  }
  if (buckets.paid.length > 10) console.log(`  ... and ${buckets.paid.length - 10} more`);

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${r.rows.length}  ·  Paid: ${buckets.paid.length}  ·  Has PM unpaid: ${buckets.has_pm_unpaid.length}  ·  No PM unpaid: ${buckets.no_pm_unpaid.length}  ·  Declined: ${buckets.declined.length}`);

  await pg.end();
})();
