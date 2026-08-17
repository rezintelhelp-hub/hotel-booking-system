// Read-only report — Charles House (account 273) Expedia bookings that
// came through Channex. For each: what card details are on file, was
// there ever a charge attempt, was anything recorded in payment_transactions.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const r = await pg.query(`
    SELECT b.id, b.channex_booking_id,
           b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.guest_email, b.arrival_date, b.departure_date,
           b.grand_total, b.balance_amount, b.currency, b.payment_status, b.status,
           b.stripe_customer_id, b.stripe_payment_method_id,
           b.stripe_setup_intent_id, b.stripe_payment_intent_id, b.stripe_charge_id,
           b.card_last4, b.last_charge_error, b.last_charge_error_code, b.last_charge_error_at,
           b.created_at, b.updated_at,
           (SELECT COUNT(*)::int FROM payment_transactions pt WHERE pt.booking_id = b.id) AS tx_total,
           (SELECT COUNT(*)::int FROM payment_transactions pt WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded')) AS tx_completed,
           (SELECT COALESCE(SUM(pt.amount)::numeric,0) FROM payment_transactions pt WHERE pt.booking_id = b.id AND pt.status IN ('completed','succeeded') AND pt.transaction_type IN ('deposit','balance','payment','charge','capture')) AS ledger_paid
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = 273
       AND LOWER(COALESCE(b.booking_source,'')) = 'expedia'
       AND b.channex_booking_id IS NOT NULL
     ORDER BY b.arrival_date DESC
  `);

  console.log(`\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`CHARLES HOUSE — Expedia bookings via Channex — CARD DETAILS JOURNEY`);
  console.log(`═══════════════════════════════════════════════════════════════════════`);
  console.log(`Total bookings: ${r.rows.length}\n`);

  const buckets = {
    has_pm_never_charged: [],
    has_pm_charge_succeeded: [],
    has_pm_charge_failed: [],
    no_pm: [],
    other: []
  };

  for (const b of r.rows) {
    const hasPm = !!b.stripe_payment_method_id;
    const hasCharge = b.tx_completed > 0 || !!b.stripe_charge_id;
    const hasError = !!b.last_charge_error;

    if (!hasPm) buckets.no_pm.push(b);
    else if (hasCharge) buckets.has_pm_charge_succeeded.push(b);
    else if (hasError) buckets.has_pm_charge_failed.push(b);
    else if (hasPm) buckets.has_pm_never_charged.push(b);
    else buckets.other.push(b);
  }

  const fmt = (b) => {
    const name = String(b.guest).trim().padEnd(28);
    const arr = b.arrival_date ? b.arrival_date.toISOString().slice(0,10) : '?';
    const amt = `${b.currency||'?'} ${parseFloat(b.grand_total||0).toFixed(2)}`.padEnd(10);
    const bal = `bal ${parseFloat(b.balance_amount||0).toFixed(2)}`.padEnd(12);
    return `#${String(b.id).padEnd(7)} ${name} arr=${arr} ${amt} ${bal}`;
  };

  console.log(`── 🚨 NO CARD ON FILE (Channex clone never happened OR was never manually attached) — ${buckets.no_pm.length} ──`);
  for (const b of buckets.no_pm) {
    console.log('  ' + fmt(b) + ` pm=(null) tx=${b.tx_total}`);
    console.log(`         email=${b.guest_email || '-'}   created=${b.created_at.toISOString().slice(0,10)}`);
  }

  console.log(`\n── 🟡 HAS CARD, NEVER CHARGED (nobody clicked Take Payment) — ${buckets.has_pm_never_charged.length} ──`);
  for (const b of buckets.has_pm_never_charged) {
    console.log('  ' + fmt(b) + ` pm=${b.stripe_payment_method_id.slice(0,20)}... tx=${b.tx_total}`);
    console.log(`         card_last4=${b.card_last4 || '-'}   setup_intent=${b.stripe_setup_intent_id ? 'yes' : 'no'}   created=${b.created_at.toISOString().slice(0,10)}   updated=${b.updated_at.toISOString().slice(0,10)}`);
  }

  console.log(`\n── ✅ HAS CARD, CHARGE SUCCEEDED — ${buckets.has_pm_charge_succeeded.length} ──`);
  for (const b of buckets.has_pm_charge_succeeded) {
    console.log('  ' + fmt(b) + ` charge=${b.stripe_charge_id ? b.stripe_charge_id.slice(0,20)+'...' : '(via tx)'} ledger=${b.currency} ${parseFloat(b.ledger_paid).toFixed(2)}`);
  }

  console.log(`\n── ❌ HAS CARD, CHARGE FAILED — ${buckets.has_pm_charge_failed.length} ──`);
  for (const b of buckets.has_pm_charge_failed) {
    console.log('  ' + fmt(b) + ` err=${b.last_charge_error_code || '?'}`);
    console.log(`         "${(b.last_charge_error||'').slice(0,120)}"`);
    console.log(`         when=${b.last_charge_error_at?.toISOString?.() || '-'}`);
  }

  if (buckets.other.length) {
    console.log(`\n── ? OTHER — ${buckets.other.length} ──`);
    for (const b of buckets.other) console.log('  ' + fmt(b));
  }

  const totalOwed = r.rows.reduce((s, b) => s + parseFloat(b.balance_amount || 0), 0);
  console.log(`\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`Summary: ${r.rows.length} total  ·  ${buckets.no_pm.length} no-card  ·  ${buckets.has_pm_never_charged.length} card-never-charged  ·  ${buckets.has_pm_charge_succeeded.length} charge-ok  ·  ${buckets.has_pm_charge_failed.length} charge-failed`);
  console.log(`Balance still owed across all: ${r.rows[0]?.currency || 'GBP'} ${totalOwed.toFixed(2)}`);
  console.log(`═══════════════════════════════════════════════════════════════════════`);

  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
