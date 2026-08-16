// Actually look at 361667 Larry Fabrey — is it really paid or did balance
// get zeroed some other way?
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const b = await pg.query(`SELECT * FROM bookings WHERE id = 361667`);
  const row = b.rows[0];

  console.log('=== BOOKING 361667 (Larry Fabrey) ===');
  console.log(`Guest: ${row.guest_first_name} ${row.guest_last_name} <${row.guest_email}>`);
  console.log(`Arrival: ${row.arrival_date}  Departure: ${row.departure_date}`);
  console.log(`Status: ${row.status}   Payment status: ${row.payment_status}   Method: ${row.payment_method}`);
  console.log(`Grand total: ${row.grand_total}`);
  console.log(`Deposit amount: ${row.deposit_amount}`);
  console.log(`Balance amount: ${row.balance_amount}`);
  console.log(`Deposit paid: ${row.deposit_paid}   Deposit paid at: ${row.deposit_paid_at}`);
  console.log(`Balance paid at: ${row.balance_paid_at}`);
  console.log('');
  console.log('Square fields:');
  console.log(`  square_payment_id: ${row.square_payment_id || '(null)'}`);
  console.log(`  square_customer_id: ${row.square_customer_id || '(null)'}`);
  console.log(`  square_card_id: ${row.square_card_id || '(null)'}`);
  console.log(`  square_location_id: ${row.square_location_id || '(null)'}`);
  console.log('');
  console.log('Stripe fields:');
  console.log(`  stripe_payment_intent_id: ${row.stripe_payment_intent_id || '(null)'}`);
  console.log(`  stripe_customer_id: ${row.stripe_customer_id || '(null)'}`);
  console.log(`  stripe_payment_method_id: ${row.stripe_payment_method_id || '(null)'}`);
  console.log('');
  console.log(`Created at: ${row.created_at}`);
  console.log(`Updated at: ${row.updated_at}`);
  console.log(`Booking source: ${row.booking_source || '(null)'}   API source: ${row.api_source || '(null)'}`);

  console.log('\n=== ALL PAYMENT_TRANSACTIONS ROWS ===');
  const tx = await pg.query(`SELECT * FROM payment_transactions WHERE booking_id = 361667 ORDER BY id`);
  if (tx.rows.length === 0) {
    console.log('(NONE — zero payment_transactions rows)');
  } else {
    for (const t of tx.rows) {
      console.log(`  #${t.id}  gateway=${t.payment_gateway}  status=${t.status}  type=${t.transaction_type}  amount=${t.amount}  gateway_txn=${t.gateway_transaction_id || '-'}  created=${t.created_at}`);
    }
  }

  await pg.end();
})();
