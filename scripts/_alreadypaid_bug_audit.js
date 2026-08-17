// Estate-wide audit — every booking stranded by the auto-charge cron's
// "alreadyPaid is not defined" ReferenceError. Bug present since inner
// idempotency try-block was added; fix 770f6566 (2026-08-17).
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Direct match on the exact error string. Also try a broader match in
  // case Node's error message varies.
  const r = await pg.query(`
    SELECT b.id, b.guest_first_name || ' ' || COALESCE(b.guest_last_name,'') AS guest,
           b.arrival_date, b.grand_total, b.balance_amount, b.currency,
           b.payment_status, b.status,
           b.last_charge_error, b.last_charge_error_at,
           p.account_id, a.name AS account_name, p.name AS property_name
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.last_charge_error LIKE '%alreadyPaid%'
        OR b.last_charge_error LIKE '%grandTotal is not defined%'
     ORDER BY p.account_id, b.arrival_date
  `);

  console.log(`\n═══ AUTO-CHARGE alreadyPaid BUG — ESTATE AUDIT ═══\n`);
  console.log(`Total bookings stranded: ${r.rows.length}\n`);

  // Group by account
  const byAcct = new Map();
  let grandTotalOwed = 0;
  for (const b of r.rows) {
    if (!byAcct.has(b.account_id)) byAcct.set(b.account_id, { name: b.account_name, rows: [], owed: 0 });
    const g = byAcct.get(b.account_id);
    g.rows.push(b);
    g.owed += parseFloat(b.balance_amount || 0);
    grandTotalOwed += parseFloat(b.balance_amount || 0);
  }

  console.log('By account:');
  console.log('acct | name                              | count | balance owed');
  console.log('-----|-----------------------------------|-------|-------------');
  for (const [id, g] of [...byAcct.entries()].sort((a,b) => b[1].owed - a[1].owed)) {
    const cur = g.rows[0]?.currency || 'GBP';
    console.log(`${String(id).padEnd(4)} | ${String(g.name).slice(0,33).padEnd(33)} | ${String(g.rows.length).padStart(5)} | ${cur} ${g.owed.toFixed(2).padStart(9)}`);
  }
  console.log(`\nEstate-wide balance owed: ${grandTotalOwed.toFixed(2)} (mixed currencies)\n`);

  // Detail
  console.log('══ DETAIL (per booking) ══\n');
  for (const [id, g] of byAcct) {
    console.log(`── ${g.name} (${g.rows.length} bookings, owed ${g.owed.toFixed(2)}) ──`);
    for (const b of g.rows) {
      const past = new Date(b.arrival_date) < new Date(new Date().toDateString());
      const flag = past ? 'PAST' : 'fut ';
      const arr = b.arrival_date.toISOString().slice(0,10);
      console.log(`  #${String(b.id).padEnd(7)} [${flag}] ${String(b.guest).trim().padEnd(28)} arr=${arr}  ${b.currency||''} total=${parseFloat(b.grand_total||0).toFixed(2).padStart(8)} owed=${parseFloat(b.balance_amount||0).toFixed(2).padStart(8)}  err_at=${b.last_charge_error_at?.toISOString?.().slice(0,10) || '-'}`);
    }
    console.log('');
  }

  // Split future vs past
  const future = r.rows.filter(b => new Date(b.arrival_date) >= new Date(new Date().toDateString()));
  const past = r.rows.filter(b => new Date(b.arrival_date) < new Date(new Date().toDateString()));
  const futureOwed = future.reduce((s,b) => s + parseFloat(b.balance_amount||0), 0);
  const pastOwed = past.reduce((s,b) => s + parseFloat(b.balance_amount||0), 0);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`Future arrivals (fix will pick these up next cron tick): ${future.length}, owed ${futureOwed.toFixed(2)}`);
  console.log(`Past arrivals   (need chase — guests have stayed):        ${past.length}, owed ${pastOwed.toFixed(2)}`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
