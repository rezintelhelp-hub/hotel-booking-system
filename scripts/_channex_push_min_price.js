// Backfill: push bookable_units.min_rate to Channex's PROPERTY-level
// settings.min_price for every property with at least one room that has a
// min_rate set. Uses the pushChannexPropertyMinPrice helper (same code
// the units save endpoint fires on change).
//
// Channex only supports min_price at the property level (not per-room,
// not on rate_plans, not on restrictions), so this takes the MAX across
// every Channex-mapped room on each property.
//
// Usage: node scripts/_channex_push_min_price.js [propertyId1,propertyId2,...]
// Default: all Channex-mapped properties with a min_rate somewhere.
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { pushChannexPropertyMinPrice } = require('../gas-sync/channex-outbox');

const overrideIds = (process.argv[2] || '').split(',').map(s => parseInt(s.trim())).filter(Number.isFinite);

(async () => {
  let propIds;
  if (overrideIds.length) {
    propIds = overrideIds;
  } else {
    const r = await p.query(`
      SELECT DISTINCT bu.property_id
        FROM bookable_units bu
        JOIN gas_sync_room_types gsrt ON gsrt.gas_room_id = bu.id
        JOIN gas_sync_properties gsp ON gsp.id = gsrt.sync_property_id
        JOIN gas_sync_connections gsc ON gsc.id = gsp.connection_id
       WHERE gsc.adapter_code = 'channex'
         AND bu.min_rate IS NOT NULL
       ORDER BY bu.property_id
    `);
    propIds = r.rows.map(x => x.property_id);
  }
  console.log(`Pushing property-level min_price to Channex for ${propIds.length} propert${propIds.length === 1 ? 'y' : 'ies'}: ${propIds.join(', ')}`);
  let ok = 0, err = 0, skip = 0;
  for (const pid of propIds) {
    const nameR = await p.query('SELECT name, account_id FROM properties WHERE id = $1', [pid]);
    const name = nameR.rows[0]?.name || '(unknown)';
    const acct = nameR.rows[0]?.account_id || '?';
    const res = await pushChannexPropertyMinPrice(p, pid);
    if (res.success) { console.log(`  ✓ ${name} (acct ${acct}, gas_prop ${pid}) → ${res.min_price}`); ok++; }
    else if (res.skipped) { console.log(`  ↷ ${name} (acct ${acct}, gas_prop ${pid}) skipped: ${res.skipped}`); skip++; }
    else { console.log(`  ✗ ${name} (acct ${acct}, gas_prop ${pid}) err: ${res.error || 'unknown'}`); err++; }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\nDone. ${ok} pushed, ${skip} skipped, ${err} errors.`);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
