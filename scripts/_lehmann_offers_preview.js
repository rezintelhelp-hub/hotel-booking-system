// PREVIEW ONLY (no writes to offers).
// 1. Sets cm_offers_import_enabled=true on account 4 (Lehmann) so the
//    server-side importer is unlocked for the actual run later.
// 2. Pulls Beds24 priceRules for the account using the same approach as
//    fetchBeds24PriceRulesForAccount() and prints what would be imported.
// 3. Does NOT touch the offers table.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const accId = 4;
  // 1) Enable the master flag
  const before = await p.query('SELECT cm_offers_import_enabled FROM accounts WHERE id = $1', [accId]);
  console.log('cm_offers_import_enabled before:', before.rows[0]?.cm_offers_import_enabled);
  if (!before.rows[0]?.cm_offers_import_enabled) {
    await p.query('UPDATE accounts SET cm_offers_import_enabled = true, updated_at = NOW() WHERE id = $1', [accId]);
    console.log('flipped to true');
  }

  // 2) Resolve a Beds24 token (mirror of getBeds24AccessTokenForAccount priority order)
  let token = null;
  // Try gas_sync_connections first
  const gsc = await p.query("SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1", [accId]);
  if (gsc.rows[0]?.refresh_token) {
    try { const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: gsc.rows[0].refresh_token } }); token = r.data?.token; } catch (_) {}
  }
  // Fallback: invite-code path
  if (!token) {
    const a = await p.query("SELECT beds24_refresh_token FROM accounts WHERE id = $1", [accId]);
    if (a.rows[0]?.beds24_refresh_token) {
      try { const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: a.rows[0].beds24_refresh_token } }); token = r.data?.token; } catch (_) {}
    }
  }
  if (!token) { console.log('no token resolved'); await p.end(); return; }

  // 3) Pull priceRules + offers per property/room
  const rich = await axios.get('https://beds24.com/api/v2/properties', {
    headers: { token, accept: 'application/json' },
    params: { includePriceRules: true, includeOffers: true, includeAllRooms: true }
  });
  const props = rich.data?.data || [];
  console.log('\nBeds24 properties on this account:', props.length);

  // 4) Walk rooms + non-empty priceRules. Show what would land in offers.
  // Also build the gas-room-id mapping for each beds24 room.
  let totalRules = 0, mappedRules = 0, unmappedRooms = new Set();
  for (const prop of props) {
    console.log('\n=== property ' + prop.id + ' ' + prop.name + ' (rooms: ' + (prop.roomTypes||[]).length + ') ===');
    for (const rt of (prop.roomTypes || [])) {
      // Look up the GAS room id linked to this beds24 room
      const link = await p.query("SELECT bu.id, bu.name FROM bookable_units bu WHERE bu.beds24_room_id::text = $1", [String(rt.id)]);
      const gasRoom = link.rows[0];
      const nonEmpty = (rt.priceRules || []).filter(r => r && r.name && r.name.trim());
      console.log('  room ' + rt.id + ' "' + rt.name + '" → ' + (gasRoom ? 'GAS room ' + gasRoom.id + ' "' + gasRoom.name + '"' : '⚠️  NOT LINKED in gas') + '   priceRules:' + nonEmpty.length);
      if (!gasRoom) { unmappedRooms.add(rt.id); }
      nonEmpty.forEach((r, i) => {
        totalRules++;
        if (gasRoom) mappedRules++;
        const days = r.allowedDaysOfWeek || '(any)';
        const dates = (r.firstNight || r.lastNight) ? (r.firstNight || '∞') + '→' + (r.lastNight || '∞') : '(any date)';
        const upto = r.priceFor?.upToPersonValue;
        console.log('     #' + r.id + ' "' + (r.name || '').padEnd(28) + '" minStay=' + (r.minimumStay||'-') + ' maxStay=' + (r.maximumStay||'-') + ' upTo=' + (upto||'-') + ' extraPerson=' + (r.extraPerson||'-') + ' offer=' + (r.offer||'-') + ' days=' + days + ' ' + dates);
      });
    }
  }
  console.log('\n=== SUMMARY ===');
  console.log('Beds24 active priceRules:', totalRules);
  console.log('Would import (rooms linked):', mappedRules);
  console.log('Skipped (rooms not linked to GAS): ' + (totalRules - mappedRules));
  if (unmappedRooms.size) console.log('Unmapped beds24 room ids:', Array.from(unmappedRooms).join(', '));

  // Sanity: how many offer rows currently on account 4
  const off = await p.query("SELECT COUNT(*) AS n FROM offers WHERE account_id = $1", [accId]);
  console.log('\ncurrent offers rows on Lehmann account:', off.rows[0].n);
  console.log('\n(No writes performed. Run the actual import via the cm-offers-import/run endpoint when ready.)');
  await p.end();
})();
