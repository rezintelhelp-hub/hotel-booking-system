const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`UPDATE bookings SET num_adults = 2, updated_at = NOW() WHERE id = 539597 RETURNING id, num_adults, num_children, total_guests`);
  console.log('Updated:', JSON.stringify(r.rows[0], null, 2));
  console.log('\nNew tourist tax total: 2 × 21 × 0.94 = ' + (2 * 21 * 0.94).toFixed(2) + ' €');
  await p.end();
})();
