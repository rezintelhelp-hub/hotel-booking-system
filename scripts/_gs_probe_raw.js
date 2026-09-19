require('dotenv').config();
const axios = require('axios');
(async () => {
  const user = process.env.BEDS24_MARKETPLACE_USER;
  const pass = process.env.BEDS24_MARKETPLACE_PASS;
  const apiKey = process.env.BEDS24_MASTER_API_KEY;
  const propKey = process.env.PROBE_PROPKEY;
  if (!propKey) { console.log('set PROBE_PROPKEY env'); return; }

  const jsonData = {
    authentication: { apiKey, propKey },
    roomId: '98851',   // Spruce Glen Townhome B
    from: '20261225', to: '20270105',
    incMultiplier: 1, incOverride: 1
  };
  const r = await axios.post('https://api.beds24.com/rezintel.net/getRoomDates',
    `json=${encodeURIComponent(JSON.stringify(jsonData))}`,
    { auth: { username: user, password: pass }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 60000 });

  const cal = r.data?.getRoomDates || r.data;
  console.log('=== RAW response keys ===');
  console.log(Object.keys(cal).slice(0, 20).join(', '));
  console.log('\n=== ALL days ===');
  Object.keys(cal).filter(k => /^\d{8}$/.test(k)).sort().forEach(d => {
    console.log(`  ${d}: ${JSON.stringify(cal[d])}`);
  });
  console.log('\n=== all fields ever seen ===');
  const seen = new Set();
  Object.keys(cal).filter(k => /^\d{8}$/.test(k)).forEach(k => {
    Object.keys(cal[k]||{}).forEach(f => seen.add(f));
  });
  console.log([...seen].sort().join(', '));
})().catch(e => console.error(e.response?.data || e.message));
