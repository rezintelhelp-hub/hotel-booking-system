// Who ELSE has the Monzo pm ending 9050 attached? And when did 571931's
// pm_id change from pm_1U12SE... to pm_1U56x0...?
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const OLD_PM = 'pm_1U12SEKcKXdYSUjNYuzmEw59';
  const CUR_PM = 'pm_1U56x0KcKXdYSUjNRR7U9pft';

  console.log(`=== Any bookings ever referenced pm_1U12SE (the one Stripe shows for the failed charge)? ===`);
  const r1 = await pg.query(`
    SELECT b.id, p.account_id, a.name AS account_name, p.name AS property_name,
           b.guest_first_name, b.guest_last_name, b.arrival_date, b.grand_total,
           b.stripe_payment_method_id, b.stripe_customer_id
      FROM bookings b JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.stripe_payment_method_id = $1 OR b.stripe_setup_intent_id LIKE 'seti_%'  /* just this booking */
     AND b.stripe_payment_method_id = $1
     ORDER BY b.id
  `, [OLD_PM]);
  console.table(r1.rows);

  console.log(`\n=== Any bookings currently reference pm_1U56x0 (what's on 571931 right now)? ===`);
  const r2 = await pg.query(`
    SELECT b.id, p.account_id, a.name AS account_name, p.name AS property_name,
           b.guest_first_name, b.guest_last_name, b.arrival_date, b.grand_total
      FROM bookings b JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.stripe_payment_method_id = $1
     ORDER BY b.id
  `, [CUR_PM]);
  console.table(r2.rows);

  console.log(`\n=== Any bookings under Cotswolds Retreats (acct 95) with card_last4 = 9050 ? ===`);
  const r3 = await pg.query(`
    SELECT b.id, b.property_id, p.name AS property_name,
           b.guest_first_name, b.guest_last_name, b.arrival_date, b.grand_total,
           b.stripe_payment_method_id, b.card_last4
      FROM bookings b JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 95 AND b.card_last4 = '9050'
     ORDER BY b.arrival_date DESC LIMIT 20
  `);
  console.table(r3.rows);

  console.log(`\n=== Any bookings ANYWHERE with card_last4 = 9050 (past 90 days) ? ===`);
  const r4 = await pg.query(`
    SELECT b.id, p.account_id, a.name AS account_name, p.name AS property_name,
           b.guest_first_name, b.guest_last_name, b.arrival_date, b.grand_total,
           b.stripe_payment_method_id, b.card_last4
      FROM bookings b JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.card_last4 = '9050'
       AND b.created_at > NOW() - INTERVAL '90 days'
     ORDER BY b.arrival_date DESC LIMIT 20
  `);
  console.table(r4.rows);

  console.log(`\n=== 571931 audit trail — any related audit / history rows? ===`);
  // Check if there's a bookings history / audit table
  const tables = await pg.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND (table_name LIKE '%bookings_audit%' OR table_name LIKE '%booking_history%' OR table_name LIKE '%bookings_log%')
  `);
  console.log('  history tables:', tables.rows.map(r=>r.table_name).join(', ') || '(none)');

  console.log(`\n=== payment_transactions on 571931 (any attempts logged?) ===`);
  const r5 = await pg.query(`
    SELECT id, payment_gateway, status, transaction_type, amount, currency,
           gateway_transaction_id, description, failure_reason, created_at
      FROM payment_transactions WHERE booking_id = 571931 ORDER BY id
  `);
  if (r5.rows.length === 0) console.log('  (none)');
  else console.table(r5.rows);

  await pg.end();
})();
