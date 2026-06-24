// Lehmann-only apply of the custom-pages index rebuild.
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const SITE_ID = 57;

(async () => {
  try {
    const customs = await pool.query(
      `SELECT section, settings FROM website_settings WHERE deployed_site_id = $1 AND section LIKE 'page-custom-%' ORDER BY section`,
      [SITE_ID]
    );
    const indexRow = await pool.query(
      `SELECT settings FROM website_settings WHERE deployed_site_id = $1 AND section = 'custom-pages'`,
      [SITE_ID]
    );
    const existingIdx = (indexRow.rows[0]?.settings?.pages || []);
    const knownSlugs = new Set(existingIdx.map(p => p.slug));

    const missing = [];
    for (const c of customs.rows) {
      const slug = c.section.replace(/^page-custom-/, '');
      if (knownSlugs.has(slug)) continue;
      const s = c.settings || {};
      const title = (s['title-en'] || s.title || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())).trim();
      missing.push({
        slug,
        title,
        parent: s.parent || '',
        visibility: s.visibility || 'menu',
        external_url: s['external-url'] || s.external_url || null
      });
    }

    if (!missing.length) { console.log('Nothing to do on Lehmann.'); return; }
    console.log(`Restoring ${missing.length} page(s) to Lehmann custom-pages index:`);
    missing.forEach(m => console.log('  +', JSON.stringify(m)));

    const merged = [...existingIdx, ...missing];
    if (indexRow.rows.length) {
      await pool.query(
        `UPDATE website_settings SET settings = $1, updated_at = NOW() WHERE deployed_site_id = $2 AND section = 'custom-pages'`,
        [JSON.stringify({ pages: merged }), SITE_ID]
      );
    } else {
      await pool.query(
        `INSERT INTO website_settings (deployed_site_id, section, settings, created_at, updated_at) VALUES ($1, 'custom-pages', $2, NOW(), NOW())`,
        [SITE_ID, JSON.stringify({ pages: merged })]
      );
    }
    console.log(`\n✓ Wrote custom-pages with ${merged.length} total entries.`);

    // Verify
    const after = await pool.query(`SELECT settings FROM website_settings WHERE deployed_site_id = $1 AND section = 'custom-pages'`, [SITE_ID]);
    console.log('After:', JSON.stringify(after.rows[0]?.settings, null, 2));
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
