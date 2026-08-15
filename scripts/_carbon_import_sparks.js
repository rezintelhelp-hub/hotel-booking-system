// One-shot Setseed → Spark import for Carbon Country Shady Rest (account 159).
// Steve 2026-08-15 — client needed pages for the CRM (starting with
// Mount Rainier). Whitelist-only: only the IDs he explicitly wanted are
// pulled — noise + duplicates (Rooms, Terms, TEST, Cart flow) skipped.
//
// Modelled on scripts/setseed-to-spark.js (same live-scrape + sanitise
// helpers, same source_external_id key for idempotent re-runs).
//
// Usage:
//   node scripts/_carbon_import_sparks.js           # dry-run (default)
//   node scripts/_carbon_import_sparks.js --live    # actually write
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Client } = require('pg');

const LIVE = process.argv.includes('--live');
const ACCOUNT_ID = 159;
const SETSEED_DB = 'setseed_wwwcarboncountrysshadyrestcomimportss9lvws';
const SETSEED_URL = 'https://www.carboncountrysshadyrest.com';

// Whitelist of static_pagesid values Steve confirmed. Everything else in
// setseed is skipped (Rooms 1/2/3, Terms, TEST PG, Account/Login, etc.).
const INCLUDE_IDS = [
  32,  // Guest Book
  89,  // Spring has Sprung in Carbon Country
  90,  // Unsubscribe to spring offer
  91,  // Q&A Page
  95,  // Welcome to Carbon Country Shady Rest Bed & Breakfast
  97,  // Welcome Back to Carbon Country Shady Rest Bed & Breakfast
  118, // List Of Ingredients
  134, // Valentines Day
  156, // Q&A Valentines Day Offer
  164, // Request to change
  165, // Free Guide
  166, // Free Guide landing page
  167, // Into and video page
  168, // Offer page
  169, // Opt in Page (FG)
  172, // Mount Rainier
  // dropped 2026-08-15: 117 Sign Up Verify (empty stub), 124 Order received
  // (empty), 125 Order Dispatched (empty) — old cart/auth flow, no CRM value
];

