// Heal bookable_units.currency where it doesn't match the property's currency.
// The column had DEFAULT 'CHF' (found 2026-09-16 investigating Cordelia
// Belmont's receipt going out in CHF). Every INSERT that omitted currency
// landed on CHF. This script:
//   1. Snapshots every mismatched row to an audit table (reversible)
//   2. Updates bookable_units.currency = property.currency for those rows
//   3. Drops the DEFAULT 'CHF' so future INSERTs get NULL (the read code
//      already prefers booking.currency > property.currency > room.currency)
//
// Reversal: INSERT INTO bookable_units_currency_heal_20260916 has the
// before-values; a simple UPDATE against it restores.
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Audit table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookable_units_currency_heal_20260916 (
        unit_id INT PRIMARY KEY,
        property_id INT,
        account_name TEXT,
        property_name TEXT,
        unit_name TEXT,
        old_currency TEXT,
        new_currency TEXT,
        healed_at TIMESTAMPTZ DEFAULT NOW()
      )`);

    // Snapshot every row that would be updated
    const snap = await client.query(`
      INSERT INTO bookable_units_currency_heal_20260916
        (unit_id, property_id, account_name, property_name, unit_name, old_currency, new_currency)
      SELECT bu.id, p.id, a.name, p.name, bu.name, bu.currency, p.currency
        FROM bookable_units bu
        JOIN properties p ON p.id = bu.property_id
        LEFT JOIN accounts a ON a.id = p.account_id
       WHERE bu.currency IS DISTINCT FROM p.currency
         AND p.currency IS NOT NULL
       ON CONFLICT (unit_id) DO NOTHING
      RETURNING unit_id`);
    console.log('snapshot inserted:', snap.rowCount, 'rows');

    // Update
    const upd = await client.query(`
      UPDATE bookable_units bu
         SET currency = p.currency, updated_at = NOW()
        FROM properties p
       WHERE p.id = bu.property_id
         AND bu.currency IS DISTINCT FROM p.currency
         AND p.currency IS NOT NULL`);
    console.log('updated bookable_units:', upd.rowCount);

    // Drop the schema default so new inserts don't re-drift
    await client.query(`ALTER TABLE bookable_units ALTER COLUMN currency DROP DEFAULT`);
    console.log('dropped DEFAULT on bookable_units.currency');

    await client.query('COMMIT');
    console.log('done');

    // Post-check
    const post = await pool.query(`
      SELECT COUNT(*) AS n FROM bookable_units bu
        JOIN properties p ON p.id = bu.property_id
       WHERE bu.currency IS DISTINCT FROM p.currency AND p.currency IS NOT NULL`);
    console.log('remaining mismatches:', post.rows[0].n);

    const def = await pool.query(`
      SELECT column_default FROM information_schema.columns
       WHERE table_name='bookable_units' AND column_name='currency'`);
    console.log('current default:', def.rows[0].column_default);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('FAIL — rolled back:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
