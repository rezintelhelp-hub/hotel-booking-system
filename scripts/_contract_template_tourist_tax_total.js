// Patch live contract_templates rows: swap "per adult per night" line for the
// computed total + breakdown. Idempotent.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const OLD = `<tr><th>Taxe de séjour / Tourist tax (per adult per night)</th><td>{{tourist_tax}}</td></tr>`;
const NEW = `<tr><th>Taxe de séjour / Tourist tax (payable on arrival)</th><td>{{tourist_tax_total}} <span style="color:#64748b; font-size:0.85em;">({{tourist_tax_breakdown}})</span></td></tr>`;
(async () => {
  const r = await p.query(`SELECT id, name FROM contract_templates`);
  for (const t of r.rows) {
    const body = (await p.query(`SELECT html_body FROM contract_templates WHERE id = $1`, [t.id])).rows[0].html_body || '';
    if (body.includes(NEW)) { console.log(`  #${t.id} — already patched`); continue; }
    if (!body.includes(OLD)) { console.log(`  #${t.id} — no marker, skipped`); continue; }
    await p.query(`UPDATE contract_templates SET html_body = $1, updated_at = NOW() WHERE id = $2`, [body.replace(OLD, NEW), t.id]);
    console.log(`  ✓ #${t.id} — tourist tax total patched`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
