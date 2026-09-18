// Revert the seeded Web Builder content on Sterling Scott staging so
// Steve can build it up himself via the Web Builder UI. Leaves the
// shell intact (account, property, unit, deployed_sites row, WP blog,
// theme). Only clears my seeded website_settings rows.

require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

(async () => {
  try {
    const r = await pool.query(
      `DELETE FROM website_settings WHERE deployed_site_id = 234 RETURNING section`
    );
    console.log('✓ deleted', r.rowCount, 'website_settings rows for deployed_site_id=234');
    r.rows.forEach(row => console.log('   -', row.section));
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await pool.end();
  }
})();
