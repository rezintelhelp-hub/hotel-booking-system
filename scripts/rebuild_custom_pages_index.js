// Web Builder "Add Page" regression — orphaned page-custom-{slug}
// rows exist in website_settings for slugs that are missing from each
// site's custom-pages.pages[] index. Without the index entry the
// front-end can't list/push the page and operators see it as "gone".
// This script rebuilds the index from the orphan rows, per site.
//
// DRY-RUN by default (APPLY=1 to write).
//   railway run --service hotel-booking-system node scripts/rebuild_custom_pages_index.js
//   APPLY=1 railway run --service hotel-booking-system node scripts/rebuild_custom_pages_index.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const APPLY = process.env.APPLY === '1';

(async () => {
  try {
    // Pull every deployed site that has at least one page-custom-* row.
    const sites = await pool.query(`
      SELECT DISTINCT ws.deployed_site_id, ds.site_name, ds.site_url, ds.custom_domain, ds.account_id
        FROM website_settings ws
        JOIN deployed_sites ds ON ds.id = ws.deployed_site_id
       WHERE ws.section LIKE 'page-custom-%'
       ORDER BY ws.deployed_site_id`);
    console.log(`Found ${sites.rows.length} site(s) with page-custom-* rows.\n`);

    let totalRebuilt = 0;
    let sitesTouched = 0;

    for (const site of sites.rows) {
      const sid = site.deployed_site_id;
      const customs = await pool.query(
        `SELECT section, settings FROM website_settings WHERE deployed_site_id = $1 AND section LIKE 'page-custom-%' ORDER BY section`,
        [sid]
      );
      const indexRow = await pool.query(
        `SELECT settings FROM website_settings WHERE deployed_site_id = $1 AND section = 'custom-pages'`,
        [sid]
      );
      const existingIdx = (indexRow.rows[0]?.settings?.pages || []);
      const knownSlugs = new Set(existingIdx.map(p => p.slug));

      const missing = [];
      for (const c of customs.rows) {
        const slug = c.section.replace(/^page-custom-/, '');
        if (knownSlugs.has(slug)) continue;
        const s = c.settings || {};
        // Title fallback chain: title-en → title → derived from slug
        const title = (s['title-en'] || s.title || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())).trim();
        missing.push({
          slug,
          title,
          parent: s.parent || '',
          visibility: s.visibility || 'menu',
          external_url: s['external-url'] || s.external_url || null
        });
      }

      if (!missing.length) continue;
      sitesTouched++;
      totalRebuilt += missing.length;
      console.log(`[site ${sid}] ${site.site_name} (${site.custom_domain || site.site_url}) — ${missing.length} missing slug(s) in index:`);
      missing.forEach(m => console.log(`    + ${m.slug.padEnd(40)} title=${JSON.stringify(m.title).slice(0,50)} parent=${JSON.stringify(m.parent)} visibility=${m.visibility}`));

      if (APPLY) {
        const merged = [...existingIdx, ...missing];
        if (indexRow.rows.length) {
          await pool.query(
            `UPDATE website_settings SET settings = $1, updated_at = NOW() WHERE deployed_site_id = $2 AND section = 'custom-pages'`,
            [JSON.stringify({ pages: merged }), sid]
          );
        } else {
          await pool.query(
            `INSERT INTO website_settings (deployed_site_id, section, settings, created_at, updated_at) VALUES ($1, 'custom-pages', $2, NOW(), NOW())`,
            [sid, JSON.stringify({ pages: merged })]
          );
        }
        console.log(`    → wrote custom-pages with ${merged.length} total entries`);
      }
    }

    console.log(`\nSummary: ${sitesTouched} site(s) affected, ${totalRebuilt} orphan page(s) ${APPLY ? 'restored to index' : 'would be restored'}.`);
    if (!APPLY) console.log('\nDRY-RUN. Re-run with APPLY=1 to write.');
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
