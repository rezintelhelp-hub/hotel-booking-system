#!/usr/bin/env node
/**
 * GAS Blog Migration CLI
 *
 * Migrates blog posts from old Rezintel SetSeed MySQL databases
 * to GAS Railway PostgreSQL blog_posts table.
 *
 * Usage:
 *   node scripts/migrate-blog.js --site <invisible_key> --account-id <id> [--dry-run] [--live] [--log <file>]
 *
 * Source: Old Rezintel server 139.162.234.112 (MySQL via SSH tunnel)
 * Destination: Railway PostgreSQL (blog_posts table)
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
  console.error('Usage: node scripts/migrate-blog.js --site <invisible_key> --account-id <id> [--live] [--log <file>] [--limit <n>] [--tag-name <name>]');
  console.error('  --site         Rezintel invisible_key (required)');
  console.error('  --account-id   GAS account/client ID (required)');
  console.error('  --live         Actually write to database (default: dry-run)');
  console.error('  --log <file>   Write log to file');
  console.error('  --sample <n>   Number of sample payloads to show in dry-run (default: 3)');
  console.error('  --limit <n>    Only process first N posts (for testing)');
  console.error('  --tag-name <n> Override blog tag name (default: auto-detect)');
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
  const line = `[${new Date().toISOString()}] ⚠️  ${msg}`;
  console.warn(line);
  if (logStream) logStream.write(line + '\n');
}

function logError(msg) {
  const line = `[${new Date().toISOString()}] ❌ ${msg}`;
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

// ─── Content Cleanup ────────────────────────────────────────────────

/**
 * Strip SetSeed-specific markup from HTML content.
 * Returns cleaned HTML suitable for WordPress/GAS rendering.
 */
