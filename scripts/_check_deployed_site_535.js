const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const scoped = await p.query(
    `SELECT id, account_id, property_id, property_ids, custom_domain, site_url
       FROM deployed_sites
      WHERE account_id = 197
        AND (property_id = 535 OR property_ids @> to_jsonb(535::int))`);
  console.log('scoped to 535:', JSON.stringify(scoped.rows, null, 2));
  const anyAcct = await p.query(
    `SELECT id, account_id, property_id, custom_domain, site_url
       FROM deployed_sites WHERE account_id = 197`);
  console.log('\nany site on acct 197:', JSON.stringify(anyAcct.rows, null, 2));
  await p.end();
})();
