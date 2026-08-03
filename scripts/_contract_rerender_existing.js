// Re-run the render for existing contract_instances so any template
// engine fixes propagate to instances already sent (before a guest
// visits the sign URL again).
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
function fmtDate(d, lang='fr') { if(!d) return ''; return new Intl.DateTimeFormat(lang==='fr'?'fr-FR':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d); }
function fmtMoney(a,c) { if(a==null||isNaN(parseFloat(a))) return ''; return `${parseFloat(a).toFixed(2)} ${c==='EUR'?'€':(c||'')}`; }
function render(html, ctx) {
  const resolve = (path) => { let cur=ctx; for(const s of path.split('.')){if(cur==null)return null;cur=cur[s];} return cur; };
  let out = html.replace(/\{\{#\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g, (_,path,inner) => { const v=resolve(path); return (v!=null&&v!==''&&v!==false&&v!==0&&v!=='0')?inner:''; });
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_,path)=>{ const v=resolve(path); return v==null?'':String(v); });
  return out;
}
(async () => {
  const all = await p.query(`SELECT ci.id, ci.template_id, ci.booking_id, ci.sign_token, ci.signed_at, ct.html_body FROM contract_instances ci JOIN contract_templates ct ON ct.id = ci.template_id WHERE ci.signed_at IS NULL ORDER BY ci.id`);
  console.log(`Re-rendering ${all.rows.length} unsigned contract(s)...`);
  for (const ci of all.rows) {
    const b = await p.query(`SELECT b.*, p.account_id AS acc_id, p.name AS prop_name, p.address AS prop_address, p.city AS prop_city, p.country AS prop_country, bu.name AS unit_name, bu.description AS unit_description, bu.max_guests AS unit_max_guests, a.name AS acc_name, a.email AS acc_email FROM bookings b LEFT JOIN bookable_units bu ON bu.id = b.bookable_unit_id LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN accounts a ON a.id = p.account_id WHERE b.id = $1`, [ci.booking_id]);
    if (!b.rows[0]) continue;
    const bk = b.rows[0];
    const s = await p.query(`SELECT * FROM account_contract_settings WHERE account_id = $1`, [bk.acc_id]);
    const settings = s.rows[0] || {};
    const arr = bk.arrival_date ? new Date(bk.arrival_date) : null;
    const dep = bk.departure_date ? new Date(bk.departure_date) : null;
    const nights = arr && dep ? Math.round((dep-arr)/86400000) : bk.nights_count || 0;
    const currency = bk.currency || 'EUR';
    const baseUrl = 'https://admin.gas.travel';
    const ctx = {
      booking: { id: bk.id, reference:`GAS-${bk.id}`, arrival_date: fmtDate(arr,'fr'), departure_date: fmtDate(dep,'fr'), nights, weeks: nights>0?Math.round(nights/7):0, num_adults: bk.num_adults||1, num_children: bk.num_children||0, grand_total: fmtMoney(bk.grand_total,currency), deposit_amount: fmtMoney(bk.deposit_amount,currency), balance_amount: fmtMoney(bk.balance_amount,currency) },
      guest: { title: bk.guest_title||'', first_name: bk.guest_first_name||'', last_name: bk.guest_last_name||'', email: bk.guest_email||'', phone: bk.guest_phone||'', address: bk.guest_address||'', city: bk.guest_city||'', postcode: bk.guest_postcode||'', country: bk.guest_country||'' },
      property: { name: bk.prop_name||'', address: bk.prop_address||'', city: bk.prop_city||'', country: bk.prop_country||'' },
      room: { name: bk.unit_name||'', description: bk.unit_description||'', max_guests: bk.unit_max_guests||'' },
      landlord: { name: settings.landlord_name||'', company: settings.landlord_company||'', address: settings.landlord_address||'', postcode: settings.landlord_postcode||'', city: settings.landlord_city||'', country: settings.landlord_country||'', phone: settings.landlord_phone||'', email: settings.landlord_email||'', siret: settings.landlord_siret||'', tourist_let_reg: settings.tourist_let_reg||'', iban: settings.iban||'', bic: settings.bic||'', bank_account_name: settings.bank_account_name||'' },
      contract: { sign_url: `${baseUrl}/contract/sign/${ci.sign_token}`, today: fmtDate(new Date(),'fr') },
      security_deposit: fmtMoney(settings.default_security_deposit,'EUR'),
      cleaning_fee: fmtMoney(settings.default_cleaning_fee,'EUR'),
      tourist_tax: settings.default_tourist_tax_per_person_per_night!=null ? `${parseFloat(settings.default_tourist_tax_per_person_per_night).toFixed(2)} €` : '',
    };
    const filled = render(ci.html_body, ctx);
    await p.query(`UPDATE contract_instances SET filled_html = $1, updated_at = NOW() WHERE id = $2`, [filled, ci.id]);
    console.log(`  ✓ #${ci.id} re-rendered`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
