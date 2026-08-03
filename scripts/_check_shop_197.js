const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const cols = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='shop_products' ORDER BY ordinal_position`);
  console.log('cols:', cols.rows.map(r=>r.column_name).join(', '));
  const r = await p.query(`SELECT id, account_id, name, product_type, price, currency, is_active, created_at, updated_at FROM shop_products WHERE account_id = 197 ORDER BY id DESC LIMIT 10`);
  console.log('\nproducts for 197:', JSON.stringify(r.rows, null, 2));
  await p.end();
})();
