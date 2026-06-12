#!/usr/bin/env node
// Submits the 4 GAS booking-lifecycle WhatsApp templates to Meta for review.
// Idempotent: skips templates that already exist on the WABA.
// Run: node scripts/wa-submit-lifecycle-templates.js [--dry-run]

require('dotenv').config();
const { Client } = require('pg');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');
const LANG = 'en';

// 5 body variables in this order, fixed across all templates so the
// helper at server.js:sendBookingLifecycleWhatsApp can fill them:
//   {{1}} guest first name
//   {{2}} property name
//   {{3}} check-in date (YYYY-MM-DD)
//   {{4}} check-out date (YYYY-MM-DD)
//   {{5}} event-specific (invoice number / booking id / amount / balance)
const TEMPLATES = [
  {
    name: 'booking_confirmation',
    category: 'UTILITY',
    body: 'Hi {{1}},\n\nYour booking at {{2}} is confirmed.\n\nCheck-in: {{3}}\nCheck-out: {{4}}\nReference: {{5}}\n\nWe look forward to welcoming you.',
    example: ['Sarah', 'Park Row Hotel', '2026-07-15', '2026-07-18', 'INV-1-001234']
  },
  {
    name: 'booking_cancelled',
    category: 'UTILITY',
    body: 'Hi {{1}},\n\nYour booking at {{2}} has been cancelled.\n\nCheck-in: {{3}}\nCheck-out: {{4}}\nReference: {{5}}\n\nAny applicable refund will be processed within 5-10 business days.',
    example: ['Sarah', 'Park Row Hotel', '2026-07-15', '2026-07-18', 'INV-1-001234']
  },
  {
    name: 'payment_receipt',
    category: 'UTILITY',
    body: 'Hi {{1}},\n\nPayment received for your stay at {{2}}.\n\nCheck-in: {{3}}\nCheck-out: {{4}}\nAmount: {{5}}\n\nThank you.',
    example: ['Sarah', 'Park Row Hotel', '2026-07-15', '2026-07-18', 'GBP 250.00']
  },
  {
    name: 'balance_reminder',
    category: 'UTILITY',
    body: 'Hi {{1}},\n\nA reminder that the remaining balance for your stay at {{2}} is due soon.\n\nCheck-in: {{3}}\nCheck-out: {{4}}\nBalance due: {{5}}\n\nPlease contact us if you need any help.',
    example: ['Sarah', 'Park Row Hotel', '2026-07-15', '2026-07-18', 'GBP 175.00']
  },
  {
    // Master → operator onboarding ping. Sent cold to a new operator
    // so they save the GAS Support WhatsApp number and reply, which
    // opens Meta's 24-hour conversation window for free-form support.
    // Single body param (operator first name) — keeps it simple and
    // approval-friendly.
    name: 'support_welcome',
    category: 'UTILITY',
    body: 'Hi {{1}},\n\nThis is your GAS Travel Support line on WhatsApp.\n\nPlease save this number as "GAS Support" in your contacts and reply to this message so we can connect it to your account.\n\nAfter that we can help you with any questions whenever you need us.\n\n— GAS Travel Support',
    example: ['Tracey']
  }
];

function metaCall(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'graph.facebook.com',
      path,
      method,
      headers: { Authorization: 'Bearer ' + token }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, json: { raw: buf } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cfg = await c.query("SELECT waba_id, access_token FROM gas_whatsapp_configs WHERE id = 1");
  const { waba_id, access_token } = cfg.rows[0];
  await c.end();

  console.log('WABA:', waba_id);
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'SUBMIT');
  console.log('Language:', LANG);
  console.log('---');

  // Get existing templates so we skip ones already submitted.
  const existing = await metaCall('GET', `/v25.0/${waba_id}/message_templates?fields=name,language,status&limit=100`, access_token);
  const existingByName = new Map();
  (existing.json?.data || []).forEach(t => existingByName.set(`${t.name}:${t.language}`, t.status));

  for (const tpl of TEMPLATES) {
    const key = `${tpl.name}:${LANG}`;
    if (existingByName.has(key)) {
      console.log(`[skip] ${tpl.name} (${LANG}) already exists — status: ${existingByName.get(key)}`);
      continue;
    }

    const payload = {
      name: tpl.name,
      language: LANG,
      category: tpl.category,
      allow_category_change: true,
      components: [
        {
          type: 'BODY',
          text: tpl.body,
          example: { body_text: [tpl.example] }
        }
      ]
    };

    if (DRY_RUN) {
      console.log(`[dry] would submit ${tpl.name}:`, JSON.stringify(payload, null, 2));
      continue;
    }

    const r = await metaCall('POST', `/v25.0/${waba_id}/message_templates`, access_token, payload);
    if (r.status >= 200 && r.status < 300) {
      console.log(`[ok] ${tpl.name} submitted — id ${r.json.id}, status ${r.json.status}`);
    } else {
      console.log(`[err] ${tpl.name}:`, JSON.stringify(r.json, null, 2));
    }
  }

  console.log('---');
  console.log('Done. Approval typically takes minutes to a few hours for UTILITY templates.');
  console.log('Re-run this script later — it will only submit missing ones.');
})().catch(e => { console.error(e); process.exit(1); });
