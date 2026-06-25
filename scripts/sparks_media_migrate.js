/**
 * Sparks media migration (2026-06-25).
 *
 * For every Spark with body HTML referencing an external image host
 * (e.g. lehmannhouse.com/images/*, media.xmlcal.com/*), download the
 * image, push it to R2, and rewrite the body HTML to point at the
 * R2-public URL. Once Lehmann's domain moves to GAS, the originals
 * 404 — this insulates her against that.
 *
 * Dry-run by default. Pass --apply to write.
 * Optional: --account=4   (default: all accounts with Sparks)
 *           --spark=123   (run on one spark only — useful for testing)
 *           --limit=N     (cap total spark count this pass)
 *
 *   railway run node scripts/sparks_media_migrate.js
 *   railway run node scripts/sparks_media_migrate.js --apply
 *   railway run node scripts/sparks_media_migrate.js --apply --account=4 --limit=5
 */
const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ── Old-SetSeed-server source map ──────────────────────────────
// Lehmann's original images on lehmannhouse.com now 404 (site moved
// to WordPress). The originals still live on the old SetSeed Linode
// (139.162.234.112, READ ONLY per CLAUDE.md) under each site's
// directory. Map external-host → { ssh: 'root@host', base: '/path' }
// so the fetcher knows where to look. Other hosts fall through to
// HTTP — works for live CDNs like media.xmlcal.com.
const SSH_KEY = process.env.OLD_SETSEED_KEY || (process.env.HOME ? `${process.env.HOME}/.ssh/id_ed25519` : '/root/.ssh/id_ed25519');
const SETSEED_SOURCES = {
  'lehmannhouse.com': {
    ssh: 'root@139.162.234.112',
    base: '/var/www/html/sites/wwwlehmannhousecom5x5gp57chag',
  },
};

function sshCatFile(remote, sshTarget) {
  return new Promise((resolve, reject) => {
    execFile(
      'ssh',
      ['-i', SSH_KEY, '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=15', '-o', 'BatchMode=yes', sshTarget, 'cat', remote],
      { maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' },
      (err, stdout, stderr) => {
        if (err) return reject(new Error('ssh cat failed: ' + (stderr && stderr.toString().trim()) || err.message));
        if (!stdout || stdout.length === 0) return reject(new Error('ssh cat returned empty'));
        resolve(stdout);
      }
    );
  });
}

const APPLY = process.argv.includes('--apply');
const ACCOUNT_FILTER = (() => { const a = process.argv.find(x => x.startsWith('--account=')); return a ? parseInt(a.split('=')[1], 10) : null; })();
const SPARK_FILTER = (() => { const a = process.argv.find(x => x.startsWith('--spark=')); return a ? parseInt(a.split('=')[1], 10) : null; })();
const LIMIT = (() => { const a = process.argv.find(x => x.startsWith('--limit=')); return a ? parseInt(a.split('=')[1], 10) : null; })();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'gas-property-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

// Hosts we already own — skip these.
const OWNED_HOST = /(^|\.)(gas\.travel|r2\.dev|cloudflarestorage\.com|cloudfront\.net)$/i;

const MAX_BYTES = 20 * 1024 * 1024; // 20MB safety cap
const REQ_TIMEOUT = 30000;          // 30s per file

function extractImageUrls(html) {
  if (!html) return [];
  const seen = new Set();
  const out = [];
  const reImg = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const reBg  = /background(?:-image)?\s*:\s*[^;"']*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = reImg.exec(html)) !== null) if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); }
  while ((m = reBg.exec(html))  !== null) if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); }
  return out;
}

function isExternal(u) {
  try {
    const url = new URL(u, 'https://placeholder.local/');
    if (!url.host || url.host === 'placeholder.local') return false;
    if (OWNED_HOST.test(url.host)) return false;
    return true;
  } catch (_) { return false; }
}

function escapeForReplace(str) {
  // Replace literal occurrences only — body HTML has the URL as a string
  // inside attributes, so a plain split/join handles all instances and
  // sidesteps regex escaping pitfalls.
  return str;
}

function inferContentType(headerCT, filename) {
  if (headerCT && /^image\//i.test(headerCT)) return headerCT.split(';')[0].trim().toLowerCase();
  const ext = path.extname(filename || '').toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.heic': 'image/heic', '.heif': 'image/heif',
  };
  return map[ext] || 'application/octet-stream';
}

