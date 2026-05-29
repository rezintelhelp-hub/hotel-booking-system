// scripts/hebden-pool-mapping.js
//
// Day 4 of the hostel inventory build — finishes the pool/listing
// mapping for IOU Hebden Bridge Hostel (account 169). A prior session
// already set up most of it correctly; this script ships the 5
// remaining surgical fixes uncovered during the 2026-05-29 audit.
//
// Dry-run by default; pass --apply to actually write. Single transaction.
//
// Buyout ↔ individual cascade is automatic, no extra logic needed:
//   • Sell the buyout (whole_property listing consumes every pool at
//     full capacity) → every per-bed/per-room availability collapses
//     to 0 because FLOOR((cap-cap)/consumed) = 0.
//   • Sell any individual bed/room → that pool's sold ticks up →
//     buyout's availability for that pool = FLOOR((cap-1)/cap) = 0
//     → buyout listing drops to 0.
//
// Changes:
//   1. CREATE pool for Private 6 Bed Room Ensuite (source unit 1261).
//   2. FIX listing 12: was wrongly hooked to pool 10 (Mixed 6-Bed Dorm)
//      and labelled whole_room_exclusive. Re-link to new ensuite pool,
//      change kind → private_room, rename to canonical form.
//   3. CREATE whole_room_exclusive listing for Female Dorm Room 7.
//   4. CREATE whole_room_exclusive listing for Male Dorm Room 8.
//   5. ADD buyout consumption row for the new ensuite pool (so the
//      buyout still blocks every pool at full capacity).

const { Client } = require('pg');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const ACCOUNT_ID = 169;
const PROPERTY_ID = 523;

