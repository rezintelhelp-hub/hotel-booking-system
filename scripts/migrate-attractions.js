#!/usr/bin/env node
/**
 * GAS Attractions Migration CLI
 *
 * Migrates attraction pages from old Rezintel SetSeed MySQL databases
 * to GAS Railway PostgreSQL attractions table.
 *
 * Usage:
 *   node scripts/migrate-attractions.js --site <invisible_key> --account-id <id> [--dry-run] [--live] [--log <file>]
 *
 * Source: Old Rezintel server 139.162.234.112 (MySQL via SSH tunnel)
 * Destination: Railway PostgreSQL (attractions table)
 *
 * Default mode is --dry-run. Must pass --live to write anything.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client: SSHClient } = require('ssh2');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ─── Argument Parsing ───────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}
function hasFlag(name) {
  return args.includes(`--${name}`);
}

const SITE_KEY = getArg('site');
const ACCOUNT_ID = parseInt(getArg('account-id'));
const IS_LIVE = hasFlag('live');
const IS_DRY_RUN = !IS_LIVE;
const LOG_FILE = getArg('log');
const SAMPLE_COUNT = parseInt(getArg('sample')) || 3;
const POST_LIMIT = getArg('limit') ? parseInt(getArg('limit')) : null;
const TAG_NAME_OVERRIDE = getArg('tag-name');

if (!SITE_KEY || !ACCOUNT_ID) {
  console.error('Usage: node scripts/migrate-attractions.js --site <invisible_key> --account-id <id> [--live] [--log <file>] [--limit <n>] [--tag-name <name>]');
  console.error('  --site         Rezintel invisible_key (required)');
  console.error('  --account-id   GAS account/client ID (required)');
  console.error('  --live         Actually write to database (default: dry-run)');
  console.error('  --log <file>   Write log to file');
  console.error('  --sample <n>   Number of sample payloads in dry-run (default: 3)');
  console.error('  --limit <n>    Only process first N attractions (for testing)');
  console.error('  --tag-name <n> Override attraction tag name (default: auto-detect)');
  process.exit(1);
}

// ─── Logging ────────────────────────────────────────────────────────

let logStream = null;
if (LOG_FILE) {
  const logPath = path.resolve(LOG_FILE);
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (logStream) logStream.write(line + '\n');
}
function logWarn(msg) {
  const line = `[${new Date().toISOString()}] WARNING: ${msg}`;
  console.warn(line);
  if (logStream) logStream.write(line + '\n');
}
function logError(msg) {
  const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
  console.error(line);
  if (logStream) logStream.write(line + '\n');
}

// ─── Constants ──────────────────────────────────────────────────────

const SSH_HOST = '139.162.234.112';
const SSH_USER = 'root';
const SSH_KEY_PATH = path.join(process.env.HOME, '.ssh', 'id_ed25519');
const MYSQL_USER = 'setseed_master';
const MYSQL_PASS = 'hrDpymeXhGjcBgvT8GTZ';
const MYSQL_DB = `setseed_${SITE_KEY}`;
const IMAGE_BASE_PATH = `/var/www/html/sites/${SITE_KEY}/images`;

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'gas-property-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

// ─── Content Cleanup (shared with blog migration) ───────────────────

function cleanContent(html) {
  if (!html) return '';
  let cleaned = html;
  cleaned = cleaned.replace(/<div\s+class="SETSEEDcomponent[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/<div\s+class="SETSEEDcomponent[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div\s+class="bpe_split_divider[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<a\s+class="componentDelete"[^>]*>[\s\S]*?<\/a>/gi, '');
  cleaned = cleaned.replace(/\s+class="Button_Medium"/gi, '');
  cleaned = cleaned.replace(/\s+class="Sidebar_Content"/gi, '');
  cleaned = cleaned.replace(/\s+data-element-id="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\?(width|height|shrink|quality|format)=[^"'\s&]*/gi, '');
  cleaned = cleaned.replace(/\?(&amp;)?(width|height|shrink|quality|format)=[^"'\s]*/gi, '');
  cleaned = cleaned.replace(/<div>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/<div\s*>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/(\s*\n){3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\\n|\\n$/g, '');
  return cleaned.trim();
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeShortDescription(content) {
  const MAX = 150;
  const text = stripHtml(content);
  if (!text) return '';
  if (text.length <= MAX) return text;
  const truncated = text.substring(0, MAX);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 50 ? truncated.substring(0, lastSpace) : truncated) + '\u2026';
}

function cleanSlug(raw) {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 250);
}

/**
 * Extract first external URL from HTML content.
 */
function extractWebsiteUrl(html) {
  if (!html) return null;
  const match = html.match(/href="(https?:\/\/[^"]+)"/i);
  if (match && !match[1].includes('thecotswoldretreats') && !match[1].includes('/documents/') && !match[1].includes('/downloads/')) {
    return match[1];
  }
  return null;
}

