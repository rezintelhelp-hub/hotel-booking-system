// Correction: I just migrated Vo Rental's floor mattresses to
// 'double-floor-mattress' (capacity 2) but Steve confirmed they're all
// single (capacity 1). Switching them all to 'single-floor-mattress' and
// recomputing.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BED_TYPE_CAPACITY = {
  KING: 2, QUEEN: 2, DOUBLE: 2,
  SINGLE: 1, TWIN: 1,
  SOFA: 2, SOFA_BED: 2, SOFABED: 2, FUTON: 2,
  BUNK: 2, BUNKBED: 2, BUNK_BED: 2,
  FAMILY: 2, MURPHY: 2,
  FLOOR_MATTRESS: 1, FLOORMATTRESS: 1,
  SINGLE_FLOOR_MATTRESS: 1, SINGLEFLOORMATTRESS: 1,
  DOUBLE_FLOOR_MATTRESS: 2, DOUBLEFLOORMATTRESS: 2,
  AIR_MATTRESS: 1, AIRMATTRESS: 1,
  TRUNDLE: 1, CHILD: 1,
  COT: 0, CRIB: 0
};
function bedSleepCapacity(bed) {
  if (!bed || typeof bed !== 'object') return 0;
  if (typeof bed.sleeps_adults === 'number' || typeof bed.sleeps_children === 'number') {
    return Math.max(bed.sleeps_adults || 0, bed.sleeps_children || 0);
  }
  const type = String(bed.type || '').toUpperCase().replace(/-/g, '_').replace(/^BED_/, '');
  const cap = BED_TYPE_CAPACITY[type] !== undefined ? BED_TYPE_CAPACITY[type] : 2;
  const qty = parseInt(bed.quantity) || 1;
  return cap * qty;
}

const ALIASES = new Set([
  'floor-mattress', 'floor_mattress', 'floormattress',
  'bed_floormattress', 'bed_floor_mattress',
  'double-floor-mattress', 'double_floor_mattress'
]);

(async () => {
  const rows = await p.query(`
    SELECT pb.id, pb.room_id, pb.bed_config
    FROM property_bedrooms pb
    JOIN properties p ON p.id = pb.property_id
    WHERE p.account_id = 239
      AND jsonb_typeof(pb.bed_config) = 'array'
  `);
  let updatedRows = 0;
  const affectedRoomIds = new Set();
  for (const row of rows.rows) {
    let changed = false;
    const newCfg = row.bed_config.map(bed => {
      if (bed && typeof bed === 'object' && bed.type) {
        const lower = String(bed.type).toLowerCase();
        if (ALIASES.has(lower)) {
          changed = true;
          return { ...bed, type: 'single-floor-mattress' };
        }
      }
      return bed;
    });
    if (changed) {
      await p.query('UPDATE property_bedrooms SET bed_config = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(newCfg), row.id]);
      updatedRows++;
      if (row.room_id) affectedRoomIds.add(row.room_id);
    }
  }
  console.log('Re-migrated ' + updatedRows + ' bedroom rows to single-floor-mattress.');

  // Recompute each affected room
  for (const roomId of affectedRoomIds) {
    const r = await p.query('SELECT bed_config FROM property_bedrooms WHERE room_id = $1', [roomId]);
    let totalSleeps = 0, totalBeds = 0;
    for (const row of r.rows) {
      if (!Array.isArray(row.bed_config)) continue;
      for (const bed of row.bed_config) {
        totalSleeps += bedSleepCapacity(bed);
        totalBeds += parseInt(bed.quantity) || 1;
      }
    }
    const before = await p.query('SELECT name, max_guests, max_guests_from_beds FROM bookable_units WHERE id = $1', [roomId]);
    await p.query('UPDATE bookable_units SET max_guests_from_beds = $1, beds_from_amenities = $2, updated_at = NOW() WHERE id = $3', [totalSleeps, totalBeds, roomId]);
    const oldD = Math.max(before.rows[0].max_guests || 0, before.rows[0].max_guests_from_beds || 0);
    const newD = Math.max(before.rows[0].max_guests || 0, totalSleeps);
    console.log('  room ' + String(roomId).padEnd(6) + ' "' + (before.rows[0].name || '').slice(0, 28).padEnd(28) + '" derived ' + (before.rows[0].max_guests_from_beds||0) + '→' + totalSleeps + ' display ' + oldD + '→' + newD);
  }
  await p.end();
})();
