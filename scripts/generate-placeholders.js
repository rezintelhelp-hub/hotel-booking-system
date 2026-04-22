#!/usr/bin/env node
/**
 * Generate category placeholder images and upload to R2.
 * Then backfill any blog_posts/attractions rows with NULL featured_image_url.
 *
 * Usage: node scripts/generate-placeholders.js
 * Requires R2 creds in .env
 */

require('dotenv').config();
const { Pool } = require('pg');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'gas-property-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ─── Category definitions ───────────────────────────────────────────

// Using SVG path icons instead of emojis (Sharp SVG parser doesn't handle emojis)
// icon is an SVG path element centred at 400,160 in the 800x400 canvas
const calendarIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><line x1="390" y1="140" x2="390" y2="130" stroke="{fg}" stroke-width="3" stroke-linecap="round"/><line x1="410" y1="140" x2="410" y2="130" stroke="{fg}" stroke-width="3" stroke-linecap="round"/><line x1="380" y1="155" x2="420" y2="155" stroke="{fg}" stroke-width="2"/>';
const utensilsIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><line x1="393" y1="140" x2="393" y2="170" stroke="{fg}" stroke-width="2.5" stroke-linecap="round"/><line x1="407" y1="140" x2="407" y2="170" stroke="{fg}" stroke-width="2.5" stroke-linecap="round"/>';
const leafIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><path d="M388 168 Q400 135 412 168" fill="none" stroke="{fg}" stroke-width="2.5"/><line x1="400" y1="148" x2="400" y2="168" stroke="{fg}" stroke-width="2"/>';
const compassIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><polygon points="400,133 407,158 400,152 393,158" fill="{fg}" opacity="0.7"/><polygon points="400,177 393,152 400,158 407,152" fill="{fg}" opacity="0.3"/>';
const bedIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><rect x="382" y="150" width="36" height="14" rx="3" fill="none" stroke="{fg}" stroke-width="2.5"/><line x1="382" y1="164" x2="382" y2="168" stroke="{fg}" stroke-width="2.5"/><line x1="418" y1="164" x2="418" y2="168" stroke="{fg}" stroke-width="2.5"/>';
const bulbIcon = '<circle cx="400" cy="148" r="18" fill="none" stroke="{fg}" stroke-width="3"/><line x1="395" y1="166" x2="405" y2="166" stroke="{fg}" stroke-width="2.5"/><line x1="396" y1="171" x2="404" y2="171" stroke="{fg}" stroke-width="2"/>';
const newsIcon = '<rect x="375" y="133" width="50" height="44" rx="4" fill="none" stroke="{fg}" stroke-width="3"/><line x1="383" y1="145" x2="417" y2="145" stroke="{fg}" stroke-width="2"/><line x1="383" y1="155" x2="410" y2="155" stroke="{fg}" stroke-width="2"/><line x1="383" y1="165" x2="405" y2="165" stroke="{fg}" stroke-width="2"/>';
const pinIcon = '<path d="M400 180 Q400 180 400 180 C400 160 425 148 425 135 C425 121 414 110 400 110 C386 110 375 121 375 135 C375 148 400 160 400 180Z" fill="none" stroke="{fg}" stroke-width="3"/><circle cx="400" cy="135" r="6" fill="{fg}" opacity="0.4"/>';
const wavesIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><path d="M378 150 Q385 143 392 150 Q399 157 406 150 Q413 143 420 150" fill="none" stroke="{fg}" stroke-width="2.5"/><path d="M378 162 Q385 155 392 162 Q399 169 406 162 Q413 155 420 162" fill="none" stroke="{fg}" stroke-width="2.5"/>';
const castleIcon = '<rect x="383" y="148" width="34" height="28" fill="none" stroke="{fg}" stroke-width="3"/><rect x="383" y="138" width="8" height="10" fill="none" stroke="{fg}" stroke-width="2"/><rect x="396" y="138" width="8" height="10" fill="none" stroke="{fg}" stroke-width="2"/><rect x="409" y="138" width="8" height="10" fill="none" stroke="{fg}" stroke-width="2"/>';
const masksIcon = '<circle cx="390" cy="150" r="16" fill="none" stroke="{fg}" stroke-width="3"/><circle cx="410" cy="155" r="16" fill="none" stroke="{fg}" stroke-width="3"/>';
const golfIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><line x1="400" y1="138" x2="400" y2="172" stroke="{fg}" stroke-width="2.5"/><path d="M400 138 L415 148 L400 148Z" fill="{fg}" opacity="0.5"/>';
const fishIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><ellipse cx="400" cy="155" rx="18" ry="10" fill="none" stroke="{fg}" stroke-width="2.5"/><polygon points="420,155 430,147 430,163" fill="{fg}" opacity="0.4"/>';
const tentIcon = '<circle cx="400" cy="155" r="35" fill="none" stroke="{fg}" stroke-width="3"/><path d="M380 175 L400 135 L420 175Z" fill="none" stroke="{fg}" stroke-width="2.5"/><line x1="400" y1="135" x2="400" y2="175" stroke="{fg}" stroke-width="1.5"/>';

