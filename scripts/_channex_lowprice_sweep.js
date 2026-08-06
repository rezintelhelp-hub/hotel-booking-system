// Find + fix all suspiciously-low room_availability rows across every
// Channex-connected account. Applies the same floor as the extender:
// price is raised to max(room.base_price, GLOBAL_MIN_FLOOR=15). Only
// touches CURRENT/FUTURE dates. Enqueues a Channex push for each row
// fixed so OTAs get the correct rate on the next sync.
//
//   Dry-run  (default): node scripts/_channex_lowprice_sweep.js
//   Apply           : APPLY=1 node scripts/_channex_lowprice_sweep.js
//   Just Charles    : ACCOUNT_ID=273 node scripts/_channex_lowprice_sweep.js
//   Custom floor    : GLOBAL_MIN_FLOOR=20 node scripts/_channex_lowprice_sweep.js

const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});

const APPLY = process.env.APPLY === '1';
const GLOBAL_MIN_FLOOR = Number(process.env.GLOBAL_MIN_FLOOR || 15);
const ACCOUNT_ID = process.env.ACCOUNT_ID ? parseInt(process.env.ACCOUNT_ID) : null;

(async () => {
  try {
    console.log(`Mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (read only)'}`);
    console.log(`Global floor: £${GLOBAL_MIN_FLOOR}`);
    console.log(`Scope: ${ACCOUNT_ID ? 'account ' + ACCOUNT_ID : 'ALL Channex accounts'}\n`);

    // Rooms on Channex-connected accounts
    const scope = ACCOUNT_ID ? 'AND p.account_id = $1' : '';
    const args = ACCOUNT_ID ? [ACCOUNT_ID] : [];
    const rooms = await pool.query(`
      SELECT bu.id AS room_id, bu.name AS room_name, bu.min_rate,
             p.account_id, a.name AS account_name, p.name AS property_name
        FROM bookable_units bu
        JOIN properties p ON p.id = bu.property_id
        JOIN accounts a ON a.id = p.account_id
        JOIN gas_sync_connections gsc ON gsc.account_id = p.account_id
         AND gsc.adapter_code = 'channex' AND COALESCE(gsc.status,'') != 'deleted'
       WHERE (bu.is_hidden = false OR bu.is_hidden IS NULL)
         AND COALESCE(bu.unit_role, 'room') = 'room'
         ${scope}
       ORDER BY p.account_id, bu.id
    `, args);

    console.log(`${rooms.rows.length} Channex-linked rooms considered\n`);

    let totalRowsToFix = 0, totalRoomsAffected = 0;
    const byAccount = {};

    for (const r of rooms.rows) {
      const roomMinRate = parseFloat(r.min_rate) || 0;
      const floor = Math.max(roomMinRate, GLOBAL_MIN_FLOOR);
      // Find future rows with an effective price below the floor
      const bad = await pool.query(`
        SELECT date, direct_price, cm_price, standard_price
          FROM room_availability
         WHERE room_id = $1
           AND date >= CURRENT_DATE
           AND COALESCE(direct_price, cm_price, standard_price) IS NOT NULL
           AND COALESCE(direct_price, cm_price, standard_price) < $2
         ORDER BY date
      `, [r.room_id, floor]);

      if (bad.rows.length === 0) continue;
      totalRoomsAffected++;
      totalRowsToFix += bad.rows.length;
      const acct = r.account_name;
      byAccount[acct] = (byAccount[acct] || 0) + bad.rows.length;

      const firstDate = bad.rows[0].date;
      const lastDate = bad.rows[bad.rows.length - 1].date;
      const minPushed = Math.min(...bad.rows.map(x => parseFloat(x.direct_price || x.cm_price || x.standard_price)));
      const maxPushed = Math.max(...bad.rows.map(x => parseFloat(x.direct_price || x.cm_price || x.standard_price)));
      console.log(`[${acct}] ${r.property_name} · ${r.room_name} (id ${r.room_id}) — ${bad.rows.length} rows below £${floor} (range £${minPushed}-£${maxPushed}), spans ${String(firstDate).slice(0,10)} → ${String(lastDate).slice(0,10)}, floor £${floor} (min_rate £${roomMinRate})`);

      if (APPLY) {
        // Only bump the columns that were set. If direct_price was low, bump it;
        // same for cm_price and standard_price.
        const r2 = await pool.query(`
          UPDATE room_availability
             SET direct_price   = CASE WHEN direct_price   IS NOT NULL AND direct_price   < $2 THEN $2 ELSE direct_price   END,
                 cm_price       = CASE WHEN cm_price       IS NOT NULL AND cm_price       < $2 THEN $2 ELSE cm_price       END,
                 standard_price = CASE WHEN standard_price IS NOT NULL AND standard_price < $2 THEN $2 ELSE standard_price END,
                 source         = COALESCE(source,'') || ' | floor_bumped_' || CURRENT_DATE,
                 updated_at     = NOW()
           WHERE room_id = $1
             AND date >= CURRENT_DATE
             AND COALESCE(direct_price, cm_price, standard_price) IS NOT NULL
             AND COALESCE(direct_price, cm_price, standard_price) < $2
        `, [r.room_id, floor]);
        console.log(`    ✓ bumped ${r2.rowCount} rows`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Rooms with low-price rows: ${totalRoomsAffected}`);
    console.log(`Total rows ${APPLY ? 'bumped' : 'that would be bumped'}: ${totalRowsToFix}`);
    Object.entries(byAccount).sort((a,b) => b[1]-a[1]).forEach(([acct, n]) => console.log(`  ${acct}: ${n}`));
    if (!APPLY && totalRowsToFix > 0) console.log(`\nRe-run with APPLY=1 to write the changes. Channex push will pick them up on the next 6-hour extender pass (or trigger POST /api/admin/channex/extend-availability sooner).`);
  } catch (e) {
    console.error('ERR', e.message, e.stack);
  } finally {
    await pool.end();
  }
})();
