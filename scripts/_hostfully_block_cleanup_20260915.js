// One-shot cleanup: delete every synthetic 'Hostfully Block' booking row.
// These were created by the server.js:13411 BLOCK-lead sync (killed
// 2026-09-15) that never had a delete-when-gone pass, so stale blocks
// accumulated over months and hid rooms from booking searches.
//
// Reversible: every deleted row snapshotted to
// bookings_hostfully_block_heal_20260915 first. Restore via
//   INSERT INTO bookings SELECT (matching cols) FROM bookings_hostfully_block_heal_20260915;
//
// Only affects account 219 (MTN合同会社 / Togari-Nozawa — the only Hostfully
// client). Steve 2026-09-15.

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Heal audit table — mirror of bookings for the rows we're about to zap.
    // CREATE + INSERT in one shot so structure matches whatever bookings looks
    // like today (no column drift risk).
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings_hostfully_block_heal_20260915
      (LIKE bookings INCLUDING ALL)
    `);

    const preview = await client.query(`
      SELECT COUNT(*) AS n
      FROM bookings
      WHERE status = 'blocked'
        AND booking_source = 'hostfully'
        AND guest_first_name = 'Hostfully'
        AND guest_last_name = 'Block'
    `);
    console.log('Rows to snapshot + delete:', preview.rows[0].n);

    const snap = await client.query(`
      INSERT INTO bookings_hostfully_block_heal_20260915
      SELECT * FROM bookings
      WHERE status = 'blocked'
        AND booking_source = 'hostfully'
        AND guest_first_name = 'Hostfully'
        AND guest_last_name = 'Block'
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Snapshotted:', snap.rowCount);

    const del = await client.query(`
      DELETE FROM bookings
      WHERE status = 'blocked'
        AND booking_source = 'hostfully'
        AND guest_first_name = 'Hostfully'
        AND guest_last_name = 'Block'
    `);
    console.log('Deleted:', del.rowCount);

    await client.query('COMMIT');
    console.log('Done. To roll back:');
    console.log("  INSERT INTO bookings SELECT * FROM bookings_hostfully_block_heal_20260915 ON CONFLICT (id) DO NOTHING;");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, rolled back:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})();
