require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const b = await pg.query(`SELECT id, guest_first_name, guest_last_name, guest_email, property_id, booking_source, api_source, arrival_date, grand_total, deposit_amount, deposit_paid, deposit_paid_at, balance_amount, balance_due_date, payment_status, payment_method, status, stripe_payment_intent_id, stripe_setup_intent_id, stripe_payment_method_id, stripe_customer_id, stripe_charge_id, currency, created_at, updated_at, notes, source_site_url, offer_id, deposit_rule_id, ota_prepaid, beds24_booking_id, channex_booking_id, raw_payload FROM bookings WHERE id = 736700`);
  if (!b.rows[0]) { console.log('NOT FOUND'); await pg.end(); return; }
  const r = b.rows[0];
  console.log('=== #736700 Timothy Kilpatrick Casa Magnolia ===');
  for (const [k,v] of Object.entries(r)) {
    if (v === null || v === '') continue;
    let disp;
    if (v instanceof Date) disp = v.toISOString();
    else if (typeof v === 'object') disp = JSON.stringify(v).slice(0, 300);
    else disp = String(v).slice(0, 300);
    console.log(`  ${k}: ${disp}`);
  }
  console.log('\n=== payment_transactions ===');
  const p = await pg.query(`SELECT id, transaction_type, amount, currency, status, payment_gateway, gateway_transaction_id, payment_method_type, completed_at, created_at, description FROM payment_transactions WHERE booking_id = 736700 ORDER BY id`);
  console.log(`(${p.rows.length} rows)`);
  for (const t of p.rows) console.log(`  #${t.id} ${t.created_at?.toISOString?.()} ${t.transaction_type} ${t.amount} ${t.currency} ${t.status} gw=${t.payment_gateway} gtid=${t.gateway_transaction_id || '(null)'} — ${t.description || ''}`);

  console.log('\n=== booking_extras ===');
  const ex = await pg.query(`SELECT id, source_type, name, qty, unit_price, currency, status, notes FROM booking_extras WHERE booking_id = 736700 ORDER BY id`);
  console.log(`(${ex.rows.length} rows)`);
  for (const e of ex.rows) console.log(`  #${e.id} ${e.source_type} ${e.name} x${e.qty} ${e.unit_price} ${e.currency} status=${e.status} — ${e.notes || ''}`);

  console.log('\n=== related payment_schedule / rules ===');
  try {
    const ps = await pg.query(`SELECT * FROM payment_schedules WHERE booking_id = 736700 ORDER BY id`);
    console.log(`payment_schedules: ${ps.rows.length}`);
    for (const s of ps.rows) console.log(`  ${JSON.stringify(s).slice(0,300)}`);
  } catch(_) { console.log('  (no payment_schedules table)'); }
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
