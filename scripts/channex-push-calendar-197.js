/**
 * Phase 1: Push GAS room_availability → Channex staging for account 197.
 *
 * Read-only on the GAS DB. Idempotent on the Channex side.
 *
 * Steps:
 *   1. Ensure each Channex room_type has a "Standard" rate_plan (create if missing)
 *   2. Read GAS `room_availability` for each unit (next 365 days from today)
 *   3. Map columns:
 *        rate            = COALESCE(standard_price, direct_price, cm_price, base_price)
 *        min_stay        = COALESCE(min_stay_override, cm_min_stay, min_stay, 1)
 *        availability    = available ? 1 : 0     (Channex caps at count_of_rooms)
 *   4. Push availability counts via adapter.updateAvailabilityBatch
 *   5. Push rate + min_stay via adapter.updateRestrictions (per rate_plan)
 *   6. Read back availability + restrictions from Channex to verify
 *
 * SAFETY: this script DOES NOT write to GAS DB. It only reads
 * room_availability + bookable_units. All side effects land on Channex.
 *
 * Run: node scripts/channex-push-calendar-197.js
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');
const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');

const ACCOUNT_ID = 197;
const HORIZON_DAYS = 365;
const BATCH_SIZE = 200;          // dates per Channex API call

// Stable IDs from yesterday's trial — already provisioned on staging.
const CHANNEX_GROUP_ID = 'f6af334c-7876-4d10-a8ad-08cbdf5d643b';
const CHANNEX_PROPERTY_ID = 'eaeefe34-56f6-42ed-9afd-0c5391691d27';
const ROOM_MAP = {
  // GAS bookable_unit_id → Channex room_type_id
  1309: '806d665f-f6cd-4c1c-a919-da63fc7f6ce6',  // Julie Anne
  1310: '9b342c84-a936-4660-ae21-d1ef0ddc129a'   // No 5
};

function loadApiKey() {
  const f = '/Users/stevedriver/hotel-booking-system/.env.channex';
  const line = fs.readFileSync(f, 'utf8').split('\n').find(l => l.startsWith('CHANNEX_API_KEY='));
  return line.replace(/^CHANNEX_API_KEY=/, '').trim();
}

function log(...a) { console.log('[push-cal-197]', ...a); }

async function ensureRatePlan(adapter, propertyId, roomTypeId, title, defaultRateCents) {
  const list = await adapter.getRatePlans(propertyId, { limit: 100 });
  if (!list.success) throw new Error(`getRatePlans failed: ${list.error}`);
  const existing = (list.data || []).find(rp => {
    const a = rp.attributes || rp;
    const linkedRoom = rp.relationships?.room_type?.data?.id || a.room_type_id;
    return linkedRoom === roomTypeId && (a.title || '').toLowerCase() === title.toLowerCase();
  });
  if (existing) {
    log(`rate plan "${title}" already exists for room ${roomTypeId} — reusing ${existing.id}`);
    return existing.id;
  }
  // Channex requires per-occupancy `options` on rate plan create. Rooms have
  // capacity 2 here, so we expose 1- and 2-person rates. Both default to the
  // same value (defaultRateCents); the per-date /restrictions push overwrites
  // these per night anyway.
  const create = await adapter.createRatePlan({
    title,
    propertyId,
    roomTypeId,
    currency: 'EUR',
    sellMode: 'per_room',
    rateMode: 'manual',
    occupancy: 2,
    children: 0,
    // sell_mode='per_room' = one flat rate regardless of occupancy. Channex
    // rejects multiple options in this mode. (For per-occupancy pricing we'd
    // switch to sell_mode='per_person'.)
    extra: {
      options: [
        { occupancy: 2, is_primary: true, rate: defaultRateCents }
      ]
    }
  });
  if (!create.success) throw new Error(`createRatePlan failed: ${JSON.stringify(create, null, 2)}`);
  const id = create.data?.id || create.data?.attributes?.id;
  log(`created rate plan "${title}" id=${id} for room ${roomTypeId}`);
  return id;
}

async function readGasCalendar(pg, unitId, fromDate, toDate) {
  // Pricing fallback: standard_price (canonical guest-facing) → direct_price
  // → cm_price → bookable_units.base_price.
  //
  // Bookable check: GAS treats a date as bookable when
  //   is_available = true AND is_blocked = false
  // (server.js:20655, 94427 — the canonical check used by both the booking
  // engine and the public availability search). The newer `available`
  // column was added for multi-unit qty awareness but is unreliable for
  // single-unit rooms (it can disagree with is_available/is_blocked when
  // sources conflict). Use is_available + NOT is_blocked instead.
  const r = await pg.query(`
    SELECT
      ra.date::text AS date,
      COALESCE(ra.standard_price, ra.direct_price, ra.cm_price, bu.base_price) AS rate,
      COALESCE(ra.min_stay_override, ra.cm_min_stay, ra.min_stay, 1) AS min_stay,
      ra.max_stay,
      (ra.is_available = true AND COALESCE(ra.is_blocked, false) = false) AS bookable
    FROM room_availability ra
    LEFT JOIN bookable_units bu ON bu.id = ra.room_id
    WHERE ra.room_id = $1 AND ra.date >= $2 AND ra.date <= $3
    ORDER BY ra.date
  `, [unitId, fromDate, toDate]);
  return r.rows;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  const apiKey = loadApiKey();
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const adapter = new ChannexAdapter({ apiKey, groupId: CHANNEX_GROUP_ID, environment: 'staging' });

  const fromDate = new Date().toISOString().slice(0, 10);
  const toDate = new Date(Date.now() + HORIZON_DAYS * 86400000).toISOString().slice(0, 10);
  log(`pushing ${fromDate} → ${toDate} (${HORIZON_DAYS} days) for account ${ACCOUNT_ID}`);

  for (const [unitIdStr, roomTypeId] of Object.entries(ROOM_MAP)) {
    const unitId = parseInt(unitIdStr);
    const unitMeta = await pg.query(`SELECT id, name FROM bookable_units WHERE id=$1`, [unitId]);
    const unitName = unitMeta.rows[0]?.name || `unit-${unitId}`;
    log(`\n=== ${unitName} (gas=${unitId} → channex=${roomTypeId}) ===`);

    // 1. Rate plan — seed the options[] with the unit's default base price
    //    so the rate plan is creatable. Per-date restrictions push real rates.
    const baseRow = await pg.query(
      `SELECT COALESCE(bu.base_price, 50)::numeric AS base FROM bookable_units bu WHERE bu.id=$1`,
      [unitId]
    );
    const seedCents = Math.round(parseFloat(baseRow.rows[0].base) * 100) || 5000;
    const ratePlanId = await ensureRatePlan(adapter, CHANNEX_PROPERTY_ID, roomTypeId, 'Standard', seedCents);

    // 2. Read GAS calendar
    const rows = await readGasCalendar(pg, unitId, fromDate, toDate);
    log(`read ${rows.length} GAS rows for ${unitName}`);
    if (rows.length === 0) { log('no GAS data — skipping'); continue; }

    // Sample first + last for sanity
    log(`first row:`, rows[0]);
    log(`last row:`, rows[rows.length - 1]);

    // 3. Build availability + restrictions payloads.
    // count: 1 if GAS considers the date bookable, 0 if blocked or unavailable.
    const availItems = rows.map(r => ({
      propertyId: CHANNEX_PROPERTY_ID,
      roomTypeId,
      date: r.date,
      count: r.bookable ? 1 : 0
    }));
    // Channex /restrictions wants `rate` in the currency's smallest unit
    // (cents for EUR). Multiply.
    const restrictionItems = rows
      .filter(r => r.rate !== null && Number(r.rate) > 0)
      .map(r => ({
        propertyId: CHANNEX_PROPERTY_ID,    // required even with rate_plan_id
        ratePlanId,
        date: r.date,
        rate: Math.round(parseFloat(r.rate) * 100),     // €40.00 → 4000
        minStayArrival: parseInt(r.min_stay) || 1,
        minStayThrough: parseInt(r.min_stay) || 1
      }));

    log(`will push: ${availItems.length} availability rows + ${restrictionItems.length} rate/restriction rows`);

    // 4. Push in batches
    for (const batch of chunk(availItems, BATCH_SIZE)) {
      const res = await adapter.updateAvailabilityBatch(batch);
      log(`  availability batch (${batch.length}):`, res.success ? `ok task=${res.data?.[0]?.id || '-'}` : `FAIL ${res.error} ${JSON.stringify(res.details || {})}`);
    }
    for (const batch of chunk(restrictionItems, BATCH_SIZE)) {
      const res = await adapter.updateRestrictions(batch);
      log(`  restrictions batch (${batch.length}):`, res.success ? `ok task=${res.data?.[0]?.id || '-'}` : `FAIL ${res.error} ${JSON.stringify(res.details || {})}`);
    }
  }

  // 5. Verify — read back a sample (3 days from today) for both rooms
  log('\n=== VERIFICATION (read-back from Channex, 3 days) ===');
  await new Promise(r => setTimeout(r, 3000));  // let async tasks settle
  const verifyTo = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  for (const [unitIdStr, roomTypeId] of Object.entries(ROOM_MAP)) {
    const unitId = parseInt(unitIdStr);
    const unitMeta = await pg.query(`SELECT id, name FROM bookable_units WHERE id=$1`, [unitId]);
    const unitName = unitMeta.rows[0]?.name || `unit-${unitId}`;
    const av = await adapter.getAvailability(roomTypeId, fromDate, verifyTo, { propertyId: CHANNEX_PROPERTY_ID });
    log(`${unitName} availability:`, av.data);
  }

  await pg.end();
  log('\n=== DONE ===');
})().catch(e => { console.error(e); process.exit(1); });
