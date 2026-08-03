const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const acc = await p.query(`SELECT id, name FROM accounts WHERE id = 4`);
  console.log('Account:', JSON.stringify(acc.rows[0]));
  const wfs = await p.query(`SELECT id, name, trigger_type, is_active, updated_at FROM workflows WHERE account_id = 4 ORDER BY id`);
  const active = wfs.rows.filter(w => w.is_active).length;
  console.log(`\nWorkflows: ${wfs.rows.length} total, ${active} active`);
  console.log('\nAll workflows:');
  for (const w of wfs.rows) console.log(`  #${w.id} [${w.is_active?'ON':'OFF'}] ${w.trigger_type||'?'} — ${w.name} (updated ${w.updated_at?.toISOString?.() || w.updated_at})`);
  // Recent bookings on this account
  const bk = await p.query(`SELECT id, guest_first_name, guest_last_name, arrival_date, created_at FROM bookings b JOIN properties p ON p.id = b.property_id WHERE p.account_id = 4 AND b.created_at > NOW() - INTERVAL '48 hours' ORDER BY b.created_at DESC LIMIT 5`);
  console.log(`\nRecent bookings (last 48h):`, bk.rows);
  await p.end();
})();
