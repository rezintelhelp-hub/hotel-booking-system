require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const DEPLOYED_SITE_ID = 226;
const ACCOUNT_ID = 152;

// Field names verified against the live /api/public/client/:id/site-config
// response for the developer-light theme (hero uses headline-en, usp uses
// item-N-title-en/text-en, etc). NOT the same as the naive "title-en"
// convention on other sections — the theme mapper is inconsistent.
const sections = {
  hero: {
    enabled: true,
    'headline-en': 'Turn your Fuerteventura holiday home into passive income',
    'subheadline-en': 'We handle the bookings, guests, pricing and paperwork. You get monthly income into your bank — and your home professionally cared for.',
    'button-text-en': 'Get Started',
    'button-link': '#register',
    'overlay': '40',
    'height': '85',
    'show-badge': '0',
    'show-search': false
  },
  intro: {
    enabled: true,
    'title-en': 'Owner-managed holiday homes, done properly',
    'text-en': "We're the owner-management arm of Invest Jet Real Estate, based on Fuerteventura. Full service, real people, transparent commission — the way holiday-home management should work."
  },
  usp: {
    enabled: true,
    'title-en': 'How we help owners',
    'subtitle-en': '',
    'card-bg': '#ffffff',
    'text-color': '#475569',
    'title-color': '#1e293b',
    'item-1-title-en': 'We do everything',
    'item-1-text-en': 'Photography, multi-channel listings (Airbnb, Booking.com, VRBO, direct), pricing that flexes with the season, guest messaging in four languages, check-in, cleaning and maintenance coordination. You approve the calendar; we do the rest.',
    'item-1-icon': '',
    'item-2-title-en': 'Paid every month',
    'item-2-text-en': 'Transparent commission — no hidden fees, no fake "optimisation" upsells. See exactly what each booking earned. Payout to your bank account every month with a full statement.',
    'item-2-icon': '',
    'item-3-title-en': 'Fuerteventura team, on the ground',
    'item-3-text-en': "We're not a call centre in another country. Our team lives on the island, meets your guests, handles the maintenance calls, and knows the local trades who actually turn up.",
    'item-3-icon': ''
  },
  about: {
    enabled: true,
    'title-en': 'Why Booking Assist',
    'text-en': "Booking Assist is the owner-management arm of Invest Jet Real Estate, based on Fuerteventura. We already look after dozens of properties across the island — from Corralejo to Costa Calma to Jandía.\n\nWe use professional systems — channel management, dynamic pricing, guest CRM — so nothing slips. But we're a local business, not a franchise. When you call, we answer.",
    'layout': 'image-left',
    'show-btn': false
  },
  cta: {
    enabled: true,
    'title-en': 'Ready to turn your property into income?',
    'text-en': "Register now — no obligation, no card required. We'll come back to you within 24 hours.",
    'btn-text-en': 'Get Started',
    'btn-url': '#register',
    'background': '#0f172a',
    'text-color': '#ffffff',
    'title-color': '#ffffff',
    'btn-bg': '#F97224',
    'btn-text-color': '#ffffff'
  }
};

(async () => {
  for (const [section, settings] of Object.entries(sections)) {
    const existing = await pool.query(
      'SELECT settings FROM website_settings WHERE deployed_site_id=$1 AND section=$2',
      [DEPLOYED_SITE_ID, section]
    );
    const merged = existing.rows.length
      ? Object.assign({}, existing.rows[0].settings || {}, settings)
      : settings;
    if (existing.rows.length) {
      await pool.query(
        'UPDATE website_settings SET settings=$1, updated_at=NOW() WHERE deployed_site_id=$2 AND section=$3',
        [merged, DEPLOYED_SITE_ID, section]
      );
      console.log('UPDATED', section);
    } else {
      await pool.query(
        'INSERT INTO website_settings (deployed_site_id, account_id, section, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [DEPLOYED_SITE_ID, ACCOUNT_ID, section, merged]
      );
      console.log('INSERTED', section);
    }
  }
  console.log('Done.');
  await pool.end();
})();
