const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  for (const tbl of ['rate_plans','rate_plan_dates','offers','bookable_unit_price_overrides','seasonal_rate_multipliers','daily_prices']) {
    const c = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [tbl]);
    console.log('\n=== ' + tbl + ' (' + c.rows.length + ' cols) ===');
    c.rows.forEach(r => console.log('  ' + r.column_name.padEnd(34) + r.data_type));
  }
  await p.end();
})();
