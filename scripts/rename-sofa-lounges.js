// One-off: rename property_bedrooms rows that are actually sofa-bed
// lounges (a "Bedroom N" with only a sofa bed in its bed_config). Cuts
// down the displayed bedroom count without losing guest capacity —
// max_guests on the bookable_unit isn't touched.
//
//   node scripts/rename-sofa-lounges.js [--apply]
//
// Without --apply it lists candidates only. With --apply it does the
// rename in a transaction.

require('dotenv').config();
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Candidate set: any "Bedroom N" row on a Cotswolds property where
  // every entry in bed_config is a sofa-bed (BED_SOFA / type='sofa')
  // AND the property has at least one OTHER bedroom row with non-sofa
  // beds. The second condition protects against bad-data cases where
  // every bedroom is sofa-only (e.g. Barnsley / Meadow View — likely
  // a Beds24-side data gap rather than an actual all-sofa property),
  // which would otherwise collapse to "0 bedrooms" — clearly wrong.
  // Properties already using a lounge-style name (e.g. 284 The Lighthouse
  // "Lounge - Sofa Bed") are excluded by the name ILIKE 'Bedroom %' guard.
  const candidates = await c.query(`
    WITH sofa_only_rows AS (
      SELECT pb.id, pb.property_id, p.name AS prop_name, pb.name AS bedroom_name, pb.bed_config
      FROM property_bedrooms pb
      JOIN properties p ON pb.property_id = p.id
      WHERE p.account_id = 95
        AND pb.name ILIKE 'Bedroom %'
        AND jsonb_typeof(pb.bed_config::jsonb) = 'array'
        AND (SELECT COUNT(*) FROM jsonb_array_elements(pb.bed_config::jsonb) e) > 0
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pb.bed_config::jsonb) e
          WHERE NOT (
            (e->>'type' ILIKE '%sofa%')
            OR (e->>'type' ILIKE 'BED_SOFA')
            OR (e->>'name' ILIKE '%sofa%')
          )
        )
    ),
    has_real_bedroom AS (
      SELECT DISTINCT pb.property_id
      FROM property_bedrooms pb
      WHERE jsonb_typeof(pb.bed_config::jsonb) = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(pb.bed_config::jsonb) e
          WHERE NOT (
            (e->>'type' ILIKE '%sofa%')
            OR (e->>'type' ILIKE 'BED_SOFA')
            OR (e->>'name' ILIKE '%sofa%')
          )
        )
    )
    SELECT s.* FROM sofa_only_rows s
    WHERE s.property_id IN (SELECT property_id FROM has_real_bedroom)
    ORDER BY s.property_id, s.id
  `);

  console.log(`Found ${candidates.rows.length} sofa-only "Bedroom N" rows to rename.\n`);
  for (const row of candidates.rows) {
    console.log(`  ${row.property_id} ${row.prop_name} | ${row.bedroom_name} → "Lounge with Sofa Bed"`);
  }

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to commit.`);
    await c.end();
    return;
  }

  await c.query('BEGIN');
  let renamed = 0;
  for (const row of candidates.rows) {
    await c.query(
      `UPDATE property_bedrooms SET name = $1, updated_at = NOW() WHERE id = $2`,
      ['Lounge with Sofa Bed', row.id]
    );
    renamed++;
  }
  await c.query('COMMIT');
  console.log(`\nRenamed ${renamed} rows.`);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
