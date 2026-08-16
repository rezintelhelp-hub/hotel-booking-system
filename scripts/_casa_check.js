require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Discover schemas first
  const bCols = await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_name='bookings' ORDER BY column_name`);
  const bColsSet = new Set(bCols.rows.map(r => r.column_name));
  console.log('bookings cols sample:', [...bColsSet].filter(c => /card|square|stripe|source|balance|paid|status|checkin|check_in|arrival/i.test(c)).join(', '));

  const ptCols = await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_name='payment_transactions' ORDER BY column_name`);
  console.log('payment_transactions cols:', ptCols.rows.map(r => r.column_name).join(', '));

  const ids = [361667, 333012, 500713, 657262, 676941, 521749, 521723, 402774, 402829, 282952, 567420, 667062, 499860];

  // Build a safe select
  const cols = ['id','guest_first_name','guest_last_name','grand_total','balance_amount','source','created_at',
                'stripe_payment_intent_id','square_customer_id','card_on_file','arrival_date','account_id',
                'square_card_id','stripe_customer_id','card_last4','card_brand','payment_method','payment_status','status']
    .filter(c => bColsSet.has(c));
  const r = await pg.query(`
    SELECT ${cols.map(c => 'b.' + c).join(', ')},
           (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.booking_id = b.id) AS tx_count,
           (SELECT string_agg(pt.payment_gateway || ':' || COALESCE(pt.status,'') || ':' || COALESCE(pt.transaction_type,'') || ':£' || COALESCE(pt.amount::text,'') , ' | ' ORDER BY pt.id)
              FROM payment_transactions pt WHERE pt.booking_id = b.id) AS tx_summary
      FROM bookings b
     WHERE b.id = ANY($1::int[])
     ORDER BY b.id
  `, [ids]);
  console.log('\n=== BOOKINGS ===');
  for (const row of r.rows) {
    const name = `${row.guest_first_name || ''} ${row.guest_last_name || ''}`.trim();
    console.log(`\n#${row.id} ${name} — arrival ${row.arrival_date} — total £${row.grand_total} balance £${row.balance_amount}`);
    console.log(`  source=${row.source} status=${row.status} payment_status=${row.payment_status || 'n/a'} method=${row.payment_method || 'n/a'}`);
    console.log(`  cof=${row.card_on_file} last4=${row.card_last4 || '-'} brand=${row.card_brand || '-'}`);
    console.log(`  stripe_pi=${row.stripe_payment_intent_id || '-'} stripe_cust=${row.stripe_customer_id || '-'}`);
    console.log(`  square_cust=${row.square_customer_id || '-'} square_card=${row.square_card_id || '-'}`);
    console.log(`  tx_count=${row.tx_count} tx=${row.tx_summary || '(none)'}`);
  }
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
