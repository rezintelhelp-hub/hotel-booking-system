// One-shot: force marketplace-adapter CTA/CTD sync for GoSlopes right now,
// mirroring the exact scheduler write path (server.js:~146395 as of
// commit 54b1852a). Runs on Railway so it has env vars + prod DB.
//
//   railway run node scripts/_gs_force_cta_sync.js
require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CONNECTION_ID = 348; // GoSlopeSide LLC
const FROM = '2026-09-19';
const TO   = '2027-06-30';  // covers Dec 31 (+ full ski season)

async function beds24MarketplaceRequest(endpoint, extraData, extraAuth) {
  const user = process.env.BEDS24_MARKETPLACE_USER;
  const pass = process.env.BEDS24_MARKETPLACE_PASS;
  const apiKey = process.env.BEDS24_MASTER_API_KEY || process.env.BEDS24_MARKETPLACE_APIKEY;
  const url = `https://api.beds24.com/rezintel.net/${endpoint}`;
  const jsonData = { authentication: { apiKey, ...extraAuth }, ...extraData };
  const resp = await axios.post(url, `json=${encodeURIComponent(JSON.stringify(jsonData))}`, {
    auth: { username: user, password: pass },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 60000
  });
  return resp.data;
}

(async () => {
  const conn = (await pool.query('SELECT * FROM gas_sync_connections WHERE id=$1', [CONNECTION_ID])).rows[0];
  const creds = typeof conn.credentials === 'string' ? JSON.parse(conn.credentials) : conn.credentials;
  const targetPropKey = creds.propKey;

  const rooms = (await pool.query(`
    SELECT rt.id, rt.external_id AS beds24_room_id, rt.gas_room_id, bu.name
      FROM gas_sync_room_types rt
      JOIN gas_sync_properties sp ON rt.sync_property_id = sp.id
      JOIN bookable_units bu ON bu.id = rt.gas_room_id
     WHERE sp.connection_id = $1 AND rt.gas_room_id IS NOT NULL
     ORDER BY rt.gas_room_id`, [CONNECTION_ID])).rows;

  console.log(`Syncing ${rooms.length} GoSlopes rooms Dec 19 → Jun 30 (incOverride=1)`);

  const fromStr = FROM.replace(/-/g, '');
  const toStr   = TO.replace(/-/g, '');

  let totalDays = 0, ctaSet = 0, ctdSet = 0, errors = 0;
  for (const room of rooms) {
    try {
      const cal = await beds24MarketplaceRequest('getRoomDates', {
        roomId: room.beds24_room_id, from: fromStr, to: toStr,
        incMultiplier: 1, incOverride: 1
      }, { propKey: targetPropKey });

      const calendar = cal?.getRoomDates || cal || {};
      const dates = Object.keys(calendar).filter(k => /^\d{8}$/.test(k));

      let roomDays = 0, roomCTA = 0, roomCTD = 0;
      for (const dateKey of dates) {
        const day = calendar[dateKey];
        const dateFormatted = `${dateKey.substring(0, 4)}-${dateKey.substring(4, 6)}-${dateKey.substring(6, 8)}`;
        const inventory = parseInt(day.i) || 0;
        const multiplier = parseFloat(day.x) || 100;
        let bestPrice = null;
        for (let r = 1; r <= 16; r++) {
          const rp = parseFloat(day[`p${r}`]);
          if (rp && rp > 0) {
            const ep = rp * multiplier / 100;
            if (bestPrice === null || ep < bestPrice) bestPrice = ep;
          }
        }
        const minStay = parseInt(day.m) || 1;

        const _o = parseInt(day.o, 10) || 0;
        const cta = (_o & 1) !== 0 || (_o & 4) !== 0;
        const ctd = (_o & 2) !== 0 || (_o & 4) !== 0;
        if (cta) roomCTA++;
        if (ctd) roomCTD++;

        await pool.query(`
          INSERT INTO room_availability (room_id, date, price, cm_price, direct_price, is_available, is_blocked, min_stay, cm_min_stay, closed_to_arrival, closed_to_departure, cta_source, ctd_source, source, updated_at)
          VALUES ($1, $2, $3, $3, $3, $4, $5, $6, $6, $7, $8, 'beds24', 'beds24', 'beds24-marketplace', NOW())
          ON CONFLICT (room_id, date) DO UPDATE SET
            price = CASE WHEN $3 IS NOT NULL THEN $3 ELSE room_availability.price END,
            cm_price = CASE WHEN $3 IS NOT NULL THEN $3 ELSE room_availability.cm_price END,
            direct_price = CASE WHEN $3 IS NOT NULL THEN $3 ELSE room_availability.direct_price END,
            is_available = $4, is_blocked = $5,
            min_stay = CASE WHEN room_availability.min_stay_override IS NOT NULL THEN room_availability.min_stay ELSE $6 END,
            cm_min_stay = $6,
            closed_to_arrival   = CASE WHEN COALESCE(room_availability.cta_source, '') = 'operator' THEN room_availability.closed_to_arrival ELSE $7 END,
            closed_to_departure = CASE WHEN COALESCE(room_availability.ctd_source, '') = 'operator' THEN room_availability.closed_to_departure ELSE $8 END,
            cta_source = CASE WHEN COALESCE(room_availability.cta_source, '') = 'operator' THEN room_availability.cta_source ELSE 'beds24' END,
            ctd_source = CASE WHEN COALESCE(room_availability.ctd_source, '') = 'operator' THEN room_availability.ctd_source ELSE 'beds24' END,
            source = 'beds24-marketplace', updated_at = NOW()
        `, [room.gas_room_id, dateFormatted, bestPrice, inventory > 0 && bestPrice !== null, inventory === 0, minStay, cta, ctd]);
        roomDays++;
        totalDays++;
      }
      console.log(`  ✓ ${room.name.slice(0,60)} — ${roomDays} days, cta=${roomCTA}, ctd=${roomCTD}`);
      ctaSet += roomCTA; ctdSet += roomCTD;
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      errors++;
      console.log(`  ✗ ${room.name.slice(0,60)} — ${e.response?.data?.error || e.message}`);
    }
  }
  console.log(`\nDONE — ${totalDays} rows total, CTA set on ${ctaSet}, CTD set on ${ctdSet}, ${errors} errors`);
  await pool.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
