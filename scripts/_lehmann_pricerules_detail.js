const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const acc = (await p.query("SELECT beds24_token, beds24_refresh_token, beds24_token_expires FROM accounts WHERE id = 4")).rows[0];
  let token = acc.beds24_token;
  if (new Date(acc.beds24_token_expires) < new Date()) {
    const r = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: acc.beds24_refresh_token } });
    token = r.data.token;
  }
  const H = { token, accept: 'application/json' };

  const rich = await axios.get('https://beds24.com/api/v2/properties', {
    headers: H,
    params: { id: 16276, includePriceRules: true, includeOffers: true, includeAllRooms: true }
  });
  const prop = rich.data?.data?.[0];
  const room = prop.roomTypes[0];
  console.log('=== ' + room.name + ' (room ' + room.id + ') ===');
  console.log('all 16 priceRules:');
  room.priceRules.forEach((r, i) => {
    const dates = r.firstNight || r.lastNight ? (r.firstNight || '∞') + ' → ' + (r.lastNight || '∞') : '(any date)';
    const days = r.allowedDaysOfWeek ? '  daysOfWeek=[' + r.allowedDaysOfWeek + ']' : '';
    console.log('  #' + (i+1).toString().padStart(2) + ' "' + (r.name || '').padEnd(28) + '" rate=' + (r.roomPrice || '-').toString().padEnd(7) + ' extraPerson=' + (r.extraPerson || '-').toString().padEnd(5) + ' minStay=' + (r.minimumStay || '-') + ' upTo=' + JSON.stringify(r.priceFor) + ' offer=' + r.offer + days + '  ' + dates);
  });
  // Also dump room 2 to see if rules differ per room
  if (prop.roomTypes[1]) {
    const room2 = prop.roomTypes[1];
    console.log('\n=== ' + room2.name + ' (room ' + room2.id + ') ===');
    console.log('all rules (first 6):');
    room2.priceRules.slice(0, 6).forEach((r, i) => {
      console.log('  #' + (i+1).toString().padStart(2) + ' "' + (r.name || '').padEnd(28) + '" rate=' + (r.roomPrice || '-').toString().padEnd(7) + ' extraPerson=' + (r.extraPerson || '-'));
    });
  }
  // Also show what `offers` contains (offer 1 is usually the "standard" offer; 2+ are deals)
  console.log('\nproperty-level offers:', JSON.stringify(prop.offers || prop.offerType || 'see roomTypes'));
  await p.end();
})();
