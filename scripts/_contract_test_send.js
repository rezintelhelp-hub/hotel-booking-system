// End-to-end test: pick Steve's latest 5 Rte des Thermes booking, render
// the contract template against it, insert a contract_instance, print the
// sign URL Steve can visit in a browser. Bypasses HTTP auth by using the
// same DB path as /api/admin/bookings/:id/send-contract. Read of booking
// is real; write is a real insert. Sign URL works against the deployed
// server.
const { Pool } = require('pg');
const crypto = require('crypto');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ACCOUNT_ID = 197;
const TEMPLATE_ID = parseInt(process.env.TEMPLATE_ID || '1', 10);
const BOOKING_ID_OVERRIDE = process.env.BOOKING_ID ? parseInt(process.env.BOOKING_ID, 10) : null;

// Inline copy of contractsHydrateContext + contractsRenderTemplate from
// server.js — kept in sync manually for this test script.
function fmtDate(d, lang = 'fr') {
  if (!d) return '';
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}
function fmtMoney(amt, currency) {
  if (amt == null || isNaN(parseFloat(amt))) return '';
  const c = currency === 'EUR' ? '€' : (currency || '');
  return `${parseFloat(amt).toFixed(2)} ${c}`;
}
function renderTemplate(html, ctx) {
  const resolve = (path) => {
    let cur = ctx;
    for (const seg of path.split('.')) { if (cur == null) return null; cur = cur[seg]; }
    return cur;
  };
  let out = html.replace(/\{\{#\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g, (_, path, inner) => {
    const v = resolve(path);
    const truthy = v != null && v !== '' && v !== false && v !== 0 && v !== '0';
    return truthy ? inner : '';
  });
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => { const v = resolve(path); return v == null ? '' : String(v); });
  return out;
}

