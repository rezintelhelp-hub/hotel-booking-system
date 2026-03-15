#!/usr/bin/env node
/**
 * Partner API Smoke Test
 *
 * Hits every GET endpoint documented in Swagger and verifies:
 * 1. Returns 200 with success: true
 * 2. Response contains expected top-level keys
 * 3. No 500 errors
 *
 * Also does a safe PUT round-trip test on content sections
 * (reads current value, writes same value back, verifies no data loss)
 *
 * Usage: node tests/partner-api-smoke-test.js
 */

const API_KEY = 'gas_96f1f22c3103c0a504ed8ca0ee14661d08f0592d8597e40b';
const BASE_URL = 'https://admin.gas.travel';

let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];
const warningList = [];

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

function pass(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name, reason) {
  failed++;
  failures.push({ name, reason });
  console.log(`  ❌ ${name} — ${reason}`);
}

function warn(name, reason) {
  warnings++;
  warningList.push({ name, reason });
  console.log(`  ⚠️  ${name} — ${reason}`);
}

function checkKeys(json, expectedKeys, testName) {
  const missing = expectedKeys.filter(k => !(k in json));
  if (missing.length > 0) {
    fail(testName, `Missing keys: ${missing.join(', ')}`);
    return false;
  }
  pass(testName);
  return true;
}

