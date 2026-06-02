#!/usr/bin/env node
/**
 * theme-smoke.js — pre/post deploy smoke test for live client sites
 *
 * Why this exists: theme deploys go to every site running the theme
 * at once. There's no canary. When a regression slips through it shows
 * up as a customer call, not a CI failure. This script lets you snapshot
 * the visible state of every live site, deploy, then diff the new state
 * against the snapshot — catching sections that vanished or appeared.
 *
 * Usage:
 *   node scripts/theme-smoke.js snapshot                  → save current state
 *                                                            to .theme-smoke-snapshot.json
 *   node scripts/theme-smoke.js diff                      → compare current state
 *                                                            against the snapshot
 *   node scripts/theme-smoke.js check                     → quick health check
 *                                                            (HTTP 200 + non-trivial page size)
 *
 *   --out PATH                                            → custom snapshot file
 *   --against PATH                                        → diff against a custom snapshot
 *   --concurrency N                                       → parallel fetch limit (default 8)
 *   --timeout-ms N                                        → per-request timeout (default 15000)
 *   --include-frozen                                      → also check site_status='frozen'
 *   --hostname FOO                                        → limit to a single site by hostname
 *   --strict                                              → exit non-zero on any diff
 *
 * Typical workflow:
 *   1) node scripts/theme-smoke.js snapshot
 *   2) scp themes/.../*.php root@72.61.207.109:/var/www/wordpress/wp-content/themes/...
 *   3) ssh ... 'sudo -u www-data wp transient delete --all --network'
 *   4) node scripts/theme-smoke.js diff
 *   → If anything regressed, you see it BEFORE customers do.
 */
require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────────────
// CLI parsing
// ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const cmd = (argv[0] || '').toLowerCase();
function flag(name) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return null;
  return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
}
const SNAPSHOT_PATH = flag('out') || flag('against') || path.join(__dirname, '..', '.theme-smoke-snapshot.json');
const CONCURRENCY = parseInt(flag('concurrency')) || 8;
const TIMEOUT_MS = parseInt(flag('timeout-ms')) || 15000;
const INCLUDE_FROZEN = !!flag('include-frozen');
const ONLY_HOST = flag('hostname');
const STRICT = !!flag('strict');

// ────────────────────────────────────────────────────────────────────
// Terminal colours (cheap, no extra deps)
// ────────────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};
const ok = (s) => c.green + s + c.reset;
const warn = (s) => c.yellow + s + c.reset;
const bad = (s) => c.red + c.bold + s + c.reset;
const dim = (s) => c.dim + s + c.reset;

// ────────────────────────────────────────────────────────────────────
// Site discovery
// ────────────────────────────────────────────────────────────────────
async function loadLiveSites() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set — copy from Railway env or .env');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const statuses = INCLUDE_FROZEN ? "('live','frozen')" : "('live')";
    const r = await client.query(`
      SELECT id, account_id, site_url, custom_domain, template, site_status
      FROM deployed_sites
      WHERE site_status IN ${statuses}
        AND template LIKE 'developer-%'
        AND COALESCE(site_url, '') <> ''
      ORDER BY id
    `);
    return r.rows.map((s) => {
      // Prefer custom_domain when set, otherwise the site_url
      const url = (s.custom_domain && /^https?:\/\//.test(s.custom_domain))
        ? s.custom_domain
        : (s.custom_domain ? 'https://' + s.custom_domain : s.site_url);
      const u = new URL(url);
      return {
        id: s.id,
        account_id: s.account_id,
        hostname: u.hostname,
        url: url.replace(/\/?$/, '/'),
        template: s.template,
        site_status: s.site_status,
      };
    }).filter((s) => !ONLY_HOST || s.hostname === ONLY_HOST);
  } finally {
    await client.end();
  }
}

