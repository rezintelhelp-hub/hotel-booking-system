// Pull the live Channex state for connection 341 (account 197):
//   1. Properties registered on this Channex group
//   2. Room types per property
//   3. Recent bookings (including Celine's 5974506956)
// Read-only. No writes to GAS.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const c = (await p.query("SELECT credentials FROM gas_sync_connections WHERE id = 341")).rows[0];
  const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : c.credentials;
  const H = { 'user-api-key': creds.apiKey, accept: 'application/json' };

  // 1. Properties
  console.log('=== Channex properties on group ' + creds.groupId + ' ===');
  const props = await axios.get('https://app.channex.io/api/v1/properties', { headers: H, params: { 'filter[group_id]': creds.groupId } });
  const propList = props.data?.data || [];
  console.log('count:', propList.length);
  propList.forEach(p => {
    console.log('  ' + p.id + '  ' + (p.attributes?.title || '?') + '  (' + (p.attributes?.currency || '?') + ', ' + (p.attributes?.timezone || '?') + ')');
  });

  // Try production URL too in case staging is wrong
  if (!propList.length) {
    console.log('\n--- staging empty, trying production URL ---');
    try {
      const props2 = await axios.get('https://channex.io/api/v1/properties', { headers: H, params: { 'filter[group_id]': creds.groupId } });
      const list2 = props2.data?.data || [];
      console.log('production count:', list2.length);
      list2.forEach(p => console.log('  ' + p.id + '  ' + (p.attributes?.title || '?')));
    } catch (e) { console.log('production failed:', e.response?.status, e.response?.data); }
  }

  // 2. Recent bookings
  console.log('\n=== Recent Channex bookings ===');
  try {
    const today = new Date().toISOString().slice(0,10);
    const monthAgo = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const bk = await axios.get('https://app.channex.io/api/v1/bookings', { headers: H, params: { 'filter[group_id]': creds.groupId, 'filter[inserted_from]': monthAgo, 'filter[inserted_to]': today, 'pagination[limit]': 50 } });
    const list = bk.data?.data || [];
    console.log('count:', list.length);
    list.forEach(b => console.log('  ' + b.id + ' guest=' + (b.attributes?.customer?.name || '?') + ' arr=' + b.attributes?.arrival_date + ' dep=' + b.attributes?.departure_date + ' status=' + b.attributes?.status + ' ota=' + b.attributes?.ota_reservation_code));
  } catch (e) { console.log('bookings staging failed:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 300)); }

  // 3. Look for Celine 5974506956 specifically
  console.log('\n=== Search by OTA ref 5974506956 ===');
  try {
    const search = await axios.get('https://app.channex.io/api/v1/bookings', { headers: H, params: { 'filter[ota_reservation_code]': '5974506956' } });
    console.log('matches:', JSON.stringify(search.data?.data || []).slice(0, 500));
  } catch (e) { console.log('search failed:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 300)); }

  await p.end();
})();
