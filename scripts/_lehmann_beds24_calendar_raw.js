// Pull Beds24's raw calendar/availability response for ONE Lehmann room
// over the same week Steve pasted from the UI. See whether Beds24 returns
// Sat+Sun = $225 (UI-consistent) or Fri+Sat = $225 (matches GAS / off-by-1).
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const acc = (await p.query("SELECT beds24_refresh_token, beds24_token, beds24_token_expires FROM accounts WHERE id = 4")).rows[0];
  let token = acc.beds24_token;
  if (!token || new Date(acc.beds24_token_expires) < new Date()) {
    const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: acc.beds24_refresh_token } });
    token = r.data?.token;
  }
  const H = { token, accept: 'application/json' };

  // King Room - The Presidents Room is beds24 room 39945 (per earlier probe)
  // Try several endpoint shapes since /inventory/rooms/dates 500'd earlier.
  const today = '2026-07-01';
  const end = '2026-07-08';

  console.log('\n=== /properties?id=16276 includePriceRules+offers (re-confirm structure) ===');
  const props = await axios.get('https://beds24.com/api/v2/properties', {
    headers: H,
    params: { id: 16276, includeAllRooms: true, includePriceRules: true, includeOffers: true }
  });
  const room = props.data?.data?.[0]?.roomTypes?.find(r => r.id === 39945);
  console.log('room name:', room?.name);

  // Try the calendar endpoint that the sync uses
  console.log('\n=== /inventory/rooms/calendar?roomId=39945&startDate=' + today + '&endDate=' + end + ' ===');
  try {
    const cal = await axios.get('https://beds24.com/api/v2/inventory/rooms/calendar', {
      headers: H,
      params: { roomId: 39945, startDate: today, endDate: end }
    });
    const rows = cal.data?.data || [];
    console.log('entries returned:', rows.length);
    rows.forEach(e => {
      console.log('  ', JSON.stringify(e));
    });
  } catch (e) {
    console.log('calendar endpoint failed:', e.response?.data || e.message);
  }

  // Also try /inventory/rooms/offers — the offers price-per-rule endpoint
  console.log('\n=== /inventory/rooms/offers?roomId=39945&startDate=' + today + '&endDate=' + end + ' ===');
  try {
    const off = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
      headers: H,
      params: { roomId: 39945, startDate: today, endDate: end }
    });
    const rows = off.data?.data || [];
    console.log('entries returned:', rows.length);
    rows.slice(0, 10).forEach(e => console.log('  ', JSON.stringify(e).slice(0, 300)));
  } catch (e) {
    console.log('offers endpoint failed:', e.response?.data || e.message);
  }

  await p.end();
})();
