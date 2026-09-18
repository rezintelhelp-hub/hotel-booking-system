// Sterling Scott — header section only (per screenshot from Steve).
// Navy background, white logo image from current site, phone CTA.

require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

const header = {
  'bg': '#0b0859',
  'text-color': '#ffffff',
  'logo-color': '#ffffff',
  'logo-image-url': 'https://sterlingscott.custom.gas.travel/graphics/logo.png',
  'logo-size': '60',
  'cta-button-enabled': true,
  'cta-button-text-en': '01483 267 814',
  'cta-link': 'tel:01483267814',
  'cta-bg': '#1a1470',
  'cta-text-color': '#ffffff',
  'cta-style': 'solid',
  'sticky': true,
  'border': false
};

// Also style overrides so navy is consistent across the site
const styles = {
  'primary-color': '#0b0859',
  'accent-color': '#0b0859',
  'btn-primary-bg': '#0b0859',
  'btn-primary-text': '#ffffff',
  'heading-color': '#0b0859',
  'subheading-color': '#0b0859',
  'body-color': '#4d4d4d',
  'link-color': '#0b0859',
  'btn-radius': '4',
  'heading-font': 'inter',
  'body-font': 'inter'
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [section, settings] of [['header', header], ['styles', styles]]) {
      await client.query(
        `INSERT INTO website_settings (account_id, deployed_site_id, section, settings, sync_source, updated_at)
         VALUES (291, 234, $1, $2::jsonb, 'ss-header-only', NOW())
         ON CONFLICT (deployed_site_id, section) WHERE deployed_site_id IS NOT NULL
         DO UPDATE SET settings = EXCLUDED.settings, sync_source = 'ss-header-only', updated_at = NOW()`,
        [section, JSON.stringify(settings)]
      );
      console.log('✓', section);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
