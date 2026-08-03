// Patch contract_templates rows in-place so any existing template picks up
// the room.public_url link on the Logement loué line. Idempotent — only
// replaces the exact original marker, does nothing if already patched.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const OLD = `<tr><th>Logement loué / Property let</th><td>{{property.name}}<br>{{property.address}}, {{property.city}}</td></tr>`;
const NEW = `<tr><th>Logement loué / Property let</th><td>{{property.name}}<br>{{property.address}}, {{property.city}}{{#room.public_url}}<br><a href="{{room.public_url}}" target="_blank" rel="noopener" style="color:#2563eb;">📷 Voir votre logement / View your accommodation</a>{{/room.public_url}}</td></tr>`;
(async () => {
  const r = await p.query(`SELECT id, name FROM contract_templates`);
  for (const t of r.rows) {
    const row = await p.query(`SELECT html_body FROM contract_templates WHERE id = $1`, [t.id]);
    const body = row.rows[0].html_body || '';
    if (body.includes(NEW)) { console.log(`  #${t.id} ${t.name} — already patched`); continue; }
    if (!body.includes(OLD)) { console.log(`  #${t.id} ${t.name} — no match, skipped`); continue; }
    const patched = body.replace(OLD, NEW);
    await p.query(`UPDATE contract_templates SET html_body = $1, updated_at = NOW() WHERE id = $2`, [patched, t.id]);
    console.log(`  ✓ #${t.id} ${t.name} — patched`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
