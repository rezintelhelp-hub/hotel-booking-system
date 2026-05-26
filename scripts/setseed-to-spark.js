#!/usr/bin/env node
/**
 * setseed-to-spark.js
 *
 * Pull static_pages from a Setseed site on the old Rezintel server and
 * insert each as a Spark in GAS. Idempotent (matches by source_external_id =
 * "setseed:<static_pages_id>"), so safe to re-run.
 *
 * Usage:
 *   node scripts/setseed-to-spark.js \
 *     --setseed-db setseed_wwwlehmannhousecom5x5gp57chag \
 *     --account-id 4 \
 *     [--dry-run] [--limit 5]
 *
 * Tag mapping (skip = already in another GAS app, redirect = create only a
 * 301 entry, spark = import as a Spark):
 *   Blog articles    → skip (already in blog_posts)
 *   Attractions      → skip (already in attractions)
 *   Properties       → redirect-only (already covered by GAS rooms)
 *   Main menu        → skip (Web Builder owns these pages)
 *   Default tag      → skip (auto-applied, no curation signal)
 *   TEST             → skip
 *   March Offer 2020 → skip (expired)
 *   Untagged         → spark
 *   everything else  → spark (Best Kept Secrets, Paranormal, Tour, Dining,
 *                              Online Gift Shop, Events sub-pages, etc.)
 *
 * Each Spark gets:
 *   - slug         = Setseed url_str (preserves SEO)
 *   - title        = Setseed pagetitle
 *   - body         = Setseed content (sanitised)
 *   - hero_image   = first <img src=…> from content (if any)
 *   - subtitle     = Setseed summary (truncated to 500)
 *   - meta_title   = Setseed pagetitle (truncated to 60)
 *   - meta_desc    = Setseed summary or first 160 chars of content
 *   - is_published = true (operator can unpublish individually)
 *   - source_external_id = "setseed:<id>"
 *
 * REQUIREMENTS:
 *   npm install mysql2 (if not present)
 *   .env contains DATABASE_URL (Railway), SETSEED_SSH_HOST + SETSEED_SSH_KEY
 *   or just run via SSH tunnel:
 *     ssh -L 3307:127.0.0.1:3306 root@139.162.234.112
 *   then set --mysql-port 3307
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg, i, a) => {
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = a[i + 1];
      return [key, next && !next.startsWith('--') ? next : true];
    }
    return null;
  }).filter(Boolean)
);

if (!args['setseed-db'] || !args['account-id']) {
  console.error('Usage: node scripts/setseed-to-spark.js --setseed-db <db> --account-id <id> [--dry-run] [--limit N]');
  process.exit(1);
}

const SETSEED_DB = args['setseed-db'];
const ACCOUNT_ID = parseInt(args['account-id'], 10);
const DRY_RUN = args['dry-run'] === true;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const MYSQL_HOST = args['mysql-host'] || '139.162.234.112';
const MYSQL_PORT = parseInt(args['mysql-port'] || '3306', 10);
const MYSQL_USER = args['mysql-user'] || 'setseed_master';
const MYSQL_PASS = args['mysql-pass'] || process.env.SETSEED_MYSQL_PASS || 'hrDpymeXhGjcBgvT8GTZ';
// Canonical public URL of the original site — used to absolute-ize relative
// image URLs (Setseed stores /images/foo.jpg, but on GAS that 404s).
// Required arg — pass --setseed-url https://lehmannhouse.com
const SETSEED_URL = args['setseed-url'];
if (!SETSEED_URL) {
  console.error('Missing --setseed-url. Pass the canonical public domain of the source site, e.g. --setseed-url https://lehmannhouse.com');
  process.exit(1);
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client } = require('pg');
const mysql = require('mysql2/promise');

const TAG_SKIP = new Set(['Blog articles', 'Attractions', 'Properties', 'Main menu', 'Default tag', 'TEST', 'March Offer 2020']);
const TAG_REDIRECT_ONLY = new Set(['Properties']);

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}

function absolutizeImageUrl(url, setseedUrl) {
  if (!url) return null;
  // Already absolute? Return as-is.
  if (/^https?:\/\//i.test(url)) return url;
  // Setseed-style relative paths start with /images/ — prepend the public hostname.
  // We also drop the query-string resize hints (?width=...&height=...) since they
  // were Setseed-specific image scaler params and break on other servers.
  const clean = url.split('?')[0];
  return setseedUrl.replace(/\/$/, '') + clean;
}

function extractFirstImage(html, setseedUrl) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? absolutizeImageUrl(m[1], setseedUrl) : null;
}

function sanitizeSetseedContent(html, setseedUrl) {
  if (!html) return '';
  let out = String(html);
  // 1. Strip Setseed widget dividers — they output "Content Bar N" text noise
  //    e.g. <div class="bpe_split_divider Content_Bar_1_Banner">Content Bar 1 Banner</div>
  out = out.replace(/<div[^>]*class=["'][^"']*bpe_split_divider[^"']*["'][^>]*>.*?<\/div>/gis, '');
  // 2. Strip Setseed's per-element editing IDs (data-element-id="el_..."), they
  //    clutter the DOM and serve no purpose outside Setseed's editor.
  out = out.replace(/\s*data-element-id=["'][^"']*["']/gi, '');
  // 3. Strip Setseed's other internal data-* attributes
  out = out.replace(/\s*data-(version|widget-id|bpe-[a-z0-9-]+)=["'][^"']*["']/gi, '');
  // 4. Absolute-ize all image src URLs and drop ?width=...&height=...&shrink=... query strings
  out = out.replace(/<img([^>]+)src=["']([^"']+)["']/gi, (m, before, src) => {
    return `<img${before}src="${absolutizeImageUrl(src, setseedUrl)}"`;
  });
  // 5. Same for any <a href="/something"> or <a href="/images/...">
  out = out.replace(/<a([^>]+)href=["'](\/[^"']*)["']/gi, (m, before, href) => {
    return `<a${before}href="${absolutizeImageUrl(href, setseedUrl)}"`;
  });
  // 6. Fix self-closing img tags that show /  /> from the source
  out = out.replace(/<img([^>]*?)\s*\/\s*\/>/gi, '<img$1/>');
  // 7. Collapse Setseed's stray `bpe_*` class names (visually they reference an
  //    internal CSS that doesn't exist on GAS sites).
  out = out.replace(/\s+class=["']([^"']*?)bpe_(image|cta|button|text)[^"']*?["']/gi, ' class="$1"');
  return out;
}

// Scrape the rendered HTML of a Setseed page from its live URL. This is the
// source of truth — the DB `content` column holds editor wireframes with
// widget placeholders ("Equal Columns Quarters", "first column", etc.) and
// references to images stored in separate tables. The live URL gives us the
// fully-rendered HTML with real <img> tags and resolved layouts.
async function fetchLiveContent(setseedUrl, slug) {
  const base = setseedUrl.replace(/\/$/, '');
  const url = `${base}/${slug}/`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Extract the <main id="main">...</main> block (Setseed theme convention)
    const mainMatch = html.match(/<main[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/main>/i);
    if (!mainMatch) return null;
    let body = mainMatch[1];
    // Strip surrounding chrome: <style> blocks, the outer container/section
    // wrappers, hero/header includes — keep just the content payload.
    body = body
      // 1. Remove inline <style> tags (they reference theme CSS not on GAS)
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // 2. Remove the leading <div class="container content..."> ... opening — keep its contents
      .replace(/<div[^>]*class=["'][^"']*container content[^"']*["'][^>]*>/i, '')
      // 3. Remove <section class="row"> wrappers
      .replace(/<section[^>]*class=["'][^"']*row[^"']*["'][^>]*>/gi, '')
      .replace(/<\/section>/gi, '')
      // 4. Remove content-block wrapper div and its inner wrapping <div>
      .replace(/<div[^>]*class=["'][^"']*content-block[^"']*["'][^>]*>\s*<div[^>]*>/i, '')
      // 5. Defensive: strip leftover Setseed editor markup
      .replace(/<a[^>]*class=["'][^"']*componentDelete[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*(?:componentZonesTitle|customZoneTitle)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      // 6. Tidy multiple consecutive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    // Trim trailing closing tags from the outer wrappers we stripped above
    body = body.replace(/(<\/div>\s*){2,4}\s*$/i, '');
    // Absolute-ize all image src URLs and drop Setseed scaler query strings
    body = body.replace(/<img([^>]+?)src=["']([^"']+)["']/gi, (m, before, src) => {
      return `<img${before}src="${absolutizeImageUrl(src, setseedUrl)}"`;
    });
    // Strip srcset (mostly relative URLs that 404 on GAS — easier to drop than rewrite all)
    body = body.replace(/\s+srcset=["'][^"']*["']/gi, '');
    return body;
  } catch (e) {
    return null;
  }
}

function htmlToPlain(html, len = 160) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim().slice(0, len);
}

(async () => {
  const my = await mysql.createConnection({ host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER, password: MYSQL_PASS, database: SETSEED_DB });
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Pull all live, undeleted pages with their tags
  const [rows] = await my.execute(`
    SELECT sp.static_pagesid AS id, sp.url_str AS slug, sp.pagetitle AS title,
           sp.summary, sp.content, sp.meta_content,
           GROUP_CONCAT(pt.name SEPARATOR '||') AS tags
    FROM static_pages sp
    LEFT JOIN page_has_tags pht ON pht.static_pages_id = sp.static_pagesid
    LEFT JOIN page_tags pt ON pt.page_tagsid = pht.page_tags_id
    WHERE sp.live = 'yes' AND sp.deleted = ''
    GROUP BY sp.static_pagesid
    ORDER BY sp.static_pagesid DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `);

  console.log(`Found ${rows.length} live pages on ${SETSEED_DB}`);
  const summary = { spark_created: 0, spark_updated: 0, redirect_only: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    const tags = (row.tags || '').split('||').filter(Boolean);
    const skipByTag = tags.some(t => TAG_SKIP.has(t));
    const slug = slugify(row.slug || row.title);

    if (!slug) { summary.skipped++; continue; }

    if (skipByTag) {
      console.log(`  [SKIP] #${row.id} "${row.title}" — tagged: ${tags.join(', ')}`);
      summary.skipped++;
      continue;
    }

    const externalId = `setseed:${row.id}`;
    // Prefer scraping the live URL (gives clean rendered HTML with real
    // images). Fall back to DB content with sanitisation if the live URL
    // 404s (page may have been pulled from public nav).
    const liveBody = await fetchLiveContent(SETSEED_URL, slug);
    const sanitizedBody = liveBody || sanitizeSetseedContent(row.content, SETSEED_URL);
    const heroImage = extractFirstImage(sanitizedBody, SETSEED_URL);
    const subtitle = htmlToPlain(row.summary || sanitizedBody, 480);
    const metaDesc = htmlToPlain(row.summary || sanitizedBody, 160);
    if (!liveBody && row.content) console.log(`    (live URL not reachable, fell back to DB content)`);

    if (DRY_RUN) {
      console.log(`  [DRY] #${row.id} → Spark slug="${slug}" title="${row.title.slice(0, 60)}" hero=${heroImage ? '✓' : '✗'}`);
      summary.spark_created++;
      continue;
    }

    try {
      // Upsert — check by source_external_id first
      const existing = await pg.query(`SELECT id FROM sparks WHERE account_id = $1 AND source_external_id = $2 LIMIT 1`, [ACCOUNT_ID, externalId]);
      if (existing.rows[0]) {
        await pg.query(`
          UPDATE sparks SET title=$2, subtitle=$3, body=$4, hero_image_url=$5, meta_description=$6, updated_at=NOW()
          WHERE id=$1
        `, [existing.rows[0].id, row.title, subtitle, sanitizedBody, heroImage, metaDesc]);
        console.log(`  [UPDATE] #${row.id} → spark ${existing.rows[0].id} "${row.title.slice(0, 60)}"`);
        summary.spark_updated++;
      } else {
        const r = await pg.query(`
          INSERT INTO sparks (account_id, slug, title, subtitle, body, hero_image_url,
            meta_title, meta_description, is_published, published_at, source, source_external_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), 'setseed', $9, NOW(), NOW())
          ON CONFLICT (account_id, slug) DO UPDATE SET
            title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body,
            hero_image_url=EXCLUDED.hero_image_url, source_external_id=EXCLUDED.source_external_id, updated_at=NOW()
          RETURNING id
        `, [ACCOUNT_ID, slug, row.title, subtitle, sanitizedBody, heroImage, row.title.slice(0, 60), metaDesc, externalId]);
        console.log(`  [CREATE] #${row.id} → spark ${r.rows[0].id} "${row.title.slice(0, 60)}"`);
        summary.spark_created++;
      }
    } catch (e) {
      console.error(`  [ERROR] #${row.id} "${row.title}": ${e.message}`);
      summary.errors++;
    }
  }

  // Also import the redirects table — add to a new GAS sparks redirect entry
  console.log(`\nImporting Setseed → redirects table…`);
  const [rdrRows] = await my.execute(`SELECT old, new FROM redirects`);
  let redirectsAttached = 0;
  for (const r of rdrRows) {
    const oldSlug = String(r.old || '').replace(/^\/+|\/+$/g, '').split('/').pop();
    const newSlug = String(r.new || '').replace(/^\/+|\/+$/g, '').split('/').pop();
    if (!oldSlug || !newSlug || oldSlug === newSlug) continue;
    // Find a Spark with the newSlug → append oldSlug to redirect_from_urls
    if (!DRY_RUN) {
      const u = await pg.query(`
        UPDATE sparks SET redirect_from_urls = ARRAY(SELECT DISTINCT unnest(redirect_from_urls || ARRAY[$3]))
        WHERE account_id = $1 AND slug = $2
        RETURNING id
      `, [ACCOUNT_ID, newSlug, oldSlug]);
      if (u.rows[0]) redirectsAttached++;
    } else {
      redirectsAttached++;
    }
  }
  console.log(`  Attached ${redirectsAttached} legacy redirects from ${rdrRows.length} total to matching Sparks.`);

  console.log(`\nSummary:`, summary);
  await my.end();
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