// ─── Category Detection ─────────────────────────────────────────────

const CATEGORY_RULES = [
  { name: 'Fishing',       keywords: /\b(fishing|angling|trout|fishery|fisheries)\b/i },
  { name: 'Golf',          keywords: /\b(golf)\b/i },
  { name: 'Water Sports',  keywords: /\b(water\s*ski\w*|canoe|lake|beach|water\s*park|watersport)\b/i },
  { name: 'Parks & Gardens', keywords: /\b(park|garden|arboretum|castle|palace)\b/i },
  { name: 'Entertainment', keywords: /\b(theatre|cinema|playhouse|festival)\b/i },
  { name: 'Food & Drink',  keywords: /\b(caf[eé]|coffee|kitchen|bar|pub|inn|pizzeria|restaurant|hart|arms|wheatsheaf|crown|tackle)\b/i },
  { name: 'Heritage',      keywords: /\b(manor|stones?|monument|museum|roman|history|historic)\b/i },
  { name: 'Outdoors',      keywords: /\b(driving|bikes?|cycling|walking|wildlife)\b/i },
];

function detectCategory(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(title)) return rule.name;
  }
  return 'General';
}

// ─── SSH + MySQL Connection ─────────────────────────────────────────

function createSSHTunnel() {
  return new Promise((resolve, reject) => {
    const sshConn = new SSHClient();
    sshConn.on('ready', () => { log('SSH connection established'); resolve(sshConn); });
    sshConn.on('error', (err) => reject(new Error(`SSH connection failed: ${err.message}`)));
    sshConn.connect({ host: SSH_HOST, port: 22, username: SSH_USER, privateKey: fs.readFileSync(SSH_KEY_PATH) });
  });
}

function createMySQLConnection(sshConn) {
  return new Promise((resolve, reject) => {
    sshConn.forwardOut('127.0.0.1', 0, '127.0.0.1', 3306, (err, stream) => {
      if (err) return reject(err);
      mysql.createConnection({ stream, user: MYSQL_USER, password: MYSQL_PASS, database: MYSQL_DB, charset: 'utf8mb4' })
        .then(resolve).catch(reject);
    });
  });
}

// ─── Image Handling ─────────────────────────────────────────────────

function openSFTPSession(sshConn) {
  return new Promise((resolve, reject) => {
    sshConn.sftp((err, sftp) => { if (err) return reject(err); resolve(sftp); });
  });
}

function downloadImageSFTP(sftp, remotePath) {
  return new Promise((resolve) => {
    const chunks = [];
    const readStream = sftp.createReadStream(remotePath);
    readStream.on('data', (chunk) => chunks.push(chunk));
    readStream.on('end', () => resolve(Buffer.concat(chunks)));
    readStream.on('error', (e) => { logWarn(`SFTP download failed for ${remotePath}: ${e.message}`); resolve(null); });
  });
}

async function uploadImageToR2(r2Client, buffer, accountId, filename) {
  const ext = path.extname(filename).toLowerCase();
  const baseFilename = path.basename(filename, ext);
  const uniqueId = uuidv4();
  const type = 'website/attraction-image';

  const sizes = {
    large:     { width: 1920, quality: 85 },
    medium:    { width: 1200, quality: 85 },
    thumbnail: { width: 400,  quality: 80 },
  };

  const results = { original: null, large: null, medium: null, thumbnail: null };

  for (const [sizeName, config] of Object.entries(sizes)) {
    const key = `${type}/${accountId}/${sizeName}/${uniqueId}-${baseFilename}.webp`;
    const processed = await sharp(buffer)
      .resize(config.width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: config.quality })
      .toBuffer();
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: key, Body: processed,
      ContentType: 'image/webp', CacheControl: 'public, max-age=31536000',
    }));
    results[sizeName] = `${R2_PUBLIC_URL}/${key}`;
  }

  const origKey = `${type}/${accountId}/original/${uniqueId}-${baseFilename}.jpg`;
  const jpgBuf = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: origKey, Body: jpgBuf,
    ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000',
  }));
  results.original = `${R2_PUBLIC_URL}/${origKey}`;
  return results;
}

