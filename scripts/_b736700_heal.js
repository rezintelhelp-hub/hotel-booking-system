// Heal booking 736700 — reset fake "50% paid" state to actual unpaid.
// No payment_transactions exist for this booking; the deposit_paid was
// injected by the Beds24 sync reconciler from an invoice line, not from
// a real charge. Reset so Casa Magnolia can chase the full amount.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const LIVE = process.argv.includes('--live');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const before = await pg.query(`SELECT id, deposit_paid, deposit_paid_at, balance_amount, payment_status FROM bookings WHERE id = 736700`);
  console.log('BEFORE:', before.rows[0]);

  if (!LIVE) { console.log('\n[DRY RUN] Re-run with --live to apply.'); await pg.end(); return; }

  // Snapshot into a small audit table so this is reversible
  await pg.query(`
    CREATE TABLE IF NOT EXISTS bookings_fake_deposit_heal_20260818 (
      booking_id INT PRIMARY KEY,
      previous_deposit_paid NUMERIC,
      previous_deposit_paid_at TIMESTAMP,
      previous_balance_amount NUMERIC,
      previous_payment_status TEXT,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pg.query(`
    INSERT INTO bookings_fake_deposit_heal_20260818
      (booking_id, previous_deposit_paid, previous_deposit_paid_at, previous_balance_amount, previous_payment_status)
    SELECT id, deposit_paid, deposit_paid_at, balance_amount, payment_status FROM bookings WHERE id = 736700
    ON CONFLICT DO NOTHING
  `);

  await pg.query(`
    UPDATE bookings
       SET deposit_paid = 0,
           deposit_paid_at = NULL,
           balance_amount = grand_total,
           payment_status = 'unpaid',
           updated_at = NOW()
     WHERE id = 736700
  `);

  const after = await pg.query(`SELECT id, deposit_paid, deposit_paid_at, balance_amount, payment_status FROM bookings WHERE id = 736700`);
  console.log('AFTER:', after.rows[0]);
  console.log('\n↩ Reversal:  UPDATE bookings b SET deposit_paid=h.previous_deposit_paid, deposit_paid_at=h.previous_deposit_paid_at, balance_amount=h.previous_balance_amount, payment_status=h.previous_payment_status FROM bookings_fake_deposit_heal_20260818 h WHERE b.id=h.booking_id AND b.id=736700;');
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
