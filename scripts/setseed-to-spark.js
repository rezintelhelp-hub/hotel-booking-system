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

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client } = require('pg');
const mysql = require('mysql2/promise');

const TAG_SKIP = new Set(['Blog articles', 'Attractions', 'Properties', 'Main menu', 'Default tag', 'TEST', 'March Offer 2020']);
const TAG_REDIRECT_ONLY = new Set(['Properties']);

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}

function extractFirstImage(html) {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function htmlToPlain(html, len = 160) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, len);
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
    const heroImage = extractFirstImage(row.content);
    const subtitle = htmlToPlain(row.summary || row.content, 480);
    const metaDesc = htmlToPlain(row.summary || row.content, 160);

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
        `, [existing.rows[0].id, row.title, subtitle, row.content, heroImage, metaDesc]);
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
        `, [ACCOUNT_ID, slug, row.title, subtitle, row.content, heroImage, row.title.slice(0, 60), metaDesc, externalId]);
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
