require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const b = await p.query(`SELECT b.id, b.guest_first_name, b.guest_last_name, b.arrival_date, b.departure_date, b.status, b.bookable_unit_id, b.property_id, b.beds24_booking_id, b.channex_booking_id, b.booking_source, p.account_id, a.name AS acct FROM bookings b LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN accounts a ON a.id = p.account_id WHERE b.id = 536429`);
  const row = b.rows[0];
  if (!row) { console.log('Not found'); process.exit(0); }
  console.log('B536429:', JSON.stringify(row, null, 2));
  // Range around booking
  const from = new Date(row.arrival_date); from.setDate(from.getDate()-1);
  const to = new Date(row.departure_date); to.setDate(to.getDate()+1);
  const fromStr = from.toISOString().slice(0,10);
  const toStr = to.toISOString().slice(0,10);
  console.log(`\nAvailability API for unit ${row.bookable_unit_id} ${fromStr} → ${toStr}:`);
  const resp = await axios.get(`https://admin.gas.travel/api/availability/${row.bookable_unit_id}?from=${fromStr}&to=${toStr}`);
  for (const d of (resp.data.availability || [])) console.log(`  ${d.date}: avail=${d.is_available} blocked=${d.is_blocked} booked=${d.is_booked} bookings=${d.has_bookings} src=${d.source} count=${d.available_count}/${d.capacity}`);
  // Direct DB check on room_availability
  const ra = await p.query(`SELECT to_char(date,'YYYY-MM-DD') AS date, is_available, is_blocked FROM room_availability WHERE room_id = $1 AND date >= $2 AND date <= $3 ORDER BY date`, [row.bookable_unit_id, fromStr, toStr]);
  console.log(`\nroom_availability direct DB:`);
  for (const d of ra.rows) console.log(`  ${d.date}: avail=${d.is_available} blocked=${d.is_blocked}`);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