// ─── Attraction Discovery ───────────────────────────────────────────

async function findAttractionsTagId(mysqlConn) {
  if (TAG_NAME_OVERRIDE) {
    const [rows] = await mysqlConn.query(`SELECT page_tagsid, name FROM page_tags WHERE name = ?`, [TAG_NAME_OVERRIDE]);
    if (rows.length > 0) { log(`Using override tag: "${rows[0].name}" (ID: ${rows[0].page_tagsid})`); return rows[0].page_tagsid; }
    logWarn(`Override tag "${TAG_NAME_OVERRIDE}" not found — falling back to auto-detect`);
  }
  const [rows] = await mysqlConn.query(`
    SELECT page_tagsid, name FROM page_tags
    WHERE name IN ('Attractions', 'Things to Do', 'Places to Visit', 'Local Attractions', 'Things to do')
    ORDER BY CASE name
      WHEN 'Attractions' THEN 1
      WHEN 'Things to Do' THEN 2
      WHEN 'Things to do' THEN 3
      WHEN 'Places to Visit' THEN 4
      WHEN 'Local Attractions' THEN 5
      ELSE 6
    END
    LIMIT 1
  `);
  if (rows.length === 0) return null;
  log(`Found attractions tag: "${rows[0].name}" (ID: ${rows[0].page_tagsid})`);
  return rows[0].page_tagsid;
}

async function fetchAttractionPages(mysqlConn, tagId) {
  const [rows] = await mysqlConn.query(`
    SELECT DISTINCT sp.static_pagesid AS id, sp.pagetitle AS title, sp.url_str AS slug,
           sp.content, sp.summary, sp.pic_url, sp.last_updated, sp.language
    FROM static_pages sp
    JOIN page_has_tags pht ON pht.static_pages_id = sp.static_pagesid
    WHERE pht.page_tags_id = ?
      AND sp.live = 'yes'
      AND (sp.deleted IS NULL OR sp.deleted = 0 OR sp.deleted = '')
    ORDER BY sp.pagetitle ASC
  `, [tagId]);
  return rows;
}

async function resolveWidgetImages(mysqlConn, pageId) {
  const images = [];
  try {
    const [widgets] = await mysqlConn.query(`
      SELECT w.id AS widget_id, w.name, wd.value AS image_id
      FROM widgets w
      JOIN widgets_data wd ON wd.widgetsid = w.id AND wd.var = 'image'
      WHERE w.static_pages_id = ? AND w.template = 'Image.tpl'
    `, [pageId]);
    for (const w of widgets) {
      const imgId = parseInt(w.image_id);
      if (!imgId) continue;
      const [imgRows] = await mysqlConn.query(
        'SELECT filename, caption FROM page_images WHERE page_imagesid = ?', [imgId]
      );
      if (imgRows.length > 0) {
        images.push({ widgetId: w.widget_id, filename: imgRows[0].filename, caption: imgRows[0].caption });
      } else {
        logWarn(`Widget ${w.widget_id} references missing page_image ${imgId}`);
      }
    }
  } catch (e) {
    logWarn(`Widget image resolution failed for page ${pageId}: ${e.message}`);
  }
  return images;
}

/**
 * Fetch structured metadata from page_meta table.
 * Returns object keyed by var name.
 */
async function fetchPageMeta(mysqlConn, pageId) {
  try {
    const [rows] = await mysqlConn.query(
      'SELECT `var`, `value` FROM page_meta WHERE static_pages_id = ?', [pageId]
    );
    const meta = {};
    for (const r of rows) {
      if (r.var && r.value !== null) meta[r.var] = r.value;
    }
    return meta;
  } catch (e) {
    logWarn(`Failed to fetch page_meta for page ${pageId}: ${e.message}`);
    return {};
  }
}

