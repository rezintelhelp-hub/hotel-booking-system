const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Deposit rules for account 173
  const dr = await p.query(`SELECT * FROM deposit_rules WHERE account_id = 173`);
  console.log('deposit_rules acct 173:', JSON.stringify(dr.rows, null, 2));
  // Booking payment schedule for B548702
  const bps = await p.query(`SELECT * FROM booking_payment_schedule WHERE booking_id = 548702 ORDER BY id`);
  console.log('\nbooking_payment_schedule B548702:', JSON.stringify(bps.rows, null, 2));
  // What columns does deposit_rules have?
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='deposit_rules' ORDER BY ordinal_position`);
  console.log('\ndeposit_rules cols:', cols.rows.map(r=>r.column_name).join(', '));
  await p.end();
})();