// --- helpers (copy of the tiny bits from setseed-to-spark.js so this
// stays self-contained; the shared script is generic and CLI-driven) ---
// Preserve Setseed's url_str verbatim — Steve 2026-08-15: same-slug is a
// hard requirement (SEO + external links + printed material). Only fall
// back to slugify(title) when url_str is empty/null. Lowercase + trim
// only, no character collapse (double-hyphen slugs like
// "welcome-to-carbon-country-shady-rest-bed--breakfast" must survive).
function preserveOrSlug(setseedUrl, fallbackTitle) {
  const raw = String(setseedUrl || '').trim();
  if (raw) return raw.toLowerCase().slice(0, 180);
  return String(fallbackTitle || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}
function absolutizeImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return SETSEED_URL.replace(/\/$/, '') + url.split('?')[0];
}
function extractFirstImage(html) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? absolutizeImageUrl(m[1]) : null;
}
// Pull the first embedded video URL — YouTube or Vimeo iframe, or a
// <video><source src="…"/></video> element. Returned URL is normalised
// to the canonical watch/vimeo URL so the spark hero renderer can embed
// it consistently. Falls through to null when no video present.
function extractFirstVideo(html) {
  if (!html) return null;
  const s = String(html);
  const iframe = s.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframe) {
    const src = iframe[1];
    // youtube.com/embed/VIDEO_ID → watch?v=VIDEO_ID
    const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/);
    if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
    // youtu.be/VIDEO_ID
    const ytShort = src.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (ytShort) return `https://www.youtube.com/watch?v=${ytShort[1]}`;
    // player.vimeo.com/video/ID → vimeo.com/ID
    const vm = src.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (vm) return `https://vimeo.com/${vm[1]}`;
    // Anything else iframe — return src as-is (spark hero embedder can decide)
    if (/youtube|vimeo|wistia|loom/i.test(src)) return src;
  }
  const vidTag = s.match(/<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
  if (vidTag) return absolutizeImageUrl(vidTag[1]);
  return null;
}
function sanitizeSetseedContent(html) {
  if (!html) return '';
  let out = String(html);
  out = out.replace(/<div[^>]*class=["'][^"']*bpe_split_divider[^"']*["'][^>]*>.*?<\/div>/gis, '');
  out = out.replace(/\s*data-element-id=["'][^"']*["']/gi, '');
  out = out.replace(/\s*data-(version|widget-id|bpe-[a-z0-9-]+)=["'][^"']*["']/gi, '');
  out = out.replace(/<img([^>]+)src=["']([^"']+)["']/gi, (m, before, src) => `<img${before}src="${absolutizeImageUrl(src)}"`);
  out = out.replace(/<a([^>]+)href=["'](\/[^"']*)["']/gi, (m, before, href) => `<a${before}href="${absolutizeImageUrl(href)}"`);
  out = out.replace(/<img([^>]*?)\s*\/\s*\/>/gi, '<img$1/>');
  out = out.replace(/\s+class=["']([^"']*?)bpe_(image|cta|button|text)[^"']*?["']/gi, ' class="$1"');
  return out;
}
async function fetchLiveContent(slug) {
  const url = `${SETSEED_URL.replace(/\/$/, '')}/${slug}/`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!resp.ok) return null;
    const html = await resp.text();
    const m = html.match(/<main[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/main>/i);
    if (!m) return null;
    let body = m[1]
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*container content[^"']*["'][^>]*>/i, '')
      .replace(/<section[^>]*class=["'][^"']*row[^"']*["'][^>]*>/gi, '')
      .replace(/<\/section>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*content-block[^"']*["'][^>]*>\s*<div[^>]*>/i, '')
      .replace(/<a[^>]*class=["'][^"']*componentDelete[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*(?:componentZonesTitle|customZoneTitle)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    body = body.replace(/(<\/div>\s*){2,4}\s*$/i, '');
    body = body.replace(/<img([^>]+?)src=["']([^"']+)["']/gi, (mm, before, src) => `<img${before}src="${absolutizeImageUrl(src)}"`);
    body = body.replace(/\s+srcset=["'][^"']*["']/gi, '');
    return body;
  } catch (_) { return null; }
}
function htmlToPlain(html, len = 160) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim().slice(0, len);
}

(async () => {
  console.log(`[carbon-sparks] ${LIVE ? 'LIVE' : 'DRY-RUN'} — account #${ACCOUNT_ID}, ${INCLUDE_IDS.length} pages`);
  // MySQL on old server binds to localhost only. Run via SSH tunnel:
  //   ssh -f -N -L 3307:127.0.0.1:3306 -i ~/.ssh/id_ed25519 root@139.162.234.112
  // Env overrides host/port if you're running from a machine that has
  // direct network access (e.g. Railway edge).
  const my = await mysql.createConnection({
    host: process.env.SETSEED_MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.SETSEED_MYSQL_PORT || '3307', 10),
    user: 'setseed_master', password: 'hrDpymeXhGjcBgvT8GTZ',
    database: SETSEED_DB,
  });
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const [rows] = await my.execute(`
    SELECT static_pagesid AS id, url_str AS slug, pagetitle AS title, summary, content
      FROM static_pages
     WHERE static_pagesid IN (${INCLUDE_IDS.join(',')})
       AND live = 'yes' AND deleted = ''
     ORDER BY static_pagesid
  `);

  const summary = { created: 0, updated: 0, skipped: 0, errors: 0 };
  for (const row of rows) {
    const slug = preserveOrSlug(row.slug, row.title);
    if (!slug) { summary.skipped++; continue; }
    const externalId = `setseed:${row.id}`;
    const liveBody = await fetchLiveContent(slug);
    const body = liveBody || sanitizeSetseedContent(row.content);
    const heroImage = extractFirstImage(body);
    const heroVideo = extractFirstVideo(body);
    const subtitle = htmlToPlain(row.summary || body, 480);
    const metaDesc = htmlToPlain(row.summary || body, 160);
    const src = liveBody ? 'live-url' : 'db-content';
    const imgCount = (body.match(/<img\b/gi) || []).length;
    const iframeCount = (body.match(/<iframe\b/gi) || []).length;

    if (!LIVE) {
      console.log(`  [DRY] #${row.id} slug="${slug}" src=${src} bodyLen=${body.length} imgs=${imgCount} iframes=${iframeCount} heroImg=${heroImage ? '✓' : '✗'} heroVid=${heroVideo ? '✓' : '✗'}`);
      if (heroVideo) console.log(`         └─ video: ${heroVideo}`);
      summary.created++; continue;
    }

    try {
      const existing = await pg.query(
        `SELECT id FROM sparks WHERE account_id = $1 AND source_external_id = $2 LIMIT 1`,
        [ACCOUNT_ID, externalId]
      );
      if (existing.rows[0]) {
        await pg.query(`
          UPDATE sparks
             SET title=$2, subtitle=$3, body=$4,
                 hero_image_url=$5, hero_video_url=$6,
                 meta_description=$7, updated_at=NOW()
           WHERE id=$1
        `, [existing.rows[0].id, row.title, subtitle, body, heroImage, heroVideo, metaDesc]);
        console.log(`  [UPDATE] #${row.id} → spark ${existing.rows[0].id} "${String(row.title).slice(0, 60)}"`);
        summary.updated++;
      } else {
        const r = await pg.query(`
          INSERT INTO sparks (
            account_id, slug, title, subtitle, body,
            hero_image_url, hero_video_url,
            meta_title, meta_description,
            is_published, published_at,
            source, source_external_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), 'setseed', $10, NOW(), NOW())
          ON CONFLICT (account_id, slug) DO UPDATE SET
            title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body,
            hero_image_url=EXCLUDED.hero_image_url,
            hero_video_url=EXCLUDED.hero_video_url,
            source_external_id=EXCLUDED.source_external_id, updated_at=NOW()
          RETURNING id
        `, [ACCOUNT_ID, slug, row.title, subtitle, body, heroImage, heroVideo, String(row.title).slice(0, 60), metaDesc, externalId]);
        console.log(`  [CREATE] #${row.id} → spark ${r.rows[0].id} "${String(row.title).slice(0, 60)}"`);
        summary.created++;
      }
    } catch (e) {
      console.error(`  [ERROR] #${row.id} "${row.title}": ${e.message}`);
      summary.errors++;
    }
  }

  console.log(`\n[carbon-sparks] done — created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors}`);
  if (!LIVE) console.log('(this was a DRY-RUN — re-run with --live to actually write)');
  await my.end();
  await pg.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
