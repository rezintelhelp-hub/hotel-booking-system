// Bulk-populate reporting_price_override = Beds24 API bk.price for every
// Hebden Ex Hire booking. Beds24's `price` field is the authoritative
// value (matches Beds24 UI and its own reports). Staff-added duplicate
// charge lines inflate invoiceItems 2-5x; using price sidesteps them.
// Safe: reporting_price_override is nullable and never touched by re-sync.
const { Pool } = require('pg');
const axios = require('axios');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const cx = await p.query("SELECT refresh_token, credentials FROM gas_sync_connections WHERE account_id=169 AND adapter_code='beds24' ORDER BY id DESC LIMIT 1");
  const c = cx.rows[0];
  const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : (c.credentials || {});
  const rt = c.refresh_token || creds?.refreshToken;
  const t = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: rt } });
  const token = t.data?.token;

  const q = await p.query(`
    SELECT b.id, b.beds24_booking_id, b.grand_total,
           TRIM(COALESCE(b.guest_first_name,'')||' '||COALESCE(b.guest_last_name,'')) AS name
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169 AND b.status='confirmed'
      AND b.arrival_date BETWEEN '2022-07-01' AND '2026-07-24'
      AND (COALESCE(bu.unit_role,'room')='exclusive_hire' OR COALESCE(bu.name,'') ~* 'exclusive hire|whole property|buyout|buy.out')
      AND b.beds24_booking_id IS NOT NULL
      AND b.reporting_price_override IS NULL
    ORDER BY b.grand_total DESC NULLS LAST
  `);
  console.log('Ex Hire bookings to bulk-override: ' + q.rows.length);

  let done = 0, written = 0, skipped = 0, failed = 0;
  let sumBefore = 0, sumAfter = 0;
  const errors = [];

  for (const r of q.rows) {
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        headers: { token },
        params: { id: r.beds24_booking_id, includeInvoiceItems: 'false' }
      });
      const bk = (resp.data?.data || resp.data?.bookings || [])[0];
      if (!bk) { failed++; errors.push(`${r.beds24_booking_id}: no booking returned`); continue; }
      const beds24Price = parseFloat(bk.price);
      if (!Number.isFinite(beds24Price)) { failed++; errors.push(`${r.beds24_booking_id}: no valid price`); continue; }

      const gasTotal = parseFloat(r.grand_total || 0);
      sumBefore += gasTotal;
      sumAfter += beds24Price;

      await p.query(`
        UPDATE bookings
        SET reporting_price_override = $1,
            reporting_price_override_note = $2,
            reporting_price_override_at = NOW(),
            reporting_price_override_by = NULL
        WHERE id = $3
      `, [beds24Price, `Bulk-set from Beds24 API price (was £${gasTotal.toFixed(2)} via invoiceItems)`, r.id]);
      written++;

      if (done < 15 || Math.abs(gasTotal - beds24Price) > 2000) {
        console.log(`  #${r.id} b24=${r.beds24_booking_id}  ${r.name.slice(0, 26).padEnd(28)}  GAS £${gasTotal.toFixed(2).padStart(9)} → override £${beds24Price.toFixed(2).padStart(9)}  (${(gasTotal - beds24Price >= 0 ? '-' : '+')}£${Math.abs(gasTotal - beds24Price).toFixed(2)})`);
      }
    } catch (e) {
      failed++;
      errors.push(`${r.beds24_booking_id}: ${e.response?.status || ''} ${e.message}`);
    }
    done++;
    if (done % 20 === 0) process.stderr.write(`  progress ${done}/${q.rows.length}\n`);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n=== DONE ===');
  console.log(`  Written:  ${written}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Sum before (grand_total): £${sumBefore.toFixed(2)}`);
  console.log(`  Sum after  (override):    £${sumAfter.toFixed(2)}`);
  console.log(`  Delta:                    £${(sumAfter - sumBefore).toFixed(2)}`);
  if (errors.length) {
    console.log('\nErrors:');
    errors.slice(0, 20).forEach(e => console.log('  ' + e));
  }

  // Verify aggregate against Beds24 report target
  const v = await p.query(`
    SELECT COUNT(*)::int AS rows,
           SUM(COALESCE(b.reporting_price_override, b.grand_total, 0))::numeric(14,2) AS ex_hire_reported_total
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169 AND b.status='confirmed'
      AND b.arrival_date BETWEEN '2022-07-01' AND '2026-07-24'
      AND (COALESCE(bu.unit_role,'room')='exclusive_hire' OR COALESCE(bu.name,'') ~* 'exclusive hire|whole property|buyout|buy.out')
  `);
  console.log('\n=== POST-FILL EX HIRE TOTAL (Sales Ledger view) ===');
  console.log('  Rows:  ' + v.rows[0].rows);
  console.log('  Total: £' + v.rows[0].ex_hire_reported_total);
  console.log('  Beds24 report target: £324,786.00');
  console.log('  Gap: £' + (parseFloat(v.rows[0].ex_hire_reported_total) - 324786).toFixed(2));

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
