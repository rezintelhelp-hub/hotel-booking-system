require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const b = await pg.query(`SELECT * FROM bookings WHERE id = 571931`);
  if (b.rows.length === 0) { console.log('NOT FOUND'); process.exit(0); }
  const row = b.rows[0];

  console.log('=== BOOKING 571931 ===');
  console.log(`Guest: ${row.guest_first_name} ${row.guest_last_name} <${row.guest_email}>`);
  console.log(`Property: id=${row.property_id}`);
  console.log(`Arrival: ${row.arrival_date}  Departure: ${row.departure_date}`);
  console.log(`Status: ${row.status}   Payment status: ${row.payment_status}   Method: ${row.payment_method}`);
  console.log(`Grand total: ${row.grand_total} ${row.currency}`);
  console.log(`Deposit amount: ${row.deposit_amount}`);
  console.log(`Deposit paid: ${row.deposit_paid}   at: ${row.deposit_paid_at}`);
  console.log(`Balance amount: ${row.balance_amount}`);
  console.log(`Balance paid at: ${row.balance_paid_at}`);
  console.log(`Balance due date: ${row.balance_due_date}`);
  console.log('');
  console.log('Charge state:');
  console.log(`  last_charge_error: ${row.last_charge_error || '(none)'}`);
  console.log(`  last_charge_error_code: ${row.last_charge_error_code || '(none)'}`);
  console.log(`  last_charge_error_at: ${row.last_charge_error_at || '(none)'}`);
  console.log('');
  console.log('Stripe fields:');
  console.log(`  stripe_payment_intent_id: ${row.stripe_payment_intent_id || '(null)'}`);
  console.log(`  stripe_customer_id: ${row.stripe_customer_id || '(null)'}`);
  console.log(`  stripe_payment_method_id: ${row.stripe_payment_method_id || '(null)'}`);
  console.log(`  stripe_setup_intent_id: ${row.stripe_setup_intent_id || '(null)'}`);
  console.log(`  stripe_charge_id: ${row.stripe_charge_id || '(null)'}`);
  console.log('');
  console.log('Square fields:');
  console.log(`  square_payment_id: ${row.square_payment_id || '(null)'}`);
  console.log(`  square_customer_id: ${row.square_customer_id || '(null)'}`);
  console.log(`  square_card_id: ${row.square_card_id || '(null)'}`);
  console.log('');
  console.log(`Booking source: ${row.booking_source || '(null)'}   API source: ${row.api_source || '(null)'}`);
  console.log(`Created: ${row.created_at}`);
  console.log(`Updated: ${row.updated_at}`);

  console.log('\n=== PAYMENT_TRANSACTIONS ===');
  const tx = await pg.query(`SELECT id, payment_gateway, status, transaction_type, amount, currency, gateway_transaction_id, description, failure_reason, created_at
                               FROM payment_transactions WHERE booking_id = 571931 ORDER BY id`);
  if (tx.rows.length === 0) {
    console.log('(NONE)');
  } else {
    for (const t of tx.rows) {
      console.log(`  #${t.id}  ${t.payment_gateway}:${t.status}:${t.transaction_type}  ${t.currency} ${t.amount}  ${t.created_at.toISOString()}`);
      console.log(`      gateway_txn=${t.gateway_transaction_id || '-'}`);
      console.log(`      desc="${t.description || '-'}"`);
      if (t.failure_reason) console.log(`      failure="${t.failure_reason}"`);
    }
  }

  // Also get property + account context
  const p = await pg.query(`SELECT p.id, p.name, p.account_id, a.name as account_name, a.stripe_secret_key IS NOT NULL AS has_stripe_key, a.square_status
                              FROM properties p JOIN accounts a ON a.id = p.account_id WHERE p.id = $1`, [row.property_id]);
  console.log('\n=== PROPERTY/ACCOUNT ===');
  console.log(p.rows[0]);

  await pg.end();
})();
