// Enrich Lehmann's existing 23 cm-import offers with:
//   1. valid_days_of_week — derived from which days each price-slot is non-zero
//   2. daily_prices       — the per-date numeric £/night for that slot
//
// Source: Beds24 /inventory/rooms/calendar?includePrices=true returns calendar
// entries like {from, to, price1, price2, price3, ...} where priceN maps to
// the priceRule with id=N (Beds24 convention; verified manually for Lehmann
// where slot 1=Weekday, 2=Weekend, 3=Single Night Weekend).
//
// Lehmann-only (account_id=4). Only touches offers WHERE source='cm-import'
// AND cm_adapter='beds24'. Re-runnable.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ACCOUNT_ID = 4;
const PROPERTY_ID = 16276;
const HORIZON_DAYS = 365;
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function getToken() {
  const a = (await p.query("SELECT beds24_refresh_token, beds24_token, beds24_token_expires FROM accounts WHERE id = $1", [ACCOUNT_ID])).rows[0];
  let token = a.beds24_token;
  if (!token || new Date(a.beds24_token_expires) < new Date()) {
    const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: a.beds24_refresh_token } });
    token = r.data?.token;
  }
  return token;
}

function expandRange(fromStr, toStr) {
  const out = [];
  const from = new Date(fromStr + 'T00:00:00Z');
  const to = new Date(toStr + 'T00:00:00Z');
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

(async () => {
  const token = await getToken();
  const H = { token, accept: 'application/json' };

  // 1. Get all Lehmann rooms (beds24_room_id → gas room id)
  const rooms = await p.query(`
    SELECT bu.id AS gas_room_id, bu.name, bu.beds24_room_id::text AS beds24_room_id
    FROM bookable_units bu
    JOIN properties pr ON pr.id = bu.property_id
    WHERE pr.account_id = $1 AND bu.beds24_room_id IS NOT NULL
    ORDER BY bu.id
  `, [ACCOUNT_ID]);
  console.log('Lehmann rooms with beds24 link:', rooms.rows.length);

  // 2. Date horizon
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + HORIZON_DAYS * 86400000).toISOString().slice(0, 10);

  let offersUpdated = 0;
  let offersSkipped = 0;

  for (const room of rooms.rows) {
    // Pull this room's calendar with per-rate-plan prices
    let cal;
    try {
      const r = await axios.get('https://beds24.com/api/v2/inventory/rooms/calendar', {
        headers: H,
        params: { roomId: parseInt(room.beds24_room_id), startDate: today, endDate, includePrices: true }
      });
      cal = r.data?.data?.[0]?.calendar || [];
    } catch (e) {
      console.log('  ✗ room ' + room.beds24_room_id + ' calendar fetch failed:', e.response?.data || e.message);
      continue;
    }
    if (!cal.length) { console.log('  room ' + room.beds24_room_id + ' "' + room.name + '" → no calendar entries'); continue; }

    // Aggregate price slots: priceSlots[slotNum] = { date: price }
    const priceSlots = {};
    for (const entry of cal) {
      const dates = expandRange(entry.from, entry.to);
      for (const key of Object.keys(entry)) {
        const m = key.match(/^price(\d+)$/);
        if (!m) continue;
        const slot = parseInt(m[1]);
        const val = parseFloat(entry[key]);
        if (!Number.isFinite(val) || val <= 0) continue;
        priceSlots[slot] = priceSlots[slot] || {};
        for (const d of dates) priceSlots[slot][d] = val;
      }
    }

    // For each slot, derive valid_days_of_week from where prices are present
    // (only meaningful if the slot has at least 14 days of data — short
    // sample sizes might mis-classify).
    for (const slotStr of Object.keys(priceSlots)) {
      const slot = parseInt(slotStr);
      const dailyPrices = priceSlots[slot];
      const dateKeys = Object.keys(dailyPrices);
      if (!dateKeys.length) continue;

      const dowSet = new Set();
      for (const d of dateKeys) {
        const dow = new Date(d + 'T00:00:00Z').getUTCDay();
        dowSet.add(DOW_NAMES[dow]);
      }
      // Sort by week order
      const validDays = DOW_NAMES.filter(n => dowSet.has(n)).join(',');

      // Find the matching offer row (external_id = `${beds24_room_id}_${slot}`)
      const externalId = `${room.beds24_room_id}_${slot}`;
      const upd = await p.query(`
        UPDATE offers
        SET valid_days_of_week = $1,
            daily_prices = $2::jsonb,
            updated_at = NOW()
        WHERE account_id = $3 AND source = 'cm-import' AND cm_adapter = 'beds24'
          AND external_id = $4
        RETURNING id, name
      `, [validDays, JSON.stringify(dailyPrices), ACCOUNT_ID, externalId]);

      if (upd.rows.length) {
        offersUpdated++;
        console.log('  ✓ room ' + room.beds24_room_id + ' slot ' + slot + ' (offer "' + upd.rows[0].name + '"): ' + dateKeys.length + ' days, applies on ' + validDays);
      } else {
        offersSkipped++;
        console.log('  - no offer found for ' + externalId + ' (slot ' + slot + ' has ' + dateKeys.length + ' days)');
      }
    }
  }

  console.log('\n=== RESULT ===');
  console.log('offers updated  :', offersUpdated);
  console.log('orphan slots    :', offersSkipped);

  // Verify sample
  const verify = await p.query(`
    SELECT id, room_id, name, min_nights, max_nights, valid_days_of_week,
           jsonb_object_keys(daily_prices) IS NOT NULL AS has_prices
    FROM offers WHERE account_id = $1 AND source = 'cm-import' AND room_id = 1285
    ORDER BY name
  `, [ACCOUNT_ID]);
  console.log('\nverification — King Presidents Room (1285) offers after enrich:');
  verify.rows.forEach(r => console.log('  "' + r.name + '" min=' + r.min_nights + ' max=' + r.max_nights + ' days=' + r.valid_days_of_week + ' has_prices=' + r.has_prices));

  // Show actual prices for one offer
  const sample = await p.query("SELECT name, daily_prices FROM offers WHERE account_id = $1 AND room_id = 1285 AND name = 'Single Night Weekend' LIMIT 1", [ACCOUNT_ID]);
  if (sample.rows.length) {
    const dp = sample.rows[0].daily_prices;
    const firstFive = Object.entries(dp || {}).slice(0, 6);
    console.log('\nSingle Night Weekend prices (first 6 dates):');
    firstFive.forEach(([d, v]) => console.log('  ', d, '$' + v));
  }
  await p.end();
})();