const BLOG_CATEGORIES = {
  'Events &amp; Festivals':   { bg: '#fef3c7', fg: '#92400e', svgIcon: calendarIcon },
  'Food &amp; Drink':         { bg: '#fee2e2', fg: '#991b1b', svgIcon: utensilsIcon },
  'Walks &amp; Nature':       { bg: '#d1fae5', fg: '#065f46', svgIcon: leafIcon },
  'Things to Do':              { bg: '#dbeafe', fg: '#1e40af', svgIcon: compassIcon },
  'Accommodation':             { bg: '#ede9fe', fg: '#5b21b6', svgIcon: bedIcon },
  'Guides &amp; Inspiration': { bg: '#e0e7ff', fg: '#3730a3', svgIcon: bulbIcon },
  'General':                   { bg: '#f1f5f9', fg: '#334155', svgIcon: newsIcon },
};

const ATTRACTION_CATEGORIES = {
  'Restaurant':              { bg: '#fee2e2', fg: '#991b1b', svgIcon: utensilsIcon },
  'Food &amp; Drink':        { bg: '#fee2e2', fg: '#991b1b', svgIcon: utensilsIcon },
  'Food and Drink':          { bg: '#fee2e2', fg: '#991b1b', svgIcon: utensilsIcon },
  'Pub':                     { bg: '#fee2e2', fg: '#991b1b', svgIcon: utensilsIcon },
  'Beach':                   { bg: '#bae6fd', fg: '#0c4a6e', svgIcon: wavesIcon },
  'Park':                    { bg: '#d1fae5', fg: '#065f46', svgIcon: leafIcon },
  'Parks &amp; Gardens':     { bg: '#d1fae5', fg: '#065f46', svgIcon: leafIcon },
  'Gardens':                 { bg: '#d1fae5', fg: '#065f46', svgIcon: leafIcon },
  'Museum':                  { bg: '#ede9fe', fg: '#5b21b6', svgIcon: castleIcon },
  'Theatre':                 { bg: '#fce7f3', fg: '#9d174d', svgIcon: masksIcon },
  'Entertainment':           { bg: '#fce7f3', fg: '#9d174d', svgIcon: masksIcon },
  'Heritage':                { bg: '#fed7aa', fg: '#9a3412', svgIcon: castleIcon },
  'Historic Building':       { bg: '#fed7aa', fg: '#9a3412', svgIcon: castleIcon },
  'Historical Site':         { bg: '#fed7aa', fg: '#9a3412', svgIcon: castleIcon },
  'Golf':                    { bg: '#d1fae5', fg: '#065f46', svgIcon: golfIcon },
  'Golf Club':               { bg: '#d1fae5', fg: '#065f46', svgIcon: golfIcon },
  'Water Sports':            { bg: '#bae6fd', fg: '#0c4a6e', svgIcon: wavesIcon },
  'Fishing':                 { bg: '#bae6fd', fg: '#0c4a6e', svgIcon: fishIcon },
  'Outdoors':                { bg: '#d1fae5', fg: '#065f46', svgIcon: tentIcon },
  'Visitor Attraction':      { bg: '#dbeafe', fg: '#1e40af', svgIcon: pinIcon },
  'Tourist Attraction':      { bg: '#dbeafe', fg: '#1e40af', svgIcon: pinIcon },
  'General':                 { bg: '#f1f5f9', fg: '#334155', svgIcon: pinIcon },
};

// ─── SVG generation ─────────────────────────────────────────────────

