// Full audit of Casa Magnolia bookings — categorises every future booking
// by what action the client needs to take.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Find Casa Magnolia account
  const acct = await pg.query(`SELECT id, name, square_status FROM accounts WHERE name ILIKE '%casa magnolia%' LIMIT 1`);
  if (acct.rows.length === 0) { console.error('Casa Magnolia not found'); process.exit(1); }
  const accountId = acct.rows[0].id;
  console.log(`Account: ${acct.rows[0].name} (id=${accountId}) square_status=${acct.rows[0].square_status}\n`);

  const r = await pg.query(`
    SELECT b.id, b.guest_first_name, b.guest_last_name, b.guest_email,
           b.arrival_date, b.grand_total, b.deposit_amount, b.balance_amount, b.currency,
           b.payment_method, b.payment_status, b.status,
           b.square_customer_id, b.square_card_id, b.square_payment_id,
           b.card_last4,
           b.stripe_customer_id, b.stripe_payment_intent_id, b.stripe_payment_method_id,
           b.booking_source, b.created_at,
           (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.booking_id = b.id AND pt.status = 'completed') AS tx_count,
           (SELECT COALESCE(SUM(pt.amount),0) FROM payment_transactions pt WHERE pt.booking_id = b.id AND pt.status = 'completed' AND pt.transaction_type IN ('deposit','payment','charge','balance')) AS tx_paid
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE p.account_id = $1
       AND b.arrival_date >= CURRENT_DATE - INTERVAL '90 days'
       AND b.status IN ('confirmed','pending')
       -- Exclude OTA channel imports: Beds24 stubs, booking.com aliases,
       -- Airbnb aliases. Direct GAS bookings have real guest emails.
       AND COALESCE(b.guest_email,'') !~* '(no-?email\.local|guest\.booking\.com|guest\.airbnb\.com|^beds24-)'
       AND (b.api_source IS NULL OR b.api_source NOT IN ('beds24','channex','hostaway','hostfully','airbnb','booking'))
     ORDER BY b.arrival_date ASC
  `, [accountId]);

  const buckets = {
    ok:            [],  // balance-covered or fully paid, no action
    action_capture:[],  // needs a card capture link sent (no card_id but balance owed)
    action_manual: [],  // no tx at all, no card — needs full manual chase
    ok_no_balance: [],  // balance is 0, nothing to do
    ledger_drift:  [],  // tx_paid doesn't match grand_total - balance
  };

  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const bal = row.balance_amount === null ? gt : parseFloat(row.balance_amount);
    const paid = parseFloat(row.tx_paid || 0);
    const txCount = parseInt(row.tx_count) || 0;  // node-pg returns COUNT as string
    const owed = +(gt - paid).toFixed(2);
    const declaredPaid = +(gt - bal).toFixed(2);
    const drift = Math.abs(paid - declaredPaid);
    const name = `${row.guest_first_name || ''} ${row.guest_last_name || ''}`.trim();
    const arrival = row.arrival_date.toISOString().slice(0,10);
    const hasCard = !!row.square_card_id || !!row.stripe_payment_method_id;

    const entry = {
      id: row.id, name, email: row.guest_email, arrival,
      total: gt, balance: bal, owed_from_ledger: owed,
      tx_count: txCount,
      payment_method: row.payment_method, payment_status: row.payment_status,
      square_customer: row.square_customer_id, square_card: row.square_card_id,
      has_card: hasCard,
      drift,
    };

    // Bucket rules
    const arrivalDate = new Date(row.arrival_date);
    const isPast = arrivalDate < new Date(new Date().toDateString());
    entry.past = isPast;

    if (bal <= 0.01) {
      buckets.ok_no_balance.push(entry);
    } else if (!hasCard && txCount === 0) {
      buckets.action_manual.push(entry);
    } else if (!hasCard && txCount > 0) {
      buckets.action_capture.push(entry);
    } else if (hasCard) {
      buckets.ok.push(entry);
    }

    if (drift > 1.00 && row.tx_count > 0) {
      buckets.ledger_drift.push({ ...entry, ledger_paid: paid, declared_paid: declaredPaid });
    }
  }

  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`CASA MAGNOLIA — future bookings audit (${r.rows.length} total)`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  const printBucket = (label, list, action) => {
    console.log(`── ${label} (${list.length}) ──`);
    if (action) console.log(`   ACTION: ${action}`);
    for (const e of list) {
      const flag = e.past ? '[PAST]' : '[fut] ';
      console.log(`   #${e.id} ${flag} ${e.name.padEnd(28)} ${e.arrival}  total=${e.total.toFixed(2)} bal=${e.balance.toFixed(2)}  card=${e.has_card ? 'YES' : 'NO'}  tx=${e.tx_count}  ${e.email || ''}`);
    }
    console.log('');
  };

  printBucket('✅ OK — card on file, cron will auto-charge', buckets.ok, null);
  printBucket('✅ OK — balance already 0, nothing owed', buckets.ok_no_balance, null);
  printBucket('🔴 NEEDS CAPTURE LINK — deposit taken, card NOT saved', buckets.action_capture,
    'Open booking → "📧 Send capture link to guest". Guest re-enters card, we save it, cron takes balance on due date.');
  printBucket('🚨 NEEDS MANUAL CHASE — no transaction on file, no card', buckets.action_manual,
    'GAS has no record of a payment for these. Confirm with guest what they paid (or if deposit was taken at Square Terminal), then either mark paid manually or send capture link.');

  if (buckets.ledger_drift.length > 0) {
    console.log(`── ⚠️  LEDGER DRIFT (${buckets.ledger_drift.length}) — payment_transactions total ≠ (grand_total - balance) ──`);
    for (const e of buckets.ledger_drift) {
      console.log(`   #${e.id} ${e.name} — ledger says paid £${e.ledger_paid.toFixed(2)}, balance implies paid £${e.declared_paid.toFixed(2)} (drift £${e.drift.toFixed(2)})`);
    }
    console.log('');
  }

  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Summary: ${buckets.ok.length} auto-collectable · ${buckets.ok_no_balance.length} zero-balance · ${buckets.action_capture.length} need capture link · ${buckets.action_manual.length} need manual chase · ${buckets.ledger_drift.length} ledger-drift`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
