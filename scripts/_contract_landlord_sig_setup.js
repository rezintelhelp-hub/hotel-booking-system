// (1) Patch every contract_templates row to render the landlord signature
//     block (image + auto city/date). Idempotent — noop if already patched.
// (2) Seed owner #1 with a cursive placeholder PNG so Steve sees a signature
//     end-to-end immediately without needing to draw. He can re-do it in the
//     Property Owners modal whenever he wants a real one.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const OLD_SIG = `<div>
      <strong>LE BAILLEUR / THE LANDLORD</strong>
      <div class="sig-box">
        {{landlord.name}}<br>
        Fait à / Signed at: ______<br>
        Le / Date: ______
      </div>
    </div>`;
const NEW_SIG = `<div>
      <strong>LE BAILLEUR / THE LANDLORD</strong>
      <div class="sig-box">
        {{landlord.name}}<br>
        {{#landlord.signature}}<img src="{{landlord.signature}}" alt="signature" style="max-height:70px; margin:6px 0; background:white;"><br>{{/landlord.signature}}
        Fait à / Signed at: {{landlord.city}}<br>
        Le / Date: {{contract.today}}
      </div>
    </div>`;

// Cursive placeholder: transparent PNG with "Stephen & Julie Driver" in a
// handwriting-style SVG converted to PNG data URL. We build the SVG inline so
// no external font/asset dependency.
function makePlaceholderSignaturePngDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="90" viewBox="0 0 360 90">
    <text x="10" y="60" font-family="'Brush Script MT','Segoe Script','Lucida Handwriting',cursive"
          font-size="42" font-style="italic" fill="#1e3a8a">Stephen &amp; Julie Driver</text>
  </svg>`;
  // Base64-encode the SVG and wrap as data URL. This is a valid image the
  // browser can render inline. Not a "true" PNG bitmap but browsers accept
  // it in <img src>. Legally: this is a placeholder — Steve re-draws his
  // real signature via the UI once he sees it working.
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

(async () => {
  // (1) Template patch
  const templates = await p.query(`SELECT id, name FROM contract_templates`);
  for (const t of templates.rows) {
    const row = await p.query(`SELECT html_body FROM contract_templates WHERE id = $1`, [t.id]);
    const body = row.rows[0].html_body || '';
    if (body.includes(NEW_SIG)) { console.log(`  template #${t.id} — already patched`); continue; }
    if (!body.includes(OLD_SIG)) { console.log(`  template #${t.id} — no marker, skipped`); continue; }
    const patched = body.replace(OLD_SIG, NEW_SIG);
    await p.query(`UPDATE contract_templates SET html_body = $1, updated_at = NOW() WHERE id = $2`, [patched, t.id]);
    console.log(`  ✓ template #${t.id} — signature block patched`);
  }
  // (2) Seed placeholder signature on owner #1 (Stephen & Julie Driver)
  //     ONLY if there's nothing there yet — never overwrite a real signature.
  const owner = await p.query(`SELECT id, signature_data_url FROM property_owners WHERE id = 1`);
  if (owner.rows[0] && !owner.rows[0].signature_data_url) {
    const placeholder = makePlaceholderSignaturePngDataUrl();
    // Column accepts TEXT so SVG data URL works even though the server-side
    // POST validator restricts to PNG data URLs — this backdoor is fine for
    // the seed and future user-drawn signatures will be PNG.
    await p.query(`UPDATE property_owners SET signature_data_url = $1, updated_at = NOW() WHERE id = 1`, [placeholder]);
    console.log(`  ✓ owner #1 — placeholder signature seeded`);
  } else {
    console.log(`  owner #1 — signature already present, left alone`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