(async () => {
  // Pick a booking on account 197 — most recent by arrival date if not
  // overridden by env var.
  let booking;
  if (BOOKING_ID_OVERRIDE) {
    const r = await p.query(`SELECT b.*, p.account_id AS acc_id, p.name AS prop_name, p.address AS prop_address, p.city AS prop_city, p.country AS prop_country, bu.name AS unit_name, bu.description AS unit_description, bu.max_guests AS unit_max_guests, bu.bedrooms AS unit_bedrooms, bu.bathrooms AS unit_bathrooms, bu.size_sqm AS unit_size_sqm, a.name AS acc_name, a.email AS acc_email FROM bookings b LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN accounts a ON a.id = p.account_id WHERE b.id = $1`, [BOOKING_ID_OVERRIDE]);
    booking = r.rows[0];
  } else {
    const r = await p.query(`SELECT b.*, p.account_id AS acc_id, p.name AS prop_name, p.address AS prop_address, p.city AS prop_city, p.country AS prop_country, bu.name AS unit_name, bu.description AS unit_description, bu.max_guests AS unit_max_guests, bu.bedrooms AS unit_bedrooms, bu.bathrooms AS unit_bathrooms, bu.size_sqm AS unit_size_sqm, a.name AS acc_name, a.email AS acc_email FROM bookings b LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN accounts a ON a.id = p.account_id WHERE p.account_id = $1 AND b.status = 'confirmed' AND b.guest_email IS NOT NULL AND b.guest_email <> '' ORDER BY b.arrival_date DESC LIMIT 1`, [ACCOUNT_ID]);
    booking = r.rows[0];
  }
  if (!booking) { console.error('No suitable booking found'); process.exit(1); }
  console.log(`Selected booking B${booking.id} — ${booking.guest_first_name} ${booking.guest_last_name} (${booking.guest_email}), arriving ${booking.arrival_date?.toISOString().slice(0,10)}`);

  const t = await p.query(`SELECT * FROM contract_templates WHERE id = $1 LIMIT 1`, [TEMPLATE_ID]);
  if (!t.rows[0]) { console.error(`Template ${TEMPLATE_ID} not found`); process.exit(1); }
  const template = t.rows[0];

  const s = await p.query(`SELECT * FROM account_contract_settings WHERE account_id = $1`, [booking.acc_id]);
  const settings = s.rows[0] || {};

  const signToken = crypto.randomBytes(24).toString('hex');
  const baseUrl = process.env.PUBLIC_URL || 'https://admin.gas.travel';
  const signUrl = `${baseUrl}/contract/sign/${signToken}`;

  const arrivalDate = booking.arrival_date ? new Date(booking.arrival_date) : null;
  const departureDate = booking.departure_date ? new Date(booking.departure_date) : null;
  const nights = arrivalDate && departureDate
    ? Math.round((departureDate - arrivalDate) / 86400000) : booking.nights_count || 0;
  const currency = booking.currency || 'EUR';

  const ctx = {
    booking: {
      id: booking.id, reference: `GAS-${booking.id}`,
      arrival_date: fmtDate(arrivalDate, 'fr'),
      arrival_date_en: fmtDate(arrivalDate, 'en'),
      departure_date: fmtDate(departureDate, 'fr'),
      departure_date_en: fmtDate(departureDate, 'en'),
      nights, weeks: nights > 0 ? Math.round(nights / 7) : 0,
      num_adults: booking.num_adults || 1, num_children: booking.num_children || 0,
      grand_total: fmtMoney(booking.grand_total, currency),
      deposit_amount: fmtMoney(booking.deposit_amount, currency),
      balance_amount: fmtMoney(booking.balance_amount, currency),
    },
    guest: {
      title: booking.guest_title || '',
      first_name: booking.guest_first_name || '', last_name: booking.guest_last_name || '',
      email: booking.guest_email || '', phone: booking.guest_phone || '',
      address: booking.guest_address || '', city: booking.guest_city || '',
      postcode: booking.guest_postcode || '', country: booking.guest_country || '',
    },
    property: {
      name: booking.prop_name || '', address: booking.prop_address || '',
      city: booking.prop_city || '', country: booking.prop_country || '',
    },
    room: {
      name: booking.unit_name || '', description: booking.unit_description || '',
      max_guests: booking.unit_max_guests || '',
    },
    landlord: {
      name: settings.landlord_name || '', company: settings.landlord_company || '',
      address: settings.landlord_address || '', postcode: settings.landlord_postcode || '',
      city: settings.landlord_city || '', country: settings.landlord_country || '',
      phone: settings.landlord_phone || '', email: settings.landlord_email || '',
      siret: settings.landlord_siret || '', tourist_let_reg: settings.tourist_let_reg || '',
      iban: settings.iban || '', bic: settings.bic || '',
      bank_account_name: settings.bank_account_name || '',
    },
    contract: { sign_url: signUrl, today: fmtDate(new Date(), 'fr') },
    security_deposit: fmtMoney(settings.default_security_deposit, 'EUR'),
    cleaning_fee: fmtMoney(settings.default_cleaning_fee, 'EUR'),
    tourist_tax: settings.default_tourist_tax_per_person_per_night != null
      ? `${parseFloat(settings.default_tourist_tax_per_person_per_night).toFixed(2)} €` : '',
  };

  const filledHtml = renderTemplate(template.html_body, ctx);

  const ins = await p.query(`
    INSERT INTO contract_instances
      (template_id, booking_id, account_id, sign_token, filled_html,
       status, guest_email, sent_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'sent', $6, NOW(), NOW(), NOW())
    RETURNING id, sign_token`,
    [template.id, booking.id, booking.acc_id, signToken, filledHtml, booking.guest_email]);

  console.log(`\n✓ Contract instance #${ins.rows[0].id} created`);
  console.log(`\n== SIGN URL ==\n${signUrl}\n`);
  console.log(`(No email sent — this is a bypass-auth test. Visit the URL in your browser to see the signing page live.)`);
  await p.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
