// One-off: pull check-in / check-out times from Beds24 for the newer
// Cotswolds properties (1039-1080 cluster) and seed property_terms.
// Closes the gap left when those properties were originally synced —
// the content-sync route only wrote text fields, not times. The fix
// for *future* syncs lives in server.js (commit 825414f0). This
// script backfills what's already there.
//
//   node scripts/backfill-cotswolds-terms-times.js

require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const CANONICAL_DEFAULTS = { from: '15:00', until: '22:00', out: '11:00' };

function padTime(v) {
  if (!v || typeof v !== 'string') return '';
  const m = v.match(/^(\d{1,2}):?(\d{2})?$/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2] || '00'}`;
}

function isDefaultOrBlank(v, canonical) {
  return v === null || v === '' || v === canonical;
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // 1) Get Cotswolds Beds24 refresh token
  const tokRow = await c.query(`SELECT refresh_token FROM gas_sync_connections WHERE id = 38`);
  const refreshToken = tokRow.rows[0]?.refresh_token;
  if (!refreshToken) {
    console.error('No refresh token on connection 38');
    process.exit(1);
  }
  const authResp = await axios.get('https://beds24.com/api/v2/authentication/token', {
    headers: { refreshToken }
  });
  const accessToken = authResp.data.token;
  console.log('Got Beds24 access token.');

  // 2) Affected property IDs (the new-sync cluster Steve flagged)
  const propsR = await c.query(`
    SELECT p.id AS gas_property_id, p.name, sp.external_id AS beds24_property_id
    FROM properties p
    JOIN gas_sync_properties sp ON sp.gas_property_id = p.id
    WHERE p.account_id = 95 AND p.id BETWEEN 1039 AND 1080
    ORDER BY p.id
  `);
  console.log(`Will backfill ${propsR.rows.length} properties.`);

  let updated = 0, skipped = 0, fetched = 0, errors = 0;

  for (const row of propsR.rows) {
    try {
      const b24Id = row.beds24_property_id;
      // Fetch the property from Beds24
      const propResp = await axios.get('https://beds24.com/api/v2/properties', {
        headers: { token: accessToken },
        params: { id: b24Id }
      });
      const list = Array.isArray(propResp.data) ? propResp.data : (propResp.data?.data || [propResp.data]);
      const b24Prop = list[0];
      if (!b24Prop) { console.log(`  ${row.gas_property_id} ${row.name}: no Beds24 row`); skipped++; continue; }

      const checkInFrom  = padTime(b24Prop.checkInStart    || b24Prop.checkInTimeStart);
      const checkInUntil = padTime(b24Prop.checkInEnd      || b24Prop.checkInTimeEnd);
      const checkOutBy   = padTime(b24Prop.checkOutEnd     || b24Prop.checkOutTime || b24Prop.checkOutTimeEnd);
      fetched++;

      if (!checkInFrom && !checkInUntil && !checkOutBy) {
        console.log(`  ${row.gas_property_id} ${row.name}: Beds24 returned no times — skipping`);
        skipped++;
        continue;
      }

      // Read current row, only overwrite NULL/blank/default values
      const cur = await c.query(
        `SELECT checkin_from, checkin_until, checkout_by FROM property_terms WHERE property_id = $1`,
        [row.gas_property_id]
      );
      const curRow = cur.rows[0] || {};

      const wantFrom  = checkInFrom  && isDefaultOrBlank(curRow.checkin_from,  CANONICAL_DEFAULTS.from);
      const wantUntil = checkInUntil && isDefaultOrBlank(curRow.checkin_until, CANONICAL_DEFAULTS.until);
      const wantOut   = checkOutBy   && isDefaultOrBlank(curRow.checkout_by,   CANONICAL_DEFAULTS.out);

      if (!wantFrom && !wantUntil && !wantOut) {
        console.log(`  ${row.gas_property_id} ${row.name}: all times already custom (skip)`);
        skipped++;
        continue;
      }

      const sets = [];
      const vals = [row.gas_property_id];
      let i = 2;
      if (wantFrom)  { sets.push(`checkin_from = $${i++}`);  vals.push(checkInFrom); }
      if (wantUntil) { sets.push(`checkin_until = $${i++}`); vals.push(checkInUntil); }
      if (wantOut)   { sets.push(`checkout_by = $${i++}`);   vals.push(checkOutBy); }
      sets.push('updated_at = NOW()');

      const r = await c.query(
        `UPDATE property_terms SET ${sets.join(', ')} WHERE property_id = $1`,
        vals
      );
      if (r.rowCount === 0) {
        // Row doesn't exist — INSERT
        await c.query(
          `INSERT INTO property_terms (property_id, checkin_from, checkin_until, checkout_by)
           VALUES ($1, $2, $3, $4)`,
          [row.gas_property_id, checkInFrom || null, checkInUntil || null, checkOutBy || null]
        );
      }
      console.log(`  ${row.gas_property_id} ${row.name}: ${checkInFrom}/${checkInUntil}/${checkOutBy}  (${[wantFrom && 'from', wantUntil && 'until', wantOut && 'out'].filter(Boolean).join(',')})`);
      updated++;

      // Beds24 rate-limit politeness
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`  ${row.gas_property_id} ${row.name}: ERROR ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone. fetched=${fetched} updated=${updated} skipped=${skipped} errors=${errors}`);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
