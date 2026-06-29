const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // 1) Property 1116 — every field that affects visibility
  const prop = await p.query(`
    SELECT id, name, account_id, status, show_on_portfolio, property_type,
           latitude, longitude, currency    FROM properties WHERE id = 1116
  `);
  console.log('property 1116:'); console.log(JSON.stringify(prop.rows[0], null, 2));

  // 2) Room 2281 — every field that affects visibility
  const room = await p.query(`
    SELECT id, name, property_id, status, unit_role, unit_type,
           max_guests, base_price    FROM bookable_units WHERE id = 2281
  `);
  console.log('\nroom 2281:'); console.log(JSON.stringify(room.rows[0], null, 2));

  // 3) Account info
  if (prop.rows[0]) {
    const acc = await p.query('SELECT id, name FROM accounts WHERE id = $1', [prop.rows[0].account_id]);
    console.log('\naccount:', JSON.stringify(acc.rows[0]));

    // 4) Deployed sites for this account
    const ds = await p.query('SELECT id, site_url, blog_id, property_id, property_ids FROM deployed_sites WHERE account_id = $1', [prop.rows[0].account_id]);
    console.log('\ndeployed_sites for account:');
    ds.rows.forEach(r => console.log(' ', JSON.stringify(r)));

    // 5) Run the actual server SELECT against these criteria for a quick sanity check
    const visible = await p.query(`
      SELECT bu.id, bu.name, bu.unit_role, bu.status,
             p.status AS prop_status, p.show_on_portfolio, p.account_id
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.account_id = $1
        AND p.status = 'active'
        AND (p.show_on_portfolio IS NULL OR p.show_on_portfolio = true)
        AND (bu.unit_role IN ('room', 'exclusive_hire') OR bu.unit_role IS NULL)
    `, [prop.rows[0].account_id]);
    console.log('\nrooms the public API would return for this account (no room_ids/property_id filter):');
    visible.rows.forEach(r => {
      const flag = r.id === 2281 ? '  <-- target' : '';
      console.log('  room ' + r.id + ' (prop ' + r.account_id + ' / status=' + r.status + ' / role=' + r.unit_role + ')' + flag);
    });
  }
  await p.end();
})();
