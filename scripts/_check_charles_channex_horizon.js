require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Get GAS room_availability last date for Charles House rooms
  const rooms = await p.query(`SELECT bu.id, bu.name FROM bookable_units bu JOIN properties p ON p.id = bu.property_id WHERE p.account_id = 273 AND (bu.is_hidden = false OR bu.is_hidden IS NULL) AND COALESCE(bu.unit_role, 'room') = 'room' ORDER BY bu.id`);
  for (const r of rooms.rows) {
    const last = await p.query(`SELECT MAX(date::text) AS last_date, COUNT(*) AS cnt FROM room_availability WHERE room_id = $1 AND standard_price IS NOT NULL AND standard_price > 0`, [r.id]);
    console.log(`Room ${r.id} ${r.name}: last priced date = ${last.rows[0].last_date} (${last.rows[0].cnt} rows total)`);
  }
  // Also see if there's anything in gas_sync_channex_outbox queue
  const q = await p.query(`SELECT change_type, COUNT(*) AS n, MAX(created_at) AS newest FROM gas_sync_outbox WHERE account_id = 273 GROUP BY change_type ORDER BY newest DESC LIMIT 5`);
  console.log('\nOutbox for acct 273:', JSON.stringify(q.rows, null, 2));
  await p.end();
})();
