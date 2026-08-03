const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='accounts' ORDER BY ordinal_position`);
  console.log('accounts cols:', cols.rows.map(r=>r.column_name).join(', '));
  const acs = await p.query(`SELECT * FROM account_contract_settings WHERE account_id = 197`);
  console.log('\naccount_contract_settings 197:', JSON.stringify(acs.rows[0] || null, null, 2));
  // Also check bookings for guest_address of Stephen DRIVER (his own bookings as a guest)
  const g = await p.query(`SELECT DISTINCT guest_address, guest_city, guest_postcode, guest_country FROM bookings WHERE guest_email = 'stv.driver@googlemail.com' AND guest_address IS NOT NULL AND guest_address <> '' LIMIT 5`);
  console.log('\nStephen as guest:', JSON.stringify(g.rows, null, 2));
  await p.end();
})();
