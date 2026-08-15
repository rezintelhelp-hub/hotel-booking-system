// One-shot: pull the 6 PDFs referenced by Carbon Country sparks from the
// old Rezintel Linode, upload to R2, rewrite spark bodies to point at the
// R2 public URLs. Insulates the sparks against the old server going away.
// Steve 2026-08-15.
//
// Usage:
//   node scripts/_carbon_import_pdfs.js           # dry-run (default)
//   node scripts/_carbon_import_pdfs.js --live    # actually upload + write

require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const LIVE = process.argv.includes('--live');
const ACCOUNT_ID = 159;
const OLD_HOST = 'root@139.162.234.112';
const OLD_DIR = '/var/www/html/sites/wwwcarboncountrysshadyrestcomimportss9lvws/downloads';
const SSH_KEY = process.env.HOME + '/.ssh/id_ed25519';

// The 6 PDFs referenced by our imported sparks (from the earlier audit).
// Any file matching one of these basenames in the /downloads href gets
// rewritten to its R2 URL.
const PDFS = [
  'What-To-Do-free-Guide-YH-final-22.pdf',
  'Our-Tips-To-Discovering-Mount-Rainier-National-Park-2.pdf',
  'mount-rainier-park-map-1.pdf',
  'Carbon-River_Mowich-Area-Trails-Aug11.pdf',
  'Ohanapecosh-Area-Trails-Aug11.pdf',
  'wonderland-trail-may2013.pdf',
];

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'gas-property-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function scpDown(remoteFile, localFile) {
  execFileSync('scp', ['-i', SSH_KEY, '-o', 'StrictHostKeyChecking=no', `${OLD_HOST}:${remoteFile}`, localFile], { stdio: 'inherit' });
}

async function r2HasKey(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch (e) { if (e.$metadata && e.$metadata.httpStatusCode === 404) return false; throw e; }
}

async function r2Upload(key, buffer) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: `inline; filename="${path.basename(key)}"`,
  }));
}

(async () => {
  console.log(`[carbon-pdfs] ${LIVE ? 'LIVE' : 'DRY-RUN'} — ${PDFS.length} PDFs, account #${ACCOUNT_ID}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carbon-pdfs-'));
  console.log('temp dir:', tmp);

  const urlMap = {}; // basename → r2 public URL
  for (const name of PDFS) {
    const local = path.join(tmp, name);
    const remote = `${OLD_DIR}/${name}`;
    // Key mirrors the sparks_media_migrate.js convention:
    //   sparks/<account_id>/pdf/<basename>
    const r2Key = `sparks/${ACCOUNT_ID}/pdf/${name}`;
    const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;
    urlMap[name] = publicUrl;

    if (!LIVE) {
      console.log(`  [DRY] ${name}  →  ${publicUrl}`);
      continue;
    }

    // Skip if already there — makes re-runs safe.
    if (await r2HasKey(r2Key)) {
      console.log(`  [SKIP-R2] already uploaded: ${r2Key}`);
      continue;
    }

    console.log(`  scp ${remote}`);
    scpDown(remote, local);
    const buf = fs.readFileSync(local);
    console.log(`  upload ${r2Key} (${buf.length} bytes)`);
    await r2Upload(r2Key, buf);
    fs.unlinkSync(local);
    console.log(`  → ${publicUrl}`);
  }

  // Rewrite spark bodies — replace any /downloads/<basename> reference with
  // the R2 URL. Uses a regex bounded to the /downloads/ prefix so we don't
  // accidentally touch other URLs that happen to contain the same filename.
  const pg = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const sparks = await pg.query(`SELECT id, slug, body FROM sparks WHERE account_id=$1`, [ACCOUNT_ID]);
  let touched = 0;
  for (const s of sparks.rows) {
    let body = s.body || '';
    let changed = 0;
    for (const name of PDFS) {
      // Match /downloads/<name> with any surrounding quote/href boundary.
      const re = new RegExp('(/downloads/)' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), 'g');
      const before = body;
      body = body.replace(re, urlMap[name]);
      if (body !== before) changed++;
    }
    if (changed > 0) {
      touched++;
      if (LIVE) {
        await pg.query(`UPDATE sparks SET body=$1, updated_at=NOW() WHERE id=$2`, [body, s.id]);
        console.log(`  [REWRITE] spark #${s.id} (${s.slug}) — ${changed} PDF ref(s) patched`);
      } else {
        console.log(`  [DRY-REWRITE] spark #${s.id} (${s.slug}) — ${changed} PDF ref(s) would be patched`);
      }
    }
  }

  console.log(`\n[carbon-pdfs] done — pdfs=${PDFS.length}, sparks_touched=${touched}, mode=${LIVE ? 'LIVE' : 'DRY-RUN'}`);
  if (!LIVE) console.log('re-run with --live to upload + write');
  try { fs.rmdirSync(tmp); } catch (_) {}
  await pg.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