function xmlSafe(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateSVG(category, config) {
  const { bg, fg, svgIcon } = config;
  const label = category.replace(/&amp;/g, '&').length > 30 ? category.substring(0, 30) + '...' : category;
  // Scale icons up: translate to centre at 400,155 then scale 2.2x from that centre
  const iconSvg = (svgIcon || '').replace(/\{fg\}/g, fg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
  <rect width="800" height="400" fill="${bg}"/>
  <g transform="translate(400,155) scale(2.2) translate(-400,-155)">${iconSvg}</g>
  <text x="400" y="310" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="${fg}" opacity="0.7">${label}</text>
</svg>`;
}

// ─── Upload to R2 ───────────────────────────────────────────────────

async function uploadPlaceholder(type, categorySlug, svgContent) {
  const key = `website/placeholders/${type}/v2-${categorySlug}.webp`;

  // Convert SVG to WebP via Sharp
  const svgBuffer = Buffer.from(svgContent);
  const webpBuffer = await sharp(svgBuffer, { density: 300 })
    .resize(800, 400)
    .webp({ quality: 95 })
    .toBuffer();

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000',
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Generating and uploading placeholder images...\n');

  const urls = { blog: {}, attraction: {} };

  // Blog placeholders
  for (const [category, config] of Object.entries(BLOG_CATEGORIES)) {
    const slug = slugify(category);
    const svg = generateSVG(category, config);
    const url = await uploadPlaceholder('blog', slug, svg);
    urls.blog[category] = url;
    console.log(`  Blog: ${category} -> ${url}`);
  }

  // Attraction placeholders
  for (const [category, config] of Object.entries(ATTRACTION_CATEGORIES)) {
    const slug = slugify(category);
    const svg = generateSVG(category, config);
    const url = await uploadPlaceholder('attraction', slug, svg);
    urls.attraction[category] = url;
    console.log(`  Attraction: ${category} -> ${url}`);
  }

  // Default fallbacks
  const defaultBlogSvg = generateSVG('Blog', { bg: '#f1f5f9', fg: '#334155', svgIcon: newsIcon });
  const defaultAttrSvg = generateSVG('Local Attraction', { bg: '#f1f5f9', fg: '#334155', svgIcon: pinIcon });
  urls.blog['_default'] = await uploadPlaceholder('blog', '_default', defaultBlogSvg);
  urls.attraction['_default'] = await uploadPlaceholder('attraction', '_default', defaultAttrSvg);
  console.log(`  Blog default: ${urls.blog['_default']}`);
  console.log(`  Attraction default: ${urls.attraction['_default']}`);

  console.log(`\nUploaded ${Object.keys(urls.blog).length} blog + ${Object.keys(urls.attraction).length} attraction placeholders.\n`);

  // ─── Backfill database ──────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL — skipping backfill. Set it to update existing rows.');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Backfill blog_posts
  const emptyBlogs = await pool.query(
    "SELECT id, category FROM blog_posts WHERE featured_image_url IS NULL OR featured_image_url = '' OR featured_image_url LIKE '%DRY-RUN%'"
  );
  let blogUpdated = 0;
  for (const row of emptyBlogs.rows) {
    const cat = row.category || '';
    const xmlCat = cat.replace(/&/g, '&amp;');
    const url = urls.blog[xmlCat] || urls.blog[cat] || urls.blog['_default'];
    await pool.query('UPDATE blog_posts SET featured_image_url = $1 WHERE id = $2', [url, row.id]);
    blogUpdated++;
  }
  console.log(`Backfilled ${blogUpdated} blog posts with placeholder images.`);

  // Backfill attractions
  const emptyAttrs = await pool.query(
    "SELECT id, category FROM attractions WHERE featured_image_url IS NULL OR featured_image_url = ''"
  );
  let attrUpdated = 0;
  for (const row of emptyAttrs.rows) {
    const cat = row.category || '';
    const xmlCat = cat.replace(/&/g, '&amp;');
    const url = urls.attraction[xmlCat] || urls.attraction[cat] || urls.attraction['_default'];
    await pool.query('UPDATE attractions SET featured_image_url = $1 WHERE id = $2', [url, row.id]);
    attrUpdated++;
  }
  console.log(`Backfilled ${attrUpdated} attractions with placeholder images.`);

  await pool.end();
  console.log('\nDone!');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
