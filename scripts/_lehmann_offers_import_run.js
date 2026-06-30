// Surgical: actually run the CM Offers Import for Lehmann (account 4) only.
// Mirrors upsertCmPriceRuleAsOffer() at server.js:69590 byte-for-byte on the
// fields it sets — including the (account_id, external_id, cm_adapter)
// ON CONFLICT path so re-runs are safe.
// Touches NOTHING outside account_id=4.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ACCOUNT_ID = 4;
const ADAPTER = 'beds24';

function mapBeds24OfferRefundPolicy(beds24Offer) {
  if (!beds24Offer) return null;
  const name = String(beds24Offer.name || '').toLowerCase();
  const type = String(beds24Offer.type || '').toLowerCase();
  if (type.includes('nonref') || name.includes('non-refund') || name.includes('non refund')) return 'non_refundable';
  if (type.includes('full') || name.includes('flex')) return 'refundable';
  return 'inherit';
}

(async () => {
  // Safety: verify master gate
  const acct = (await p.query('SELECT id, name, cm_offers_import_enabled FROM accounts WHERE id = $1', [ACCOUNT_ID])).rows[0];
  if (!acct) { console.log('account not found'); await p.end(); return; }
  if (!acct.cm_offers_import_enabled) {
    console.log('cm_offers_import_enabled is FALSE — refusing to run');
    await p.end(); return;
  }
  console.log('Account:', acct.name, '(id', acct.id, ')');

  // Resolve token
  let token = null;
  const gsc = await p.query("SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1", [ACCOUNT_ID]);
  if (gsc.rows[0]?.refresh_token) {
    try { const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: gsc.rows[0].refresh_token } }); token = r.data?.token; } catch (_) {}
  }
  if (!token) {
    const a = await p.query("SELECT beds24_refresh_token FROM accounts WHERE id = $1", [ACCOUNT_ID]);
    if (a.rows[0]?.beds24_refresh_token) {
      const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: a.rows[0].beds24_refresh_token } });
      token = r.data?.token;
    }
  }
  if (!token) { console.log('no token'); await p.end(); return; }

  // Build the cm_room_id → gas_unit_id map (same query as fetchBeds24V2PriceRulesForAccount)
  const mapRes = await p.query(`
    SELECT bu.id as gas_unit_id, bu.property_id as gas_property_id,
           bu.beds24_room_id::text as cm_room_id
    FROM bookable_units bu
    JOIN properties pr ON bu.property_id = pr.id
    WHERE pr.account_id = $1 AND bu.beds24_room_id IS NOT NULL
  `, [ACCOUNT_ID]);
  const cmRoomToGas = {};
  for (const row of mapRes.rows) cmRoomToGas[row.cm_room_id] = { gasUnitId: row.gas_unit_id, gasPropertyId: row.gas_property_id };

  // Suppressions
  const suppressedRes = await p.query("SELECT cm_external_id FROM cm_offer_suppressions WHERE account_id = $1 AND cm_adapter = $2", [ACCOUNT_ID, ADAPTER]);
  const suppressedSet = new Set(suppressedRes.rows.map(r => ADAPTER + ':' + r.cm_external_id));

  // Pull Beds24 priceRules
  const rich = await axios.get('https://beds24.com/api/v2/properties', {
    headers: { token, accept: 'application/json' },
    params: { includeAllRooms: true, includePriceRules: true, includeOffers: true, limit: 100 }
  });
  const properties = rich.data?.data || [];

  // Build the entries list (mirror of fetchBeds24V2PriceRulesForAccount line 69558-69565)
  const entries = [];
  for (const prop of properties) {
    const offerLookup = {};
    for (const o of (prop.offers || [])) offerLookup[o.id] = o;
    for (const rt of (prop.roomTypes || [])) {
      const gas = cmRoomToGas[String(rt.id)];
      if (!gas) continue;
      for (const rule of (rt.priceRules || [])) {
        if (!rule || !rule.name || !rule.name.trim()) continue;
        entries.push({
          roomGasId: gas.gasUnitId,
          roomGasPropertyId: gas.gasPropertyId,
          cmRoomId: String(rt.id),
          rule: { ...rule, id: `${rt.id}_${rule.id}` },
          offerLabel: rule.offer != null ? (offerLookup[rule.offer]?.name || null) : null,
          offerRefundPolicy: rule.offer != null ? mapBeds24OfferRefundPolicy(offerLookup[rule.offer]) : null
        });
      }
    }
  }
  console.log('entries to upsert:', entries.length);

  // Upsert each entry (mirror of upsertCmPriceRuleAsOffer at server.js:69590)
  let inserted = 0, updated = 0, suppressed = 0, errors = 0;
  const seenExternalIds = [];
  for (const entry of entries) {
    const { roomGasId, roomGasPropertyId, rule, offerLabel, offerRefundPolicy } = entry;
    const externalId = String(rule.id);
    if (suppressedSet.has(ADAPTER + ':' + externalId)) { suppressed++; continue; }
    const name = rule.name || (offerLabel || ('CM Rule ' + externalId));
    const minNights = parseInt(rule.minimumStay) || null;
    const maxNights = parseInt(rule.maximumStay) || null;
    const minAdv = parseInt(rule.minDaysUntilCheckin) || null;
    const maxAdv = parseInt(rule.maxDaysUntilCheckin) || null;
    const extraPerson = rule.extraPerson != null ? parseFloat(rule.extraPerson) : null;
    const extraChild = rule.extraChild != null ? parseFloat(rule.extraChild) : null;
    const baseOccupancy = parseInt(rule.priceFor?.upToPersonValue ?? rule.priceFor?.upToPerson ?? rule.numAdult ?? rule.numAdults ?? rule.priceForAdults) || null;
    const offsetMult = (rule.priceLinking?.offsetMultiplier != null && rule.priceLinking?.priceId) ? parseFloat(rule.priceLinking.offsetMultiplier) : null;

    try {
      const r = await p.query(
        `INSERT INTO offers
           (account_id, name, description, external_id, cm_adapter, source,
            room_id, property_id, min_nights, max_nights,
            min_advance_days, max_advance_days,
            extra_person_amount, extra_child_amount, offset_multiplier,
            refund_policy, active, discount_type, discount_value, daily_prices,
            replaces_standard, base_occupancy, last_cm_synced_at)
         VALUES ($1, $2, $3, $4, $5, 'cm-import',
                 $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, 'percentage', $16, NULL, $17, $18, NOW())
         ON CONFLICT (account_id, external_id, cm_adapter) WHERE source = 'cm-import' AND external_id IS NOT NULL
         DO UPDATE SET
           name = EXCLUDED.name,
           room_id = EXCLUDED.room_id,
           property_id = EXCLUDED.property_id,
           min_nights = EXCLUDED.min_nights,
           max_nights = EXCLUDED.max_nights,
           min_advance_days = EXCLUDED.min_advance_days,
           max_advance_days = EXCLUDED.max_advance_days,
           extra_person_amount = EXCLUDED.extra_person_amount,
           extra_child_amount = EXCLUDED.extra_child_amount,
           offset_multiplier = EXCLUDED.offset_multiplier,
           refund_policy = COALESCE(EXCLUDED.refund_policy, offers.refund_policy),
           discount_value = EXCLUDED.discount_value,
           replaces_standard = EXCLUDED.replaces_standard,
           base_occupancy = EXCLUDED.base_occupancy,
           active = true,
           last_cm_synced_at = NOW(),
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          ACCOUNT_ID, name, offerLabel || null, externalId, ADAPTER,
          roomGasId, roomGasPropertyId, minNights, maxNights, minAdv, maxAdv,
          extraPerson, extraChild, offsetMult, offerRefundPolicy || 'inherit', 0,
          false, baseOccupancy
        ]
      );
      if (r.rows[0]?.inserted) inserted++; else updated++;
      seenExternalIds.push(externalId);
    } catch (e) {
      errors++;
      console.warn('  upsert failed for', externalId, ':', e.message);
    }
  }

  // Deactivate cm-import rows we DIDN'T see (mirror of server.js:69776)
  let deactivated = 0;
  if (seenExternalIds.length > 0) {
    const r = await p.query(
      `UPDATE offers SET active = false, updated_at = NOW()
       WHERE source = 'cm-import' AND cm_adapter = $1 AND account_id = $2 AND active = true
         AND NOT (external_id = ANY($3::text[]))
       RETURNING id`,
      [ADAPTER, ACCOUNT_ID, seenExternalIds]
    );
    deactivated = r.rows.length;
  }

  console.log('\n=== RESULT ===');
  console.log('inserted :', inserted);
  console.log('updated  :', updated);
  console.log('suppressed:', suppressed);
  console.log('errors   :', errors);
  console.log('deactivated (cm-import rows no longer in CM):', deactivated);

  // Verify
  const after = await p.query("SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE active) AS active FROM offers WHERE account_id = $1 AND source = 'cm-import'", [ACCOUNT_ID]);
  console.log('\noffers table for Lehmann (source=cm-import):', JSON.stringify(after.rows[0]));
  // Sample
  const sample = await p.query(`
    SELECT id, room_id, name, min_nights, max_nights, base_occupancy, extra_person_amount, refund_policy, active
    FROM offers WHERE account_id = $1 AND source = 'cm-import'
    ORDER BY room_id, min_nights LIMIT 5
  `, [ACCOUNT_ID]);
  console.log('\nfirst 5 sample rows:');
  sample.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  await p.end();
})();
