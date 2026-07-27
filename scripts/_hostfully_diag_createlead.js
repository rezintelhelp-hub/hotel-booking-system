// Diagnostic: call Hostfully createLead directly (not via server) so we
// see the exact payload + response. Uses the same adapter the server
// does. Steve 2026-07-27 — backfill runs 2-3 both rejected with
// checkInDateTime/checkInDate missing despite adapter passing them.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const conn = await p.query(
    `SELECT c.credentials, sp.external_id AS property_uid
       FROM gas_sync_connections c
       JOIN gas_sync_properties sp ON sp.connection_id = c.id
      WHERE c.account_id = 219 AND c.adapter_code = 'hostfully' AND sp.gas_property_id = 602
      LIMIT 1`
  );
  const creds = typeof conn.rows[0].credentials === 'string' ? JSON.parse(conn.rows[0].credentials) : conn.rows[0].credentials;
  const propertyUid = conn.rows[0].property_uid;
  console.log('propertyUid:', propertyUid);
  console.log('apiKey (first 10):', String(creds.apiKey).slice(0, 10) + '...');
  console.log('agencyUid:', creds.agencyUid);

  // Bypass adapter entirely — go straight to Hostfully API so we can
  // test payload variations quickly.
  const axios = require('axios');
  const baseUrl = 'https://platform.hostfully.com/api/v3';
  const headers = {
    'X-HOSTFULLY-APIKEY': creds.apiKey,
    'Content-Type': 'application/json',
  };
  // v3 schema — mirrors the GET /leads response shape.
  const variants = [
    {
      label: 'K: v3 schema — checkInLocalDateTime + guestInformation nested',
      body: {
        propertyUid, agencyUid: creds.agencyUid,
        checkInLocalDateTime: '2026-07-29T15:00:00',
        checkOutLocalDateTime: '2026-07-30T11:00:00',
        source: 'HOSTFULLY_API',
        status: 'BOOKED',
        type: 'BOOKING',
        guestInformation: {
          firstName: 'Diag', lastName: 'DEL-ME',
          email: 'diag@example.com', phoneNumber: '+81',
          adultCount: 2, childrenCount: 0, infantCount: 0, petCount: 0,
        },
        quoteAmount: 100,
      },
    },
  ];
  for (const v of variants) {
    console.log('\n=== ' + v.label + ' ===');
    try {
      const r = await axios.post(`${baseUrl}/leads`, v.body, { headers, timeout: 20000 });
      console.log('SUCCESS  status=' + r.status + '  data=' + JSON.stringify(r.data).slice(0, 200));
    } catch (e) {
      console.log('FAIL  status=' + (e.response?.status || '?') + '  ' + JSON.stringify(e.response?.data || e.message).slice(0, 300));
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
