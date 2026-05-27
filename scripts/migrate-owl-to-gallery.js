#!/usr/bin/env node
/**
 * migrate-owl-to-gallery.js
 *
 * Imported Setseed Sparks have <div class="owl-slideshow-multi">...<div class="item">
 * blocks where a carousel was originally rendered via Owl Carousel JS. We don't
 * ship Owl, so those images currently stack with no styling.
 *
 * This script:
 *   1. Finds each Spark with an owl-slideshow block
 *   2. Extracts the <img> URLs + alt text into the spark.gallery_images JSONB field
 *      (which has a proper grid renderer in the plugin: .gas-spark-gallery)
 *   3. Strips the owl block from the body so it doesn't render alongside
 *
 * Idempotent — running twice is a no-op (no owl block left, nothing to do).
 *
 * Usage:
 *   node scripts/migrate-owl-to-gallery.js --account-id 4 [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.replace(/^--/, ''), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : null).filter(Boolean)
);
const ACCOUNT_ID = parseInt(args['account-id'], 10);
const DRY = args['dry-run'] === true;
if (!ACCOUNT_ID) { console.error('Usage: --account-id <id> [--dry-run]'); process.exit(1); }

const OWL_BLOCK_RE = /<div\s+class="owl-slideshow[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>(?=\s|$)/i;
const IMG_RE = /<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*\/?>/gi;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT id, slug, body, gallery_images
    FROM sparks
    WHERE account_id = $1 AND body LIKE '%owl-slideshow%'
  `, [ACCOUNT_ID]);
  console.log(`Found ${r.rows.length} Sparks with Owl Carousel blocks`);
  let migrated = 0;
  for (const row of r.rows) {
    // Pull the owl block out with a non-greedy match. The carousel can have
    // nested <div class="item">, so use a wider extraction approach:
    // capture from <div class="owl-slideshow…"> up to the matching </div></div>
    // at the same depth. Quick & dirty: grab from "owl-slideshow" to the next
    // </div> immediately followed by either text or end-of-body.
    const openIdx = row.body.search(/<div[^>]+class="owl-slideshow[^"]*"/i);
    if (openIdx === -1) continue;
    // Track div depth from the opening
    let depth = 0, i = openIdx, endIdx = -1;
    while (i < row.body.length) {
      const openMatch = row.body.slice(i).match(/^<div\b/i);
      const closeMatch = row.body.slice(i).match(/^<\/div>/i);
      if (openMatch) { depth++; i += openMatch[0].length; }
      else if (closeMatch) { depth--; i += closeMatch[0].length; if (depth === 0) { endIdx = i; break; } }
      else { i++; }
    }
    if (endIdx === -1) { console.warn(`  /${row.slug}: couldn't find end of owl block, skipping`); continue; }
    const owlBlock = row.body.slice(openIdx, endIdx);
    const newBody = (row.body.slice(0, openIdx) + row.body.slice(endIdx)).trim();

    // Extract images from the owl block
    const images = [];
    let m;
    IMG_RE.lastIndex = 0;
    while ((m = IMG_RE.exec(owlBlock)) !== null) {
      const url = m[1];
      // alt isn't always captured by the first regex; grep separately
      const altMatch = m[0].match(/alt="([^"]*)"/i);
      images.push({ url, alt: altMatch ? altMatch[1] : '' });
    }
    if (images.length === 0) { console.warn(`  /${row.slug}: no images in owl block, skipping`); continue; }

    // Merge into gallery_images (preserve any existing entries, dedupe by URL)
    const existing = Array.isArray(row.gallery_images) ? row.gallery_images : [];
    const seen = new Set(existing.map(g => g.url || g));
    const merged = [...existing];
    for (const img of images) {
      if (!seen.has(img.url)) {
        merged.push(img);
        seen.add(img.url);
      }
    }

    console.log(`  /${row.slug}: extracted ${images.length} images, gallery now ${merged.length}`);
    if (DRY) continue;
    await c.query(
      'UPDATE sparks SET gallery_images = $1::jsonb, body = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(merged), newBody, row.id]
    );
    migrated++;
  }
  console.log(`\nMigrated ${migrated} Sparks (${DRY ? 'DRY RUN — no writes' : 'committed'})`);
  await c.end();
})();
