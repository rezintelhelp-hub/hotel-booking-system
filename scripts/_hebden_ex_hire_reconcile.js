// Reconcile every Hebden Ex Hire booking against live Beds24 API.
// Fetches Beds24 `price` for each and compares to GAS grand_total.
// Reports top-N with biggest inflation so Jo can prioritise overrides.
const { Pool } = require('pg');
const axios = require('axios');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Auth
  const cxRes = await p.query(`
    SELECT id, account_id, adapter_code, refresh_token, credentials
    FROM gas_sync_connections
    WHERE account_id = 169 AND adapter_code = 'beds24' AND COALESCE(status,'') <> 'deleted'
    ORDER BY id DESC LIMIT 1
  `);
  const conn = cxRes.rows[0];
  if (!conn) { console.log('No Beds24 connection'); process.exit(0); }
  const creds = typeof conn.credentials === 'string' ? JSON.parse(conn.credentials) : (conn.credentials || {});
  const rt = conn.refresh_token || creds?.refreshToken;
  const tokResp = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: rt } });
  const token = tokResp.data?.token;

  // Ex Hire scope from GAS (matches sales-ledger filter)
  const q = await p.query(`
    SELECT b.id, b.beds24_booking_id, b.master_booking_id,
           b.arrival_date, b.departure_date, b.nights_count,
           TRIM(COALESCE(b.guest_first_name,'')||' '||COALESCE(b.guest_last_name,'')) AS name,
           b.grand_total, b.extras_total, b.reporting_price_override,
           bu.name AS room
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169 AND b.status='confirmed'
      AND b.arrival_date BETWEEN '2022-07-01' AND '2026-07-24'
      AND (COALESCE(bu.unit_role, 'room') = 'exclusive_hire'
           OR COALESCE(bu.name, '') ~* 'exclusive hire|whole property|buyout|buy.out')
      AND b.beds24_booking_id IS NOT NULL
    ORDER BY b.grand_total DESC NULLS LAST
  `);
  console.log('Ex Hire bookings to check: ' + q.rows.length);

  // One at a time (batch id param only returns first record on Beds24 v2)
  const rows = q.rows;
  const results = [];
  let done = 0;
  for (const r of rows) {
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        headers: { token },
        params: { id: r.beds24_booking_id, includeInvoiceItems: 'true' }
      });
      const list = resp.data?.data || resp.data?.bookings || [];
      const bk = list[0] || null;
      const b24Price = bk ? parseFloat(bk.price || 0) : null;
      const items = bk?.invoiceItems || [];
      const chargesSum = items
        .filter(it => (it.type || 'charge').toLowerCase() === 'charge' && !(String(it.description || '').toLowerCase().includes('payment')))
        .reduce((s, it) => {
          const lt = it.lineTotal != null && it.lineTotal !== '' ? parseFloat(it.lineTotal) : parseFloat(it.amount || 0);
          return s + (Number.isFinite(lt) ? lt : 0);
        }, 0);
      results.push({
        id: r.id,
        beds24_id: r.beds24_booking_id,
        arrival: String(r.arrival_date).slice(0, 10),
        nights: r.nights_count,
        name: r.name,
        gas_total: parseFloat(r.grand_total || 0),
        b24_price: b24Price,
        b24_items_sum: chargesSum,
        diff_vs_b24_price: b24Price != null ? parseFloat(r.grand_total || 0) - b24Price : null,
        override_set: r.reporting_price_override != null,
      });
    } catch (e) {
      console.error('Fetch error for ' + r.beds24_booking_id + ': ' + e.message);
    }
    done++;
    if (done % 20 === 0) process.stderr.write('  ' + done + '/' + rows.length + '\n');
    await new Promise(r => setTimeout(r, 250));
  }

  // Sort by absolute over/under vs Beds24 price (Beds24's canonical booking price)
  results.sort((a, b) => Math.abs(b.diff_vs_b24_price || 0) - Math.abs(a.diff_vs_b24_price || 0));

  console.log('\n=== TOP 25 EX HIRE OVER/UNDER-COUNTS (GAS grand_total vs Beds24 `price`) ===');
  console.log('GAS_ID   B24_ID     Arr        Nts  Guest                          GAS_total   B24_price   B24_items   DIFF');
  results.slice(0, 25).forEach(r => {
    const g = r.gas_total.toFixed(2).padStart(9);
    const p = r.b24_price != null ? r.b24_price.toFixed(2).padStart(9) : '   MISSING';
    const s = r.b24_items_sum.toFixed(2).padStart(9);
    const d = r.diff_vs_b24_price != null ? r.diff_vs_b24_price.toFixed(2).padStart(9) : '        -';
    console.log(String(r.id).padEnd(9) + String(r.beds24_id).padEnd(11) + r.arrival + '   ' + String(r.nights).padStart(2) + '   ' + r.name.slice(0, 28).padEnd(30) + g + '   ' + p + '   ' + s + '   ' + d);
  });

  // Summary
  const totalGas = results.reduce((s, r) => s + r.gas_total, 0);
  const totalB24Price = results.reduce((s, r) => s + (r.b24_price || 0), 0);
  const totalB24Items = results.reduce((s, r) => s + r.b24_items_sum, 0);
  console.log('\n=== TOTALS ===');
  console.log('  GAS grand_total:     £' + totalGas.toFixed(2));
  console.log('  Beds24 API price:    £' + totalB24Price.toFixed(2));
  console.log('  Beds24 items sum:    £' + totalB24Items.toFixed(2));
  console.log('  GAS - B24 price:     £' + (totalGas - totalB24Price).toFixed(2));
  console.log('  Bookings compared:   ' + results.length);
  console.log('  Overrides already set: ' + results.filter(r => r.override_set).length);

  // How much of the gap the top-N captures
  const gap = totalGas - totalB24Price;
  let cumulative = 0;
  for (const n of [5, 10, 15, 20, 30]) {
    cumulative = results.slice(0, n).reduce((s, r) => s + (r.diff_vs_b24_price || 0), 0);
    console.log('  Top ' + String(n).padStart(2) + ' bookings account for £' + cumulative.toFixed(2) + ' (' + ((cumulative / gap) * 100).toFixed(0) + '% of gap)');
  }

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
