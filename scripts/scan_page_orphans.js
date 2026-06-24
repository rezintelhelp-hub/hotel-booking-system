const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    // ──────────────────────────────────────────────────────────────
    // ANGLE 1: page_sections rows whose slug is missing from both the
    // custom-pages index AND the page-custom-* settings sections.
    // ──────────────────────────────────────────────────────────────
    console.log('=== page_sections orphans (no settings AND not in index) ===');
    const ps = await pool.query(`
      SELECT DISTINCT website_id, page_slug
        FROM page_sections
       WHERE page_slug IS NOT NULL
         AND page_slug NOT IN ('home','about','contact','dining','gallery','reviews','attractions','blog','offers','rooms','book-now','checkout','room','terms','privacy','cart')
       ORDER BY website_id, page_slug`);
    let psOrphans = 0;
    for (const r of ps.rows) {
      // Is it in custom-pages index?
      const idx = await pool.query(
        `SELECT settings FROM website_settings WHERE deployed_site_id = $1 AND section = 'custom-pages'`,
        [r.website_id]
      );
      const inIdx = (idx.rows[0]?.settings?.pages || []).some(p => p.slug === r.page_slug);
      // Is there a page-custom-* settings row?
      const stg = await pool.query(
        `SELECT 1 FROM website_settings WHERE deployed_site_id = $1 AND section = $2`,
        [r.website_id, 'page-custom-' + r.page_slug]
      );
      const hasSettings = stg.rows.length > 0;
      if (!inIdx) {
        psOrphans++;
        const site = await pool.query(`SELECT site_name, custom_domain, site_url FROM deployed_sites WHERE id=$1`, [r.website_id]);
        const sname = site.rows[0]?.site_name || 'unknown';
        const surl = site.rows[0]?.custom_domain || site.rows[0]?.site_url || '?';
        console.log(`  site=${r.website_id} (${sname} ${surl}) slug="${r.page_slug}" hasSettings=${hasSettings} inIndex=${inIdx}`);
      }
    }
    console.log(`Total page_sections orphans: ${psOrphans}\n`);

    // ──────────────────────────────────────────────────────────────
    // ANGLE 2: list every site's CURRENT custom-pages index (so Steve
    // can see what's known per site at a glance and spot missing).
    // ──────────────────────────────────────────────────────────────
    console.log('=== Current custom-pages index per site (top 30) ===');
    const all = await pool.query(`
      SELECT ws.deployed_site_id, ds.site_name, ds.custom_domain, ds.site_url, ws.settings
        FROM website_settings ws JOIN deployed_sites ds ON ds.id = ws.deployed_site_id
       WHERE ws.section = 'custom-pages'
       ORDER BY ds.site_name`);
    all.rows.slice(0, 30).forEach(r => {
      const pages = r.settings?.pages || [];
      console.log(`  [${r.deployed_site_id}] ${r.site_name} (${r.custom_domain || r.site_url}) → ${pages.length} page(s): ${pages.map(p => p.slug).join(', ') || '(empty)'}`);
    });
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
