// Pull full booking + room types so we can build the GAS row correctly.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = (await p.query("SELECT credentials FROM gas_sync_connections WHERE id = 341")).rows[0];
  const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : c.credentials;
  const H = { 'user-api-key': creds.apiKey, accept: 'application/json' };
  const BASE = 'https://app.channex.io/api/v1';

  // 1. Full booking
  console.log('=== full booking 5a1c054a... ===');
  const b = await axios.get(BASE + '/bookings/5a1c054a-917f-449d-9276-2604caa3eefc', { headers: H });
  console.log(JSON.stringify(b.data?.data, null, 2));

  // 2. Room types on the property
  console.log('\n=== room types on property 18e45cee... ===');
  const rt = await axios.get(BASE + '/room_types', { headers: H, params: { 'filter[property_id]': '18e45cee-085e-4b2f-b21e-170ca9b976a8' } });
  (rt.data?.data || []).forEach(r => console.log('  ' + r.id + '  ' + (r.attributes?.title || '?') + '  occ=' + r.attributes?.occ_adults));

  // 3. GAS bookable_units on property 535
  const bu = await p.query('SELECT id, name FROM bookable_units WHERE property_id = 535 ORDER BY id');
  console.log('\n=== GAS bookable_units on property 535 ===');
  bu.rows.forEach(u => console.log('  ' + u.id + '  ' + u.name));

  // 4. Existing room type mapping in gas_sync_room_types
  const map = await p.query('SELECT id, sync_property_id, external_id, gas_room_id, name FROM gas_sync_room_types WHERE sync_property_id IN (2312, 2332)');
  console.log('\n=== existing room-type mappings for these sync_properties ===');
  if (!map.rows.length) console.log('  (none)');
  map.rows.forEach(m => console.log(' ', JSON.stringify(m)));

  await p.end();
})();