// ────────────────────────────────────────────────────────────────────
// Single-site probe
// ────────────────────────────────────────────────────────────────────
// What we extract is deliberately small — the diff has to be human-
// readable. We capture the SET of section CSS classes present (the
// `developer-*` names that mark each homepage section), the SET of
// JSON-LD @type values, presence of a few critical markers, and the
// page size. Anything else is noise.
async function probeSite(site) {
  const started = Date.now();
  const probe = {
    hostname: site.hostname,
    url: site.url,
    template: site.template,
    site_status: site.site_status,
    http_status: null,
    elapsed_ms: null,
    size_bytes: 0,
    sections: [],          // unique developer-* section markers (e.g. "developer-intro")
    schema_types: [],      // unique @type values from JSON-LD blocks
    flags: {},             // boolean checks
    error: null,
  };
  try {
    const cacheBust = '?_smoke=' + Date.now();
    const res = await axios.get(site.url + cacheBust, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'gas-theme-smoke/1.0' },
      // Allow self-signed certs in case a site is mid-cutover
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    probe.http_status = res.status;
    const html = typeof res.data === 'string' ? res.data : '';
    probe.size_bytes = Buffer.byteLength(html);

    // Unique section markers — every renderable homepage section in the
    // developer-* themes carries a "developer-{name}" class. We extract
    // the set of UNIQUE values rather than counts so adding/removing a
    // section is the signal, not a wording tweak that bumps occurrences.
    const sectionRe = /class="[^"]*?\b(developer-[a-z][a-z0-9-]+)\b/g;
    const sectionSet = new Set();
    let m;
    while ((m = sectionRe.exec(html)) !== null) sectionSet.add(m[1]);
    // Filter to identifiable section/block markers (the ones that signal
    // "section X is on the page"). Generic utility classes are skipped.
    const SIGNAL_PREFIXES = [
      'developer-hero', 'developer-intro', 'developer-wrap',
      'developer-featured', 'developer-usp', 'developer-about',
      'developer-services', 'developer-reviews', 'developer-cta',
      'developer-footer', 'developer-faqs', 'developer-page-hero',
      'developer-page-content', 'developer-rooms', 'developer-image-row',
      'developer-badge-row', 'developer-search',
    ];
    probe.sections = [...sectionSet]
      .filter((s) => SIGNAL_PREFIXES.some((p) => s === p || s.startsWith(p + '-')))
      .sort();

    // JSON-LD @type values — useful to flag "did SEO schema disappear" or
    // "did a new schema type appear unexpectedly" (e.g. our FAQ accordion
    // episode today would have shown FAQPage appearing).
    const ldRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    const typeSet = new Set();
    while ((m = ldRe.exec(html)) !== null) {
      const blob = m[1];
      const types = blob.match(/"@type"\s*:\s*"([^"]+)"/g) || [];
      for (const t of types) {
        const v = t.match(/"@type"\s*:\s*"([^"]+)"/);
        if (v) typeSet.add(v[1]);
      }
    }
    probe.schema_types = [...typeSet].sort();

    // Cheap boolean health checks. These name the things that matter.
    probe.flags = {
      has_hero:   sectionSet.has('developer-hero'),
      has_footer: sectionSet.has('developer-footer'),
      has_book_now: /\bbook[ -]?now\b/i.test(html),
      mentions_property: /<title>([^<]+)<\/title>/.test(html) && html.match(/<title>([^<]+)<\/title>/)[1].trim().length > 1,
      // Visible FAQ accordion — the regression from today
      visible_faq_accordion: /<section[^>]*class="[^"]*developer-faqs/.test(html),
      faqpage_schema: typeSet.has('FAQPage'),
    };
  } catch (e) {
    probe.error = e.code || e.message || String(e);
  }
  probe.elapsed_ms = Date.now() - started;
  return probe;
}

