#!/usr/bin/env node
/**
 * Web Builder wiring audit — finds admin fields that aren't fully plumbed
 * through to the rendered page.
 *
 * A Web Builder setting needs five things wired in lockstep:
 *
 *   1. Admin input        public/gas-admin.html        <input id="wb-{section}-{field}">
 *   2. DB key             website_settings.settings    {"{field}": value}  (stored under section)
 *   3. API mapping        themes/.../functions.php     '{section}_{field}' => $website_{section}['{field}']
 *   4. Theme variable     themes/.../*.php             $varname = $api['{section}_{field}']
 *   5. Render             themes/.../*.php             echo esc_attr($varname)
 *
 * When any link is missing the operator sees "I set it but the site
 * doesn't change". This script flags every link gap so we can fix the
 * wiring before the operator hits it.
 *
 * Usage:    node scripts/audit-web-builder-wiring.js [--theme light|dark]
 * Output:   table to stdout, plus exit 1 if any RED rows.
 *
 * Heuristic — not perfect, but catches the common breakage class
 * (missing mapping in functions.php, mapped-but-not-rendered).
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ADMIN_HTML = path.join(REPO, 'public/gas-admin.html');

// Themes to check. light is default; pass --theme dark|both to widen.
const themeArg = (process.argv.find(a => a.startsWith('--theme=')) || '').split('=')[1] || 'light';
const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg];

// Fields to ignore in the input scan — UI plumbing, not saved values.
const IGNORE_SUFFIX = [
  '-picker', '-preview', '-preview-url', '-save-btn', '-loading', '-value',
  '-image-preview', '-search', '-error', '-list', '-modal', '-content',
  '-options', '-fields',
];
// Suffixes that indicate a language variant — collapse them to the base.
const LANG_SUFFIXES = ['-en', '-fr', '-es', '-nl', '-de', '-ja'];
// Sections that don't go through developer_get_api_settings (Pro Builder,
// modals, etc.) — skip to keep the report focused on Web Builder.
const SKIP_SECTIONS = new Set([
  'pb', 'shop', 'rooms', 'account', 'agency', 'booking', 'media',
  'partner', 'auth', 'login', 'signup', 'profile', 'theme', 'site',
]);

function readFile(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

// ---- 1. Extract Web Builder input IDs from admin HTML ---------------
function scanAdminFields(html) {
  const fields = new Map(); // key = "section/field", value = { section, field, ids: [] }
  const re = /\bid="wb-([a-z0-9-]+?)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let id = m[1];
    // Strip language suffix
    for (const ls of LANG_SUFFIXES) if (id.endsWith(ls)) { id = id.slice(0, -ls.length); break; }
    // Strip UI-plumbing suffixes
    let isUi = false;
    for (const sfx of IGNORE_SUFFIX) if (id.endsWith(sfx)) { isUi = true; break; }
    if (isUi) continue;
    // First token = section
    const dash = id.indexOf('-');
    if (dash < 0) continue;
    const section = id.slice(0, dash);
    if (SKIP_SECTIONS.has(section)) continue;
    const field = id.slice(dash + 1);
    const key = `${section}/${field}`;
    if (!fields.has(key)) fields.set(key, { section, field, ids: [] });
    fields.get(key).ids.push('wb-' + id);
  }
  return fields;
}

// ---- 2. Scan functions.php for $api mapping ------------------------------
// Restricted to the body of developer_get_api_settings() — the function
// that flattens $website[section][field] into the $api[key] dict consumed
// by templates. add_setting() calls in the Customize API also match the
// 'key' => 'value' shape but they aren't what we care about.
//
// Matches the three common right-hand-side patterns:
//   A. 'api_key' => $website_section['field']
//   B. 'api_key' => $website_section['field'] ?? '#default'
//   C. 'api_key' => developer_get_ml_value($website_section, 'field', $lang)
function scanFunctionsMappings(php) {
  const mappings = new Map();
  // Slice to the body of developer_get_api_settings(). The function is
  // declared roughly: `function developer_get_api_settings() { ... }`.
  // Heuristic — first `function developer_get_api_settings` to the
  // matching closing brace (we use the next-blank-line-followed-by-`}`
  // pattern, fallback to end-of-file).
  const fnIdx = php.indexOf('function developer_get_api_settings');
  let body = php;
  if (fnIdx >= 0) {
    // Find matching close brace by simple depth counting.
    let depth = 0, i = php.indexOf('{', fnIdx), start = i;
    for (; i < php.length; i++) {
      const c = php[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { body = php.slice(start, i); break; } }
    }
  }
  // Pattern A/B — direct array access
  const reArr = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*\$website_([a-z_-]+)\[\s*['"]([a-z0-9_-]+)['"]\s*\]/g;
  let m;
  while ((m = reArr.exec(body)) !== null) {
    const apiKey = m[1];
    const sectionVar = m[2].replace(/_/g, '-');
    const dbField = m[3];
    mappings.set(`${sectionVar}/${dbField}`, apiKey);
  }
  // Pattern C — developer_get_ml_value() helper
  const reMl = /['"]([a-z][a-z0-9_]+)['"]\s*=>\s*developer_get_ml_value\(\s*\$website_([a-z_-]+)\s*,\s*['"]([a-z0-9_-]+)['"]/g;
  while ((m = reMl.exec(body)) !== null) {
    const apiKey = m[1];
    const sectionVar = m[2].replace(/_/g, '-');
    const dbField = m[3];
    mappings.set(`${sectionVar}/${dbField}`, apiKey);
  }
  return mappings;
}

// ---- 3. Scan theme templates for $api['key'] reads + var renders ------
function scanThemeUsages(themeDir) {
  const out = { apiReads: new Set(), renderedVars: new Set() };
  const files = fs.readdirSync(themeDir)
    .filter(f => f.endsWith('.php'))
    .map(f => path.join(themeDir, f));
  // Search subdirs one level deep (templates/, parts/, etc.)
  for (const f of fs.readdirSync(themeDir, { withFileTypes: true })) {
    if (!f.isDirectory()) continue;
    const sub = path.join(themeDir, f.name);
    for (const subf of fs.readdirSync(sub)) {
      if (subf.endsWith('.php')) files.push(path.join(sub, subf));
    }
  }
  const apiRe = /\$api(?:_settings)?\[\s*['"]([a-z0-9_]+)['"]\s*\]/g;
  const varRe = /<\?php\s+echo\s+esc_attr\(\s*\$([a-z0-9_]+)\b/g;
  for (const f of files) {
    const src = readFile(f);
    let m;
    while ((m = apiRe.exec(src)) !== null) out.apiReads.add(m[1]);
    while ((m = varRe.exec(src)) !== null) out.renderedVars.add(m[1]);
  }
  return out;
}

// ---- Status classifier ------------------------------------------------
function classify(fieldKey, mappings, themeUsage) {
  const apiKey = mappings.get(fieldKey);
  if (!apiKey) return { status: 'NO_API_MAP', detail: 'functions.php has no mapping for this field' };
  if (!themeUsage.apiReads.has(apiKey)) {
    return { status: 'MAPPED_BUT_UNREAD', detail: `$api['${apiKey}'] is set but no template reads it` };
  }
  return { status: 'OK', detail: `→ $api['${apiKey}']` };
}

// ---- Main -------------------------------------------------------------
const adminHtml = readFile(ADMIN_HTML);
if (!adminHtml) { console.error('Could not read', ADMIN_HTML); process.exit(2); }
const fields = scanAdminFields(adminHtml);

const reports = themes.map(t => {
  const themeDir = path.join(REPO, `themes/gas-theme-developer-${t}`);
  const funcs = readFile(path.join(themeDir, 'functions.php'));
  const mappings = scanFunctionsMappings(funcs);
  const usage = scanThemeUsages(themeDir);
  return { theme: t, mappings, usage };
});

let anyRed = false;
const ROW = (s, f, st, d) => `${s.padEnd(14)} ${f.padEnd(28)} ${st.padEnd(20)} ${d}`;
for (const r of reports) {
  console.log(`\n=== Theme: gas-theme-developer-${r.theme} ===`);
  console.log(`Admin fields: ${fields.size}  |  Functions.php mappings: ${r.mappings.size}  |  API reads in templates: ${r.usage.apiReads.size}\n`);
  console.log(ROW('SECTION', 'FIELD', 'STATUS', 'DETAIL'));
  console.log('-'.repeat(96));
  const sortedKeys = [...fields.keys()].sort();
  const counts = { OK: 0, NO_API_MAP: 0, MAPPED_BUT_UNREAD: 0 };
  for (const key of sortedKeys) {
    const { section, field } = fields.get(key);
    const verdict = classify(key, r.mappings, r.usage);
    counts[verdict.status]++;
    if (verdict.status !== 'OK') anyRed = true;
    if (verdict.status !== 'OK' || process.argv.includes('--all')) {
      console.log(ROW(section, field, verdict.status, verdict.detail));
    }
  }
  console.log('-'.repeat(96));
  console.log(`Summary: OK=${counts.OK}  NO_API_MAP=${counts.NO_API_MAP}  MAPPED_BUT_UNREAD=${counts.MAPPED_BUT_UNREAD}`);
}

if (!process.argv.includes('--all')) {
  console.log('\n(Showing only fields with issues. Re-run with --all to see fully-wired fields too.)');
}
process.exit(anyRed ? 1 : 0);