async function downloadAndUpload(origUrl, sparkId) {
  let url;
  try { url = new URL(origUrl); } catch (_) { throw new Error('invalid URL'); }
  const safeName = (() => {
    const base = path.basename(url.pathname) || ('img-' + Date.now());
    // Normalise to lowercase up front so basename + extname agree
    // (path.basename(name, ext) is case-sensitive; otherwise we end
    // up with photo-6.JPG.jpg style double-extensions).
    return base.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 80);
  })();
  const ext = path.extname(safeName);
  const baseNoExt = path.basename(safeName, ext);

  // Pick source: SSH-cat from the old SetSeed server for known migrated
  // sites; HTTP fetch for everything else.
  const sshSrc = SETSEED_SOURCES[url.host.toLowerCase()];
  let buffer;
  let ct;
  let source;
  if (sshSrc) {
    const remotePath = sshSrc.base + url.pathname;
    buffer = await sshCatFile(remotePath, sshSrc.ssh);
    if (buffer.length > MAX_BYTES) throw new Error('file exceeds MAX_BYTES (' + buffer.length + ')');
    ct = inferContentType(null, safeName);
    source = 'ssh:' + sshSrc.ssh + remotePath;
  } else {
    const resp = await axios.get(origUrl, {
      responseType: 'arraybuffer',
      timeout: REQ_TIMEOUT,
      maxContentLength: MAX_BYTES,
      maxBodyLength: MAX_BYTES,
      validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'GAS-MediaMigrator/1.0 (+https://gas.travel)' },
    });
    buffer = Buffer.from(resp.data);
    if (buffer.length === 0) throw new Error('empty response body');
    ct = inferContentType(resp.headers['content-type'], safeName);
    source = 'http';
  }

  const key = `spark-media/${sparkId}/${uuidv4()}-${baseNoExt}${ext || ''}`;
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: ct,
    CacheControl: 'public, max-age=31536000',
    ContentDisposition: `inline; filename="${safeName}"`,
  }));
  return { newUrl: `${R2_PUBLIC_URL}/${key}`, bytes: buffer.length, contentType: ct, source };
}

(async () => {
  console.log('Sparks media migration — ' + (APPLY ? 'APPLY' : 'DRY RUN'));
  if (ACCOUNT_FILTER) console.log('  account filter:', ACCOUNT_FILTER);
  if (SPARK_FILTER)   console.log('  spark filter  :', SPARK_FILTER);
  if (LIMIT)          console.log('  limit         :', LIMIT);
  console.log('');

  const params = [];
  let where = `WHERE s.body IS NOT NULL AND s.body <> ''`;
  if (ACCOUNT_FILTER) { params.push(ACCOUNT_FILTER); where += ` AND s.account_id = $${params.length}`; }
  if (SPARK_FILTER)   { params.push(SPARK_FILTER);   where += ` AND s.id = $${params.length}`; }
  const limitSql = LIMIT ? ` LIMIT ${LIMIT}` : '';

  const sparks = await pool.query(`
    SELECT s.id, s.account_id, s.slug, s.title, s.body
      FROM sparks s ${where}
     ORDER BY s.account_id, s.id ${limitSql}
  `, params);
  console.log('Sparks to scan: ' + sparks.rows.length);
  if (sparks.rows.length === 0) { await pool.end(); return; }

  // Cache: origUrl -> newUrl (per-process; identical URLs across sparks
  // only get downloaded once).
  const urlCache = new Map();
  let urlsScanned = 0, urlsExternal = 0, urlsCached = 0;
  let downloadCount = 0, downloadBytes = 0, downloadFails = 0;
  let sparksTouched = 0, sparksWritten = 0;

  for (const sp of sparks.rows) {
    const urls = extractImageUrls(sp.body);
    urlsScanned += urls.length;
    const external = urls.filter(isExternal);
    if (external.length === 0) continue;
    urlsExternal += external.length;

    console.log('');
    console.log('— spark id=' + sp.id + '  slug=' + sp.slug + '  (' + external.length + ' external image' + (external.length === 1 ? '' : 's') + ')');

    let newBody = sp.body;
    let changed = false;

    for (const orig of external) {
      let target = urlCache.get(orig);
      if (target) {
        urlsCached++;
        console.log('    cached  ' + orig.slice(0, 80) + ' → ' + target);
      } else if (!APPLY) {
        console.log('    would download + reupload: ' + orig);
        target = '(pending)';
        urlCache.set(orig, target);
      } else {
        try {
          const { newUrl, bytes, contentType, source } = await downloadAndUpload(orig, sp.id);
          urlCache.set(orig, newUrl);
          target = newUrl;
          downloadCount++;
          downloadBytes += bytes;
          console.log('    pulled  ' + orig.slice(0, 80) + '  (' + bytes + ' B, ' + contentType + ', via ' + source + ')');
          console.log('       →    ' + newUrl);
        } catch (e) {
          downloadFails++;
          console.log('    FAILED  ' + orig + '  → ' + e.message);
          continue;
        }
      }
      if (APPLY && target && target !== '(pending)') {
        const before = newBody;
        newBody = newBody.split(orig).join(target);
        if (newBody !== before) changed = true;
      }
    }

    if (changed) {
      sparksTouched++;
      if (APPLY) {
        await pool.query('UPDATE sparks SET body = $1, updated_at = NOW() WHERE id = $2', [newBody, sp.id]);
        sparksWritten++;
        console.log('    UPDATED spark body');
      }
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('  URLs scanned     : ' + urlsScanned);
  console.log('  URLs external    : ' + urlsExternal);
  console.log('  URLs cache-hit   : ' + urlsCached);
  console.log('  Downloaded       : ' + downloadCount + ' files (' + downloadBytes + ' bytes total)');
  console.log('  Download failures: ' + downloadFails);
  console.log('  Sparks touched   : ' + sparksTouched);
  console.log('  Sparks written   : ' + sparksWritten + (APPLY ? '' : '   (dry-run — pass --apply)'));

  await pool.end();
})().catch(async (e) => {
  console.error('FATAL', e.stack || e.message);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