function cleanContent(html) {
  if (!html) return '';

  let cleaned = html;

  // 1. Strip entire SETSEEDcomponent widget divs (including contents — images resolved separately)
  cleaned = cleaned.replace(/<div\s+class="SETSEEDcomponent[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi, '');
  // Catch any remaining single-level variants
  cleaned = cleaned.replace(/<div\s+class="SETSEEDcomponent[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  // 2. Strip bpe_split_divider divs entirely
  cleaned = cleaned.replace(/<div\s+class="bpe_split_divider[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  // 3. Strip componentDelete links
  cleaned = cleaned.replace(/<a\s+class="componentDelete"[^>]*>[\s\S]*?<\/a>/gi, '');

  // 4. Remove SetSeed-specific CSS classes but keep the elements
  cleaned = cleaned.replace(/\s+class="Button_Medium"/gi, '');
  cleaned = cleaned.replace(/\s+class="Sidebar_Content"/gi, '');

  // 5. Strip data-element-id attributes (SetSeed editor tracking)
  cleaned = cleaned.replace(/\s+data-element-id="[^"]*"/gi, '');

  // 6. Clean image URL query strings (?width=&height=&shrink=...)
  cleaned = cleaned.replace(/\?(width|height|shrink|quality|format)=[^"'\s&]*/gi, (match) => {
    // Remove the entire query string if it only contains resize params
    return '';
  });
  cleaned = cleaned.replace(/\?(&amp;)?(width|height|shrink|quality|format)=[^"'\s]*/gi, '');

  // 6. Strip empty divs left behind
  cleaned = cleaned.replace(/<div>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/<div\s*>\s*<\/div>/gi, '');

  // 7. Collapse multiple blank lines
  cleaned = cleaned.replace(/(\s*\n){3,}/g, '\n\n');

  // 8. Strip leading/trailing whitespace and literal \n
  cleaned = cleaned.replace(/^\\n|\\n$/g, '');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Strip all HTML tags to get plain text (for excerpt generation).
 */
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculate read time from word count.
 */
function readTimeMinutes(text) {
  const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Generate excerpt: 150 chars at word boundary + "…" suffix.
 * If source has a summary field, use that (truncated). Otherwise strip HTML from content.
 */
function makeExcerpt(summary, content) {
  const MAX = 150;
  let text;
  if (summary && summary.trim()) {
    text = summary.trim();
  } else {
    text = stripHtml(content);
  }
  if (!text) return '';
  if (text.length <= MAX) return text;
  const truncated = text.substring(0, MAX);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 50 ? truncated.substring(0, lastSpace) : truncated) + '…';
}

/**
 * Clean/validate slug.
 */
function cleanSlug(raw) {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 250);
}

// ─── Category Detection ─────────────────────────────────────────────

/**
 * Keyword-based category detection from post title.
 * Returns the best-matching category name.
 */
const CATEGORY_RULES = [
  {
    name: 'Events & Festivals',
    keywords: /\b(festival|fair|firework|halloween|christmas|easter|carnival|show|concert|races|horse\s*trials?|triathlon|hill\s*climb|cricket|opera|bonfire|proms|games|olympics|ice\s*rink|mop\s*fair)\b/i,
  },
  {
    name: 'Food & Drink',
    keywords: /\b(dining|restaurant|pub|pubs|farm\s*shop|wine|beer|kitchen|caf[eé]|tasting|oktoberfest|cream\s*tea|food|drink|fine\s*dining|culinary)\b/i,
  },
  {
    name: 'Walks & Nature',
    keywords: /\b(walk|walks|hiking|trail|trails|nature|garden|gardens|lavender|snowdrop|wildflower|arboretum|countryside|autumn\s*colours?|spring\s*walk)\b/i,
  },
  {
    name: 'Things to Do',
    keywords: /\b(visit|castle|palace|park|wildlife|museum|cinema|theatre|art\b|exhibition|steam\s*railway|birdland|watersport|fishing|golf|canoe|cycling|bikes?|shopping|outlet)\b/i,
  },
  {
    name: 'Accommodation',
    keywords: /\b(lodge|lodges|holiday\s*home|hot\s*tub|cottage|retreat|cabin|beehive|bumble\s*bee|accommodation)\b/i,
  },
  {
    name: 'Guides & Inspiration',
    keywords: /\b(top\s*\d+|best\s|hidden\s*gems?|itinerary|why\s*(should|visit)|history|beautiful|famous|seasons?|through\s*the|must[\s-]visit|perfect\s*weekend|secret\s*spots?|year[\s-]round)\b/i,
  },
];

function detectCategory(title) {
  const t = title || '';
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(t)) return rule.name;
  }
  return 'General';
}

/**
 * Discover secondary tags from page_has_tags for a post.
 * If a secondary tag exists, prefer it over keyword detection.
 */
async function getSecondaryTag(mysqlConn, pageId, blogTagId) {
  try {
    const [rows] = await mysqlConn.query(`
      SELECT pt.name FROM page_has_tags pht
      JOIN page_tags pt ON pt.page_tagsid = pht.page_tags_id
      WHERE pht.static_pages_id = ? AND pht.page_tags_id != ? AND pht.page_tags_id != 0
    `, [pageId, blogTagId]);
    if (rows.length > 0) return rows[0].name;
  } catch (e) { /* ignore */ }
  return null;
}

/**
 * Ensure a blog_categories row exists for this client + category name.
 * Returns the category name (for blog_posts.category).
 */
async function ensureCategory(pgPool, clientId, categoryName) {
  if (!pgPool) return categoryName; // dry-run
  const slug = cleanSlug(categoryName);
  await pgPool.query(`
    INSERT INTO blog_categories (client_id, name, slug, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (client_id, slug) DO NOTHING
  `, [clientId, categoryName, slug]);
  return categoryName;
}

// ─── SSH + MySQL Connection ─────────────────────────────────────────

function createSSHTunnel() {
  return new Promise((resolve, reject) => {
    const sshConn = new SSHClient();
    sshConn.on('ready', () => {
      log('SSH connection established');
      resolve(sshConn);
    });
    sshConn.on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    });
    sshConn.connect({
      host: SSH_HOST,
      port: 22,
      username: SSH_USER,
      privateKey: fs.readFileSync(SSH_KEY_PATH),
    });
  });
}

function createMySQLConnection(sshConn) {
  return new Promise((resolve, reject) => {
    sshConn.forwardOut('127.0.0.1', 0, '127.0.0.1', 3306, (err, stream) => {
      if (err) return reject(err);
      mysql.createConnection({
        stream,
        user: MYSQL_USER,
        password: MYSQL_PASS,
        database: MYSQL_DB,
        charset: 'utf8mb4',
      }).then(resolve).catch(reject);
    });
  });
}

// ─── Image Handling ─────────────────────────────────────────────────

/**
 * Open a persistent SFTP session (reuse for all image downloads).
 */
function openSFTPSession(sshConn) {
  return new Promise((resolve, reject) => {
    sshConn.sftp((err, sftp) => {
      if (err) return reject(err);
      resolve(sftp);
    });
  });
}

/**
 * Download file from old server via a shared SFTP session.
 * Returns Buffer or null on failure.
 */
function downloadImageSFTP(sftp, remotePath) {
  return new Promise((resolve) => {
    const chunks = [];
    const readStream = sftp.createReadStream(remotePath);
    readStream.on('data', (chunk) => chunks.push(chunk));
    readStream.on('end', () => resolve(Buffer.concat(chunks)));
    readStream.on('error', (e) => {
      logWarn(`SFTP download failed for ${remotePath}: ${e.message}`);
      resolve(null);
    });
  });
}

/**
 * Upload image buffer to R2 in multiple sizes.
 * Replicates server.js processAndUploadImage() exactly.
 */
async function uploadImageToR2(r2Client, buffer, accountId, filename) {
  const ext = path.extname(filename).toLowerCase();
  const baseFilename = path.basename(filename, ext);
  const uniqueId = uuidv4();
  const type = 'website/blog-image';

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
      Bucket: R2_BUCKET,
      Key: key,
      Body: processed,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }));
    results[sizeName] = `${R2_PUBLIC_URL}/${key}`;
  }

  // JPG original fallback
  const origKey = `${type}/${accountId}/original/${uniqueId}-${baseFilename}.jpg`;
  const jpgBuf = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: origKey,
    Body: jpgBuf,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000',
  }));
  results.original = `${R2_PUBLIC_URL}/${origKey}`;

  return results;
}

