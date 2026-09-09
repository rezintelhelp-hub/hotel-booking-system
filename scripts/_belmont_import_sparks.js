// One-shot: import Belmont's old SetSeed pages as GAS Sparks (account 68).
// Steve 2026-09-09 — old site still live at
//   http://www.thebelmonthotel.co.uk.app2.rezintel.net/
// Pure live-scrape (no MySQL) — extracts <main>-equivalent body, sanitises
// SetSeed wrapper markup, absolute-izes image URLs to the app2 host.
// Idempotent via source_external_id='setseed-belmont:<slug>'.
//
// Images stay pointing at app2.rezintel.net after this import. Run
// scripts/sparks_media_migrate.js --apply --account=68 afterwards to
// move them to R2 (same pattern used for Lehmann + Walnut Canyon).
//
// Usage:
//   node scripts/_belmont_import_sparks.js            # dry-run (default)
//   node scripts/_belmont_import_sparks.js --apply    # actually write
//   node scripts/_belmont_import_sparks.js --apply --only=illuminations
//
require('dotenv').config();
const { Pool } = require('pg');

const ACCOUNT_ID = 68;
const SETSEED_URL = 'http://www.thebelmonthotel.co.uk.app2.rezintel.net';
const APPLY = process.argv.includes('--apply');
const ONLY_ARG = (() => {
  const a = process.argv.find(x => x.startsWith('--only='));
  return a ? a.split('=')[1] : null;
})();

// Every page Steve flagged for migration. Slug is the URL path segment
// (matching source SEO). Some pages live under nested paths on setseed
// (e.g. /package-breaks/festive-house-parties/) — `path` overrides the
// slug for the fetch, `slug` is used for the GAS spark URL.
const PAGES = [
  // HUB
  { slug: 'package-deals', title: 'Package Holiday Breaks in Blackpool' },
  { slug: 'summer-holidays', title: 'Summer Holidays' },
  { slug: 'by-month', title: 'Month by Month' },

  // Added Value Stays branch
  { slug: 'added-value-stays', title: 'Fed Up February Weekends' },
  { slug: 'wine-away-the-weekends', title: 'Wine Away the Weekends' },
  { slug: 'fireworks-weekends', title: 'International Firework Championships' },

  // Winter Warmer branch
  { slug: 'winter-warmer-special', title: 'Winter Warmer Specials' },
  { slug: 'pigeon-fanciers-weekend', title: 'Pigeon Fanciers Weekend' },

  // Bank Holidays branch
  { slug: 'bank-holiday-weekends', title: 'Bank Holiday Weekends' },
  { slug: 'august-bank-holiday', title: 'August Bank Holiday' },
  { slug: 'may-day-bank-holiday', title: 'May Day Bank Holiday' },
  { slug: 'spring-bank-holiday', title: 'Spring Bank Holiday' },

  // Airshow
  { slug: 'airshow-weekend-blackpool', title: 'Airshow Weekend Blackpool' },

  // Illuminations branch
  { slug: 'illuminations', title: 'Blackpool Illuminations Midweek and Weekend Breaks' },
  { slug: 'ride-the-lights', title: 'Ride the Lights in Blackpool' },
  { slug: 'switch-on-weekend', title: 'Illuminations Switch-On Weekend' },
  { slug: 'scots-september-weekend', title: 'Scots September Weekend' },
  { slug: 'half-term-family-specials', title: 'Lightpool Festival' },
  { slug: 'over-55s-illuminations', title: "Over 55's Savings at Blackpool Illuminations" },
  { slug: 'halloweenmidweek', title: 'Halloween in Blackpool' },

  // Festive branch (source lives at /package-breaks/festive-house-parties/
  // but reachable at both — use canonical slug on GAS side)
  { slug: 'festive-house-parties', title: 'Festive House Parties', path: 'package-breaks/festive-house-parties' },
  { slug: 'christmas', title: 'Enjoy a Family Christmas by the Seaside' },
  { slug: 'new-year', title: 'New Year' },
  { slug: 'twixmas-house-party', title: 'The Twixmas Getaway' },
  { slug: '10-day-christmas-cracker-festive-holiday', title: 'Festive Marathon of Fun, Food and Frollicking' },

  // About page + its rich sub-sections (single import, sections rendered inline)
  { slug: 'about-the-belmont', title: 'The Belmont Hotel on Blackpool Seafront' },
];

// ── Live-scrape + sanitise (ported from setseed-to-spark.js) ──────────

function absolutizeUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const clean = url.split('?')[0];
  return SETSEED_URL.replace(/\/$/, '') + clean;
}

function extractFirstImage(html) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? absolutizeUrl(m[1]) : null;
}

