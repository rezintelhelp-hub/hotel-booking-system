// Seed Sterling Scott's Web Builder with initial content matching the
// current static site. Steve refines from here in the UI. All inserts
// are UPSERTs into website_settings so re-runs are idempotent.

require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});

const ACCOUNT_ID = 291;
const DEPLOYED_SITE_ID = 234;

const sections = {
  styles: {
    'primary-color': '#0b0859',
    'accent-color': '#0b0859',
    'secondary-color': '#4d4d4d',
    'btn-primary-bg': '#0b0859',
    'btn-primary-text': '#ffffff',
    'btn-radius': '4',
    'btn-size': 'medium',
    'heading-font': 'inter',
    'subheading-font': 'inter',
    'body-font': 'inter',
    'heading-color': '#0b0859',
    'subheading-color': '#0b0859',
    'body-color': '#4d4d4d',
    'title-size': '44',
    'subheading-size': '30',
    'body-size': '16',
    'section-spacing': '20',
    'link-color': '#0b0859',
    'featured-bg': '#ffffff',
    'about-bg': '#f8fafc',
    'cta-bg': '#0b0859',
    'testimonials-bg': '#0b0859',
    'custom-css': ''
  },
  header: {
    'cta-text-en': 'Contact Us',
    'cta-link': '/contact/',
    'cta-bg': '#0b0859',
    'cta-text-color': '#ffffff'
  },
  hero: {
    enabled: true,
    // Theme reads `headline` + `subheadline` (via developer_get_ml_value)
    // — NOT `title`/`subtitle`. Steve caught this on the Sterling Scott
    // seed 2026-09-17.
    'headline-en': 'Sterling Scott Financial Adviser',
    'subheadline-en': 'Helping our clients achieve financial freedom and peace of mind',
    'show-search': false,
    'show-badge': false,
    'show-trust': false,
    'title-color': '#ffffff',
    'subtitle-color': '#ffffff',
    'overlay': '0.5'
  },
  intro: {
    enabled: true,
    position: 2,
    'title-en': 'Independent Financial Advice',
    'text-en': 'Sterling Scott is an independent financial adviser based in Cranleigh, Surrey. We provide guidance to clients across the South East on investment strategy, pensions, retirement planning, tax planning and estate planning.',
    'btn-text-en': 'Learn More',
    'btn-link': '/about-us/'
  },
  usp: {
    enabled: true,
    position: 3,
    'title-en': 'Specialist Areas We Cover',
    'subtitle-en': 'Independent, unbiased advice across the full range of financial planning',
    'bg-color': '#ffffff',
    'card-bg': '#f8fafc',
    'item-1-title-en': 'Investment Strategy',
    'item-1-text-en': 'Building a diversified portfolio aligned to your goals and risk tolerance.',
    'item-1-icon': '',
    'item-2-title-en': 'Retirement Planning',
    'item-2-text-en': 'Planning the income and lifestyle you want in retirement.',
    'item-2-icon': '',
    'item-3-title-en': 'Business & Family Protection',
    'item-3-text-en': 'Life cover, critical illness and income protection for your family and business.',
    'item-3-icon': '',
    'item-4-title-en': 'Tax Planning',
    'item-4-text-en': 'Efficient use of allowances and tax-advantaged structures.',
    'item-4-icon': '',
    'item-5-title-en': 'Estate Planning',
    'item-5-text-en': 'Passing on wealth to the next generation in the most efficient way.',
    'item-5-icon': '',
    'item-6-title-en': 'Long Term Care',
    'item-6-text-en': 'Planning ahead for future care costs so choice remains yours.',
    'item-6-icon': ''
  },
  cta: {
    enabled: true,
    position: 6,
    'title-en': 'Get In Touch',
    'subtitle-en': 'Call us on 01483 267 814 or email admin@sterlingscott.co.uk',
    'btn-text-en': 'Contact Us',
    'btn-link': '/contact/'
  },
  // Disable the sections that don't fit a financial-adviser site.
  featured: { enabled: false },
  services: { enabled: false },
  reviews: { enabled: false },
  about: { enabled: false },
  // Contact page content
  'page-contact': {
    enabled: true,
    'title-en': 'Contact Us',
    'subtitle-en': 'Get in touch to arrange an appointment',
    'phone': '01483 267 814',
    'mobile': '07917 611 814',
    'email': 'admin@sterlingscott.co.uk',
    'address': 'Sterling Scott Limited\n5 Ewhurst Road\nCranleigh\nSurrey\nGU6 7AA',
    'show-map': true,
    'show-form': true
  },
  'page-about': {
    enabled: true,
    'title-en': 'About Us',
    'subtitle-en': 'Independent financial advice you can trust',
    'content-en': 'Sterling Scott is an independent firm of financial advisers based in Cranleigh, Surrey. We provide clear, objective guidance to individuals and businesses across the South East. Our approach is straightforward: we take time to understand your goals, then build a plan that fits your circumstances.',
  },
  // Page toggles (visible in nav)
  'page-blog': { enabled: false },
  'page-attractions': { enabled: false },
  'page-rooms': { enabled: false },
  'page-properties': { enabled: false },
  'page-gallery': { enabled: false }
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [section, settings] of Object.entries(sections)) {
      await client.query(
        `INSERT INTO website_settings (account_id, deployed_site_id, section, settings, sync_source, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, 'ss-seed', NOW())
         ON CONFLICT (deployed_site_id, section) WHERE deployed_site_id IS NOT NULL
         DO UPDATE
           SET settings = EXCLUDED.settings, sync_source = 'ss-seed', updated_at = NOW()`,
        [ACCOUNT_ID, DEPLOYED_SITE_ID, section, JSON.stringify(settings)]
      );
      console.log('✓', section);
    }
    await client.query('COMMIT');
    console.log('\n✓ All sections seeded. Site: https://sterlingscott.sites.gas.travel/');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('✗ FAIL:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