// ─── Blog Post Discovery ────────────────────────────────────────────

/**
 * Discover blog tag ID dynamically for this site.
 */
async function findBlogTagId(mysqlConn) {
  if (TAG_NAME_OVERRIDE) {
    const [rows] = await mysqlConn.query(`SELECT page_tagsid, name FROM page_tags WHERE name = ?`, [TAG_NAME_OVERRIDE]);
    if (rows.length > 0) { log(`Using override tag: "${rows[0].name}" (ID: ${rows[0].page_tagsid})`); return rows[0].page_tagsid; }
    logWarn(`Override tag "${TAG_NAME_OVERRIDE}" not found — falling back to auto-detect`);
  }
  const [rows] = await mysqlConn.query(`
    SELECT page_tagsid, name FROM page_tags
    WHERE name IN ('Blog Articles', 'Blog articles', 'Blog', 'Articles', 'News', 'General Blogs', 'French Blog Articles')
    ORDER BY CASE name
      WHEN 'Blog Articles' THEN 1
      WHEN 'Blog articles' THEN 2
      WHEN 'Blog' THEN 3
      WHEN 'Articles' THEN 4
      WHEN 'News' THEN 5
      ELSE 6
    END
    LIMIT 1
  `);
  if (rows.length === 0) return null;
  log(`Found blog tag: "${rows[0].name}" (ID: ${rows[0].page_tagsid})`);
  return rows[0].page_tagsid;
}

/**
 * Fetch blog posts from static_pages via tag system.
 */
async function fetchStaticPageBlogPosts(mysqlConn, blogTagId) {
  const [rows] = await mysqlConn.query(`
    SELECT DISTINCT sp.static_pagesid AS id, sp.pagetitle AS title, sp.url_str AS slug,
           sp.content, sp.summary, sp.pic_url, sp.last_updated, sp.language,
           'static_page' AS source_type
    FROM static_pages sp
    JOIN page_has_tags pht ON pht.static_pages_id = sp.static_pagesid
    WHERE pht.page_tags_id = ?
      AND sp.live = 'yes'
      AND (sp.deleted IS NULL OR sp.deleted = 0 OR sp.deleted = '')
    ORDER BY sp.last_updated DESC
  `, [blogTagId]);
  return rows;
}

/**
 * Fetch blog posts from blog_entries table (fallback source).
 */