async function fetchLiveContent(slug, pathOverride) {
  const p = pathOverride || slug;
  const url = `${SETSEED_URL.replace(/\/$/, '')}/${p}/`;
  let html;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (!resp.ok) return { error: `HTTP ${resp.status}`, url };
    html = await resp.text();
  } catch (e) {
    return { error: e.message, url };
  }
  // Extract everything between the first <div class="container content ..."
  // and the <footer> — that's the main content stack on this SetSeed theme.
  const start = html.search(/<div[^>]*class=["'][^"']*container content[^"']*["']/i);
  const endMatch = html.match(/<footer[\s\S]*?$/i);
  if (start === -1) return { error: 'no container content div found', url };
  const end = endMatch ? html.indexOf(endMatch[0], start) : html.length;
  let body = html.slice(start, end);
  // Strip inline styles + scripts
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Strip SetSeed data-* editor attributes
  body = body.replace(/\s*data-(background-fade|background-align|background-panzoom|background-duration|background-color|background-opacity|element-id|version|widget-id|bpe-[a-z0-9-]+)=["'][^"']*["']/gi, '');
  // Strip bpe_* widget dividers (SetSeed editor placeholders)
  body = body.replace(/<div[^>]*class=["'][^"']*bpe_split_divider[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  // Absolute-ize image URLs + drop scaler query strings
  body = body.replace(/<img([^>]+?)src=["']([^"']+)["']/gi, (_, before, src) => `<img${before}src="${absolutizeUrl(src)}"`);
  // Absolute-ize relative <a href="/foo">
  body = body.replace(/<a([^>]+)href=["'](\/[^"']*)["']/gi, (_, before, href) => `<a${before}href="${absolutizeUrl(href)}"`);
  // Strip srcset (relative URLs that would 404 on GAS)
  body = body.replace(/\s+srcset=["'][^"']*["']/gi, '');
  // Collapse bpe_ class names to plain classes
  body = body.replace(/\s+class=["']([^"']*?)bpe_(image|cta|button|text)[^"']*?["']/gi, ' class="$1"');
  // Trim excess whitespace
  body = body.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  return { body };
}

function htmlToPlain(html, len) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, len);
}

// ── Main ──────────────────────────────────────────────────────────────

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const pages = ONLY_ARG ? PAGES.filter(p => p.slug === ONLY_ARG) : PAGES;
  if (ONLY_ARG && pages.length === 0) {
    console.error(`No page matches --only=${ONLY_ARG}. Valid slugs:\n  ${PAGES.map(p => p.slug).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Belmont Sparks import — ${APPLY ? 'APPLY' : 'DRY-RUN'} — ${pages.length} page(s)\n`);
  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };
  for (const page of pages) {
    const externalId = `setseed-belmont:${page.slug}`;
    const { body, error, url } = await fetchLiveContent(page.slug, page.path);
    if (error || !body) {
      console.log(`  ✗ ${page.slug} — ${error || 'empty body'} (${url})`);
      stats.errors++;
      continue;
    }
    const heroImage = extractFirstImage(body);
    const subtitle = htmlToPlain(body, 480);
    const metaDesc = htmlToPlain(body, 160);
    const bodyBytes = Buffer.byteLength(body, 'utf8');
    console.log(`  ✓ ${page.slug} — ${bodyBytes} bytes body, hero=${heroImage ? '✓' : '✗'}`);
    if (!APPLY) { stats.created++; continue; }
    try {
      const existing = await pool.query(
        `SELECT id FROM sparks WHERE account_id = $1 AND source_external_id = $2 LIMIT 1`,
        [ACCOUNT_ID, externalId]
      );
      if (existing.rows[0]) {
        await pool.query(`
          UPDATE sparks SET title=$2, subtitle=$3, body=$4, hero_image_url=$5,
                            meta_description=$6, updated_at=NOW()
          WHERE id=$1
        `, [existing.rows[0].id, page.title, subtitle, body, heroImage, metaDesc]);
        console.log(`      updated spark ${existing.rows[0].id}`);
        stats.updated++;
      } else {
        const r = await pool.query(`
          INSERT INTO sparks (
            account_id, slug, title, subtitle, body, hero_image_url,
            meta_title, meta_description, is_published, published_at,
            source, source_external_id,
            redirect_from_urls,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), $9, $10, $11, NOW(), NOW())
          ON CONFLICT (account_id, slug) DO UPDATE SET
            title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body,
            hero_image_url=EXCLUDED.hero_image_url,
            source_external_id=EXCLUDED.source_external_id,
            updated_at=NOW()
          RETURNING id
        `, [
          ACCOUNT_ID, page.slug, page.title, subtitle, body, heroImage,
          page.title.slice(0, 60), metaDesc,
          'setseed-belmont', externalId,
          [ `/${page.slug}/`, page.path ? `/${page.path}/` : null ].filter(Boolean)
        ]);
        console.log(`      created spark ${r.rows[0].id}`);
        stats.created++;
      }
    } catch (e) {
      console.error(`      DB error: ${e.message}`);
      stats.errors++;
    }
    // Small politeness delay so we don't hammer app2.rezintel.net
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\nSummary: ${JSON.stringify(stats)}`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