// Known IDs from the audit (verified read-only before writing).
const ENSUITE_SOURCE_UNIT_ID = 1261;  // unit 1261 = "Private 6 Bed Room Ensuite"
const ENSUITE_LISTING_ID = 12;        // existing mis-mapped listing
const MIXED_DORM_POOL_ID = 10;        // pool 10 = Mixed 6-Bed Dorm (current wrong attachment)
const FEMALE_DORM_POOL_ID = 14;       // pool 14 = Female Dorm Room 7
const MALE_DORM_POOL_ID = 11;         // pool 11 = Male Dorm Room 8
const BUYOUT_LISTING_ID = 2;          // listing 2 = Exclusive Hire (Whole Hostel)

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`\n${APPLY ? '🔥 APPLY MODE' : '🧪 DRY RUN'} — account ${ACCOUNT_ID}, property ${PROPERTY_ID}\n`);

  await c.query('BEGIN');
  try {
    // ── 1. Create pool for Private 6 Bed Room Ensuite ────────────────
    let ensuitePoolId;
    const existingPool = await c.query(
      `SELECT id FROM inventory_pools WHERE source_bookable_unit_id = $1`,
      [ENSUITE_SOURCE_UNIT_ID]
    );
    if (existingPool.rows[0]) {
      ensuitePoolId = existingPool.rows[0].id;
      console.log(`  1. pool [skip] ensuite pool exists → id=${ensuitePoolId}`);
    } else {
      const r = await c.query(
        `INSERT INTO inventory_pools (account_id, property_id, name, default_capacity, capacity_unit, source_bookable_unit_id)
         VALUES ($1, $2, 'Private 6 Bed Room Ensuite (pool)', 1, 'rooms', $3)
         RETURNING id`,
        [ACCOUNT_ID, PROPERTY_ID, ENSUITE_SOURCE_UNIT_ID]
      );
      ensuitePoolId = r.rows[0].id;
      console.log(`  1. pool [+]    Private 6 Bed Room Ensuite (pool) → id=${ensuitePoolId}`);
    }

    // ── 2. Fix listing 12: kind + name + consumption ────────────────
    const listing12 = await c.query(
      `SELECT listing_kind, name FROM bookable_listings WHERE id = $1`,
      [ENSUITE_LISTING_ID]
    );
    const needsKindFix = listing12.rows[0]?.listing_kind !== 'private_room';
    const needsRename  = listing12.rows[0]?.name !== 'Private 6 Bed Room Ensuite';
    if (needsKindFix || needsRename) {
      await c.query(
        `UPDATE bookable_listings
            SET listing_kind = 'private_room',
                name = 'Private 6 Bed Room Ensuite',
                max_occupancy = 6,
                updated_at = NOW()
          WHERE id = $1`,
        [ENSUITE_LISTING_ID]
      );
      console.log(`  2. listing [~] id=${ENSUITE_LISTING_ID} kind→private_room, name→canonical`);
    } else {
      console.log(`  2. listing [skip] id=${ENSUITE_LISTING_ID} already canonical`);
    }
    // Remove the wrong consumption row (listing 12 ↔ pool 10)
    const removeWrong = await c.query(
      `DELETE FROM listing_pool_consumption WHERE listing_id = $1 AND pool_id = $2 RETURNING listing_id`,
      [ENSUITE_LISTING_ID, MIXED_DORM_POOL_ID]
    );
    console.log(`     consumption [${removeWrong.rowCount ? '-' : 'skip'}] listing ${ENSUITE_LISTING_ID} ↔ pool ${MIXED_DORM_POOL_ID} (wrong attachment)`);
    // Add the correct consumption row (listing 12 ↔ new ensuite pool)
    await c.query(
      `INSERT INTO listing_pool_consumption (listing_id, pool_id, units_consumed)
       VALUES ($1, $2, 1)
       ON CONFLICT (listing_id, pool_id) DO UPDATE SET units_consumed = 1`,
      [ENSUITE_LISTING_ID, ensuitePoolId]
    );
    console.log(`     consumption [+] listing ${ENSUITE_LISTING_ID} ↔ pool ${ensuitePoolId} × 1`);

    // ── 3. Whole-room exclusive listing for Female Dorm Room 7 ──────
    let femaleExclusiveId = await ensureExclusiveListing(c,
      'Whole Female Dorm Room 7 (Private)', 4, FEMALE_DORM_POOL_ID);
    console.log(`  3. listing exclusive Female Dorm → id=${femaleExclusiveId}, consumes pool ${FEMALE_DORM_POOL_ID} × 4`);

    // ── 4. Whole-room exclusive listing for Male Dorm Room 8 ────────
    let maleExclusiveId = await ensureExclusiveListing(c,
      'Whole Male Dorm Room 8 (Private)', 4, MALE_DORM_POOL_ID);
    console.log(`  4. listing exclusive Male Dorm → id=${maleExclusiveId}, consumes pool ${MALE_DORM_POOL_ID} × 4`);

    // ── 5. Add buyout consumption for the new ensuite pool ──────────
    await c.query(
      `INSERT INTO listing_pool_consumption (listing_id, pool_id, units_consumed)
       VALUES ($1, $2, 1)
       ON CONFLICT (listing_id, pool_id) DO UPDATE SET units_consumed = 1`,
      [BUYOUT_LISTING_ID, ensuitePoolId]
    );
    console.log(`  5. buyout consumption [+] listing ${BUYOUT_LISTING_ID} ↔ pool ${ensuitePoolId} × 1`);

    if (APPLY) {
      await c.query('COMMIT');
      console.log('\n✅ COMMITTED');
    } else {
      await c.query('ROLLBACK');
      console.log('\n🔁 ROLLED BACK (dry-run). Re-run with --apply to commit.');
    }
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('❌ ERROR — rolled back:', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}

// Idempotent create-or-find of a whole_room_exclusive listing that
// consumes a single dorm pool at full capacity. Uses name-uniqueness as
// the idempotency key because exclusive listings don't have a source
// bookable_unit_id to anchor on.
async function ensureExclusiveListing(c, name, capacity, poolId) {
  const existing = await c.query(
    `SELECT id FROM bookable_listings
      WHERE account_id = $1 AND name = $2 AND listing_kind = 'whole_room_exclusive'`,
    [ACCOUNT_ID, name]
  );
  let listingId;
  if (existing.rows[0]) {
    listingId = existing.rows[0].id;
  } else {
    const r = await c.query(
      `INSERT INTO bookable_listings
        (account_id, property_id, name, listing_kind, max_occupancy, currency)
       VALUES ($1, $2, $3, 'whole_room_exclusive', $4, 'GBP')
       RETURNING id`,
      [ACCOUNT_ID, PROPERTY_ID, name, capacity]
    );
    listingId = r.rows[0].id;
  }
  await c.query(
    `INSERT INTO listing_pool_consumption (listing_id, pool_id, units_consumed)
     VALUES ($1, $2, $3)
     ON CONFLICT (listing_id, pool_id) DO UPDATE SET units_consumed = EXCLUDED.units_consumed`,
    [listingId, poolId, capacity]
  );
  return listingId;
}

run();
