// Build a worklist for Steve: every Ex Hire booking with GAS vs Beds24 price,
// sorted by biggest mismatch. Writes CSV to Desktop and prints a formatted
// table. Read-only — no DB writes.
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const cx = await p.query("SELECT refresh_token, credentials FROM gas_sync_connections WHERE account_id=169 AND adapter_code='beds24' ORDER BY id DESC LIMIT 1");
  const c = cx.rows[0];
  const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : (c.credentials || {});
  const rt = c.refresh_token || creds?.refreshToken;
  const t = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: rt } });
  const token = t.data?.token;

  const q = await p.query(`
    SELECT b.id, b.beds24_booking_id, b.arrival_date, b.nights_count,
           TRIM(COALESCE(b.guest_first_name,'')||' '||COALESCE(b.guest_last_name,'')) AS name,
           b.grand_total, b.reporting_price_override,
           bu.name AS room
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169 AND b.status='confirmed'
      AND b.arrival_date BETWEEN '2022-07-01' AND '2026-07-24'
      AND (COALESCE(bu.unit_role,'room')='exclusive_hire' OR COALESCE(bu.name,'') ~* 'exclusive hire|whole property|buyout|buy.out')
      AND b.beds24_booking_id IS NOT NULL
    ORDER BY b.arrival_date DESC
  `);
  console.log('Fetching Beds24 prices for ' + q.rows.length + ' Ex Hire bookings…');

  const results = [];
  let done = 0;
  for (const r of q.rows) {
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        headers: { token }, params: { id: r.beds24_booking_id }
      });
      const bk = (resp.data?.data || resp.data?.bookings || [])[0];
      const b24Price = bk ? parseFloat(bk.price) : null;
      results.push({
        gas_id: r.id,
        beds24_id: r.beds24_booking_id,
        arrival: String(r.arrival_date).slice(0, 10),
        nights: r.nights_count,
        name: r.name,
        gas_total: parseFloat(r.grand_total || 0),
        b24_price: b24Price,
        override_already: r.reporting_price_override != null ? parseFloat(r.reporting_price_override) : null,
        diff: b24Price != null ? parseFloat(r.grand_total || 0) - b24Price : null,
      });
    } catch (e) {
      results.push({ gas_id: r.id, beds24_id: r.beds24_booking_id, arrival: String(r.arrival_date).slice(0, 10), nights: r.nights_count, name: r.name, gas_total: parseFloat(r.grand_total || 0), b24_price: null, override_already: null, diff: null, error: e.response?.status || e.message });
    }
    done++;
    if (done % 20 === 0) process.stderr.write('  ' + done + '/' + q.rows.length + '\n');
    await new Promise(x => setTimeout(x, 750));
  }

  // Sort by absolute diff descending, unknowns last
  results.sort((a, b) => {
    if (a.diff == null && b.diff == null) return 0;
    if (a.diff == null) return 1;
    if (b.diff == null) return -1;
    return Math.abs(b.diff) - Math.abs(a.diff);
  });

  // Write CSV
  const csvPath = '/Users/stevedriver/Desktop/Hebden Ex Hire worklist.csv';
  const csv = ['GAS ID,Beds24 ID,Arrival,Nights,Guest,GAS total,Beds24 price,Override suggested,Diff,Admin URL'];
  results.forEach(r => {
    const suggested = r.b24_price != null ? r.b24_price.toFixed(2) : '';
    const diff = r.diff != null ? r.diff.toFixed(2) : '';
    const url = 'https://admin.gas.travel/gas-admin.html#booking-' + r.gas_id;
    csv.push([r.gas_id, r.beds24_id, r.arrival, r.nights, '"' + r.name.replace(/"/g, '""') + '"', r.gas_total.toFixed(2), r.b24_price != null ? r.b24_price.toFixed(2) : 'MISSING', suggested, diff, url].join(','));
  });
  fs.writeFileSync(csvPath, csv.join('\n'));
  console.log('\nCSV written: ' + csvPath);

  // Console table of mismatches only (diff != 0, sorted)
  console.log('\n=== EX HIRE WORKLIST — bookings where GAS ≠ Beds24 price ===');
  console.log('Sorted by biggest wrong first. Click GAS ID to open in admin.\n');
  console.log('GAS_ID    B24_ID     Arrival     Nts  GAS_total   B24_price   DIFF        Guest');
  const worklist = results.filter(r => r.diff != null && Math.abs(r.diff) >= 1);
  worklist.forEach(r => {
    const gt = r.gas_total.toFixed(2).padStart(9);
    const bp = r.b24_price.toFixed(2).padStart(9);
    const df = (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2);
    console.log(String(r.gas_id).padEnd(9) + ' ' + String(r.beds24_id).padEnd(10) + ' ' + r.arrival + '  ' + String(r.nights).padStart(3) + '  £' + gt + '   £' + bp + '   ' + df.padStart(9) + '   ' + r.name);
  });

  // Missing (rate-limited / API failed)
  const missing = results.filter(r => r.b24_price == null);
  if (missing.length) {
    console.log('\n=== NOT CHECKED (Beds24 API did not return) ===');
    missing.forEach(r => console.log('  #' + r.gas_id + '  ' + r.beds24_id + '  £' + r.gas_total.toFixed(2) + '  ' + r.name + '  (' + r.error + ')'));
  }

  // Summary
  const totalGas = results.reduce((s, r) => s + r.gas_total, 0);
  const totalB24 = results.reduce((s, r) => s + (r.b24_price || r.gas_total), 0);
  const wrongCount = worklist.length;
  const wrongSum = worklist.reduce((s, r) => s + r.diff, 0);
  console.log('\n=== SUMMARY ===');
  console.log('  Bookings total:            ' + results.length);
  console.log('  Bookings needing edit:     ' + wrongCount);
  console.log('  Bookings not checked:      ' + missing.length);
  console.log('  Current GAS Ex Hire total: £' + totalGas.toFixed(2));
  console.log('  If all overrides applied:  £' + totalB24.toFixed(2));
  console.log('  Total to be corrected:     £' + wrongSum.toFixed(2));

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