// ────────────────────────────────────────────────────────────────────
// Concurrency helper
// ────────────────────────────────────────────────────────────────────
async function runWithConcurrency(items, worker, n) {
  const results = new Array(items.length);
  let i = 0;
  const lanes = new Array(Math.min(n, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(lanes);
  return results;
}

// ────────────────────────────────────────────────────────────────────
// One-line per-site status
// ────────────────────────────────────────────────────────────────────
function renderOneLine(p) {
  const status = p.error ? bad(`ERR ${p.error}`)
    : p.http_status >= 200 && p.http_status < 300 ? ok(String(p.http_status))
    : warn(String(p.http_status));
  const size = p.size_bytes ? `${(p.size_bytes / 1024).toFixed(0)}kb` : '-';
  const elapsed = `${p.elapsed_ms}ms`;
  const sections = p.sections.length;
  const issues = [];
  if (!p.flags.has_hero) issues.push(bad('NO-HERO'));
  if (!p.flags.has_footer) issues.push(warn('no-footer'));
  if (p.flags.visible_faq_accordion) issues.push(warn('faq-accordion'));
  if (p.size_bytes && p.size_bytes < 8000) issues.push(warn('tiny'));
  return `${p.hostname.padEnd(38)} ${status.padEnd(20)} ${dim(size.padStart(6))} ${dim(elapsed.padStart(6))} ${dim('sections=' + sections)} ${issues.join(' ')}`;
}

// ────────────────────────────────────────────────────────────────────
// Diff
// ────────────────────────────────────────────────────────────────────
function diffSites(before, after) {
  // Both are arrays of probes. Key by hostname.
  const map = (arr) => Object.fromEntries(arr.map((p) => [p.hostname, p]));
  const A = map(before);
  const B = map(after);
  const hosts = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
  const lines = [];
  let regressions = 0;
  for (const h of hosts) {
    const a = A[h];
    const b = B[h];
    if (!a) { lines.push(`${warn('+ NEW   ')} ${h} (not in snapshot)`); continue; }
    if (!b) { lines.push(`${bad('- GONE  ')} ${h} (was in snapshot, missing now)`); regressions++; continue; }

    const issues = [];
    // HTTP downgrade
    if ((a.http_status >= 200 && a.http_status < 400) && !(b.http_status >= 200 && b.http_status < 400)) {
      issues.push(bad(`HTTP ${a.http_status}→${b.http_status}`)); regressions++;
    }
    // Size collapse: >40% smaller suggests a render path died
    if (a.size_bytes > 10000 && b.size_bytes < a.size_bytes * 0.6) {
      issues.push(bad(`SIZE ${(a.size_bytes / 1024).toFixed(0)}kb→${(b.size_bytes / 1024).toFixed(0)}kb (-${(100 - 100 * b.size_bytes / a.size_bytes).toFixed(0)}%)`));
      regressions++;
    }
    // Section delta
    const aSet = new Set(a.sections);
    const bSet = new Set(b.sections);
    const removed = a.sections.filter((s) => !bSet.has(s));
    const added = b.sections.filter((s) => !aSet.has(s));
    if (removed.length) { issues.push(bad('- ' + removed.join(', '))); regressions++; }
    if (added.length)   { issues.push(warn('+ ' + added.join(', '))); }
    // Boolean flags — only the negative direction counts as regression
    const negFlip = (k, label) => {
      if (a.flags?.[k] && !b.flags?.[k]) { issues.push(bad('lost-' + label)); regressions++; }
      if (!a.flags?.[k] && b.flags?.[k]) { issues.push(warn('gained-' + label)); }
    };
    negFlip('has_hero', 'hero');
    negFlip('has_footer', 'footer');
    negFlip('has_book_now', 'book-now');
    // Visible FAQ accordion gained = the regression we want to catch loudly
    if (!a.flags?.visible_faq_accordion && b.flags?.visible_faq_accordion) {
      issues.push(bad('FAQ-ACCORDION-APPEARED'));
      regressions++;
    }
    if (a.flags?.faqpage_schema && !b.flags?.faqpage_schema) {
      issues.push(warn('lost-FAQPage-schema'));
    }

    if (issues.length === 0) {
      lines.push(`${ok('OK     ')} ${dim(h)}`);
    } else {
      lines.push(`${bad('REGRESS')} ${h}  ${issues.join('  ')}`);
    }
  }
  return { lines, regressions };
}

// ────────────────────────────────────────────────────────────────────
// Commands
// ────────────────────────────────────────────────────────────────────
async function cmdProbeAll() {
  const sites = await loadLiveSites();
  if (sites.length === 0) {
    console.error(bad('No live sites found.'));
    process.exit(2);
  }
  console.log(dim(`Probing ${sites.length} site${sites.length === 1 ? '' : 's'} (concurrency=${CONCURRENCY}, timeout=${TIMEOUT_MS}ms)...`));
  const probes = await runWithConcurrency(sites, probeSite, CONCURRENCY);
  for (const p of probes) console.log(renderOneLine(p));
  return probes;
}

async function cmdSnapshot() {
  const probes = await cmdProbeAll();
  const payload = {
    saved_at: new Date().toISOString(),
    count: probes.length,
    sites: probes,
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(payload, null, 2));
  console.log('\n' + ok('Snapshot saved →') + ' ' + SNAPSHOT_PATH);
  const fail = probes.filter((p) => p.error || p.http_status < 200 || p.http_status >= 400).length;
  if (fail > 0) console.log(warn(`(${fail} site${fail === 1 ? '' : 's'} unreachable or non-2xx — snapshot still saved)`));
}

async function cmdDiff() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(bad('No snapshot at ' + SNAPSHOT_PATH));
    console.error(dim('Run `node scripts/theme-smoke.js snapshot` first.'));
    process.exit(2);
  }
  const before = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')).sites;
  console.log(dim(`Snapshot loaded (${before.length} site${before.length === 1 ? '' : 's'})`));
  console.log();
  const after = await cmdProbeAll();
  console.log();
  const { lines, regressions } = diffSites(before, after);
  for (const l of lines) console.log(l);
  console.log();
  if (regressions === 0) {
    console.log(ok('CLEAN — no regressions detected.'));
    process.exit(0);
  } else {
    console.log(bad(`${regressions} regression${regressions === 1 ? '' : 's'} found.`));
    process.exit(STRICT ? 1 : 0);
  }
}

