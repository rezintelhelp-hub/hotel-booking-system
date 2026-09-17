// Sterling Scott staging spin-up — reversible. Creates dummy account
// + dummy property + dummy bookable_unit + deployed_sites row.
// Does NOT create the WP blog (that runs via wp-cli on the VPS).
// Rollback SQL is written to stdout at the end for easy revert.

require('dotenv').config({path: '/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const acct = await client.query(
      `INSERT INTO accounts (name, email, status, plan, subscription_tier, country, currency, timezone)
       VALUES ($1, $2, 'active', 'free', 'standard', 'United Kingdom', 'GBP', 'Europe/London')
       RETURNING id, public_id, name, email`,
      ['Sterling Scott IFAs (friends & family)', 'sterlingscott+dummy@gas.travel']
    );
    const accountId = acct.rows[0].id;
    console.log('✓ accounts row inserted:', acct.rows[0]);

    // user_id=1 is the WP admin; the ACTUAL link to accounts is via
    // properties.account_id (matches every other real property row).
    const prop = await client.query(
      `INSERT INTO properties (user_id, account_id, name, status)
       VALUES (1, $1, $2, 'inactive')
       RETURNING id, name, status, account_id`,
      [accountId, 'Sterling Scott (placeholder — do not book)']
    );
    const propertyId = prop.rows[0].id;
    console.log('✓ properties row inserted:', prop.rows[0]);

    const unit = await client.query(
      `INSERT INTO bookable_units (property_id, name, max_guests, quantity)
       VALUES ($1, $2, 1, 0)
       RETURNING id, name, quantity`,
      [propertyId, 'Dummy Room (do not sell)']
    );
    const unitId = unit.rows[0].id;
    console.log('✓ bookable_units row inserted:', unit.rows[0]);

    const ds = await client.query(
      `INSERT INTO deployed_sites (account_id, site_url, site_name, site_status, site_type)
       VALUES ($1, $2, $3, 'development', 'multisite')
       RETURNING id, account_id, site_url, site_status`,
      [accountId, 'https://sterlingscott.sites.gas.travel/', 'Sterling Scott IFAs']
    );
    const deployedSiteId = ds.rows[0].id;
    console.log('✓ deployed_sites row inserted:', ds.rows[0]);

    await client.query('COMMIT');
    console.log('\n✓ TX committed. Records created:');
    console.log('   account_id  =', accountId);
    console.log('   property_id =', propertyId);
    console.log('   unit_id     =', unitId);
    console.log('   deployed_site_id =', deployedSiteId);
    console.log('\n─── ROLLBACK SQL (paste into psql if we need to unwind) ───');
    console.log(`DELETE FROM deployed_sites WHERE id = ${deployedSiteId};`);
    console.log(`DELETE FROM bookable_units WHERE id = ${unitId};`);
    console.log(`DELETE FROM properties WHERE id = ${propertyId};`);
    console.log(`DELETE FROM accounts WHERE id = ${accountId};`);
    console.log('\nNext: create WP multisite blog with slug=sterlingscott, then run _ss_link_blog.js with the returned blog_id.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('✗ FAIL — rolled back:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
