// Hunt for the Beds24 V2 endpoint that returns per-rate-plan daily prices.
// Need: for room 39945 (King Presidents), give me the price per date PER
// priceRule slot. That data unlocks both valid_days_of_week and per-offer
// daily_prices for our offers table.
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
  const ROOM = 39945;
  const FROM = '2026-07-01';
  const TO = '2026-07-14';
  const ARR = '2026-07-04'; // Saturday for offer-based endpoints
  const DEP = '2026-07-06';

  async function probe(label, url, params) {
    console.log('\n=== ' + label + ' ===');
    console.log('   ' + url + '  ' + JSON.stringify(params));
    try {
      const r = await axios.get(url, { headers: H, params });
      const data = r.data?.data;
      const sample = Array.isArray(data) ? data.slice(0, 2) : data;
      console.log('   response data:', JSON.stringify(sample).slice(0, 600));
      if (Array.isArray(data) && data.length > 2) console.log('   ...(' + data.length + ' total entries)');
    } catch (e) {
      console.log('   ✗', e.response?.data || e.message);
    }
  }

  // The 4 endpoints I haven't fully probed
  await probe('inventory/rooms/dates A', 'https://beds24.com/api/v2/inventory/rooms/dates', { roomId: ROOM, startDate: FROM, endDate: TO });
  await probe('inventory/rooms/dates B', 'https://beds24.com/api/v2/inventory/rooms/dates', { roomId: [ROOM], from: FROM, to: TO });
  await probe('inventory/rooms/calendar with includePrices', 'https://beds24.com/api/v2/inventory/rooms/calendar', { roomId: ROOM, startDate: FROM, endDate: TO, includePrices: true });
  await probe('inventory/rooms/calendar with rates', 'https://beds24.com/api/v2/inventory/rooms/calendar', { roomId: ROOM, startDate: FROM, endDate: TO, includeRates: true });
  await probe('inventory/rooms/offers A', 'https://beds24.com/api/v2/inventory/rooms/offers', { roomId: ROOM, arrival: ARR, departure: DEP });
  await probe('inventory/rooms/offers B (no dep)', 'https://beds24.com/api/v2/inventory/rooms/offers', { roomId: ROOM, arrival: ARR });
  await probe('inventory/rooms/availability', 'https://beds24.com/api/v2/inventory/rooms/availability', { roomId: ROOM, startDate: FROM, endDate: TO });
  await probe('inventory/rooms/unavailability', 'https://beds24.com/api/v2/inventory/rooms/unavailability', { roomId: ROOM, startDate: FROM, endDate: TO });
  await probe('inventory/fixedPrices', 'https://beds24.com/api/v2/inventory/fixedPrices', { roomId: ROOM, startDate: FROM, endDate: TO });
  await probe('inventory/rooms (basic)', 'https://beds24.com/api/v2/inventory/rooms', { id: ROOM });
  await probe('properties priceLines (includeAllPrices)', 'https://beds24.com/api/v2/properties', { id: 16276, includeAllRooms: true, includeAllPrices: true });
  await probe('properties dailyRates', 'https://beds24.com/api/v2/properties', { id: 16276, includeAllRooms: true, includeDailyRates: true });

  await p.end();
})();