async function fetchBlogEntries(mysqlConn) {
  // Check if table has data
  const [countRows] = await mysqlConn.query(
    `SELECT COUNT(*) AS cnt FROM blog_entries WHERE live = 'yes' AND (deleted IS NULL OR deleted != 'yes')`
  );
  if (countRows[0].cnt === 0) return [];

  // Get author lookup
  const authorMap = {};
  try {
    const [authors] = await mysqlConn.query(`SELECT blog_authorid, name FROM blog_author`);
    for (const a of authors) authorMap[a.blog_authorid] = a.name;
  } catch (e) { /* table may not exist */ }

  const [rows] = await mysqlConn.query(`
    SELECT blog_entriesid AS id, title, content, summary,
           timestamp AS unix_ts, author, language, tags,
           'blog_entry' AS source_type
    FROM blog_entries
    WHERE live = 'yes' AND (deleted IS NULL OR deleted != 'yes')
    ORDER BY timestamp DESC
  `);

  return rows.map(r => ({
    ...r,
    slug: cleanSlug(r.title),
    author_name: authorMap[r.author] || null,
    pic_url: null,
    last_updated: r.unix_ts,
  }));
}

/**
 * Resolve widget image references in content.
 * Returns { resolvedImages: [{widgetId, filename}], featuredFilename }
 */
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
        `SELECT filename, caption FROM page_images WHERE page_imagesid = ?`, [imgId]
      );
      if (imgRows.length > 0) {
        images.push({
          widgetId: w.widget_id,
          widgetName: w.name,
          filename: imgRows[0].filename,
          caption: imgRows[0].caption,
        });
      } else {
        logWarn(`Widget ${w.widget_id} references missing page_image ${imgId}`);
      }
    }
  } catch (e) {
    logWarn(`Widget image resolution failed for page ${pageId}: ${e.message}`);
  }
  return images;
}

// ─── Main Migration ─────────────────────────────────────────────────

