const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const rows = await p.query(`SELECT bookable_unit_id, to_char(date,'YYYY-MM-DD') AS date, channel, is_visible, updated_at FROM unit_channel_daily_visibility WHERE bookable_unit_id = 1309 ORDER BY date, channel`);
  console.log('Julie Anne (1309) overrides:', JSON.stringify(rows.rows, null, 2));
  // Also — hit the /api/availability endpoint from the server to confirm otas_hidden flag comes back
  const fetch = require('node-fetch');
  const url = 'https://admin.gas.travel/api/availability/1309?from=2026-10-05&to=2026-10-10';
  const resp = await fetch(url);
  const data = await resp.json();
  console.log('\nEndpoint sample:', JSON.stringify((data.availability || []).map(d => ({ date: d.date, is_available: d.is_available, is_blocked: d.is_blocked, otas_hidden: d.otas_hidden })), null, 2));
  await p.end();
})();
