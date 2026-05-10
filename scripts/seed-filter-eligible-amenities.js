/**
 * Seed master_amenities.is_filter_eligible — sensible defaults for the
 * booking-app filter dropdown. Hosts can curate further via the admin UI.
 * Idempotent. Re-run safely.
 */
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  await c.query(`ALTER TABLE master_amenities ADD COLUMN IF NOT EXISTS is_filter_eligible BOOLEAN DEFAULT false`);

  // Curated list — searched against actual amenity_code values in the DB.
  // These are amenities guests typically filter on. NOT included: niceties
  // like pillows, hangers, toilet roll holders — true but unhelpful for
  // narrowing a search.
  const defaults = [
    // Internet
    'WIFI', 'INTERNET', 'INTERNET_WIFI', 'high_speed_wifi',
    // Parking
    'PARKING_INCLUDED', 'PARKING_PAID', 'PARKING_POSSIBLE', 'FREE_STREET_PARKING', 'free_parking', 'paid_parking',
    // Pool / wellness
    'POOL', 'POOL_CHILDREN', 'POOL_HEATED', 'POOL_INDOOR', 'POOL_PRIVATE',
    'JACUZZI', 'SAUNA', 'GYM', 'FITNESS_ROOM', 'SPA',
    // Climate
    'AIR_CONDITIONING', 'HEATING',
    // Kitchen
    'KITCHEN', 'KITCHENETTE', 'kitchen_full', 'OUTDOOR_KITCHEN', 'SHARED_KITCHEN',
    'DISHWASHER', 'WASHING_MACHINE', 'TUMBLE_DRYER', 'washing_machine', 'tumble_dryer', 'dishwasher',
    // Entertainment
    'TV', 'SMART_TV', 'smarty_tv', 'CABLE_TV',
    // Meals
    'BREAKFAST_INCLUDED', 'RESTAURANT', 'BAR',
    // Family / pets
    'pets_allowed', 'PETS_CONSIDERED',
    // Accessibility
    'WHEELCHAIR_YES', 'ELEVATOR',
    // Outdoor / views
    'BALCONY', 'ROOF_TERRACE', 'GARDEN',
    'BEACH', 'BEACH_FRONT', 'BEACH_VIEW',
    'OCEAN_VIEW', 'MOUNTAIN_VIEW', 'LAKE_VIEW', 'GOLF_COURSE_VIEW',
    'GRILL', 'BARBECUE',
    // Self-check-in
    'self_check_in', 'electronic_door_lock',
    // EV
    'EV_CAR_CHARGER'
  ];

  const r = await c.query(
    `UPDATE master_amenities SET is_filter_eligible = true WHERE amenity_code = ANY($1)`,
    [defaults]
  );
  console.log(`seeded ${r.rowCount} rows as filter-eligible`);

  const found = await c.query(`SELECT amenity_code FROM master_amenities WHERE amenity_code = ANY($1)`, [defaults]);
  const foundCodes = new Set(found.rows.map(x => x.amenity_code));
  const missing = defaults.filter(x => !foundCodes.has(x));
  if (missing.length) console.log('seed codes not in DB (skipped):', missing.join(', '));

  const stats = await c.query(`SELECT
    COUNT(*) FILTER (WHERE is_filter_eligible = true)::int AS filter_eligible,
    COUNT(*)::int AS total
    FROM master_amenities WHERE is_active = true`);
  console.log(`result: ${stats.rows[0].filter_eligible} / ${stats.rows[0].total} amenities are filter-eligible`);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
