const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    const a = await pool.query(`SELECT id, name FROM accounts WHERE name ILIKE '%lehmann%'`);
    console.log('--- accounts ---'); a.rows.forEach(r => console.log(JSON.stringify(r)));
    const accountIds = a.rows.map(r => r.id);
    if (!accountIds.length) return;
    const ds = await pool.query(`SELECT id, blog_id, site_url, custom_domain, site_status, template, status FROM deployed_sites WHERE account_id = ANY($1::int[])`, [accountIds]);
    console.log('\n--- deployed_sites ---'); ds.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
