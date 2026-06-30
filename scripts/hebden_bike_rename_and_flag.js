// Hebden bike-storage one-shot:
//  - Rename units 2226-2232 so labels match physical signage (the
//    backfill landed Scott on 2226-2229 which physically are stores
//    4-7, and guests on 2230-2232 which physically are stores 1-3 —
//    the GAS unit names were the wrong way round).
//  - Flag Scott's 4 cabinets (after rename: stores 4-7, units
//    2226-2229) as bike_cabinet_public=false so the auto-allocator
//    trigger never picks them for guests, even if Scott's blocks lapse.
//  - Verify: after run, units should read 4,5,6,7,1,2,3 in id order
//    with stores 4-7 marked non-public.
//
//   railway run node scripts/hebden_bike_rename_and_flag.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const RENAMES = [
  { id: 2226, name: 'Bike Shed Store 4', public: false },
  { id: 2227, name: 'Bike Shed Store 5', public: false },
  { id: 2228, name: 'Bike Shed Store 6', public: false },
  { id: 2229, name: 'Bike Shed Store 7', public: false },
  { id: 2230, name: 'Bike Shed Store 1', public: true },
  { id: 2231, name: 'Bike Shed Store 2', public: true },
  { id: 2232, name: 'Bike Shed Store 3', public: true },
];

(async () => {
  try {
    // Self-contained: ensure the column exists before we set values, so
    // the script works whether or not the latest server.js has deployed.
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS bike_cabinet_public BOOLEAN DEFAULT true`).catch(() => {});

    for (const r of RENAMES) {
      await pool.query(
        `UPDATE bookable_units SET name = $1, bike_cabinet_public = $2, updated_at = NOW() WHERE id = $3`,
        [r.name, r.public, r.id]
      );
      console.log('  set', r.id, '→', JSON.stringify({ name: r.name, public: r.public }));
    }
    console.log('\nVerify:');
    const v = await pool.query(
      `SELECT id, name, bike_cabinet_public, ttlock_lock_id
         FROM bookable_units
        WHERE id IN (2226,2227,2228,2229,2230,2231,2232)
        ORDER BY id`
    );
    v.rows.forEach(r => console.log(' ', JSON.stringify(r)));
  } catch (e) { console.error('ERR', e.message); }
  finally { await pool.end(); }
})();