async function main() {
  log('═══════════════════════════════════════════════════');
  log(`GAS Blog Migration — ${IS_DRY_RUN ? 'DRY RUN' : '🔴 LIVE MODE'}`);
  log(`Site: ${SITE_KEY} (DB: ${MYSQL_DB})`);
  log(`Account ID: ${ACCOUNT_ID}`);
  log('═══════════════════════════════════════════════════');

  if (!IS_DRY_RUN && !process.env.DATABASE_URL) {
    logError('DATABASE_URL not set in .env — cannot run in live mode');
    process.exit(1);
  }

  // ─── Set up connections ───────────────────────────────────────
  let sshConn, mysqlConn, pgPool, r2Client, sftpSession;

  try {
    log('Connecting via SSH...');
    sshConn = await createSSHTunnel();

    log(`Connecting to MySQL (${MYSQL_DB})...`);
    mysqlConn = await createMySQLConnection(sshConn);
    log('MySQL connected');

    if (!IS_DRY_RUN) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      log('PostgreSQL pool created');

      // R2 client
      if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
        r2Client = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          },
        });
        log('R2 client initialized');
      } else {
        logWarn('R2 credentials not set — images will be skipped');
      }

      // Open persistent SFTP session for image downloads
      if (r2Client) {
        try {
          sftpSession = await openSFTPSession(sshConn);
          log('SFTP session opened');
        } catch (sftpErr) {
          logWarn(`Could not open SFTP session: ${sftpErr.message} — images will be skipped`);
        }
      }
    }

    // ─── Discover blog posts ──────────────────────────────────
    let posts = [];

    // Strategy A: page_tags + static_pages
    const blogTagId = await findBlogTagId(mysqlConn);
    if (blogTagId) {
      const taggedPosts = await fetchStaticPageBlogPosts(mysqlConn, blogTagId);
      log(`Found ${taggedPosts.length} posts via page_tags (tag ID ${blogTagId})`);
      posts = posts.concat(taggedPosts);
    } else {
      logWarn('No blog tag found in page_tags table');
    }

    // Strategy B: blog_entries
    const blogEntries = await fetchBlogEntries(mysqlConn);
    if (blogEntries.length > 0) {
      log(`Found ${blogEntries.length} posts via blog_entries table`);
      posts = posts.concat(blogEntries);
    }

    if (posts.length === 0) {
      log('No blog posts found. Nothing to migrate.');
      return;
    }
    if (POST_LIMIT) {
      posts = posts.slice(0, POST_LIMIT);
      log(`--limit ${POST_LIMIT}: processing first ${posts.length} of total`);
    }
    log(`Posts to migrate: ${posts.length}`);

    // ─── Process each post ────────────────────────────────────
    const stats = { found: posts.length, images: 0, inserts: 0, updates: 0, failures: 0, skipped: 0 };
    const seenSlugs = new Map(); // slug → count for dedup
    const samplePayloads = [];
    const categoryCount = {}; // track category distribution

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postLabel = `[${i + 1}/${posts.length}]`;

      try {
        // ── Clean content ──
        let content = cleanContent(post.content);

        // ── Resolve widget images ──
        let widgetImages = [];
        let featuredImageUrl = null;
        let featuredFilename = null;

        if (post.source_type === 'static_page') {
          widgetImages = await resolveWidgetImages(mysqlConn, post.id);

          // Featured image: prefer pic_url, then first widget image
          if (post.pic_url && post.pic_url !== '/images' && post.pic_url.length > 8) {
            // pic_url is like /images/filename.jpg
            featuredFilename = post.pic_url.replace(/^\/images\//, '');
          } else if (widgetImages.length > 0) {
            featuredFilename = widgetImages[0].filename;
          }
        }

        // ── Download & upload images (live mode only) ──
        const uploadedImages = {}; // filename → R2 URL
        if (!IS_DRY_RUN && r2Client && sftpSession) {
          const allFilenames = new Set();
          if (featuredFilename) allFilenames.add(featuredFilename);
          for (const wi of widgetImages) allFilenames.add(wi.filename);

          for (const filename of allFilenames) {
            const remotePath = `${IMAGE_BASE_PATH}/${filename}`;
            const buffer = await downloadImageSFTP(sftpSession, remotePath);
            if (buffer && buffer.length > 0) {
              try {
                const r2Result = await uploadImageToR2(r2Client, buffer, ACCOUNT_ID, filename);
                uploadedImages[filename] = r2Result.large;
                stats.images++;
                log(`${postLabel} Uploaded image: ${filename} → ${r2Result.large}`);
              } catch (uploadErr) {
                logWarn(`${postLabel} Image upload failed for ${filename}: ${uploadErr.message}`);
              }
            }
          }

          // Set featured image URL
          if (featuredFilename && uploadedImages[featuredFilename]) {
            featuredImageUrl = uploadedImages[featuredFilename];
          }
        } else if (featuredFilename) {
          // Dry-run: show what would be the featured image
          featuredImageUrl = `[DRY-RUN] would upload: ${featuredFilename}`;
        }

        // ── Generate slug ──
        let slug = cleanSlug(post.slug || post.title);
        if (!slug) {
          logWarn(`${postLabel} No slug for post "${post.title}" — skipping`);
          stats.skipped++;
          continue;
        }

        // Deduplicate slugs within source data
        const slugCount = seenSlugs.get(slug) || 0;
        if (slugCount > 0) {
          const newSlug = `${slug}-${slugCount + 1}`;
          logWarn(`${postLabel} Duplicate slug "${slug}" → renaming to "${newSlug}"`);
          slug = newSlug;
        }
        seenSlugs.set(slug.replace(/-\d+$/, slug), (seenSlugs.get(slug.replace(/-\d+$/, slug)) || 0) + 1);

        // ── Published date ──
        let publishedAt = null;
        if (post.last_updated && post.last_updated > 0) {
          publishedAt = new Date(post.last_updated * 1000);
        } else if (post.unix_ts && post.unix_ts > 0) {
          publishedAt = new Date(post.unix_ts * 1000);
        }

        // ── Excerpt ──
        const excerpt = makeExcerpt(post.summary, content);

        // ── Language ──
        const language = (post.language && post.language.length === 2) ? post.language.toLowerCase() : 'en';

        // ── Category ──
        // Prefer secondary tag from old DB; fall back to keyword detection from title
        let category = null;
        if (post.source_type === 'static_page' && blogTagId) {
          category = await getSecondaryTag(mysqlConn, post.id, blogTagId);
        }
        if (!category) {
          category = detectCategory(post.title);
        }
        await ensureCategory(pgPool, ACCOUNT_ID, category);
        categoryCount[category] = (categoryCount[category] || 0) + 1;

        // ── Build payload ──
        const payload = {
          client_id: ACCOUNT_ID,
          title: (post.title || '').trim(),
          slug,
          content,
          excerpt,
          featured_image_url: IS_DRY_RUN ? (featuredFilename || null) : (featuredImageUrl || null),
          category,
          tags: '{}',
          meta_title: (post.title || '').trim().substring(0, 200),
          meta_description: excerpt || null,
          author_name: post.author_name || null,
          language,
          is_published: true,
          is_featured: false,
          read_time_minutes: readTimeMinutes(content),
          published_at: publishedAt,
          ai_generated: false,
        };

        // ── Collect sample payloads for dry-run ──
        if (IS_DRY_RUN && samplePayloads.length < SAMPLE_COUNT) {
          samplePayloads.push({
            _source: `${post.source_type}:${post.id}`,
            _widgetImages: widgetImages.map(wi => wi.filename),
            _featuredImage: featuredFilename,
            ...payload,
            content: payload.content.substring(0, 300) + (payload.content.length > 300 ? '...' : ''),
          });
        }

        // ── Upsert (live mode only) ──
        if (!IS_DRY_RUN && pgPool) {
          const result = await pgPool.query(`
            INSERT INTO blog_posts (
              client_id, title, slug, content, excerpt, featured_image_url,
              category, tags, meta_title, meta_description, author_name,
              language, is_published, is_featured, read_time_minutes,
              published_at, ai_generated, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
            )
            ON CONFLICT (client_id, slug) DO UPDATE SET
              title = EXCLUDED.title,
              content = EXCLUDED.content,
              excerpt = EXCLUDED.excerpt,
              featured_image_url = COALESCE(EXCLUDED.featured_image_url, blog_posts.featured_image_url),
              meta_title = EXCLUDED.meta_title,
              meta_description = EXCLUDED.meta_description,
              published_at = EXCLUDED.published_at,
              read_time_minutes = EXCLUDED.read_time_minutes,
              updated_at = NOW()
            RETURNING id, (xmax = 0) AS is_insert
          `, [
            payload.client_id, payload.title, payload.slug, payload.content,
            payload.excerpt, payload.featured_image_url, payload.category,
            payload.tags, payload.meta_title, payload.meta_description,
            payload.author_name, payload.language, payload.is_published,
            payload.is_featured, payload.read_time_minutes, payload.published_at,
            payload.ai_generated,
          ]);

          const row = result.rows[0];
          if (row.is_insert) {
            stats.inserts++;
            log(`${postLabel} ✅ INSERT id=${row.id} slug="${slug}" category="${category}"`);
          } else {
            stats.updates++;
            log(`${postLabel} 🔄 UPDATE id=${row.id} slug="${slug}" category="${category}"`);
          }
        } else {
          log(`${postLabel} [DRY] "${payload.title}" → slug="${slug}" category="${category}" images=${widgetImages.length} featured=${featuredFilename || 'none'}`);
        }
      } catch (postErr) {
        stats.failures++;
        logError(`${postLabel} Failed: "${post.title}" — ${postErr.message}`);
      }
    }

    // ─── Summary ──────────────────────────────────────────────
    log('');
    log('═══════════════════════════════════════════════════');
    log('MIGRATION SUMMARY');
    log('═══════════════════════════════════════════════════');
    log(`Mode:       ${IS_DRY_RUN ? 'DRY RUN (no writes)' : '🔴 LIVE'}`);
    log(`Site:       ${SITE_KEY}`);
    log(`Account:    ${ACCOUNT_ID}`);
    log(`Posts found: ${stats.found}`);
    log(`Images:     ${stats.images}`);
    log(`Inserts:    ${stats.inserts}`);
    log(`Updates:    ${stats.updates}`);
    log(`Skipped:    ${stats.skipped}`);
    log(`Failures:   ${stats.failures}`);
    log('');
    log('Category distribution:');
    for (const [cat, cnt] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
      log(`  ${cat}: ${cnt}`);
    }
    log('═══════════════════════════════════════════════════');

    // ─── Show sample payloads in dry-run ──────────────────────
    if (IS_DRY_RUN && samplePayloads.length > 0) {
      log('');
      log(`SAMPLE PAYLOADS (first ${samplePayloads.length} posts):`);
      log('───────────────────────────────────────────────────');
      for (const sample of samplePayloads) {
        console.log(JSON.stringify(sample, null, 2));
        console.log('───────────────────────────────────────────────────');
      }
    }

  } catch (err) {
    logError(`Migration failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (mysqlConn) await mysqlConn.end().catch(() => {});
    if (pgPool) await pgPool.end().catch(() => {});
    if (sshConn) sshConn.end();
    if (logStream) logStream.end();
    log('Connections closed');
  }
}

main();
