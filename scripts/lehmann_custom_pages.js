const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    const r = await pool.query(`SELECT settings FROM website_settings WHERE deployed_site_id = 57 AND section = 'custom-pages'`);
    console.log('--- custom-pages settings ---');
    console.log(JSON.stringify(r.rows[0]?.settings, null, 2));

    // Also dump each page-custom-* section so we can see what Steve built
    const customs = await pool.query(`SELECT section, settings, updated_at FROM website_settings WHERE deployed_site_id = 57 AND section LIKE 'page-custom-%' ORDER BY updated_at`);
    console.log('\n--- page-custom-* sections ---');
    customs.rows.forEach(r => {
      const s = r.settings || {};
      console.log(`\n[${r.section}] updated ${r.updated_at}`);
      console.log(`  title-en: ${JSON.stringify(s['title-en'])}`);
      console.log(`  parent:   ${JSON.stringify(s['parent'])}`);
      console.log(`  menu-title-en: ${JSON.stringify(s['menu-title-en'])}`);
      console.log(`  visibility: ${JSON.stringify(s['visibility'])}`);
      console.log(`  enabled: ${JSON.stringify(s['enabled'])}`);
      console.log(`  content-en (first 200): ${JSON.stringify((s['content-en'] || s['content'] || '').slice(0, 200))}`);
    });
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
