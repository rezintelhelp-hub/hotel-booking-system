// Backfill payment_transactions rows for Casa Magnolia bookings where
// the booking has a real square_payment_id but no matching ledger row.
// This is the SQUARE_LEDGER_MISSING pattern — Square took the money,
// GAS Payment Ops shows nothing because the ledger insert was silently
// dropped (Casa Magnolia bug window, pre-Aug 2026 fix).
//
// Idempotent — re-runs skip anything with an existing matching tx row.
//
// Usage:
//   node scripts/_casa_ledger_backfill.js          # dry-run
//   node scripts/_casa_ledger_backfill.js --live   # actually insert
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');

const LIVE = process.argv.includes('--live');

// The 7 candidates from _casa_ledger_survey.js. Explicit list — no
// broader query, per Steve's ask to only touch the exact 14 he
// nominated.
const IDS = [361667, 333012, 500713, 521749, 521723, 402774, 282952];

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log(`[casa-ledger-backfill] ${LIVE ? 'LIVE' : 'DRY-RUN'} — ${IDS.length} candidates`);

  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.grand_total, b.deposit_paid, b.balance_amount, b.currency,
           b.square_payment_id, b.square_location_id,
           p.account_id, b.arrival_date,
           (SELECT COUNT(*) FROM payment_transactions pt
             WHERE pt.booking_id = b.id
               AND pt.gateway_transaction_id = b.square_payment_id) AS existing
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
     WHERE b.id = ANY($1::int[])
     ORDER BY b.id
  `, [IDS]);

  const summary = { inserted: 0, skipped: 0, errors: 0 };

  for (const row of r.rows) {
    const guest = String(row.guest).trim();
    if (!row.square_payment_id) {
      console.log(`  [SKIP]   #${row.id} ${guest} — no square_payment_id (nothing to backfill)`);
      summary.skipped++;
      continue;
    }
    if (parseInt(row.existing) > 0) {
      console.log(`  [SKIP]   #${row.id} ${guest} — ledger row already exists for ${row.square_payment_id}`);
      summary.skipped++;
      continue;
    }
    const amount = parseFloat(row.deposit_paid || 0);
    if (amount <= 0) {
      console.log(`  [SKIP]   #${row.id} ${guest} — deposit_paid is zero`);
      summary.skipped++;
      continue;
    }
    // If deposit_paid == grand_total, this was a full payment, not a deposit.
    const isFullPayment = Math.abs(parseFloat(row.grand_total || 0) - amount) < 0.02;
    const txnType = isFullPayment ? 'payment' : 'deposit';
    const currency = (row.currency || 'USD').toUpperCase();
    const description = `Backfill ${isFullPayment ? 'full payment' : 'deposit'} — Square payment ${row.square_payment_id} took ${currency} ${amount.toFixed(2)} on booking ${row.id} but ledger row was never inserted (pre-Aug-2026 bug window).`;

    if (!LIVE) {
      console.log(`  [DRY]    #${row.id} ${guest} → INSERT ${currency} ${amount.toFixed(2)} ${txnType} · gateway_txn=${row.square_payment_id}`);
      summary.inserted++;
      continue;
    }

    try {
      const ins = await pg.query(`
        INSERT INTO payment_transactions (
          account_id, booking_id, amount, currency,
          payment_gateway, gateway_transaction_id,
          status, transaction_type,
          payment_method_type, description,
          initiated_at, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'square', $5, 'completed', $6, 'card', $7, NOW(), NOW(), NOW(), NOW())
        RETURNING id
      `, [row.account_id, row.id, amount, currency, row.square_payment_id, txnType, description]);
      console.log(`  [INSERT] #${row.id} ${guest} → tx ${ins.rows[0].id} · ${currency} ${amount.toFixed(2)} ${txnType}`);
      summary.inserted++;
    } catch (e) {
      console.error(`  [ERROR]  #${row.id} ${guest}: ${e.message}`);
      summary.errors++;
    }
  }

  console.log(`\n[casa-ledger-backfill] done — ${LIVE ? 'inserted' : 'would insert'}=${summary.inserted}, skipped=${summary.skipped}, errors=${summary.errors}`);
  if (!LIVE) console.log('(dry-run — re-run with --live to actually insert)');
  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
