// Hostvana webhook trigger test — three options for stamping V2 bookings
// with apiSourceId: 70 (Rezintel channel partner). Run against Atlantis Realty
// (account 86) Avocado property. All test bookings use status='inquiry' (no
// availability block), far-future dates, clearly-tagged guest names, and are
// cancelled immediately after the GET-back check.

require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
const axios = require('axios');

const ACCOUNT_ID = 86;
const PROP_ID = 131203;       // Atlantis Avocado
const ROOM_ID = 293160;
const ARRIVAL = '2028-08-15';
const DEPARTURE = '2028-08-16';

async function loadToken() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(
    `SELECT access_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code = 'beds24' AND status = 'connected' ORDER BY created_at DESC LIMIT 1`,
    [ACCOUNT_ID]
  );
  await c.end();
  if (!r.rows[0]?.access_token) throw new Error('No V2 token for Atlantis');
  return r.rows[0].access_token;
}

function tag(label) {
  return `TEST-CLAUDE-${label}-${Date.now().toString().slice(-6)}`;
}

async function postV2(payload, headers, label) {
  console.log(`\n=== ${label} ===`);
  console.log('POST body[0] keys:', Object.keys(payload[0]).join(','));
  console.log('POST headers:', Object.keys(headers).join(','));
  try {
    const res = await axios.post('https://beds24.com/api/v2/bookings', payload, { headers, timeout: 30000 });
    console.log('Response:', JSON.stringify(res.data).slice(0, 600));
    return res.data;
  } catch (e) {
    console.log('ERR:', e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 600));
    return null;
  }
}

async function getV2(bookingId, token) {
  try {
    const res = await axios.get(`https://beds24.com/api/v2/bookings?bookingId=${bookingId}&includeInvoiceItems=true`, {
      headers: { token },
      timeout: 30000
    });
    return res.data;
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

async function cancelV2(bookingId, token) {
  try {
    const res = await axios.post('https://beds24.com/api/v2/bookings', [{ id: bookingId, status: 'cancelled' }], {
      headers: { 'Content-Type': 'application/json', token },
      timeout: 30000
    });
    console.log(`  cleanup ${bookingId}:`, JSON.stringify(res.data).slice(0, 200));
  } catch (e) {
    console.log(`  cleanup ${bookingId} FAIL:`, e.response?.data || e.message);
  }
}

(async () => {
  const token = await loadToken();
  console.log('Loaded V2 token, length:', token.length);

  const baseBooking = {
    propId: PROP_ID,
    roomId: ROOM_ID,
    status: 'inquiry',
    arrival: ARRIVAL,
    departure: DEPARTURE,
    numAdult: 1,
    email: 'test-claude@gas.travel',
    refererEditable: 'RezIntel-MyStayMessaging',
    notes: 'TEST — apiSourceId webhook probe. Auto-cancelled.'
  };
  const baseHeaders = { 'Content-Type': 'application/json', token };

  // ====== OPTION 1: apiSourceId in body ======
  const opt1Payload = [{
    ...baseBooking,
    firstName: tag('OPT1'),
    lastName: 'apiSourceIdBody',
    apiSourceId: 70,
    apiSource: 70
  }];
  opt1Payload.forEach(b => b.allowWebhooks = true);
  const r1 = await postV2(opt1Payload, baseHeaders, 'OPTION 1: apiSourceId+apiSource in body');
  let id1 = null;
  if (r1 && r1[0]?.success) {
    id1 = r1[0].new?.id || r1[0].modified?.id;
    if (id1) {
      console.log(`  → booking ID ${id1}`);
      const back = await getV2(id1, token);
      const b = back?.data?.[0] || back?.[0];
      console.log('  GET stamp check — apiSourceId:', b?.apiSourceId, 'apiSource:', b?.apiSource, 'referer:', b?.referer, 'refererEditable:', b?.refererEditable);
      await cancelV2(id1, token);
    }
  }

  // ====== OPTION 2: Organization header ======
  const opt2Headers = {
    'Content-Type': 'application/json',
    token,
    'Organization': 'Rezintel',
    'X-Beds24-Organization': 'Rezintel'
  };
  const opt2Payload = [{
    ...baseBooking,
    firstName: tag('OPT2'),
    lastName: 'OrgHeader'
  }];
  opt2Payload.forEach(b => b.allowWebhooks = true);
  const r2 = await postV2(opt2Payload, opt2Headers, 'OPTION 2: Organization header');
  let id2 = null;
  if (r2 && r2[0]?.success) {
    id2 = r2[0].new?.id || r2[0].modified?.id;
    if (id2) {
      console.log(`  → booking ID ${id2}`);
      const back = await getV2(id2, token);
      const b = back?.data?.[0] || back?.[0];
      console.log('  GET stamp check — apiSourceId:', b?.apiSourceId, 'apiSource:', b?.apiSource);
      await cancelV2(id2, token);
    }
  }

  // ====== OPTION 3: V2 normal then V1 GET via master key ======
  const opt3Payload = [{
    ...baseBooking,
    firstName: tag('OPT3'),
    lastName: 'V1Ping'
  }];
  opt3Payload.forEach(b => b.allowWebhooks = true);
  const r3 = await postV2(opt3Payload, baseHeaders, 'OPTION 3: V2 normal, then V1 GET via master key');
  let id3 = null;
  if (r3 && r3[0]?.success) {
    id3 = r3[0].new?.id || r3[0].modified?.id;
    if (id3) {
      console.log(`  → booking ID ${id3}`);
      // Now hit V1 with the Rezintel master key — does this trigger the webhook?
      const masterUser = process.env.BEDS24_MARKETPLACE_USER;
      const masterPass = process.env.BEDS24_MARKETPLACE_PASS;
      const masterKey = process.env.BEDS24_MASTER_API_KEY || process.env.BEDS24_MARKETPLACE_APIKEY || 'Rezintel_jd6zZzL8GaCqLm8HXhKkWqJl6TvBsSeiUh';
      console.log('  master creds: user=' + (masterUser ? 'yes' : 'no') + ' pass=' + (masterPass ? 'yes' : 'no') + ' apiKey=' + (masterKey ? 'yes' : 'no'));
      try {
        const v1 = await axios.post(
          'https://api.beds24.com/json/getBookings',
          { authentication: { apiKey: masterKey }, bookingId: String(id3) },
          { auth: masterUser && masterPass ? { username: masterUser, password: masterPass } : undefined, timeout: 20000 }
        );
        console.log('  V1 GET response:', JSON.stringify(v1.data).slice(0, 400));
      } catch (e) {
        console.log('  V1 GET ERR:', e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 400));
      }
      const back2 = await getV2(id3, token);
      const b2 = back2?.data?.[0] || back2?.[0];
      console.log('  V2 GET back — apiSourceId:', b2?.apiSourceId, 'apiSource:', b2?.apiSource);
      await cancelV2(id3, token);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Booking IDs created (now cancelled):', [id1, id2, id3].filter(Boolean).join(', '));
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
