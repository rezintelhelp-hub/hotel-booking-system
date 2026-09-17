// Link the new WP blog_id back to the deployed_sites row created earlier.
require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});
(async () => {
  try {
    const r = await pool.query(
      `UPDATE deployed_sites SET blog_id = $1, updated_at = NOW()
        WHERE id = $2 RETURNING id, account_id, blog_id, site_url, site_status`,
      [237, 234]
    );
    console.log('✓ deployed_sites linked:', r.rows[0]);
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await pool.end();
  }
})();
