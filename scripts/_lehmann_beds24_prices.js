// Probe Beds24 V2 API live for Lehmann (account 4) to see what richer
// pricing data is exposed (priceRules / rates / offers / fees) — then
// compare against what we currently consume in the sync path.
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const a = await p.query("SELECT id, name, beds24_token, beds24_refresh_token, beds24_token_expires FROM accounts WHERE id = 4");
  const acc = a.rows[0];
  if (!acc) { console.log('no account 4'); await p.end(); return; }
  console.log('account:', acc.name);
  console.log('token expires:', acc.beds24_token_expires);

  let token = acc.beds24_token;
  // Refresh if expired
  if (new Date(acc.beds24_token_expires) < new Date()) {
    console.log('refreshing token...');
    const r = await axios.get('https://beds24.com/api/v2/authentication/token', {
      headers: { refreshToken: acc.beds24_refresh_token }
    });
    token = r.data.token;
    console.log('new token expires in:', r.data.expiresIn, 's');
  }

  const H = { token, accept: 'application/json' };

  // 1) Get properties this account can see
  console.log('\n=== GET /properties (basic) ===');
  let propsRes = await axios.get('https://beds24.com/api/v2/properties', { headers: H, params: { includeAllRooms: true } });
  const props = propsRes.data?.data || [];
  console.log('properties returned:', props.length);
  props.forEach(pr => console.log(' ', pr.id, pr.name, '(rooms:', (pr.roomTypes||[]).length + ')'));
  if (!props.length) { await p.end(); return; }

  const propId = props[0].id;
  const firstRoom = (props[0].roomTypes || [])[0];

  // 2) Get priceRules and ratesAndRules and fees — the richer pricing
  console.log('\n=== GET /properties (with priceRules + ratesAndRules + fees + offers) for property ' + propId + ' ===');
  const rich = await axios.get('https://beds24.com/api/v2/properties', {
    headers: H,
    params: {
      id: propId,
      includePriceRules: true,
      includeOffers: true,
      includeFees: true,
      includeRatesAndRules: true,
      includeAllRooms: true
    }
  });
  const prop = rich.data?.data?.[0];
  console.log('top-level keys:', Object.keys(prop || {}).join(', '));
  if (prop?.priceRules) {
    console.log('\npriceRules count:', prop.priceRules.length);
    console.log('first 3 priceRules:');
    prop.priceRules.slice(0, 3).forEach((r, i) => console.log('  [' + i + ']', JSON.stringify(r).slice(0, 400)));
  }
  if (prop?.offers) {
    console.log('\noffers count:', prop.offers.length);
    prop.offers.slice(0, 3).forEach((o, i) => console.log('  [' + i + ']', JSON.stringify(o).slice(0, 400)));
  }
  if (prop?.ratesAndRules) {
    console.log('\nratesAndRules count:', prop.ratesAndRules.length);
    prop.ratesAndRules.slice(0, 3).forEach((r, i) => console.log('  [' + i + ']', JSON.stringify(r).slice(0, 400)));
  }
  if (prop?.fees) {
    console.log('\nfees count:', prop.fees.length);
    prop.fees.slice(0, 3).forEach((f, i) => console.log('  [' + i + ']', JSON.stringify(f).slice(0, 400)));
  }
  if (prop?.roomTypes) {
    console.log('\nroomTypes (showing per-room priceRules + rates):');
    prop.roomTypes.slice(0, 3).forEach(rt => {
      console.log('  room', rt.id, rt.name);
      if (rt.priceRules) console.log('    priceRules:', rt.priceRules.length, 'first:', JSON.stringify(rt.priceRules[0]).slice(0, 300));
      if (rt.rates) console.log('    rates:', rt.rates.length, 'first:', JSON.stringify(rt.rates[0]).slice(0, 300));
      if (rt.dailyRates) console.log('    dailyRates: yes (sample first 3 days)');
    });
  }

  // 3) Also pull /inventory/rooms/dates to see day-by-day prices
  if (firstRoom) {
    console.log('\n=== GET /inventory/rooms/dates (next 14 days) for room ' + firstRoom.id + ' ===');
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    try {
      const dr = await axios.get('https://beds24.com/api/v2/inventory/rooms/dates', {
        headers: H,
        params: { roomId: firstRoom.id, startDate: today, endDate: end, includePrices: true }
      });
      const rows = dr.data?.data || [];
      console.log('days returned:', rows.length);
      console.log('first 3:');
      rows.slice(0, 3).forEach(d => console.log(' ', JSON.stringify(d).slice(0, 300)));
    } catch (e) {
      console.log('inventory/rooms/dates failed:', e.response?.data || e.message);
    }
  }
  await p.end();
})();
