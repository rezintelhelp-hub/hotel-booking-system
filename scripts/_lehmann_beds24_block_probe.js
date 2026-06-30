// Find the correct Beds24 V2 endpoint + payload shape for blocking a date.
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
  const H = { token, accept: 'application/json', 'content-type': 'application/json' };
  const ROOM = 66774; // Fredericks
  const DATE = '2026-07-04'; // Steve's test date

  async function tryPost(label, url, body) {
    console.log('\n=== ' + label + ' ===');
    console.log('  ' + url);
    console.log('  body:', JSON.stringify(body).slice(0, 200));
    try {
      const r = await axios.post(url, body, { headers: H, timeout: 30000 });
      console.log('  ✓', JSON.stringify(r.data).slice(0, 300));
    } catch (e) {
      console.log('  ✗', e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 300));
    }
  }

  // Try several plausible shapes
  await tryPost('A: /inventory/rooms/calendar — array of room objects', 'https://beds24.com/api/v2/inventory/rooms/calendar',
    [{ id: ROOM, calendar: [{ from: DATE, to: DATE, numAvail: 0 }] }]);

  await tryPost('B: /inventory/rooms/calendar — single room (not array)', 'https://beds24.com/api/v2/inventory/rooms/calendar',
    { id: ROOM, calendar: [{ from: DATE, to: DATE, numAvail: 0 }] });

  await tryPost('C: /inventory/rooms/calendar — bare calendar array', 'https://beds24.com/api/v2/inventory/rooms/calendar',
    [{ roomId: ROOM, from: DATE, to: DATE, numAvail: 0 }]);

  await tryPost('D: /inventory/rooms/unavailabilities', 'https://beds24.com/api/v2/inventory/rooms/unavailabilities',
    [{ roomId: ROOM, from: DATE, to: DATE, status: 'blocked' }]);

  await tryPost('E: /inventory/fixedPrices block via 0 inventory', 'https://beds24.com/api/v2/inventory/fixedPrices',
    [{ roomId: ROOM, firstNight: DATE, lastNight: DATE, numAvail: 0 }]);

  await tryPost('F: /inventory/rooms (config endpoint — wrong but to confirm 500)', 'https://beds24.com/api/v2/inventory/rooms',
    [{ id: ROOM, calendar: [{ from: DATE, to: DATE, numAvail: 0 }] }]);

  await p.end();
})();