// ─── Main Migration ─────────────────────────────────────────────────

async function main() {
  log('\u2550'.repeat(51));
  log(`GAS Attractions Migration \u2014 ${IS_DRY_RUN ? 'DRY RUN' : '\ud83d\udd34 LIVE MODE'}`);
  log(`Site: ${SITE_KEY} (DB: ${MYSQL_DB})`);
  log(`Account ID: ${ACCOUNT_ID}`);
  log('\u2550'.repeat(51));

  if (!IS_DRY_RUN && !process.env.DATABASE_URL) {
    logError('DATABASE_URL not set in .env \u2014 cannot run in live mode');
    process.exit(1);
  }

  let sshConn, mysqlConn, pgPool, r2Client, sftpSession;

  try {
    log('Connecting via SSH...');
    sshConn = await createSSHTunnel();

    log(`Connecting to MySQL (${MYSQL_DB})...`);
    mysqlConn = await createMySQLConnection(sshConn);
    log('MySQL connected');

    if (!IS_DRY_RUN) {
      pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      log('PostgreSQL pool created');

      if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
        r2Client = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
        });
        log('R2 client initialized');
      } else {
        logWarn('R2 credentials not set \u2014 images will be skipped');
      }

      if (r2Client) {
        try {
          sftpSession = await openSFTPSession(sshConn);
          log('SFTP session opened');
        } catch (sftpErr) {
          logWarn(`Could not open SFTP session: ${sftpErr.message} \u2014 images will be skipped`);
        }
      }
    }

    // ─── Auto-detect property_id for single-property accounts ──
    let autoPropertyId = null;
    if (!IS_DRY_RUN && pgPool) {
      const propResult = await pgPool.query('SELECT id FROM properties WHERE account_id = $1', [ACCOUNT_ID]);
      if (propResult.rows.length === 1) {
        autoPropertyId = propResult.rows[0].id;
        log(`Single-property account — will set property_id = ${autoPropertyId}`);
      } else {
        log(`Multi-property account (${propResult.rows.length} properties) — property_id will be NULL`);
      }
    }

    // ─── Discover attractions ─────────────────────────────────
    const tagId = await findAttractionsTagId(mysqlConn);
    if (!tagId) {
      log('No attractions tag found. Nothing to migrate.');
      return;
    }

    let attractions = await fetchAttractionPages(mysqlConn, tagId);
    log(`Found ${attractions.length} attractions via tag ID ${tagId}`);

    if (attractions.length === 0) {
      log('No attractions found. Nothing to migrate.');
      return;
    }

    if (POST_LIMIT) {
      attractions = attractions.slice(0, POST_LIMIT);
      log(`--limit ${POST_LIMIT}: processing first ${attractions.length} of total`);
    }
    log(`Attractions to migrate: ${attractions.length}`);

    // ─── Process each attraction ──────────────────────────────
    const stats = { found: attractions.length, images: 0, inserts: 0, updates: 0, failures: 0, skipped: 0 };
    const seenSlugs = new Map();
    const samplePayloads = [];
    const categoryCount = {};

    for (let i = 0; i < attractions.length; i++) {
      const attr = attractions[i];
      const label = `[${i + 1}/${attractions.length}]`;

      try {
        // ── Fetch structured metadata from page_meta ──
        const meta = await fetchPageMeta(mysqlConn, attr.id);

        // ── Clean content (from main content column — often sparse for attractions) ──
        let content = cleanContent(attr.content);

        // ── Build description from page_meta.summary (primary) + cleaned content (secondary) ──
        const metaSummary = (meta.summary || '').replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n').trim();
        let description = metaSummary || content || null;

        // ── Resolve widget images ──
        const widgetImages = await resolveWidgetImages(mysqlConn, attr.id);
        let featuredFilename = null;
        let featuredImageUrl = null;

        if (attr.pic_url && attr.pic_url !== '/images' && attr.pic_url.length > 8) {
          featuredFilename = attr.pic_url.replace(/^\/images\//, '');
        } else if (widgetImages.length > 0) {
          featuredFilename = widgetImages[0].filename;
        }

        // ── Extract website URL from content ──
        const websiteUrl = extractWebsiteUrl(attr.content);

        // ── Download & upload images (live mode only) ──
        if (!IS_DRY_RUN && r2Client && sftpSession && featuredFilename) {
          const remotePath = `${IMAGE_BASE_PATH}/${featuredFilename}`;
          const buffer = await downloadImageSFTP(sftpSession, remotePath);
          if (buffer && buffer.length > 0) {
            try {
              const r2Result = await uploadImageToR2(r2Client, buffer, ACCOUNT_ID, featuredFilename);
              featuredImageUrl = r2Result.large;
              stats.images++;
              log(`${label} Uploaded image: ${featuredFilename} \u2192 ${r2Result.large}`);
            } catch (uploadErr) {
              logWarn(`${label} Image upload failed for ${featuredFilename}: ${uploadErr.message}`);
            }
          }
        } else if (featuredFilename) {
          featuredImageUrl = `[DRY-RUN] would upload: ${featuredFilename}`;
        }

        // ── Generate slug ──
        let slug = cleanSlug(attr.slug || attr.title);
        if (!slug) { logWarn(`${label} No slug for "${attr.title}" \u2014 skipping`); stats.skipped++; continue; }

        const slugCount = seenSlugs.get(slug) || 0;
        if (slugCount > 0) {
          const newSlug = `${slug}-${slugCount + 1}`;
          logWarn(`${label} Duplicate slug "${slug}" \u2192 renaming to "${newSlug}"`);
          slug = newSlug;
        }
        seenSlugs.set(slug, (seenSlugs.get(slug) || 0) + 1);

        // ── Category from page_meta.attraction_type (fallback to keyword detection) ──
        const category = (meta.attraction_type || '').trim() || detectCategory(attr.title);
        categoryCount[category] = (categoryCount[category] || 0) + 1;

        // ── Short description ──
        const shortDesc = makeShortDescription(description || '');

        // ── Opening hours from meta ──
        let openingHours = null;
        if (meta.opening_time || meta.closing_time) {
          const parts = [];
          if (meta.opening_time) parts.push('Open: ' + meta.opening_time);
          if (meta.closing_time) parts.push('Close: ' + meta.closing_time);
          openingHours = parts.join(' | ');
        }

        // ── Address from meta ──
        const address = (meta.street_address || meta.directions || '').trim() || null;

        // ── Price range (varchar 50 limit) ──
        let priceRange = null;
        const prices = [meta.adult_price, meta.children_price, meta.oap_price].filter(p => p && p.trim() && p.trim() !== 'Contact Venue');
        if (prices.length > 0) {
          priceRange = prices[0].replace(/\\n/g, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim().substring(0, 50);
        }

        // ── Build payload ──
        const payload = {
          client_id: ACCOUNT_ID,
          name: ((meta.attraction_name && !meta.attraction_name.includes('<script')) ? meta.attraction_name : attr.title || '').trim().substring(0, 255),
          slug,
          description,
          short_description: shortDesc || null,
          featured_image_url: IS_DRY_RUN ? (featuredFilename || null) : (featuredImageUrl || null),
          category,
          address,
          city: (meta.city || '').trim() || null,
          latitude: meta.latitude ? parseFloat(meta.latitude) : null,
          longitude: meta.longditude ? parseFloat(meta.longditude) : null,
          phone: (meta.phone || '').trim() || null,
          website_url: websiteUrl || null,
          opening_hours: openingHours,
          price_range: priceRange,
          meta_title: (meta.ss_page_title || attr.title || '').trim().substring(0, 200),
          meta_description: (meta.ss_page_desc || shortDesc || '').substring(0, 300) || null,
          is_published: true,
          is_featured: false,
          display_order: i + 1,
          property_id: autoPropertyId,
        };

        // ── Collect sample payloads for dry-run ──
        if (IS_DRY_RUN && samplePayloads.length < SAMPLE_COUNT) {
          samplePayloads.push({
            _source: `static_page:${attr.id}`,
            _widgetImages: widgetImages.map(wi => wi.filename),
            _featuredImage: featuredFilename,
            ...payload,
            description: payload.description ? payload.description.substring(0, 200) + (payload.description.length > 200 ? '...' : '') : null,
          });
        }

        // ── Upsert (live mode only) ──
        if (!IS_DRY_RUN && pgPool) {
          const result = await pgPool.query(`
            INSERT INTO attractions (
              client_id, name, slug, description, short_description, featured_image_url,
              category, address, city, latitude, longitude, phone, website_url,
              opening_hours, price_range, meta_title, meta_description,
              is_published, is_featured, display_order, property_id, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()
            )
            ON CONFLICT (client_id, slug) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              short_description = EXCLUDED.short_description,
              featured_image_url = COALESCE(EXCLUDED.featured_image_url, attractions.featured_image_url),
              category = EXCLUDED.category,
              address = COALESCE(EXCLUDED.address, attractions.address),
              city = COALESCE(EXCLUDED.city, attractions.city),
              latitude = COALESCE(EXCLUDED.latitude, attractions.latitude),
              longitude = COALESCE(EXCLUDED.longitude, attractions.longitude),
              phone = COALESCE(EXCLUDED.phone, attractions.phone),
              website_url = COALESCE(EXCLUDED.website_url, attractions.website_url),
              opening_hours = COALESCE(EXCLUDED.opening_hours, attractions.opening_hours),
              price_range = COALESCE(EXCLUDED.price_range, attractions.price_range),
              meta_title = EXCLUDED.meta_title,
              meta_description = EXCLUDED.meta_description,
              display_order = EXCLUDED.display_order,
              property_id = COALESCE(EXCLUDED.property_id, attractions.property_id),
              updated_at = NOW()
            RETURNING id, (xmax = 0) AS is_insert
          `, [
            payload.client_id, payload.name, payload.slug, payload.description,
            payload.short_description, payload.featured_image_url, payload.category,
            payload.address, payload.city, payload.latitude, payload.longitude,
            payload.phone, payload.website_url, payload.opening_hours, payload.price_range,
            payload.meta_title, payload.meta_description,
            payload.is_published, payload.is_featured, payload.display_order, payload.property_id,
          ]);

          const row = result.rows[0];
          if (row.is_insert) {
            stats.inserts++;
            log(`${label} INSERT id=${row.id} slug="${slug}" category="${category}"`);
          } else {
            stats.updates++;
            log(`${label} UPDATE id=${row.id} slug="${slug}" category="${category}"`);
          }
        } else {
          log(`${label} [DRY] "${payload.name}" slug="${slug}" category="${category}" image=${featuredFilename || 'none'} url=${websiteUrl || 'none'}`);
        }
      } catch (err) {
        stats.failures++;
        logError(`${label} Failed: "${attr.title}" \u2014 ${err.message}`);
      }
    }

    // ─── Summary ──────────────────────────────────────────────
    log('');
    log('\u2550'.repeat(51));
    log('MIGRATION SUMMARY');
    log('\u2550'.repeat(51));
    log(`Mode:        ${IS_DRY_RUN ? 'DRY RUN (no writes)' : '\ud83d\udd34 LIVE'}`);
    log(`Site:        ${SITE_KEY}`);
    log(`Account:     ${ACCOUNT_ID}`);
    log(`Found:       ${stats.found}`);
    log(`Images:      ${stats.images}`);
    log(`Inserts:     ${stats.inserts}`);
    log(`Updates:     ${stats.updates}`);
    log(`Skipped:     ${stats.skipped}`);
    log(`Failures:    ${stats.failures}`);
    log('');
    log('Category distribution:');
    for (const [cat, cnt] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
      log(`  ${cat}: ${cnt}`);
    }
    log('\u2550'.repeat(51));

    if (IS_DRY_RUN && samplePayloads.length > 0) {
      log('');
      log(`SAMPLE PAYLOADS (first ${samplePayloads.length}):`);
      log('\u2500'.repeat(51));
      for (const sample of samplePayloads) {
        console.log(JSON.stringify(sample, null, 2));
        console.log('\u2500'.repeat(51));
      }
    }

  } catch (err) {
    logError(`Migration failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (mysqlConn) await mysqlConn.end().catch(() => {});
    if (pgPool) await pgPool.end().catch(() => {});
    if (sshConn) sshConn.end();
    if (logStream) { logStream.end(); logStream = null; }
    log('Connections closed');
  }
}

main();
