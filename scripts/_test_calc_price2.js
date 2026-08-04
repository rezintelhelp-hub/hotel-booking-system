const fetch = require('node-fetch');
(async () => {
  // Try a window past Sylvie's stay
  const url = 'https://admin.gas.travel/api/public/calculate-price';
  const body = { unit_id: 1309, check_in: '2026-11-01', check_out: '2026-11-22', guests: 1, adults: 1, children: 0, linked_product: 33 };
  const r = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  const d = await r.json();
  console.log('Nov 1-22 (21n) available:', d.available, '· nights:', d.nights);
  console.log('all_offers:');
  for (const o of (d.all_offers || [])) console.log(`  ${o.id} — ${o.name} — rate_plan_total:${o.rate_plan_total}`);
})();
