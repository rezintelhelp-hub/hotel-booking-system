// Seed Steve's 5 Rte des Thermes contract template + landlord settings.
// Idempotent — safe to re-run; template is upserted by name, settings by
// account_id. Converts the Word doc Steve pasted (Contrat_location_5_Rte_
// des_Thermes_FR-EN) into HTML with {{merge}} tokens the contracts module
// hydrates from booking + property + landlord data.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ACCOUNT_ID = 197; // Steve's own gîtes account
const TEMPLATE_NAME = 'Contrat de location saisonnière — Cure (FR/EN)';

const CONTRACT_HTML = `<style>
  .contract { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color:#111; max-width:800px; margin:0 auto; }
  .contract h1 { font-size:1.4rem; text-align:center; margin: 0 0 4px; }
  .contract h2 { font-size:1.1rem; text-align:center; margin: 4px 0 20px; color:#374151; font-weight:400; }
  .contract h3 { font-size:1rem; margin-top:24px; color:#0f172a; border-bottom:2px solid #059669; padding-bottom:4px; }
  .contract .subtitle { text-align:center; font-style:italic; color:#64748b; margin-bottom: 24px; }
  .contract table { width:100%; border-collapse:collapse; margin: 12px 0; }
  .contract th, .contract td { text-align:left; padding: 6px 10px; border-bottom:1px solid #e5e7eb; font-size:0.9rem; vertical-align:top; }
  .contract th { background:#f9fafb; font-weight:600; width:40%; }
  .contract .total-row { background:#fef3c7; font-weight:600; }
  .contract .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .contract .party-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
  .contract .party-card h4 { margin:0 0 8px 0; font-size:0.9rem; color:#0f172a; }
  .contract .party-card p { margin: 3px 0; font-size:0.9rem; }
  .contract .bilingual { display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:0.85rem; line-height:1.55; }
  .contract .bilingual .fr { border-right: 1px dashed #e5e7eb; padding-right: 20px; }
  .contract .article { margin: 16px 0; }
  .contract .signature-row { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:32px; }
  .contract .sig-box { border-top: 1px solid #d1d5db; padding-top: 8px; min-height: 80px; font-size:0.85rem; }
  .contract .lang-note { background:#fef3c7; border:1px solid #fde68a; padding:8px 12px; border-radius:6px; font-size:0.85rem; margin: 16px 0; }
</style>

<div class="contract">
  <h1>CONTRAT DE LOCATION SAISONNIÈRE</h1>
  <h2>SHORT-TERM HOLIDAY RENTAL AGREEMENT</h2>
  <div class="subtitle">Meublé de tourisme — 5 Rte des Thermes, 09400 Ussat (Ariège)</div>

  <div class="grid-2">
    <div class="party-card">
      <h4>LE BAILLEUR / THE LANDLORD</h4>
      <p><strong>{{landlord.name}}</strong>{{#landlord.company}} — {{landlord.company}}{{/landlord.company}}</p>
      <p>{{landlord.address}}<br>{{landlord.postcode}} {{landlord.city}}<br>{{landlord.country}}</p>
      <p>Tél. / Phone: {{landlord.phone}}<br>Courriel / Email: {{landlord.email}}</p>
      <p style="font-size:0.8rem;color:#64748b;">SIRET: {{landlord.siret}}<br>N° enregistrement meublé: {{landlord.tourist_let_reg}}</p>
    </div>
    <div class="party-card">
      <h4>LE LOCATAIRE / THE TENANT</h4>
      <p><strong>{{guest.title}} {{guest.first_name}} {{guest.last_name}}</strong></p>
      <p>{{guest.address}}<br>{{guest.postcode}} {{guest.city}}<br>{{guest.country}}</p>
      <p>Tél. / Phone: {{guest.phone}}<br>Courriel / Email: {{guest.email}}</p>
      <p style="font-size:0.85rem;">Nombre d'occupants / Occupants: <strong>{{booking.num_adults}}</strong> adultes / adults · <strong>{{booking.num_children}}</strong> enfants / children</p>
    </div>
  </div>

  <h3>OBJET DE LA LOCATION / THE LETTING</h3>
  <table>
    <tr><th>Logement loué / Property let</th><td>{{property.name}}<br>{{property.address}}, {{property.city}}{{#room.public_url}}<br><a href="{{room.public_url}}" target="_blank" rel="noopener" style="color:#2563eb;">📷 Voir votre logement / View your accommodation</a>{{/room.public_url}}</td></tr>
    <tr><th>Type / Type</th><td>{{room.name}}</td></tr>
    <tr><th>Capacité max / Max occupancy</th><td>{{room.max_guests}} personnes / persons</td></tr>
    <tr><th>Arrivée / Check-in</th><td>{{booking.arrival_date}} — entre 15h00 et 18h00</td></tr>
    <tr><th>Départ / Check-out</th><td>{{booking.departure_date}} — avant 10h00</td></tr>
    <tr><th>Durée / Duration</th><td>{{booking.nights}} nuits / nights ({{booking.weeks}} semaines / weeks)</td></tr>
    <tr><th>Loyer / Rental price</th><td>{{booking.grand_total}}</td></tr>
    <tr><th>Forfait ménage / End-of-stay cleaning</th><td>{{cleaning_fee}}</td></tr>
    <tr><th>Linge de lit et serviettes / Bed linen and towels</th><td>Inclus / Included</td></tr>
    <tr class="total-row"><th>TOTAL À PAYER / TOTAL PAYABLE</th><td>{{booking.grand_total}}</td></tr>
    <tr><th>Acompte à verser à la réservation / Deposit payable on booking</th><td>{{booking.deposit_amount}}</td></tr>
    <tr><th>Solde à verser au plus tard le jour de l'arrivée / Balance payable no later than day of arrival</th><td>{{booking.balance_amount}}</td></tr>
    <tr><th>Dépôt de garantie / Security deposit (refunded after the stay)</th><td>{{security_deposit}}</td></tr>
    <tr><th>Taxe de séjour / Tourist tax (per adult per night)</th><td>{{tourist_tax}}</td></tr>
  </table>

  <h3>RÈGLEMENT / PAYMENT</h3>
  <p>Paiement par virement bancaire ou par carte via le lien de paiement sécurisé transmis par courriel. / Payment by bank transfer or by card via the secure payment link sent by email.</p>
  <table>
    <tr><th>Titulaire / Account name</th><td>{{landlord.bank_account_name}}</td></tr>
    <tr><th>IBAN</th><td>{{landlord.iban}}</td></tr>
    <tr><th>BIC</th><td>{{landlord.bic}}</td></tr>
  </table>
  <p style="font-size:0.85rem;color:#64748b;">Merci d'indiquer votre nom et vos dates de séjour en référence du virement. / Please quote your surname and stay dates as the transfer reference.</p>

  <p style="margin-top:24px;">Madame, Monsieur,<br>Nous avons le plaisir de vous adresser ce contrat de location. Votre réservation sera définitivement confirmée dès réception du présent contrat signé et du règlement de l'acompte.</p>
  <p style="color:#64748b;font-style:italic;">Dear Sir or Madam, we are pleased to send you this rental agreement. Your booking will be firmly confirmed once we receive this contract signed and the deposit payment.</p>

  <div class="lang-note"><strong>Note légale / Legal note:</strong> Seule la version française fait foi. La traduction anglaise est fournie à titre de commodité ; en cas de divergence, le texte français prévaut. / Only the French version is legally binding. The English translation is provided for convenience; in the event of any discrepancy, the French text prevails.</div>

  <h3>CONDITIONS GÉNÉRALES DE LOCATION / GENERAL TERMS AND CONDITIONS</h3>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 1 — Dispositions générales</strong><br>
        Aucune modification (rature, surcharge, ajout) ne sera acceptée dans la rédaction du contrat sans l'accord écrit des deux parties. Le logement est loué en qualité de meublé de tourisme, à usage exclusif d'habitation temporaire ou de vacances.
      </div>
      <div class="en">
        <strong>ARTICLE 1 — General provisions</strong><br>
        No alteration (crossing-out, overwriting or addition) to the wording of this contract will be accepted without the written agreement of both parties. The property is let as furnished tourist accommodation, for temporary residential or holiday use only.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 2 — Conclusion du contrat et paiement</strong><br>
        La réservation devient effective lorsque le locataire a retourné au bailleur un exemplaire signé du présent contrat accompagné du règlement de l'acompte. Le solde du loyer doit être réglé au plus tard le jour de l'arrivée. La taxe de séjour est due en sus du loyer. S'agissant d'une prestation d'hébergement fournie à une date déterminée, le locataire ne bénéficie pas du droit de rétractation de quatorze jours (article L. 221-28, 12° du Code de la consommation).
      </div>
      <div class="en">
        <strong>ARTICLE 2 — Formation of the contract and payment</strong><br>
        The booking becomes effective when the tenant has returned a signed copy of this contract to the landlord together with payment of the deposit. The balance of the rent must be paid no later than the day of arrival. Tourist tax is payable in addition to the rent. As this is accommodation supplied on a specified date, the tenant has no fourteen-day right of withdrawal (article L. 221-28, 12° of the French Consumer Code).
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 3 — Dépôt de garantie</strong><br>
        Le locataire verse un dépôt de garantie de {{security_deposit}} à son arrivée, distinct de l'acompte et du solde du loyer. Il est restitué dans un délai maximum d'un mois après le départ, déduction faite, le cas échéant, des sommes dues au titre de la remise en état des lieux. Toute déduction doit être justifiée par le bailleur. Ce dépôt ne constitue pas un acompte sur le loyer.
      </div>
      <div class="en">
        <strong>ARTICLE 3 — Security deposit</strong><br>
        The tenant shall pay a security deposit of {{security_deposit}} on arrival, separate from the booking deposit and the balance. It is refunded within one month of departure at the latest, less any sums due for making good the property. Any deduction must be evidenced by the landlord. This deposit is not a payment on account of the rent.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 4 — Durée du séjour</strong><br>
        Le locataire doit quitter les lieux à l'heure prévue au contrat, après établissement de l'état des lieux de sortie. Le locataire ne peut se prévaloir d'aucun droit au maintien dans les lieux à l'expiration de la période de location, sauf accord écrit du bailleur.
      </div>
      <div class="en">
        <strong>ARTICLE 4 — Length of stay</strong><br>
        The tenant must vacate the property at the time stated in the contract, once the check-out inventory has been completed. The tenant has no right to remain in the property after the end of the agreed rental period, unless the landlord agrees in writing.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 5 — Utilisation des lieux</strong><br>
        Le bailleur fournit un logement conforme à la description. Le locataire en jouit paisiblement et en fait bon usage. Le logement est loué à usage d'habitation temporaire ou de vacances, à l'exclusion de toute activité professionnelle. À son départ, le locataire s'engage à rendre le logement aussi propre qu'à son arrivée. Toutes réparations rendues nécessaires par la négligence du locataire sont à sa charge. La sous-location est interdite, même à titre gratuit. Le nombre d'occupants ne peut excéder la capacité maximale. Le logement est entièrement non-fumeur.
      </div>
      <div class="en">
        <strong>ARTICLE 5 — Use of the property</strong><br>
        The landlord provides accommodation matching the description. The tenant shall occupy the property peaceably and use it properly, for temporary residential or holiday use only, to the exclusion of any business activity. On departure, the tenant shall leave the property as clean as it was found. Any repairs made necessary by the tenant's negligence are at the tenant's expense. Sub-letting is prohibited, even free of charge. The number of occupants may not exceed the maximum capacity. The property is entirely non-smoking.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 6 — Animaux</strong><br>
        Les animaux ne sont pas admis, sauf accord écrit préalable du bailleur. En cas d'accord, un supplément de 25 € par séjour est dû. La présence d'un animal non déclaré autorise le bailleur à refuser l'accès au logement. Le locataire demeure responsable de tout dommage causé par l'animal.
      </div>
      <div class="en">
        <strong>ARTICLE 6 — Pets</strong><br>
        Pets are not accepted without the landlord's prior written agreement. Where agreement is given, a supplement of €25 per stay is payable. If an undeclared animal is brought to the property, the landlord may refuse access. The tenant remains liable for any damage caused by the animal.
      </div>
    </div>
  </div>

  <div class="article">
    <div class="bilingual">
      <div class="fr">
        <strong>ARTICLE 7 — État des lieux et inventaire</strong><br>
        L'état des lieux et l'inventaire du mobilier et des équipements sont établis contradictoirement par le bailleur et le locataire, en début et en fin de séjour.
      </div>
      <div class="en">
        <strong>ARTICLE 7 — Inventory and check-in/out</strong><br>
        The inventory of furniture and equipment, and the check-in and check-out condition report, are agreed jointly between landlord and tenant, at the start and end of the stay.
      </div>
    </div>
  </div>

  <div class="signature-row">
    <div>
      <strong>LE BAILLEUR / THE LANDLORD</strong>
      <div class="sig-box">
        {{landlord.name}}<br>
        {{#landlord.signature}}<img src="{{landlord.signature}}" alt="signature" style="max-height:70px; margin:6px 0; background:white;"><br>{{/landlord.signature}}
        Fait à / Signed at: {{landlord.city}}<br>
        Le / Date: {{contract.today}}
      </div>
    </div>
    <div>
      <strong>LE LOCATAIRE / THE TENANT</strong>
      <div class="sig-box">
        {{guest.first_name}} {{guest.last_name}}<br>
        Fait à / Signed at: ______<br>
        Le / Date: ______<br>
        Signature précédée de la mention manuscrite « Lu et approuvé »
      </div>
    </div>
  </div>
</div>
`;

