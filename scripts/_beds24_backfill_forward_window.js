// One-off backfill: for every Beds24 direct connection, force a 730-day
// price + availability sync. Cotswolds first, then other accounts ordered
// by rooms-most-affected DESC so the biggest gaps close first. Staggered
// so Beds24 doesn't get hammered — ~10s between properties, ~30s between
// accounts. Read-only from Beds24 perspective (no writes to Beds24, only
// GAS DB writes).
const { Pool } = require('pg');
const axios = require('axios');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE = process.env.SYNC_BASE || 'https://admin.gas.travel';
const DAYS = 730;

(async () => {
  // 1) Cotswolds explicit — account_id 95
  // 2) All other Beds24 connections, ranked by count of rooms needing help
  const conns = await p.query(`
    WITH bad AS (
      SELECT bu.property_id, COUNT(*)::int AS bad_rooms
        FROM bookable_units bu
        LEFT JOIN LATERAL (
          SELECT MAX(ra.date) AS d FROM room_availability ra
          WHERE ra.room_id = bu.id AND ra.cm_price IS NOT NULL
        ) mp ON TRUE
       WHERE (mp.d < CURRENT_DATE + INTERVAL '365 days' OR mp.d IS NULL)
       GROUP BY bu.property_id
    ),
    props AS (
      SELECT c.id AS connection_id, c.account_id, a.name AS account_name,
             sp.id AS sync_property_id, sp.name AS property_name,
             COALESCE(bad.bad_rooms, 0) AS bad_rooms
        FROM gas_sync_connections c
        JOIN accounts a ON a.id = c.account_id
        JOIN gas_sync_properties sp ON sp.connection_id = c.id
        LEFT JOIN bad ON bad.property_id = sp.gas_property_id
       WHERE c.adapter_code = 'beds24'
         AND c.sync_enabled = true
         AND c.status = 'connected'
         AND sp.gas_property_id IS NOT NULL
    )
    SELECT * FROM props
     ORDER BY
       (account_id = 95) DESC,                    -- Cotswolds first
       bad_rooms DESC,                            -- Biggest gaps next
       account_id ASC, sync_property_id ASC
  `);
  console.log(`Total sync properties to hit: ${conns.rows.length}`);

  let successProps = 0, failProps = 0;
  let lastAccountId = null;
  for (let i = 0; i < conns.rows.length; i++) {
    const r = conns.rows[i];
    // 30s pause between accounts (except before the very first one)
    if (lastAccountId !== null && lastAccountId !== r.account_id) {
      console.log(`  --- switching accounts, 30s cool-down ---`);
      await new Promise(x => setTimeout(x, 30000));
    }
    lastAccountId = r.account_id;

    process.stdout.write(`[${i + 1}/${conns.rows.length}] acct ${r.account_id} ${r.account_name} · ${r.property_name} (bad_rooms=${r.bad_rooms})… `);
    const t0 = Date.now();
    try {
      const resp = await axios.post(
        `${BASE}/api/gas-sync/properties/${r.sync_property_id}/sync-prices`,
        { days: DAYS },
        { timeout: 10 * 60 * 1000 }
      );
      const ms = Date.now() - t0;
      if (resp.data?.success) {
        successProps++;
        console.log(`OK  daysUpdated=${resp.data.daysUpdated || resp.data.updated || '?'}  ${ms}ms`);
      } else {
        failProps++;
        console.log(`FAIL  ${resp.data?.error || 'no error'}  ${ms}ms`);
      }
    } catch (e) {
      failProps++;
      const ms = Date.now() - t0;
      console.log(`ERR  ${e.response?.status || ''} ${e.response?.data?.error || e.message}  ${ms}ms`);
    }
    await new Promise(x => setTimeout(x, 10000)); // 10s between properties
  }

  console.log(`\n=== DONE ===`);
  console.log(`  Success: ${successProps}`);
  console.log(`  Failed:  ${failProps}`);
  console.log(`\nSpot-check Cotswolds Coconuts Retreat rates end-date:`);
  const chk = await p.query(`
    SELECT MAX(date) FILTER (WHERE cm_price IS NOT NULL) AS last_priced
      FROM room_availability WHERE room_id = 2067
  `);
  console.log(`  ${chk.rows[0].last_priced}`);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
