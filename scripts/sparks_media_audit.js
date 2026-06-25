/**
 * Sparks media audit — scope check before migration.
 *
 * For each account, count Sparks that have body content with external
 * <img src> URLs (i.e. not pointing at admin.gas.travel or a *.sites.gas.travel
 * domain). Report by account + host, with sample URLs.
 *
 * Read-only.
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Hosts we OWN — these don't need migrating.
const OWNED_HOSTS = [
  /(^|\.)gas\.travel$/i,
  /(^|\.)r2\.dev$/i,
  /(^|\.)cloudflarestorage\.com$/i,
  /(^|\.)cloudfront\.net$/i,
];

function isOwned(host) {
  return OWNED_HOSTS.some(re => re.test(host || ''));
}

function extractImageUrls(html) {
  if (!html) return [];
  const urls = [];
  // <img src="..."> or <img src='...'>
  const reImg = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = reImg.exec(html)) !== null) urls.push(m[1]);
  // CSS background-image: url('...') / url("...") / url(...)
  const reBg = /background(?:-image)?\s*:\s*[^;"']*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = reBg.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

(async () => {
  try {
    // First, find any account with Sparks
    const accts = await pool.query(`
      SELECT DISTINCT s.account_id, a.name
        FROM sparks s
        LEFT JOIN accounts a ON a.id = s.account_id
       ORDER BY s.account_id
    `);
    console.log('=== Accounts with Sparks ===');
    for (const r of accts.rows) {
      const c = await pool.query('SELECT COUNT(*)::int AS n FROM sparks WHERE account_id = $1', [r.account_id]);
      console.log('  account_id=' + r.account_id + '  ' + (r.name || '(no name)') + '  · sparks: ' + c.rows[0].n);
    }
    console.log('');

    // Pull every Spark's body, group by host
    const all = await pool.query(`
      SELECT s.id, s.account_id, s.slug, s.title, s.body,
             a.name AS account_name
        FROM sparks s
        LEFT JOIN accounts a ON a.id = s.account_id
       WHERE s.body IS NOT NULL AND s.body <> ''
       ORDER BY s.account_id, s.id
    `);

    // Group: account -> host -> { count, sampleUrls, sparkIds }
    const grouped = new Map();
    let totalUrls = 0;
    let totalExternal = 0;
    for (const row of all.rows) {
      const urls = extractImageUrls(row.body);
      for (const u of urls) {
        totalUrls++;
        let host = '';
        try { host = new URL(u, 'https://placeholder.local/').host; } catch (_) { continue; }
        if (!host || host === 'placeholder.local') continue; // relative URL
        if (isOwned(host)) continue;
        totalExternal++;
        const key = row.account_id + '|' + host;
        if (!grouped.has(key)) grouped.set(key, { account_id: row.account_id, account_name: row.account_name, host, count: 0, sample: new Set(), sparkIds: new Set() });
        const g = grouped.get(key);
        g.count++;
        g.sparkIds.add(row.id);
        if (g.sample.size < 3) g.sample.add(u);
      }
    }

    console.log('=== Image URLs referenced in Spark bodies ===');
    console.log('  Total <img>/background-image URLs: ' + totalUrls);
    console.log('  External (need migration):         ' + totalExternal);
    console.log('');

    if (grouped.size === 0) {
      console.log('  Nothing external. Done.');
      return;
    }

    console.log('=== Grouped by account + host (need migration) ===');
    const sorted = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    for (const g of sorted) {
      console.log('');
      console.log('  account=' + g.account_id + ' (' + (g.account_name || '?') + ')  host=' + g.host);
      console.log('    image refs: ' + g.count + '  across ' + g.sparkIds.size + ' spark(s)');
      console.log('    samples:');
      for (const u of g.sample) console.log('      - ' + u);
    }
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
