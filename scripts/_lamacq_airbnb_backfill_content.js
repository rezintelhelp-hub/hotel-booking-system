// One-shot: backfill Airbnb content gaps on Adrien Lamacq's 11 imported
// listings (account 277). Steve 2026-09-09 — the import ran before we
// captured amenities / unit_type / cm_source / property phone / property
// cover image, so we re-hit Channex for each existing listing and write
// only the missing fields onto the existing rows (no re-create, safe to
// re-run).
//
//   node scripts/_lamacq_airbnb_backfill_content.js           # dry-run
//   node scripts/_lamacq_airbnb_backfill_content.js --apply   # write
//
require('dotenv').config();
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const ACCOUNT_ID = 277;
const CHANNEL_DB_ID = 21; // gas_sync_channels row for Adrien's Airbnb channel

const roomTypeMap = {
  'entire_home': 'house', 'entire_place': 'house', 'private_room': 'double',
  'shared_room': 'dormitory', 'hotel_room': 'double'
};

// Very light URL-clean — matches server.js cleanImageUrl behaviour minus
// R2 rewrite (imports leave URLs external until sparks_media_migrate runs).
function cleanImageUrl(u) { return String(u || '').replace(/\?.*$/, ''); }

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Load channel + connection to build the Channex adapter
  const chanRow = await pool.query(`
    SELECT c.*, conn.account_id, conn.credentials
      FROM gas_sync_channels c
      JOIN gas_sync_connections conn ON conn.id = c.connection_id
     WHERE c.id = $1`, [CHANNEL_DB_ID]);
  if (chanRow.rows.length === 0) { console.error('Channel not found'); process.exit(1); }
  const ch = chanRow.rows[0];
  if (ch.account_id !== ACCOUNT_ID) { console.error('Channel account mismatch'); process.exit(1); }
  const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');
  const apiKey = (typeof ch.credentials === 'string' ? JSON.parse(ch.credentials) : (ch.credentials || {})).apiKey || process.env.CHANNEX_API_KEY;
  const adapter = new ChannexAdapter({ apiKey });

  // Find every already-imported listing via gas_sync_channel_mappings
  const mappings = await pool.query(`
    SELECT m.ota_listing_id, m.gas_bookable_unit_id, bu.property_id, bu.name,
           bu.cm_source, bu.amenities, bu.unit_type
      FROM gas_sync_channel_mappings m
      JOIN bookable_units bu ON bu.id = m.gas_bookable_unit_id
     WHERE m.channel_id = $1
     ORDER BY bu.id`, [CHANNEL_DB_ID]);
  console.log(`Found ${mappings.rows.length} imported listings for backfill (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const stats = { touched: 0, amenities_added: 0, property_fields_added: 0, errors: 0, skipped: 0 };

  for (const row of mappings.rows) {
    const listingId = row.ota_listing_id;
    const buId = row.gas_bookable_unit_id;
    const propId = row.property_id;
    console.log(`\n— listing ${listingId} · GAS room ${buId} · property ${propId} · "${row.name}"`);
    try {
      const detail = await adapter.getAirbnbListingDetails(ch.channex_channel_id, listingId);
      if (!detail.success) { console.log(`  ✗ Channex fetch failed: ${detail.error}`); stats.errors++; continue; }
      const L = detail.data?.listing || {};
      const desc = L.descriptions || {};
      const unitType = roomTypeMap[String(L.room_type_category || '').toLowerCase()] || 'apartment';
      // Amenities
      const rawAmen = L.amenities_details || L.amenities || [];
      const amenityDisplay = [];
      if (Array.isArray(rawAmen)) {
        for (const a of rawAmen) {
          if (!a) continue;
          if (typeof a === 'string') amenityDisplay.push(a);
          else if (a.name) amenityDisplay.push(String(a.name));
          else if (a.title) amenityDisplay.push(String(a.title));
        }
      }
      const uniqueAmenities = [...new Set(amenityDisplay.map(s => s.trim()).filter(Boolean))];
      console.log(`  · Airbnb returned ${uniqueAmenities.length} amenities, room_type_category=${L.room_type_category || 'none'}`);

      if (!APPLY) { stats.skipped++; continue; }

      // Backfill property fields (phone + cm_source + cm_property_id + cover image)
      await pool.query(`
        UPDATE properties SET
          phone = COALESCE(NULLIF($2, ''), phone),
          cm_source = COALESCE(cm_source, 'airbnb'),
          cm_property_id = COALESCE(cm_property_id, $3),
          updated_at = NOW()
         WHERE id = $1`,
        [propId, L.phone || L.host_phone || '', String(listingId)]);
      stats.property_fields_added++;

      // Cover image if property has none yet
      const hasCover = await pool.query('SELECT 1 FROM property_images WHERE property_id = $1 LIMIT 1', [propId]);
      if (hasCover.rows.length === 0) {
        const firstImg = (L.images || [])[0];
        const rawUrl = firstImg?.large_url || firstImg?.extra_large_url || firstImg?.extra_medium_url || firstImg?.small_url || firstImg?.thumbnail_url;
        if (rawUrl) {
          await pool.query(`
            INSERT INTO property_images (property_id, image_key, image_url, caption, sort_order, created_at)
            VALUES ($1, $2, $3, $4, 1, NOW())`,
            [propId, `airbnb-cover-${listingId}`, cleanImageUrl(rawUrl), desc.name || '']);
          console.log(`  ✓ property cover image added`);
        }
      }

      // Backfill bookable_unit fields (amenities JSONB + unit_type + cm_source/id)
      await pool.query(`
        UPDATE bookable_units SET
          amenities = CASE WHEN COALESCE(jsonb_array_length(amenities), 0) = 0 THEN $2::jsonb ELSE amenities END,
          unit_type = COALESCE(unit_type, $3),
          cm_source = COALESCE(cm_source, 'airbnb'),
          cm_room_id = COALESCE(cm_room_id, $4),
          updated_at = NOW()
         WHERE id = $1`,
        [buId, JSON.stringify(uniqueAmenities), unitType, String(listingId)]);

      // Match amenities to master_amenities → room_amenity_selections
      let matched = 0;
      for (const label of uniqueAmenities) {
        try {
          const m = await pool.query(
            `SELECT id FROM master_amenities
              WHERE LOWER(name) = LOWER($1)
                 OR LOWER(amenity_code) = LOWER(REPLACE($1, ' ', '_'))
                 OR LOWER(name) LIKE LOWER($2)
              ORDER BY (LOWER(name) = LOWER($1)) DESC
              LIMIT 1`,
            [label, `%${label}%`]);
          if (m.rows[0]) {
            await pool.query(
              `INSERT INTO room_amenity_selections (room_id, amenity_id, display_order)
               VALUES ($1, $2, 0) ON CONFLICT (room_id, amenity_id) DO NOTHING`,
              [buId, m.rows[0].id]);
            matched++;
          }
        } catch (_) {}
      }
      stats.amenities_added += matched;
      console.log(`  ✓ amenities: ${uniqueAmenities.length} labels → ${matched} matched to master_amenities`);
      stats.touched++;
    } catch (e) {
      console.error(`  ✗ error: ${e.message}`);
      stats.errors++;
    }
    // Polite pause so we don't hammer Channex
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nSummary: ${JSON.stringify(stats)}`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
