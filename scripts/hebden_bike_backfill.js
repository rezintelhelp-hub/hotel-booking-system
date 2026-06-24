// Backfill existing bike-storage bookings sitting on the generic unit
// 1268 (Hebden's Beds24-mapped bike storage room) to specific cabinets
// (units 2226-2232). Runs in DRY-RUN mode unless APPLY=1 is set in the
// env. Allocates first free cabinet per stay, processing oldest first so
// repeat dates collide deterministically.
//
//   Dry-run:   railway run node scripts/hebden_bike_backfill.js
//   Apply:     APPLY=1 railway run node scripts/hebden_bike_backfill.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const GENERIC_UNIT_ID = 1268;
const APPLY = process.env.APPLY === '1';

(async () => {
  try {
    const cabinets = await pool.query(
      `SELECT id, name, ttlock_lock_id FROM bookable_units
        WHERE property_id = (SELECT property_id FROM bookable_units WHERE id = $1)
          AND unit_role = 'bike_storage'
          AND status = 'available'
        ORDER BY id`, [GENERIC_UNIT_ID]
    );
    if (!cabinets.rows.length) { console.log('No cabinets — abort'); return; }
    console.log('Cabinet pool:', cabinets.rows.map(c => c.id + ':' + c.name).join(', '));

    // Future / active bookings only — past stays don't need cabinet
    // re-assignment (keys already issued or stay completed).
    const bookings = await pool.query(
      `SELECT id, arrival_date, departure_date, status, guest_first_name, guest_last_name,
              listing_id, booking_source, created_at
         FROM bookings
        WHERE bookable_unit_id = $1
          AND status IN ('confirmed','pending','inquiry')
          AND COALESCE(payment_status,'') NOT IN ('cancelled','failed','refunded')
          AND departure_date >= CURRENT_DATE
        ORDER BY arrival_date ASC, id ASC`, [GENERIC_UNIT_ID]
    );
    console.log('\nFound', bookings.rows.length, 'future/active booking(s) on generic unit', GENERIC_UNIT_ID, '\n');
    if (!bookings.rows.length) { console.log('Nothing to backfill'); return; }

    const dStr = (v) => (v instanceof Date) ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
    // In-memory ledger of allocations made during this run, so the
    // dry-run preview reflects what APPLY mode would actually do
    // (without an in-memory ledger the same cabinet would appear free
    // for every booking on the same date because we haven't written
    // the moves yet). Map: cabinetId → array of {arr, dep}.
    const allocatedInRun = {};
    cabinets.rows.forEach(c => { allocatedInRun[c.id] = []; });
    const overlapsInRun = (cabinetId, arr, dep) =>
      allocatedInRun[cabinetId].some(r => !(r.dep <= arr || r.arr >= dep));

    let moved = 0, skipped = 0;
    for (const b of bookings.rows) {
      const arr = dStr(b.arrival_date);
      const dep = dStr(b.departure_date);
      // First check live DB overlap (excludes anything we've moved this
      // run if dry-run, includes if APPLY).
      const overlap = await pool.query(
        `SELECT DISTINCT bookable_unit_id FROM bookings
          WHERE bookable_unit_id = ANY($1::int[])
            AND status IN ('confirmed','pending','inquiry')
            AND COALESCE(payment_status,'') NOT IN ('cancelled','failed','refunded')
            AND NOT (departure_date <= $2 OR arrival_date >= $3)`,
        [cabinets.rows.map(c => c.id), arr, dep]
      );
      const taken = new Set(overlap.rows.map(r => r.bookable_unit_id));
      // Then add this-run in-memory allocations for the dry-run preview.
      const pick = cabinets.rows.find(c => !taken.has(c.id) && !overlapsInRun(c.id, arr, dep));
      if (!pick) {
        console.log('  ✗ booking', b.id, '(' + b.guest_first_name, b.guest_last_name + ',', arr, '→', dep + ') — no free cabinet, SKIPPING');
        skipped++;
        continue;
      }
      console.log('  →', APPLY ? 'MOVING' : 'would move', 'booking', b.id, '(' + b.guest_first_name, b.guest_last_name + ',', arr, '→', dep + ') to cabinet', pick.id + ' (' + pick.name + ', lock=' + (pick.ttlock_lock_id || 'unpaired') + ')');
      allocatedInRun[pick.id].push({ arr, dep });
      if (APPLY) {
        await pool.query(`UPDATE bookings SET bookable_unit_id = $1, updated_at = NOW() WHERE id = $2`, [pick.id, b.id]);
        moved++;
      }
    }

    console.log('\nSummary:', APPLY ? `${moved} moved` : `${bookings.rows.length - skipped} would move`, '·', skipped, 'skipped (no free cabinet).');
    if (!APPLY) console.log('Re-run with APPLY=1 in env to write changes.');
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
