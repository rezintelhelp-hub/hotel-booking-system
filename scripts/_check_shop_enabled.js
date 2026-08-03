const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, shop_enabled, currency, shop_tax_rate FROM accounts WHERE id = 197`);
  console.log(JSON.stringify(r.rows[0], null, 2));
  // Test the actual endpoint
  const url = 'https://admin.gas.travel/api/public/client/197/shop/products';
  const fetch = require('node-fetch');
  const resp = await fetch(url);
  const data = await resp.json();
  console.log('\n' + url + ':\n' + JSON.stringify(data, null, 2).slice(0, 500));
  await p.end();
})();