async function cmdCheck() {
  const probes = await cmdProbeAll();
  const bad_ = probes.filter((p) => p.error || p.http_status < 200 || p.http_status >= 400 || !p.flags.has_hero);
  console.log();
  if (bad_.length === 0) {
    console.log(ok(`All ${probes.length} sites healthy.`));
    process.exit(0);
  } else {
    console.log(bad(`${bad_.length} of ${probes.length} sites unhealthy.`));
    process.exit(STRICT ? 1 : 0);
  }
}

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    if (cmd === 'snapshot') await cmdSnapshot();
    else if (cmd === 'diff') await cmdDiff();
    else if (cmd === 'check') await cmdCheck();
    else {
      console.log(`${c.bold}theme-smoke.js${c.reset} — pre/post deploy smoke test\n`);
      console.log('Commands:');
      console.log('  ' + ok('snapshot') + '   Save current state of every live site to .theme-smoke-snapshot.json');
      console.log('  ' + ok('diff') + '       Re-probe and diff against the snapshot');
      console.log('  ' + ok('check') + '      Quick health check (HTTP + hero present)');
      console.log('\nFlags:');
      console.log('  --out PATH         Custom snapshot file');
      console.log('  --against PATH     Diff against a custom snapshot');
      console.log('  --concurrency N    Parallel fetches (default 8)');
      console.log('  --timeout-ms N     Per-request timeout (default 15000)');
      console.log('  --include-frozen   Also probe site_status=frozen');
      console.log('  --hostname FOO     Limit to one hostname');
      console.log('  --strict           Exit non-zero on any diff');
      console.log('\nTypical pre-deploy workflow:');
      console.log('  node scripts/theme-smoke.js snapshot');
      console.log('  scp themes/.../*.php ... && ssh ... wp transient delete --all --network');
      console.log('  node scripts/theme-smoke.js diff');
      process.exit(0);
    }
  } catch (e) {
    console.error(bad('FATAL: ') + (e.stack || e.message || String(e)));
    process.exit(2);
  }
})();
