// Backfill payment_transactions rows for any Channex-imported OTA booking
// where payment_status='paid' but no ledger row exists. This is the
// "paid-but-no-ledger" pattern that panicked Barbara on Charles House
// Expedia bookings (Aug 2026). Estate-wide sweep — targets OTA bookings
// specifically, so direct bookings aren't touched.
//
// Idempotent — ON CONFLICT DO NOTHING on the gateway_transaction_id.
// Uses a synthetic txn id per booking so re-runs skip already-inserted rows.
//
// Usage:
//   node scripts/_ota_paid_ledger_backfill.js          # dry-run
//   node scripts/_ota_paid_ledger_backfill.js --live   # actually insert
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');

const LIVE = process.argv.includes('--live');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.channex_booking_id, b.arrival_date, b.grand_total, b.currency,
           b.booking_source, b.api_source, b.payment_status,
           p.account_id, a.name AS account_name
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE LOWER(b.payment_status) = 'paid'
       AND b.grand_total > 0
       AND LOWER(COALESCE(b.booking_source,'')) IN ('expedia','booking','booking.com','airbnb','agoda','vrbo','hostelworld','marriott','hotelbeds','hrs','tripadvisor','trivago','tablethotels','trip','hostvana','beds24','hostfully')
       AND NOT EXISTS (
         SELECT 1 FROM payment_transactions pt
          WHERE pt.booking_id = b.id
            AND pt.status IN ('completed','succeeded')
            AND pt.transaction_type IN ('deposit','balance','payment','charge','capture')
       )
       AND b.created_at > NOW() - INTERVAL '365 days'
     ORDER BY p.account_id, b.arrival_date
  `);

  console.log(`[ota-paid-ledger-backfill] ${LIVE ? 'LIVE' : 'DRY-RUN'} — ${r.rows.length} candidates`);

  // Group by account for a clean summary
  const byAcct = new Map();
  for (const row of r.rows) {
    if (!byAcct.has(row.account_id)) byAcct.set(row.account_id, { name: row.account_name, rows: [], total: 0 });
    const b = byAcct.get(row.account_id);
    b.rows.push(row);
    b.total += parseFloat(row.grand_total || 0);
  }
  console.log('\nBy account:');
  for (const [id, b] of byAcct) {
    console.log(`  acct ${id} ${b.name} — ${b.rows.length} bookings, £${b.total.toFixed(2)} gross`);
  }
  console.log('');

  let inserted = 0, skipped = 0, errors = 0;
  for (const row of r.rows) {
    const gt = parseFloat(row.grand_total || 0);
    const currency = (row.currency || 'GBP').toUpperCase();
    const src = (row.booking_source || 'ota').toUpperCase();
    // Synthetic gateway_transaction_id — unique per booking so re-runs skip.
    const gtxId = `ota_backfill_b${row.id}_${row.channex_booking_id || 'nochanx'}`;
    const desc = `Backfill — ${src} marked payment_status='paid' at import but no ledger row existed. Amount from booking.grand_total. Verify against ${src} payout statement.`;

    if (!LIVE) {
      console.log(`  [DRY]    #${row.id.toString().padEnd(6)} ${row.guest.padEnd(28)} ${src.padEnd(10)}  ${currency} ${gt.toFixed(2)}  arr=${row.arrival_date.toISOString().slice(0,10)}`);
      inserted++;
      continue;
    }
    try {
      const ins = await pg.query(`
        INSERT INTO payment_transactions (
          booking_id, account_id, amount, currency,
          payment_gateway, gateway_transaction_id,
          status, transaction_type,
          payment_method_type, description,
          initiated_at, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'channex_ota', $5, 'completed', 'payment', 'external', $6, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [row.id, row.account_id, gt, currency, gtxId, desc]);
      if (ins.rows[0]) {
        console.log(`  [INSERT] #${row.id.toString().padEnd(6)} ${row.guest.padEnd(28)} → tx ${ins.rows[0].id} · ${currency} ${gt.toFixed(2)}`);
        inserted++;
      } else {
        console.log(`  [SKIP]   #${row.id} — already had matching row (conflict)`);
        skipped++;
      }
    } catch (e) {
      console.error(`  [ERROR]  #${row.id}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n[ota-paid-ledger-backfill] done — ${LIVE ? 'inserted' : 'would insert'}=${inserted}  skipped=${skipped}  errors=${errors}`);
  if (!LIVE) console.log('(dry-run — re-run with --live to actually insert)');
  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
