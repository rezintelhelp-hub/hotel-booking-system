// Set the hero image on Sterling Scott's staging site + tweak the CTA
// button link. Uses the current live site's `graphics/full-width-bg.jpg`
// as the placeholder background. Steve to swap in Web Builder when he
// uploads his own hero image.

require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

(async () => {
  try {
    // Merge hero image + related fields into the existing hero settings.
    const cur = await pool.query(
      `SELECT settings FROM website_settings WHERE deployed_site_id = 234 AND section = 'hero'`
    );
    const hero = cur.rows[0]?.settings || {};
    hero['image-url'] = 'https://sterlingscott.custom.gas.travel/graphics/full-width-bg.jpg';
    hero['overlay'] = '0.55';
    hero['overlay-color'] = '#0b0859';
    hero['height'] = '520';

    await pool.query(
      `UPDATE website_settings SET settings = $1::jsonb, updated_at = NOW()
        WHERE deployed_site_id = 234 AND section = 'hero'`,
      [JSON.stringify(hero)]
    );
    console.log('✓ hero image set:', hero['image-url']);
    console.log('✓ overlay:', hero['overlay'], hero['overlay-color']);
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await pool.end();
  }
})();