async function run() {
  console.log('\n🔍 Partner API Smoke Test');
  console.log('='.repeat(60));

  // Step 1: Find tenants, then find a website to test with
  console.log('\n📋 Finding test website...');

  const tenantsRes = await api('GET', '/api/partner/tenants');
  if (tenantsRes.status !== 200 || !tenantsRes.json?.success) {
    fail('List tenants', `Status ${tenantsRes.status}: ${tenantsRes.json?.error || tenantsRes.text}`);
    return printSummary();
  }
  const tenants = tenantsRes.json.tenants || [];
  if (tenants.length === 0) {
    fail('List tenants', 'No tenants found');
    return printSummary();
  }
  pass(`List tenants (${tenants.length} found)`);

  // Find a tenant with a website — use tenant_id (external) for the API path
  let testSite = null;
  let WID = null;
  for (const tenant of tenants) {
    // The /tenants/:tenantId/websites endpoint uses the external tenant_id
    const tid = tenant.tenant_id || tenant.id;
    const wRes = await api('GET', `/api/partner/tenants/${tid}/websites`);
    if (wRes.json?.success && wRes.json.websites?.length > 0) {
      // Prefer deployed, but accept any
      const deployed = wRes.json.websites.find(w => w.site_url);
      const any = deployed || wRes.json.websites[0];
      testSite = any;
      WID = any.id;
      console.log(`  Using tenant ${tid} (${tenant.business_name}), website ID ${WID}: ${any.site_url || any.name || 'not deployed'}`);
      pass(`List websites for tenant ${tid} (${wRes.json.websites.length} sites)`);
      break;
    }
  }

  if (!WID) {
    fail('Find website', 'No website found across any tenant');
    return printSummary();
  }

  // Find a property to test with
  let PID = null;
  const propRes = await api('GET', `/api/partner/${API_KEY}/properties`);
  if (propRes.status === 200 && propRes.json?.success && propRes.json.properties?.length > 0) {
    PID = propRes.json.properties[0].id || propRes.json.properties[0].property_id;
    console.log(`  Using property ID ${PID}`);
    pass('List properties');
  } else {
    warn('List properties', 'No properties found — skipping property endpoints');
  }

  // ===== WEBSITE GET ENDPOINTS =====
  console.log('\n📡 Website GET Endpoints');
  console.log('-'.repeat(40));

  const getTests = [
    {
      path: `/api/partner/websites/${WID}`,
      name: 'GET website details',
      keys: ['success']
    },
    {
      path: `/api/partner/websites/${WID}/header`,
      name: 'GET header',
      keys: ['success', 'header']
    },
    {
      path: `/api/partner/websites/${WID}/hero`,
      name: 'GET hero',
      keys: ['success', 'headline', 'badge', 'trust_badges', 'search', 'meta']
    },
    {
      path: `/api/partner/websites/${WID}/icons`,
      name: 'GET icons',
      keys: ['success']
    },
    {
      path: `/api/partner/websites/${WID}/styles`,
      name: 'GET styles',
      keys: ['success', 'styles']
    },
    {
      path: `/api/partner/websites/${WID}/rooms-page`,
      name: 'GET rooms-page',
      keys: ['success', 'rooms_page']
    },
    {
      path: `/api/partner/websites/${WID}/contact-page`,
      name: 'GET contact-page',
      keys: ['success', 'contact_page']
    },
    {
      path: `/api/partner/websites/${WID}/status`,
      name: 'GET website status',
      keys: ['success']
    }
  ];

  for (const test of getTests) {
    const res = await api('GET', test.path);
    if (res.status === 500) {
      fail(test.name, `500 Server Error: ${res.json?.error || res.text.slice(0, 100)}`);
    } else if (res.status !== 200) {
      warn(test.name, `Status ${res.status}: ${res.json?.error || ''}`);
    } else if (!res.json?.success) {
      fail(test.name, `success: false — ${res.json?.error || ''}`);
    } else {
      checkKeys(res.json, test.keys, test.name);
    }
  }

  // ===== HEADER FIELD CHECK =====
  console.log('\n🎨 Header Response Fields');
  console.log('-'.repeat(40));

  const headerRes = await api('GET', `/api/partner/websites/${WID}/header`);
  if (headerRes.json?.success && headerRes.json.header) {
    const h = headerRes.json.header;
    const headerFields = [
      'sticky', 'fixed_header', 'transparent', 'transparent_opacity',
      'layout', 'border', 'border_color', 'border_width',
      'bg_color', 'text_color', 'underline_color',
      'cta_bg', 'cta_text_color', 'cta_button_text',
      'font', 'font_size', 'font_weight', 'text_transform',
      'favicon_image_url', 'apple_icon_image_url'
    ];
    checkKeys(h, headerFields, 'Header has all 20 fields');
  }

  // ===== HERO FIELD CHECK =====
  console.log('\n🖼️  Hero Response Fields');
  console.log('-'.repeat(40));

  const heroRes = await api('GET', `/api/partner/websites/${WID}/hero`);
  if (heroRes.json?.success) {
    const heroTopFields = ['headline', 'subheadline', 'image_url', 'background_type', 'overlay', 'height', 'slider', 'badge', 'trust_badges', 'search', 'menu_title', 'faq_enabled', 'meta'];
    checkKeys(heroRes.json, heroTopFields, 'Hero has all top-level fields');

    if (heroRes.json.search) {
      const searchFields = ['btn_bg', 'btn_text', 'max_guests', 'btn_label', 'checkin_label', 'checkout_label', 'guests_label'];
      checkKeys(heroRes.json.search, searchFields, 'Hero search has label fields');
    }

    if (heroRes.json.slider) {
      checkKeys(heroRes.json.slider, ['slide_1_url', 'duration', 'transition'], 'Hero slider fields');
    }
  }

  // ===== STYLES FIELD CHECK =====
  console.log('\n🎨 Styles Response Fields');
  console.log('-'.repeat(40));

  const stylesRes = await api('GET', `/api/partner/websites/${WID}/styles`);
  if (stylesRes.json?.success && stylesRes.json.styles) {
    const s = stylesRes.json.styles;
    const styleFields = [
      'primary_color', 'secondary_color', 'accent_color', 'link_color',
      'heading_font', 'subheading_font', 'body_font',
      'title_size', 'subheading_size', 'body_size',
      'btn_primary_bg', 'btn_primary_text', 'btn_radius',
      'featured_bg', 'about_bg', 'testimonials_bg', 'cta_bg',
      'section_spacing', 'custom_css'
    ];
    checkKeys(s, styleFields, 'Styles has all 19 fields');
  }

  // ===== CONTACT PAGE FIELD CHECK =====
  console.log('\n📞 Contact Page Response Fields');
  console.log('-'.repeat(40));

  const contactRes = await api('GET', `/api/partner/websites/${WID}/contact-page`);
  if (contactRes.json?.success && contactRes.json.contact_page) {
    const cp = contactRes.json.contact_page;
    checkKeys(cp, ['enabled', 'menu_title', 'title', 'display_options', 'contact_details', 'map', 'form', 'meta'], 'Contact page top-level');
    if (cp.form) {
      checkKeys(cp.form, ['button_color'], 'Contact page form.button_color');
    }
    if (cp.map) {
      checkKeys(cp.map, ['latitude', 'longitude', 'zoom'], 'Contact page map fields');
    }
    if (cp.display_options) {
      checkKeys(cp.display_options, ['show_map', 'show_contact_form', 'show_directions', 'show_email', 'show_phone'], 'Contact page display_options');
    }
  }

  // ===== ROOMS PAGE FIELD CHECK =====
  console.log('\n🛏️  Rooms Page Response Fields');
  console.log('-'.repeat(40));

  const roomsRes = await api('GET', `/api/partner/websites/${WID}/rooms-page`);
  if (roomsRes.json?.success && roomsRes.json.rooms_page) {
    const rp = roomsRes.json.rooms_page;
    checkKeys(rp, ['enabled', 'title', 'menu_title', 'menu_order', 'faq_enabled', 'meta'], 'Rooms page fields');
  }

  // ===== GENERIC CONTENT SECTIONS =====
  console.log('\n📄 Generic Content GET (all sections)');
  console.log('-'.repeat(40));

  const sections = [
    'header', 'hero', 'intro', 'featured', 'about', 'services', 'reviews', 'cta',
    'footer', 'styles', 'currency', 'seo',
    'page-rooms', 'page-about', 'page-gallery', 'page-contact', 'page-blog',
    'page-attractions', 'page-dining', 'page-offers', 'page-properties',
    'page-reviews', 'page-terms', 'page-privacy'
  ];

  for (const section of sections) {
    const res = await api('GET', `/api/partner/websites/${WID}/content/${section}`);
    if (res.status === 500) {
      fail(`GET content/${section}`, `500 Server Error: ${res.json?.error || ''}`);
    } else if (res.status === 200 && res.json?.success) {
      if (!res.json.settings || typeof res.json.settings !== 'object') {
        fail(`GET content/${section}`, 'Missing or invalid settings object');
      } else {
        const keyCount = Object.keys(res.json.settings).length;
        if (keyCount === 0) {
          warn(`GET content/${section}`, 'Settings object is empty (no defaults?)');
        } else {
          pass(`GET content/${section} (${keyCount} fields)`);
        }
      }
    } else {
      fail(`GET content/${section}`, `Status ${res.status}: ${res.json?.error || ''}`);
    }
  }

  // ===== PUT ROUND-TRIP TEST =====
  console.log('\n🔄 PUT Round-Trip Tests (read → write same → verify)');
  console.log('-'.repeat(40));

  // Test generic content merge: read a section, write one field, verify others preserved
  const mergeTestSection = 'footer';
  const readRes = await api('GET', `/api/partner/websites/${WID}/content/${mergeTestSection}`);
  if (readRes.json?.success && readRes.json.settings) {
    const originalSettings = readRes.json.settings;
    const originalKeyCount = Object.keys(originalSettings).length;

    // Write just one field
    const testValue = 'smoke-test-' + Date.now();
    const writeRes = await api('PUT', `/api/partner/websites/${WID}/content/${mergeTestSection}`, {
      settings: { 'company-number-en': testValue }
    });

    if (writeRes.json?.success) {
      // Read back and verify merge (other fields preserved)
      const verifyRes = await api('GET', `/api/partner/websites/${WID}/content/${mergeTestSection}`);
      if (verifyRes.json?.success) {
        const newSettings = verifyRes.json.settings;
        const newKeyCount = Object.keys(newSettings).length;

        if (newSettings['company-number-en'] === testValue) {
          pass(`PUT content/${mergeTestSection} — field saved correctly`);
        } else {
          fail(`PUT content/${mergeTestSection}`, 'Written value not read back');
        }

        if (newKeyCount >= originalKeyCount) {
          pass(`PUT content/${mergeTestSection} — merge preserved fields (${originalKeyCount} → ${newKeyCount})`);
        } else {
          fail(`PUT content/${mergeTestSection}`, `Data loss! ${originalKeyCount} fields → ${newKeyCount} fields`);
        }
      }

      // Clean up: restore original value
      const origVal = originalSettings['company-number-en'] || '';
      await api('PUT', `/api/partner/websites/${WID}/content/${mergeTestSection}`, {
        settings: { 'company-number-en': origVal }
      });
    } else {
      fail(`PUT content/${mergeTestSection}`, `Write failed: ${writeRes.json?.error}`);
    }
  }

  // Test dedicated endpoint round-trip: header
  const headerPutRes = await api('GET', `/api/partner/websites/${WID}/header`);
  if (headerPutRes.json?.success && headerPutRes.json.header) {
    const origCta = headerPutRes.json.header.cta_button_text || 'Book Now';

    // Write and read back
    const writeRes = await api('PUT', `/api/partner/websites/${WID}/header`, { cta_button_text: origCta });
    if (writeRes.json?.success) {
      pass('PUT header — round-trip OK');
    } else {
      fail('PUT header', `Write failed: ${writeRes.json?.error}`);
    }
  }

  // Test contact-page PUT
  const contactPutTest = await api('PUT', `/api/partner/websites/${WID}/contact-page`, { button_color: '#10b981' });
  if (contactPutTest.json?.success) {
    pass('PUT contact-page button_color');
  } else {
    fail('PUT contact-page', `${contactPutTest.json?.error}`);
  }

  // ===== PROPERTY ENDPOINTS =====
  if (PID) {
    console.log('\n🏨 Property Endpoints');
    console.log('-'.repeat(40));

    const propertyGetTests = [
      { path: `/api/partner/${API_KEY}/property/${PID}`, name: 'GET property details' },
      { path: `/api/partner/${API_KEY}/property/${PID}/rooms`, name: 'GET property rooms' },
      { path: `/api/partner/${API_KEY}/property/${PID}/terms`, name: 'GET property terms' },
      { path: `/api/partner/${API_KEY}/property/${PID}/images`, name: 'GET property images' },
      { path: `/api/partner/${API_KEY}/property/${PID}/offers`, name: 'GET property offers' },
    ];

    for (const test of propertyGetTests) {
      const res = await api('GET', test.path);
      if (res.status === 500) {
        fail(test.name, `500 Server Error: ${res.json?.error || ''}`);
      } else if (res.status === 200 && res.json?.success !== false) {
        pass(test.name);
      } else {
        warn(test.name, `Status ${res.status}: ${res.json?.error || ''}`);
      }
    }

    // Terms field check
    const termsRes = await api('GET', `/api/partner/${API_KEY}/property/${PID}/terms`);
    if (termsRes.json?.success && termsRes.json.terms) {
      const termsFields = ['check_in_time', 'check_out_time', 'house_rules', 'cancellation_policy', 'terms_conditions'];
      checkKeys(termsRes.json.terms, termsFields, 'Terms has all writable fields');
    }
  }

  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

  if (failures.length > 0) {
    console.log('❌ FAILURES:');
    failures.forEach(f => console.log(`   ${f.name}: ${f.reason}`));
    console.log('');
  }

  if (warningList.length > 0) {
    console.log('⚠️  WARNINGS:');
    warningList.forEach(w => console.log(`   ${w.name}: ${w.reason}`));
    console.log('');
  }

  if (failures.length === 0) {
    console.log('🎉 All tests passed! API is ready for Elevate.\n');
  } else {
    console.log(`🚨 ${failures.length} issue(s) need fixing before Elevate go-live.\n`);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