(async () => {
  // Upsert template by (account_id IS NULL, name) — this is a platform-shared template
  const existing = await p.query(
    `SELECT id FROM contract_templates WHERE account_id IS NULL AND name = $1 LIMIT 1`,
    [TEMPLATE_NAME]
  );
  let templateId;
  if (existing.rows[0]) {
    templateId = existing.rows[0].id;
    await p.query(
      `UPDATE contract_templates
          SET html_body = $1, description = $2, language = 'fr', is_active = true, updated_at = NOW()
        WHERE id = $3`,
      [CONTRACT_HTML, 'French cure long-stay rental contract, bilingual FR/EN', templateId]
    );
    console.log(`Updated template #${templateId}`);
  } else {
    const ins = await p.query(
      `INSERT INTO contract_templates (account_id, name, description, language, html_body, is_active)
       VALUES (NULL, $1, $2, 'fr', $3, true) RETURNING id`,
      [TEMPLATE_NAME, 'French cure long-stay rental contract, bilingual FR/EN', CONTRACT_HTML]
    );
    templateId = ins.rows[0].id;
    console.log(`Inserted template #${templateId}`);
  }

  // Upsert Steve's landlord settings for account 197
  await p.query(
    `INSERT INTO account_contract_settings (
       account_id, landlord_name, landlord_address, landlord_postcode, landlord_city,
       landlord_country, landlord_phone, landlord_email,
       iban, bic, bank_account_name,
       default_security_deposit, default_cleaning_fee, default_tourist_tax_per_person_per_night
     ) VALUES (
       $1, 'DRIVER Stephen', '[adresse]', '[CP]', '[Ville]',
       'United Kingdom', '+44 7880 541120', 'stv.driver@googlemail.com',
       'FR76 1027 8022 3200 0201 8970 175', 'CMCIFR2A', 'M S Driver ou Mlle J Baxter',
       150.00, 35.00, 0.50
     )
     ON CONFLICT (account_id) DO UPDATE SET
       landlord_name = EXCLUDED.landlord_name,
       landlord_phone = EXCLUDED.landlord_phone,
       landlord_email = EXCLUDED.landlord_email,
       iban = EXCLUDED.iban,
       bic = EXCLUDED.bic,
       bank_account_name = EXCLUDED.bank_account_name,
       default_security_deposit = EXCLUDED.default_security_deposit,
       default_cleaning_fee = EXCLUDED.default_cleaning_fee,
       default_tourist_tax_per_person_per_night = EXCLUDED.default_tourist_tax_per_person_per_night,
       updated_at = NOW()`,
    [ACCOUNT_ID]
  );
  console.log(`Landlord settings upserted for account ${ACCOUNT_ID}`);
  console.log('\nDone. Template + landlord settings ready.');
  console.log(`\nTo send a contract for a booking:\n  POST /api/admin/bookings/<booking_id>/send-contract\n  Body: { "template_id": ${templateId} }`);

  await p.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
