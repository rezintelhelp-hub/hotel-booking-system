const fetch = require('node-fetch');
(async () => {
  // Check product config
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const sp = await p.query(`SELECT id, name, price, event_duration_nights, property_id, account_id, is_active FROM shop_products WHERE id = 33`);
  console.log('Product 33:', JSON.stringify(sp.rows[0], null, 2));
  const room = await p.query(`SELECT bu.id, bu.name, bu.property_id, p.account_id FROM bookable_units bu LEFT JOIN properties p ON p.id = bu.property_id WHERE bu.id = 1309`);
  console.log('\nRoom 1309:', JSON.stringify(room.rows[0], null, 2));
  await p.end();
  // Test calculate-price with linked_product
  const url = 'https://admin.gas.travel/api/public/calculate-price';
  const body = { unit_id: 1309, check_in: '2026-10-03', check_out: '2026-10-24', guests: 1, adults: 1, children: 0, linked_product: 33 };
  const r = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  const d = await r.json();
  console.log('\nResponse.all_offers (' + (d.all_offers||[]).length + '):');
  for (const o of (d.all_offers || [])) console.log(`  ${o.id} — ${o.name} — type:${o.discount_type} value:${o.discount_value} rate_plan_total:${o.rate_plan_total}`);
  console.log('\nResponse.available:', d.available, '· nights:', d.nights);
})().catch(e => { console.error(e); process.exit(1); });
