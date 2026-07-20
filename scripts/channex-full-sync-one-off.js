// One-off full-sync of a Channex connection.
// Reads room_availability for the next N days, builds availability +
// restriction values, POSTs each to Channex via the adapter. Replicates the
// server.js:14673 `/api/admin/channex/connection/:id/full-sync` endpoint
// logic — used to recover from the 2026-07-20 outbox drift.
//
// Usage:
//   DATABASE_URL=... node scripts/channex-full-sync-one-off.js <connection_id> [days]

const { Client } = require('pg');
const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');

async function main() {
  const connId = parseInt(process.argv[2], 10);
  const days = parseInt(process.argv[3] || 500, 10);
  if (!connId) { console.error('usage: node scripts/channex-full-sync-one-off.js <connection_id> [days]'); process.exit(2); }

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const conn = (await c.query(
    `SELECT id, account_id, credentials FROM gas_sync_connections WHERE id = $1 AND adapter_code = 'channex'`,
    [connId]
  )).rows[0];
  if (!conn) throw new Error('connection not found or not channex');
  const creds = typeof conn.credentials === 'string' ? JSON.parse(conn.credentials) : (conn.credentials || {});
  const apiKey = creds.apiKey || creds.v1ApiKey || process.env.CHANNEX_API_KEY;
  if (!apiKey) throw new Error('no apiKey on connection or env');

  const adapter = new ChannexAdapter({ apiKey, environment: process.env.CHANNEX_ENV === 'production' ? 'production' : 'staging' });
  console.log('adapter baseUrl:', adapter.baseUrl);

  const propRow = (await c.query(
    `SELECT id, external_id AS channex_property_id, gas_property_id
       FROM gas_sync_properties WHERE connection_id = $1 AND gas_property_id IS NOT NULL
       ORDER BY synced_at DESC NULLS LAST, id DESC LIMIT 1`,
    [connId]
  )).rows[0];
  if (!propRow) throw new Error('no mapped property on this connection');
  const propertyId = propRow.channex_property_id;
  const syncPropertyId = propRow.id;
  const gasPropertyId = propRow.gas_property_id;

  const propCur = (await c.query(`SELECT currency FROM properties WHERE id = $1`, [gasPropertyId])).rows[0];
  const propertyCurrency = (propCur?.currency || 'EUR').toUpperCase();

  const roomRows = (await c.query(
    `SELECT gsrt.id AS sync_room_type_id, gsrt.external_id AS channex_room_type_id,
            gsrt.gas_room_id, COALESCE(bu.quantity, 1) AS quantity
       FROM gas_sync_room_types gsrt
       LEFT JOIN bookable_units bu ON bu.id = gsrt.gas_room_id
      WHERE gsrt.sync_property_id = $1`,
    [syncPropertyId]
  )).rows;
  if (!roomRows.length) throw new Error('no room types mapped');

  const ratePlanRows = (await c.query(
    `SELECT external_id AS channex_rate_plan_id, sync_room_type_id, currency
       FROM gas_sync_rate_plans WHERE connection_id = $1`,
    [connId]
  )).rows;

  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const dateFor = (o) => new Date(start.getTime() + o * 86400000).toISOString().slice(0, 10);
  const startStr = dateFor(0), endStr = dateFor(days);

  const gasRoomIds = roomRows.map(r => r.gas_room_id).filter(Boolean);
  const blockedRes = await c.query(
    `SELECT room_id, date::text AS date FROM room_availability
      WHERE room_id = ANY($1::int[]) AND date >= $2::date AND date < $3::date
        AND (is_blocked = true OR is_available = false)`,
    [gasRoomIds, startStr, endStr]
  );
  const blockedSet = new Set(blockedRes.rows.map(r => `${r.room_id}|${r.date}`));
  console.log('blocked cells to push as 0:', blockedSet.size);

  const availValues = [];
  for (const r of roomRows) {
    for (let d = 0; d < days; d++) {
      const dateStr = dateFor(d);
      const isBlocked = blockedSet.has(`${r.gas_room_id}|${dateStr}`);
      availValues.push({ property_id: propertyId, room_type_id: r.channex_room_type_id, date: dateStr, availability: isBlocked ? 0 : r.quantity });
    }
  }
  console.log('POST /availability values:', availValues.length);
  const availResp = await adapter.request('/availability', 'POST', { values: availValues });
  const availTaskId = availResp?.data?.[0]?.id || availResp?.raw?.data?.[0]?.id || null;
  console.log('availability response task_id:', availTaskId, 'success:', availResp?.success);
  if (!availTaskId) console.log('  raw:', JSON.stringify(availResp).slice(0, 400));

  const roomBySyncId = new Map();
  for (const r of roomRows) roomBySyncId.set(r.sync_room_type_id, r);
  const priceRes = await c.query(
    `SELECT room_id, date::text AS date, standard_price FROM room_availability
      WHERE room_id = ANY($1::int[]) AND date >= $2::date AND date < $3::date AND standard_price IS NOT NULL`,
    [gasRoomIds, startStr, endStr]
  );
  const priceMap = new Map();
  for (const r of priceRes.rows) priceMap.set(`${r.room_id}|${r.date}`, parseFloat(r.standard_price));

  const restrValues = [];
  let plansSkippedByCurrency = 0, plansSkippedNoRoom = 0, datesSkippedNoPrice = 0;
  for (const rp of ratePlanRows) {
    if ((rp.currency || '').toUpperCase() !== propertyCurrency) { plansSkippedByCurrency++; continue; }
    const room = roomBySyncId.get(rp.sync_room_type_id);
    if (!room) { plansSkippedNoRoom++; continue; }
    for (let d = 0; d < days; d++) {
      const dateStr = dateFor(d);
      const price = priceMap.get(`${room.gas_room_id}|${dateStr}`);
      if (price === undefined || !(price > 0)) {
        datesSkippedNoPrice++;
        restrValues.push({ property_id: propertyId, rate_plan_id: rp.channex_rate_plan_id, date: dateStr, stop_sell: true, closed_to_arrival: true, closed_to_departure: true });
        continue;
      }
      restrValues.push({ property_id: propertyId, rate_plan_id: rp.channex_rate_plan_id, date: dateStr, rate: Math.round(price * 100), min_stay_arrival: 1, min_stay_through: 1, closed_to_arrival: false, closed_to_departure: false, stop_sell: false });
    }
  }
  console.log('POST /restrictions values:', restrValues.length, '(skipped by currency:', plansSkippedByCurrency, ', no room:', plansSkippedNoRoom, ', no price:', datesSkippedNoPrice + ')');
  if (restrValues.length === 0) {
    await c.end();
    return console.log('done — no restrictions to push');
  }
  const restrResp = await adapter.request('/restrictions', 'POST', { values: restrValues });
  const restrTaskId = restrResp?.data?.[0]?.id || restrResp?.raw?.data?.[0]?.id || null;
  console.log('restrictions response task_id:', restrTaskId, 'success:', restrResp?.success);
  if (!restrTaskId) console.log('  raw:', JSON.stringify(restrResp).slice(0, 400));

  await c.end();
  console.log('\n=== summary ===');
  console.log('connection:', connId, '· property:', propertyId, '· currency:', propertyCurrency, '· days:', days);
  console.log('availability rows:', availValues.length, '(blocked cells:', blockedSet.size, ')');
  console.log('restriction rows:', restrValues.length);
}

main().catch(e => { console.error('ERROR:', e.message, e.stack); process.exit(1); });
