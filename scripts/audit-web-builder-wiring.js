#!/usr/bin/env node
/**
 * Web Builder wiring audit — finds admin fields that aren't fully plumbed
 * through to the rendered page.
 *
 * A setting needs five things wired together:
 *   1. Admin input        public/gas-admin.html        <input id="wb-{section}-{field}">
 *   2. DB key             website_settings.settings    {"{field}": value}  (under section)
 *   3. API mapping        themes/.../functions.php     '{section}_{field}' => $website_{section}['{field}']
 *   4. Theme variable     themes/.../*.php             $var = $api['{section}_{field}']
 *   5. Render             themes/.../*.php             echo esc_attr($var)
 *
 * When any link is missing the operator sees "I saved it but the site
 * doesn't change". This script flags every gap.
 *
 * CLI:
 *   node scripts/audit-web-builder-wiring.js               text, light theme, issues only
 *   node scripts/audit-web-builder-wiring.js --all         include OK rows too
 *   node scripts/audit-web-builder-wiring.js --theme both  both themes
 *   node scripts/audit-web-builder-wiring.js --json        machine-readable
 *
 * Also exported as a module so server.js can serve the report at
 * /api/admin/audit/web-builder-wiring.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ADMIN_HTML = path.join(REPO, 'public/gas-admin.html');

// Fields to ignore in the input scan — UI plumbing, not saved values.
const IGNORE_SUFFIX = [
  '-picker', '-preview', '-preview-url', '-save-btn', '-loading', '-value',
  '-image-preview', '-search', '-error', '-list', '-modal', '-content',
  '-options', '-fields', '-upgrade-banner', '-app-fields',
  '-hostaway-fields', '-btn-options',
  // File picker inputs — the URL field next to them (-image-url) is
  // what gets saved; the bare -image input is just the OS file picker
  // and has no persisted value. False-positive source otherwise.
  '-image', '-image-file',
];
// Suffixes that indicate a language variant — collapse to the base.
const LANG_SUFFIXES = ['-en', '-fr', '-es', '-nl', '-de', '-ja'];
// Pro Builder variants. These admin inputs are part of the separate
// Pro Builder UI flow with its own backend path, not the Web Builder
// → theme pipeline this audit covers. Strip the suffix so the
// underlying field gets bucketed (it's audited via its non-pb name)
// or, if the field only exists in -pb form, dropped as out-of-scope.
const PRO_BUILDER_SUFFIX = '-pb';
// Sections that don't go through developer_get_api_settings (Pro Builder,
// modals, etc.) — skip to keep the report focused on Web Builder.
const SKIP_SECTIONS = new Set([
  'pb', 'shop', 'account', 'agency', 'booking', 'media',
  'partner', 'auth', 'login', 'signup', 'profile', 'theme', 'site',
]);
// Multi-word section prefixes — the admin id "wb-page-rooms-title-color"
// must be parsed as section="page-rooms", field="title-color", NOT
// section="page", field="rooms-title-color". Sourced from the list of
// $website_X variables defined in functions.php.
const MULTIWORD_SECTIONS = new Set([
  'page-about', 'page-attractions', 'page-blog', 'page-contact',
  'page-dining', 'page-gallery', 'page-impressum', 'page-offers',
  'page-privacy', 'page-properties', 'page-reviews', 'page-shop',
  'page-terms', 'page-portal', 'page-faq', 'page-rooms',
  'image-rows', 'badge-row',
]);
// Field tokens that signal a UI-only flag (filter, toggle, dev mode).
// Not perfect — operator-facing flags can match too — flagged for
// triage rather than auto-excluded.

// Looped families: fields like usp-item-1-title, slide-2-url etc. share
// one underlying array in the API. Collapse them to a single representative
// row so the report doesn't show 6 copies of the same wiring question.
const LOOP_PATTERNS = [
  { name: 'item-N',       re: /^(.*?)item-(\d+)(.*)$/      },
  { name: 'slide-N',      re: /^(.*?)slide-(\d+)(.*)$/     },
  { name: 'feature-N',    re: /^(.*?)feature-(\d+)(.*)$/   },
  { name: 'image-row-N',  re: /^(.*?)image-row-(\d+)(.*)$/   },
  { name: 'row-N',        re: /^(.*?)row-(\d+)(.*)$/         },
  { name: 'social-N',     re: /^(.*?)social-(\d+)(.*)$/    },
  { name: 'gallery-N',    re: /^(.*?)gallery-(\d+)(.*)$/   },
  { name: 'review-N',     re: /^(.*?)review(\d+)(.*)$/     },
  { name: 'faq-N',        re: /^(.*?)faq-(\d+)(.*)$/       },
  { name: 'link-N',       re: /^(.*?)link-(\d+)(.*)$/      },
  { name: 'partner-N',    re: /^(.*?)partner-(\d+)(.*)$/   },
];

function readFile(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
function safeReadDir(d) { try { return fs.readdirSync(d); } catch (_) { return []; } }

// ---- 1. Extract Web Builder input IDs from admin HTML ----------------------
function scanAdminFields(html) {
  const fields = new Map(); // key = "section/field", value = { section, field, ids: [], looped }
  const re = /\bid="wb-([a-z0-9-]+?)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let id = m[1];
    // Strip Pro Builder suffix before language so id-pb-en and id-en
    // both collapse to id. Pro Builder fields exit the audit entirely
    // for now (separate code path, separate audit later).
    if (id.endsWith(PRO_BUILDER_SUFFIX)) continue;
    for (const ls of LANG_SUFFIXES) {
      if (id.endsWith(ls + PRO_BUILDER_SUFFIX)) { id = null; break; } // -en-pb etc
      if (id.endsWith(ls)) { id = id.slice(0, -ls.length); break; }
    }
    if (!id) continue;
    let isUi = false;
    for (const sfx of IGNORE_SUFFIX) if (id.endsWith(sfx)) { isUi = true; break; }
    if (isUi) continue;
    // Determine section. Default is the first token; if the first two
    // tokens form a known multi-word section (page-rooms, page-blog, …),
    // use both. Otherwise the field absorbs the second token and never
    // matches the functions.php mapping (308 false positives without this).
    const firstDash = id.indexOf('-');
    if (firstDash < 0) continue;
    let section = id.slice(0, firstDash);
    let field = id.slice(firstDash + 1);
    const secondDash = field.indexOf('-');
    if (secondDash >= 0) {
      const twoToken = `${section}-${field.slice(0, secondDash)}`;
      if (MULTIWORD_SECTIONS.has(twoToken)) {
        section = twoToken;
        field = field.slice(secondDash + 1);
      }
    }
    if (SKIP_SECTIONS.has(section)) continue;

    // Loop collapse — usp/item-1-title and usp/item-2-title become one
    // row usp/item-N-title with `looped` set.
    let collapsedField = field;
    let looped = null;
    for (const lp of LOOP_PATTERNS) {
      const lm = field.match(lp.re);
      if (lm) {
        collapsedField = `${lm[1]}${lp.name.replace('-N', '-N')}${lm[3]}`.replace(/-{2,}/g, '-');
        looped = lp.name;
        break;
      }
    }

    const key = `${section}/${collapsedField}`;
    if (!fields.has(key)) fields.set(key, { section, field: collapsedField, ids: [], looped });
    fields.get(key).ids.push('wb-' + id);
  }
  return fields;
}

// ---- 2. Scan functions.php for API mappings --------------------------------
// Restricted to the body of developer_get_api_settings() so add_setting()
// calls in the Customize API don't pollute results.
function scanFunctionsMappings(php) {
  const mappings = new Map();
  const fnIdx = php.indexOf('function developer_get_api_settings');
  let body = php;
  if (fnIdx >= 0) {
    let depth = 0, i = php.indexOf('{', fnIdx), start = i;
    for (; i < php.length; i++) {
      const c = php[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { body = php.slice(start, i); break; } }
    }
  }
  // Some $website_X variables alias a section with a DIFFERENT db key
  // than the variable name suggests. Confirmed today (2026-06-21):
  //   $website_rooms = $website['page-rooms']   (the only one in light theme)
  // Without this alias, the audit mis-attributed every $website_rooms[...]
  // mapping as "section=rooms" while the admin and DB use "section=page-rooms".
  // Result: 13+ page-rooms fields false-flagged as NO_API_MAP.
  const VAR_TO_DB_SECTION_ALIAS = {
    'rooms': 'page-rooms',
  };
  const add = (apiKey, sectionVar, dbField) => {
    let section = sectionVar.replace(/_/g, '-');
    if (VAR_TO_DB_SECTION_ALIAS[section]) section = VAR_TO_DB_SECTION_ALIAS[section];
    // Field-name underscore/dash normalization: developer_get_ml_value()
    // in PHP accepts either underscore or dash and tries both internally
    // (line ~2354 of functions.php). functions.php authors mix the two
    // freely — e.g. 'details_title' (underscore) for ml fields, but the
    // admin id and DB key always use dash ('details-title'). Index both
    // forms here so the lookup matches regardless.
    const dbFieldDash = dbField.replace(/_/g, '-');
    mappings.set(`${section}/${dbFieldDash}`, apiKey);
    if (dbField !== dbFieldDash) mappings.set(`${section}/${dbField}`, apiKey);
  };
  // 'api_key' => $website_section['field']  (with or without ?? default)
  const reArr = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*\$website_([a-z_-]+)\[\s*['"]([a-z0-9_-]+)['"]\s*\]/g;
  // 'api_key' => developer_get_ml_value($website_section, 'field', ...)
  const reMl  = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*developer_get_ml_value\(\s*\$website_([a-z_-]+)\s*,\s*['"]([a-z0-9_-]+)['"]/g;
  // 'api_key' => ($website['section'] ?? array())['field']
  // Used for sections without their own $website_X variable (badge-row etc.).
  // The .*? between the section closing ] and the field opening [ must allow
  // ')' chars because the default expression is "?? array()" — that's the
  // bug that hid 6 badge-row mappings on the first pass.
  const reArrWrap = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*\(\s*\$website\[\s*['"]([a-z0-9_-]+)['"]\s*\][\s\S]*?\)\s*\[\s*['"]([a-z0-9_-]+)['"]\s*\]/g;
  // 'api_key' => developer_get_ml_value($website['section'] ?? array(), 'field', ...)
  // Same lesson — allow ')' in the default-expression slot.
  const reMlWrap = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*developer_get_ml_value\(\s*\$website\[\s*['"]([a-z0-9_-]+)['"]\s*\][\s\S]*?,\s*['"]([a-z0-9_-]+)['"]/g;
  let m;
  // Wrapped variants don't go through add() (their section name is
  // already in dash-case literal form from $website['section']) — so
  // index both underscore + dash forms of the field here too. Without
  // this, ml_value-on-wrap mappings would miss for the same reason
  // covered by the underscore↔dash note inside add().
  const addRaw = (apiKey, section, dbField) => {
    const dbFieldDash = dbField.replace(/_/g, '-');
    mappings.set(`${section}/${dbFieldDash}`, apiKey);
    if (dbField !== dbFieldDash) mappings.set(`${section}/${dbField}`, apiKey);
  };
  while ((m = reArr.exec(body)) !== null)     add(m[1], m[2], m[3]);
  while ((m = reMl.exec(body)) !== null)      add(m[1], m[2], m[3]);
  while ((m = reArrWrap.exec(body)) !== null) addRaw(m[1], m[2], m[3]);
  while ((m = reMlWrap.exec(body)) !== null)  addRaw(m[1], m[2], m[3]);
  return mappings;
}

// ---- 3. Scan theme templates for $api['key'] reads --------------------------
// Also catches the "direct API access" pattern used by template-privacy.php
// and template-terms.php:
//
//   $wp = $site_config['website']['page-privacy'];
//   echo $wp['business-address'];
//
// Templates that read via this pattern bypass developer_get_api_settings()
// entirely. Without recording them, every field they read shows as
// NO_API_MAP even though it's wired and rendered.
function scanThemeUsages(themeDir) {
  const out = { apiReads: new Set(), directReads: new Set() };
  const files = safeReadDir(themeDir).filter(f => f.endsWith('.php')).map(f => path.join(themeDir, f));
  for (const f of safeReadDir(themeDir)) {
    const sub = path.join(themeDir, f);
    try {
      if (!fs.statSync(sub).isDirectory()) continue;
    } catch (_) { continue; }
    for (const subf of safeReadDir(sub)) {
      if (subf.endsWith('.php')) files.push(path.join(sub, subf));
    }
  }
  const apiRe = /\$api(?:_settings)?\[\s*['"]([a-z0-9_]+)['"]\s*\]/g;
  // Pattern: $local = (...) $site_config['website']['section'] (...)
  // Captures local variable name + section so we can resolve later reads.
  const aliasRe = /\$([a-z_][a-z0-9_]*)\s*=[^;]*\$site_config\[\s*['"]website['"]\s*\]\s*\[\s*['"]([a-z0-9_-]+)['"]\s*\]/g;
  for (const f of files) {
    const src = readFile(f);
    let m;
    while ((m = apiRe.exec(src)) !== null) out.apiReads.add(m[1]);

    // Find each alias binding ($wp = ...website['section']...) and then
    // every $wp['field'] read in the same file. Per-file scope is fine —
    // PHP includes don't carry locals across files in this codebase.
    const aliases = new Map(); // localVar -> section
    let am;
    while ((am = aliasRe.exec(src)) !== null) {
      aliases.set(am[1], am[2]);
    }
    for (const [varName, section] of aliases.entries()) {
      const fieldRe = new RegExp(`\\$${varName}\\[\\s*['"]([a-z0-9_-]+)['"]\\s*\\]`, 'g');
      let fm;
      while ((fm = fieldRe.exec(src)) !== null) {
        const field = fm[1];
        out.directReads.add(`${section}/${field}`);
        // Index dash form too for the same underscore↔dash reason as
        // the mapping scanner.
        const fieldDash = field.replace(/_/g, '-');
        if (fieldDash !== field) out.directReads.add(`${section}/${fieldDash}`);
      }
    }
  }
  return out;
}

// ---- 4. Plugin-consumed detection ------------------------------------------
// Some Web Builder fields are read by plugins (gas-booking, gas-shop,
// gas-form etc.) rather than by the theme. They show up as NO_API_MAP
// because they're not in developer_get_api_settings, but they aren't
// broken — they go via a different API call.
function scanPluginConsumers(pluginsDir) {
  const consumed = new Set();
  for (const pdir of safeReadDir(pluginsDir)) {
    const pluginPath = path.join(pluginsDir, pdir);
    try { if (!fs.statSync(pluginPath).isDirectory()) continue; } catch (_) { continue; }
    for (const f of safeReadDir(pluginPath)) {
      if (!f.endsWith('.php') && !f.endsWith('.js')) continue;
      const src = readFile(path.join(pluginPath, f));
      // Look for direct references to website-settings field names.
      const re = /['"]([a-z][a-z0-9_-]{3,})['"]/g;
      let m;
      while ((m = re.exec(src)) !== null) consumed.add(m[1]);
    }
  }
  return consumed;
}

// ---- Status classifier -----------------------------------------------------
function classify(key, field, mappings, themeUsage, pluginConsumed) {
  const apiKey = mappings.get(key);
  if (apiKey) {
    if (!themeUsage.apiReads.has(apiKey)) {
      return { status: 'MAPPED_BUT_UNREAD', detail: `$api['${apiKey}'] set but no template reads it`, apiKey };
    }
    return { status: 'OK', detail: `→ $api['${apiKey}']`, apiKey };
  }
  // No api-mapping found. Check the alternative wiring channels before
  // declaring this a real bug.
  // Direct read: template-privacy/terms style — $wp = $site_config
  // ['website']['section']; ... $wp['field']. Recorded by scanThemeUsages.
  if (themeUsage.directReads && themeUsage.directReads.has(key)) {
    return { status: 'OK', detail: `→ read directly via $site_config['website']['${field.section}']['${field.field}']`, apiKey: null };
  }
  if (field.looped) {
    return { status: 'DYNAMIC_LOOPED', detail: `processed as array (${field.looped})`, apiKey: null };
  }
  // Plugin-consumed (booking plugin, shop, etc.). Heuristic: dashed
  // field name appears in plugin source code.
  if (pluginConsumed.has(field.field) || pluginConsumed.has(`${field.section}-${field.field}`)) {
    return { status: 'PLUGIN_CONSUMED', detail: 'referenced in a plugin file, not the theme', apiKey: null };
  }
  return { status: 'NO_API_MAP', detail: 'no mapping in developer_get_api_settings()', apiKey: null };
}

// ---- Run a single theme ----------------------------------------------------
function runForTheme(theme, fields, pluginConsumed) {
  const themeDir = path.join(REPO, `themes/gas-theme-developer-${theme}`);
  const funcs = readFile(path.join(themeDir, 'functions.php'));
  const mappings = scanFunctionsMappings(funcs);
  const usage = scanThemeUsages(themeDir);
  const rows = [];
  const counts = { OK: 0, NO_API_MAP: 0, MAPPED_BUT_UNREAD: 0, DYNAMIC_LOOPED: 0, PLUGIN_CONSUMED: 0 };
  for (const [key, field] of [...fields.entries()].sort()) {
    const v = classify(key, field, mappings, usage, pluginConsumed);
    counts[v.status] = (counts[v.status] || 0) + 1;
    rows.push({ section: field.section, field: field.field, status: v.status, detail: v.detail, api_key: v.apiKey, ids_count: field.ids.length });
  }
  return { theme, mappings_count: mappings.size, api_reads_count: usage.apiReads.size, rows, counts };
}

// ---- Public API ------------------------------------------------------------
function runAudit({ themes = ['light'] } = {}) {
  const adminHtml = readFile(ADMIN_HTML);
  const fields = scanAdminFields(adminHtml);
  const pluginConsumed = scanPluginConsumers(path.join(REPO, 'plugins'));
  const themeReports = themes.map(t => runForTheme(t, fields, pluginConsumed));
  return {
    admin_fields_count: fields.size,
    plugin_field_refs: pluginConsumed.size,
    themes: themeReports,
  };
}

module.exports = { runAudit };

// ---- CLI entry -------------------------------------------------------------
if (require.main === module) {
  const themeArg = (process.argv.find(a => a.startsWith('--theme=')) || '').split('=')[1] || 'light';
  const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg];
  const showAll = process.argv.includes('--all');
  const jsonMode = process.argv.includes('--json');
  const report = runAudit({ themes });
  if (jsonMode) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(0);
  }
  const ROW = (s, f, st, d) => `${s.padEnd(14)} ${f.padEnd(28)} ${st.padEnd(20)} ${d}`;
  console.log(`\nAdmin fields: ${report.admin_fields_count}  |  Plugin field refs: ${report.plugin_field_refs}`);
  let anyRed = false;
  for (const r of report.themes) {
    console.log(`\n=== Theme: gas-theme-developer-${r.theme} ===`);
    console.log(`Mappings: ${r.mappings_count}  |  API reads in templates: ${r.api_reads_count}\n`);
    console.log(ROW('SECTION', 'FIELD', 'STATUS', 'DETAIL'));
    console.log('-'.repeat(96));
    for (const row of r.rows) {
      const isReal = (row.status === 'NO_API_MAP' || row.status === 'MAPPED_BUT_UNREAD');
      if (isReal) anyRed = true;
      if (isReal || showAll) console.log(ROW(row.section, row.field, row.status, row.detail));
    }
    console.log('-'.repeat(96));
    const c = r.counts;
    console.log(`Summary: OK=${c.OK}  NO_API_MAP=${c.NO_API_MAP}  MAPPED_BUT_UNREAD=${c.MAPPED_BUT_UNREAD}  DYNAMIC_LOOPED=${c.DYNAMIC_LOOPED}  PLUGIN_CONSUMED=${c.PLUGIN_CONSUMED}`);
  }
  if (!showAll) console.log('\n(Showing only real-bug rows. Re-run with --all to see everything.)');
  process.exit(anyRed ? 1 : 0);
}
