// Fix bedroom counts to exclude lounges from the count
// This corrects properties that show "3 bedrooms" when they actually have 2 bedrooms + 1 lounge
//
//   node scripts/fix-bedroom-counts.js [--apply]
//
// Without --apply it shows what would be fixed. With --apply it performs the updates.

require('dotenv').config();
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log('=== Fixing Bedroom Counts (Excluding Lounges) ===\n');

  // Find all properties where num_bedrooms includes lounges
  const affected = await c.query(`
    SELECT DISTINCT
      p.id as property_id,
      p.name as property_name,
      bu.id as room_id,
      bu.name as room_name,
      bu.num_bedrooms as current_count,
      COUNT(DISTINCT pb.id) as total_bedroom_rows,
      COUNT(DISTINCT CASE WHEN pb.name NOT ILIKE '%lounge%' THEN pb.id END) as actual_bedrooms,
      COUNT(DISTINCT CASE WHEN pb.name ILIKE '%lounge%' THEN pb.id END) as lounge_count
    FROM properties p
    JOIN bookable_units bu ON bu.property_id = p.id
    LEFT JOIN property_bedrooms pb ON (pb.property_id = p.id AND pb.room_id = bu.id)
                                    OR (pb.property_id = p.id AND pb.room_id IS NULL AND bu.id = (
                                      SELECT bu2.id FROM bookable_units bu2
                                      WHERE bu2.property_id = p.id
                                      AND bu2.status IN ('active','available')
                                      LIMIT 1
                                    ))
    WHERE bu.status IN ('active','available')
    GROUP BY p.id, p.name, bu.id, bu.name, bu.num_bedrooms
    HAVING COUNT(DISTINCT CASE WHEN pb.name ILIKE '%lounge%' THEN pb.id END) > 0
       AND bu.num_bedrooms IS NOT NULL
       AND bu.num_bedrooms = COUNT(DISTINCT pb.id)
    ORDER BY p.name, bu.name
  `);

  if (affected.rows.length === 0) {
    console.log('No properties need fixing - all bedroom counts are already correct!');
    await c.end();
    return;
  }

  console.log(`Found ${affected.rows.length} room(s) that need fixing:\n`);

  for (const row of affected.rows) {
    console.log(`${row.property_name} (ID: ${row.property_id})`);
    if (row.room_name) {
      console.log(`  Room: ${row.room_name}`);
    }
    console.log(`  Current: ${row.current_count} bedrooms`);
    console.log(`  Should be: ${row.actual_bedrooms} bedrooms (+ ${row.lounge_count} lounge${row.lounge_count > 1 ? 's' : ''} with sofa bed)`);
    console.log('');
  }

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to fix these bedroom counts.');
    await c.end();
    return;
  }

  console.log('Applying fixes...\n');

  await c.query('BEGIN');
  let fixed = 0;

  for (const row of affected.rows) {
    await c.query(
      'UPDATE bookable_units SET num_bedrooms = $1, updated_at = NOW() WHERE id = $2',
      [row.actual_bedrooms, row.room_id]
    );
    console.log(`✓ Fixed ${row.property_name}${row.room_name ? ' - ' + row.room_name : ''}: ${row.current_count} → ${row.actual_bedrooms} bedrooms`);
    fixed++;
  }

  await c.query('COMMIT');
  console.log(`\n✅ Fixed ${fixed} room(s) successfully.`);

  // Also run a general sync to catch any other cases
  console.log('\nRunning general bedroom count sync (excluding lounges)...');

  // Sync rooms with directly linked bedrooms
  const directSync = await c.query(`
    UPDATE bookable_units bu SET num_bedrooms = sub.count
    FROM (
      SELECT room_id, COUNT(*) as count
      FROM property_bedrooms
      WHERE room_id IS NOT NULL
        AND name NOT ILIKE '%lounge%'
      GROUP BY room_id
    ) sub
    WHERE bu.id = sub.room_id AND sub.count > 0
  `);

  // Sync single-unit properties
  const singleSync = await c.query(`
    UPDATE bookable_units bu SET num_bedrooms = sub.count
    FROM (
      SELECT p.id as property_id, COUNT(pb.id) as count
      FROM properties p
      JOIN property_bedrooms pb ON pb.property_id = p.id AND pb.room_id IS NULL
      WHERE (SELECT COUNT(*) FROM bookable_units bu2 WHERE bu2.property_id = p.id AND bu2.status IN ('active','available')) = 1
        AND pb.name NOT ILIKE '%lounge%'
      GROUP BY p.id
    ) sub
    WHERE bu.property_id = sub.property_id
      AND bu.status IN ('active','available')
      AND sub.count > 0
  `);

  console.log(`Updated ${directSync.rowCount} room-linked units and ${singleSync.rowCount} property-level units.\n`);

  console.log('✅ All bedroom counts fixed successfully!');
  await c.end();

})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});