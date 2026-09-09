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
  // Force production Channex — Railway sets CHANNEX_ENV=production but a
  // local .env-only run defaults to staging and 401s on every call.
  const adapter = new ChannexAdapter({ apiKey, environment: 'production' });

  // Find every already-imported listing via gas_sync_channel_mappings
  const mappings = await pool.query(`
    SELECT m.ota_listing_id, m.gas_bookable_unit_id, bu.property_id, bu.name,
           bu.cm_source, bu.amenities, bu.unit_type
      FROM gas_sync_channel_mappings m
      JOIN bookable_units bu ON bu.id = m.gas_bookable_unit_id
     WHERE m.channel_id = $1
     ORDER BY bu.id`, [CHANNEL_DB_ID]);
  console.log(`Found ${mappings.rows.length} imported listings for backfill (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const stats = { touched: 0, amenities_added: 0, property_fields_added: 0, terms_populated: 0, errors: 0, skipped: 0 };
  let dumpedFirstRawResponse = false;

  for (const row of mappings.rows) {
    const listingId = row.ota_listing_id;
    const buId = row.gas_bookable_unit_id;
    const propId = row.property_id;
    console.log(`\n— listing ${listingId} · GAS room ${buId} · property ${propId} · "${row.name}"`);
    try {
      const detail = await adapter.getAirbnbListingDetails(ch.channex_channel_id, listingId);
      if (!detail.success) { console.log(`  ✗ Channex fetch failed: ${detail.error}`); stats.errors++; continue; }
      const L = detail.data?.listing || {};
      // Dump the full first response so we can inspect which terms fields
      // Channex actually surfaces (varies by API version + listing type).
      if (!dumpedFirstRawResponse) {
        console.log('\n=== RAW listing_details keys (first successful listing) ===');
        console.log('Top-level:', Object.keys(detail.data || {}).sort().join(', '));
        console.log('listing.* keys:', Object.keys(L).sort().join(', '));
        const termsCandidates = ['house_rules','house_manual','house_rules_details','structured_house_rules',
          'cancellation_policy','cancel_policy','check_in_time_start','check_in_time_end',
          'check_in_time','checkout_time','check_in_instructions','guest_manual'];
        console.log('Terms-related fields present:');
        for (const k of termsCandidates) {
          if (L[k] !== undefined) console.log('  ✓ ' + k + ' → ' + JSON.stringify(L[k]).slice(0, 120));
        }
        console.log('=== END RAW DUMP ===\n');
        dumpedFirstRawResponse = true;
      }
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

      // Terms extraction — real Airbnb field paths discovered 2026-09-09.
      // Times are HH (string or int) — normalise to HH:MM. Guest controls
      // live under booking_settings.guest_controls.allows_*_as_host.
      // Respects the sync-lock trigger — operator-locked terms silently no-op.
      const bs = L.booking_settings || {};
      const gc = bs.guest_controls || {};
      const cps = bs.cancellation_policy_settings || {};
      const qh = Array.isArray(L.quiet_hours) && L.quiet_hours[0] || {};
      const cio = L.check_in_option || {};
      const fmtHour = h => {
        if (h === null || h === undefined || h === '') return null;
        const s = String(h).trim();
        if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? String(n).padStart(2, '0') + ':00' : null;
      };
      const checkInParts = [
        cio.category ? `Check-in method: ${cio.category}` : null,
        cio.instruction || null,
        bs.instant_book_welcome_message || null
      ].filter(Boolean).join('\n\n');
      const termsFields = {
        house_rules_text: L.descriptions?.house_rules || L.descriptions?.notes || null,
        cancel_policy: cps.cancellation_policy_category || null,
        checkin_from: fmtHour(bs.check_in_time_start),
        checkin_until: fmtHour(bs.check_in_time_end),
        checkout_by: fmtHour(bs.check_out_time),
        checkin_instructions: checkInParts || null,
        pets: gc.allows_pets_as_host === true ? 'yes' : gc.allows_pets_as_host === false ? 'no' : null,
        smoking: gc.allows_smoking_as_host === true ? 'yes' : gc.allows_smoking_as_host === false ? 'no' : null,
        events: gc.allows_events_as_host === true ? 'yes' : gc.allows_events_as_host === false ? 'no' : null,
        children: gc.allows_children_as_host === true ? 'all' : gc.allows_children_as_host === false ? 'no' : null,
        quiet_from: fmtHour(qh.start_time),
        quiet_until: fmtHour(qh.end_time),
      };
      const anyTerms = Object.values(termsFields).some(v => v !== null && v !== '' && v !== undefined);
      if (anyTerms) {
        try {
          await pool.query(`
            INSERT INTO property_terms (property_id, additional_rules, additional_rules_ml,
              cancellation_policy, checkin_from, checkin_until, checkout_by,
              check_in_instructions, check_in_instructions_ml,
              pet_policy, smoking_policy, events_policy, children_policy,
              quiet_hours_from, quiet_hours_until)
            VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (property_id) DO UPDATE SET
              additional_rules = COALESCE(EXCLUDED.additional_rules, property_terms.additional_rules),
              additional_rules_ml = COALESCE(EXCLUDED.additional_rules_ml, property_terms.additional_rules_ml),
              cancellation_policy = COALESCE(EXCLUDED.cancellation_policy, property_terms.cancellation_policy),
              checkin_from = COALESCE(EXCLUDED.checkin_from, property_terms.checkin_from),
              checkin_until = COALESCE(EXCLUDED.checkin_until, property_terms.checkin_until),
              checkout_by = COALESCE(EXCLUDED.checkout_by, property_terms.checkout_by),
              check_in_instructions = COALESCE(EXCLUDED.check_in_instructions, property_terms.check_in_instructions),
              check_in_instructions_ml = COALESCE(EXCLUDED.check_in_instructions_ml, property_terms.check_in_instructions_ml),
              pet_policy = COALESCE(EXCLUDED.pet_policy, property_terms.pet_policy),
              smoking_policy = COALESCE(EXCLUDED.smoking_policy, property_terms.smoking_policy),
              events_policy = COALESCE(EXCLUDED.events_policy, property_terms.events_policy),
              children_policy = COALESCE(EXCLUDED.children_policy, property_terms.children_policy),
              quiet_hours_from = COALESCE(EXCLUDED.quiet_hours_from, property_terms.quiet_hours_from),
              quiet_hours_until = COALESCE(EXCLUDED.quiet_hours_until, property_terms.quiet_hours_until),
              updated_at = NOW()
          `, [
            propId,
            termsFields.house_rules_text, termsFields.house_rules_text ? JSON.stringify({ en: termsFields.house_rules_text }) : null,
            termsFields.cancel_policy, termsFields.checkin_from, termsFields.checkin_until, termsFields.checkout_by,
            termsFields.checkin_instructions, termsFields.checkin_instructions ? JSON.stringify({ en: termsFields.checkin_instructions }) : null,
            termsFields.pets, termsFields.smoking, termsFields.events, termsFields.children,
            termsFields.quiet_from, termsFields.quiet_until
          ]);
          stats.terms_populated++;
          console.log(`  ✓ terms populated (or preserved if locked)`);
        } catch (termsErr) { console.warn(`  ⚠ terms write skipped: ${termsErr.message}`); }
      } else {
        console.log(`  · no terms fields returned by Channex for this listing`);
      }

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
