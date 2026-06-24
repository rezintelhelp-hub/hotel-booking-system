const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    // Lehmann deployed_site id = 57 (from earlier).
    const all = await pool.query(`SELECT section, updated_at, length(settings::text) AS bytes FROM website_settings WHERE deployed_site_id = 57 ORDER BY updated_at DESC`);
    console.log('--- ALL website_settings sections for Lehmann (most recent first) ---');
    all.rows.forEach(r => console.log(`  ${r.section.padEnd(28)} ${String(r.bytes).padStart(6)} bytes   updated ${r.updated_at}`));
    console.log(`\nTotal sections: ${all.rows.length}`);

    // Pull last 5 modified — show top-level keys so Steve can spot "free guide" etc.
    console.log('\n--- top-level keys per recent section ---');
    const recent = await pool.query(`SELECT section, settings, updated_at FROM website_settings WHERE deployed_site_id = 57 ORDER BY updated_at DESC LIMIT 10`);
    recent.rows.forEach(r => {
      const keys = r.settings && typeof r.settings === 'object' ? Object.keys(r.settings).slice(0, 30) : [];
      console.log(`  [${r.section}] (${r.updated_at})`);
      console.log('    keys: ' + keys.join(', '));
    });
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
