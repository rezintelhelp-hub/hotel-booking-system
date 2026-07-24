// Backfill bookings.beds24_price for Hebden (account 169) from the Beds24 API.
// Populates the column the Sales Ledger's needs_review flag uses.
// Going forward the importer captures it on every sync (server.js edit),
// so this only needs to run once for existing data.
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

  // ALL Hebden bookings with beds24_booking_id and no beds24_price yet.
  // Start with Ex Hire (that's where the mess is), then let the importer
  // catch the rest on its next sync run.
  const q = await p.query(`
    SELECT b.id, b.beds24_booking_id
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169
      AND b.beds24_booking_id IS NOT NULL
      AND b.beds24_price IS NULL
      AND b.status = 'confirmed'
      AND (COALESCE(bu.unit_role,'room')='exclusive_hire' OR COALESCE(bu.name,'') ~* 'exclusive hire|whole property|buyout|buy.out')
    ORDER BY b.arrival_date DESC
  `);
  console.log('To backfill: ' + q.rows.length + ' Ex Hire bookings');

  let done = 0, written = 0, failed = 0;
  for (const r of q.rows) {
    try {
      const resp = await axios.get('https://beds24.com/api/v2/bookings', {
        headers: { token }, params: { id: r.beds24_booking_id }
      });
      const bk = (resp.data?.data || resp.data?.bookings || [])[0];
      const price = bk ? parseFloat(bk.price) : null;
      if (Number.isFinite(price)) {
        await p.query('UPDATE bookings SET beds24_price = $1 WHERE id = $2', [price, r.id]);
        written++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      if ((e.response?.status) === 429) {
        // Rate limited — back off harder for the next call
        await new Promise(x => setTimeout(x, 3000));
      }
    }
    done++;
    if (done % 20 === 0) process.stderr.write('  ' + done + '/' + q.rows.length + '  written=' + written + '  failed=' + failed + '\n');
    await new Promise(x => setTimeout(x, 700));
  }

  console.log('\n=== DONE ===');
  console.log('  Written: ' + written);
  console.log('  Failed:  ' + failed);
  const summary = await p.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE beds24_price IS NOT NULL)::int AS with_price,
           COUNT(*) FILTER (WHERE beds24_price IS NULL)::int AS no_price,
           COUNT(*) FILTER (WHERE beds24_price IS NOT NULL AND reporting_price_override IS NULL AND ABS(COALESCE(grand_total, total_amount, 0) - beds24_price) > 5)::int AS needs_review
    FROM bookings b
    JOIN properties pr ON pr.id = b.property_id
    LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id
    WHERE pr.account_id = 169 AND b.status = 'confirmed'
      AND (COALESCE(bu.unit_role,'room')='exclusive_hire' OR COALESCE(bu.name,'') ~* 'exclusive hire|whole property|buyout|buy.out')
  `);
  console.log('\n=== Post-backfill Ex Hire status ===');
  console.log(JSON.stringify(summary.rows[0], null, 2));

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
