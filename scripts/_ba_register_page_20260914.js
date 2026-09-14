require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const WEBSITE_ID = 226;      // deployed_sites.id for booking-assist
const ACCOUNT_ID = 152;      // Invest Jet
const RECIPIENT_EMAIL = 'hello@invest-jet.com';

// One page_sections row for /register/. The form section posts to
// /api/public/form-submit; the 'gas-onboard-signup' form_name is the
// server-side hook that creates the GAS owner account + queues Beds24
// provisioning (endpoint hook added in server.js in the same commit).
const sections = [
  {
    type: 'text',
    heading_en: 'Register your property',
    body_en: "Tell us a bit about you and your holiday home. We'll be in touch within 24 hours to walk you through the next steps.\n\nNo card required. No obligation.",
    content_width: 'normal',
    text_align: 'left',
    background_color: '#ffffff'
  },
  {
    type: 'form',
    heading_en: '',
    body_en: '',
    content_width: 'normal',
    form_name: 'gas-onboard-signup',
    recipient_email: RECIPIENT_EMAIL,
    button_text_en: 'Register my property',
    button_text: 'Register my property',
    success_message: "Thanks! Your details are with us — we'll be in touch within 24 hours to complete your setup.",
    success_message_en: "Thanks! Your details are with us — we'll be in touch within 24 hours to complete your setup.",
    card_bg: '#ffffff',
    card_radius: '12',
    button_color: '#F97224',
    button_text_color: '#ffffff',
    background_color: '#f8fafc',
    fields: [
      { label_en: 'Your name',              field_type: 'text',     required: true,  placeholder_en: 'Full name' },
      { label_en: 'Email',                  field_type: 'email',    required: true,  placeholder_en: 'you@example.com' },
      { label_en: 'Phone',                  field_type: 'phone',    required: true,  placeholder_en: '+34 ...' },
      { label_en: 'Property name',          field_type: 'text',     required: true,  placeholder_en: 'e.g. Casa del Sol' },
      { label_en: 'Property location',      field_type: 'text',     required: true,  placeholder_en: 'Town or area on Fuerteventura' },
      { label_en: 'Number of bedrooms',     field_type: 'number',   required: true,  placeholder_en: '' },
      { label_en: 'Currently listed elsewhere?', field_type: 'select', required: false, placeholder_en: 'Choose...', options: 'Not listed anywhere,Airbnb,Booking.com,VRBO,Multiple channels,Other' },
      { label_en: 'Anything else we should know',                field_type: 'textarea', required: false, placeholder_en: 'Optional — beds, pool, quirks, current bookings on the calendar…' }
    ]
  }
];

(async () => {
  const existing = await pool.query(
    "SELECT id FROM page_sections WHERE account_id=$1 AND website_id=$2 AND page_slug='register'",
    [ACCOUNT_ID, WEBSITE_ID]
  );
  if (existing.rows.length) {
    await pool.query(
      "UPDATE page_sections SET sections=$1, page_title=$2, menu_visible=$3, enabled=true, updated_at=NOW() WHERE id=$4",
      [JSON.stringify(sections), 'Register', 'main_menu', existing.rows[0].id]
    );
    console.log('UPDATED page_sections id=' + existing.rows[0].id);
  } else {
    const r = await pool.query(
      "INSERT INTO page_sections (account_id, website_id, page_slug, page_title, menu_visible, menu_order, sections, enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()) RETURNING id",
      [ACCOUNT_ID, WEBSITE_ID, 'register', 'Register', 'main_menu', 5, JSON.stringify(sections)]
    );
    console.log('INSERTED page_sections id=' + r.rows[0].id);
  }

  await pool.end();
})();
