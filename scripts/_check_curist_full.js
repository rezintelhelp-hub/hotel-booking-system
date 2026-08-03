const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT id, name, product_type, price, currency, offers_accommodation, property_id, event_start_date, event_end_date, event_duration_nights, event_block_rooms, event_held_room_ids, event_holds_status, event_recurring, available_days_of_week, valid_from, valid_until FROM shop_products WHERE id = 33`);
  console.log(JSON.stringify(r.rows[0], null, 2));
  await p.end();
})();
