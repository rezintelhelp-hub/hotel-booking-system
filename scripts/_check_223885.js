// Diagnose why GAS-223885 (Cotswolds — Tracey) balance wasn't auto-charged.
// Look at the exact cron gate conditions in processAutoChargePayments and
// see which one skipped it.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const b = await pg.query(`
    SELECT b.*, p.account_id, p.name AS property_name, a.name AS account_name
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.id = 223885
  `);
  if (b.rows.length === 0) { console.log('Booking 223885 not found'); process.exit(0); }
  const row = b.rows[0];

  console.log('=== BOOKING 223885 ===');
  console.log(`Guest: ${row.guest_first_name} ${row.guest_last_name} <${row.guest_email}>`);
  console.log(`Property: ${row.property_name} (id=${row.property_id})`);
  console.log(`Account:  ${row.account_name} (id=${row.account_id})`);
  console.log(`Arrival:  ${row.arrival_date}   Departure: ${row.departure_date}`);
  console.log(`Status:   ${row.status}   payment_status: ${row.payment_status}   payment_method: ${row.payment_method}`);
  console.log(`Grand total: ${row.currency} ${row.grand_total}`);
  console.log(`Deposit amount: ${row.deposit_amount}   Deposit paid: ${row.deposit_paid}   Deposit paid at: ${row.deposit_paid_at}`);
  console.log(`Balance amount: ${row.balance_amount}   Balance paid at: ${row.balance_paid_at}   Balance due date: ${row.balance_due_date}`);
  console.log(`Booking source: ${row.booking_source}   API source: ${row.api_source}   Channex booking id: ${row.channex_booking_id || '(null)'}`);
  console.log('');
  console.log('Card state:');
  console.log(`  stripe_customer_id:       ${row.stripe_customer_id || '(null)'}`);
  console.log(`  stripe_payment_method_id: ${row.stripe_payment_method_id || '(null)'}`);
  console.log(`  stripe_setup_intent_id:   ${row.stripe_setup_intent_id || '(null)'}`);
  console.log(`  stripe_payment_intent_id: ${row.stripe_payment_intent_id || '(null)'}`);
  console.log(`  stripe_charge_id:         ${row.stripe_charge_id || '(null)'}`);
  console.log(`  card_last4: ${row.card_last4 || '(null)'}   card_brand: ${row.card_brand || '(null)'}`);
  console.log(`  ota_payment_collect: ${row.ota_payment_collect || '(null)'}`);
  console.log('');
  console.log('Error trail:');
  console.log(`  last_charge_error: ${row.last_charge_error || '(none)'}`);
  console.log(`  last_charge_error_code: ${row.last_charge_error_code || '(none)'}`);
  console.log(`  last_charge_error_at:  ${row.last_charge_error_at || '(never)'}`);
  console.log('');

  // deposit_rule for this booking
  const rule = await pg.query(`
    SELECT id, is_active, schedule_mode, balance_due_days, auto_charge_days_before,
           auto_charge_balance, deposit_percentage, deposit_amount, property_id, account_id
      FROM deposit_rules
     WHERE id = COALESCE($1, (
        SELECT dr2.id FROM deposit_rules dr2
         WHERE dr2.is_active = true
           AND (dr2.property_id = $2 OR (dr2.property_id IS NULL AND dr2.account_id = $3))
         ORDER BY (dr2.property_id IS NOT NULL) DESC, dr2.created_at DESC
         LIMIT 1
     ))
  `, [row.deposit_rule_id, row.property_id, row.account_id]);
  console.log('=== DEPOSIT RULE APPLIED ===');
  if (rule.rows.length === 0) { console.log('  NO RULE'); }
  else {
    const r = rule.rows[0];
    console.log(`  rule #${r.id}  is_active=${r.is_active}   schedule_mode=${r.schedule_mode}`);
    console.log(`  balance_due_days=${r.balance_due_days}   auto_charge_days_before=${r.auto_charge_days_before}`);
    console.log(`  auto_charge_balance=${r.auto_charge_balance}   deposit_percentage=${r.deposit_percentage}   deposit_amount=${r.deposit_amount}`);
    // effective trigger date
    const eff = Math.max(0, r.balance_due_days ?? r.auto_charge_days_before ?? 14);
    const arr = new Date(row.arrival_date);
    const trig = new Date(arr.getTime() - eff * 86400000);
    console.log(`  effective days_before = ${eff}   trigger date = ${trig.toISOString().slice(0,10)}   arrival = ${arr.toISOString().slice(0,10)}   today = ${new Date().toISOString().slice(0,10)}`);
  }
  console.log('');

  // payment_transactions
  const tx = await pg.query(`SELECT id, payment_gateway, status, transaction_type, amount, currency, gateway_transaction_id, description, created_at, failure_reason FROM payment_transactions WHERE booking_id = 223885 ORDER BY id`);
  console.log(`=== PAYMENT_TRANSACTIONS (${tx.rows.length}) ===`);
  for (const t of tx.rows) {
    console.log(`  #${t.id}  ${t.payment_gateway}:${t.status}:${t.transaction_type}  ${t.currency} ${t.amount}  ${t.created_at?.toISOString?.() || t.created_at}`);
    console.log(`      gateway_txn=${t.gateway_transaction_id || '-'}   desc="${t.description || '-'}"   fail="${t.failure_reason || ''}"`);
  }
  console.log('');

  // Cron gate check — simulate the exact WHERE clause for this booking
  console.log('=== AUTO-CHARGE CRON GATE CHECK ===');
  const gate = await pg.query(`
    SELECT
      b.id,
      (dr.is_active = true) AS gate_rule_active,
      (dr.schedule_mode IS NULL OR dr.schedule_mode != 'schedule') AS gate_not_scheduled,
      (b.stripe_payment_method_id IS NOT NULL) AS gate_has_pm,
      (b.payment_status != 'paid') AS gate_not_paid,
      (b.balance_amount > 0) AS gate_balance_owed,
      (b.status NOT IN ('cancelled','rejected')) AS gate_status_ok,
      (b.payment_method IS NULL OR b.payment_method NOT IN ('card_guarantee','pay_at_property','bank_transfer','enigma')) AS gate_method_ok,
      (b.arrival_date - INTERVAL '1 day' * COALESCE(dr.balance_due_days, dr.auto_charge_days_before, 14))::date <= CURRENT_DATE AS gate_trigger_reached,
      (b.arrival_date >= CURRENT_DATE) AS gate_arrival_future,
      (b.booking_source IS NULL OR LOWER(b.booking_source) NOT IN ('expedia','booking','booking.com','airbnb','agoda','vrbo','hostelworld','marriott','hotelbeds','hrs','tripadvisor','trivago','tablethotels','trip','hostvana','beds24','hostfully')) AS gate_not_ota
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      LEFT JOIN deposit_rules dr ON dr.id = COALESCE(
        b.deposit_rule_id,
        (SELECT dr2.id FROM deposit_rules dr2
          WHERE dr2.is_active = true
            AND (dr2.property_id = b.property_id OR (dr2.property_id IS NULL AND dr2.account_id = p.account_id))
          ORDER BY (dr2.property_id IS NOT NULL) DESC, dr2.created_at DESC LIMIT 1)
      )
     WHERE b.id = 223885
  `);
  const g = gate.rows[0];
  for (const [k, v] of Object.entries(g)) {
    if (k === 'id') continue;
    const symbol = v === true ? '✅' : v === false ? '❌' : '?';
    console.log(`  ${symbol} ${k}: ${v}`);
  }

  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
