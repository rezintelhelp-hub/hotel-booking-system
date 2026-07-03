# Spanish Compliance + Hotelbeds + Regional Partnership Strategy

*Captured 2026-06-10. Single reference for the evening's strategic discussion: Hotelbeds B2B distribution, regional-partner concierge model, Spanish regulatory stack (SES Hospedajes + FNMT + tourist licences), Invest jet migration plan, WhatsApp/Meta status.*

---

## 1. Hotelbeds Connect API — what we proved tonight

### Status
- **Hotels API key**: live on sandbox (Evaluation tier — 50 calls/day, 8 per 4s). End-to-end working.
- **Activities API key**: live, auth confirmed, sandbox quirks on stocked-data search.
- **Transfers API key**: live, auth confirmed, sandbox returns intermittent 500s.
- **Partner profile form**: page 1 submitted (rezintel + GAS), page 2 completed and parked. Steve's contact info on file with their commercial team.

### Sandbox credentials (rotate before production)
Stored in 1Password as **"Hotelbeds Sandbox"**. Never echo secrets in chat/code.
- Three separate Apikey/Secret pairs (one per product family)
- HMAC-SHA256 signature: `SHA256(apiKey + secret + timestamp_seconds)`
- Endpoint: `https://api.test.hotelbeds.com`

### Demo state in production GAS DB (cleanable)
- **Account 272** — "Hotelbeds Inventory" — admin role
- **Property 1111** — Ohtels Villa Dorada (Salou, ES) — `external_source='hotelbeds'`, `external_id='1'`
- **22 bookable_units** — one per Hotelbeds room type code (DBT.ST, SGL.ST, etc.)
- **7 room_images** — pointing at CDN `https://photos.hotelbeds.com/giata/*`

### Catalogue scale verified
- **255,254 hotels** worldwide
- ~**30,000 activities** (per public docs)
- ~**5,000 transfer routes** / 800+ airports
- 185 countries, ~5,000 destination codes
- ~25% of Booking.com's hotel catalogue at wholesale

### Pricing model — DECIDED
**Variable markup, default 15%.** Resolver order:

```
gas_price = COALESCE(
    properties.hotelbeds_markup_pct,    -- per-property override
    accounts.hotelbeds_markup_pct,       -- per-account override
    0.15                                 -- platform default
) × net_rate

guest_price = gas_price × (1 + agent_commission_pct)
```

**Dynamic markup with rate intelligence (Phase 2):**

```
gas_price = MAX(
    hotelbeds_net × 1.05,         -- floor: never below 5% margin
    MIN(
        hotelbeds_net × 1.25,     -- ceiling: cap at 25% markup
        bcom_live_price - 5        -- try to beat B.com by £5
    )
)
```

### Live market validation (28-29 Jun 2026, 2 adults)

| Hotel | City | Net (you pay) | GAS price | B.com retail | B.com active | Saving | Margin/night |
|---|---|---|---|---|---|---|---|
| Whitelaw Hotel | Miami Beach | £41.50 | £50 | — | £86 | 42% | £6.50 + £2.50 |
| Best Western Plus | Cannes | £105.50 | £127 | — | £177 | 28% | £16 + £6 |
| Hotel LIVVO Fataga | Las Palmas | £59 | £71 | £117 | £88 (flash) | 19-39% | £9 + £3.40 |
| Sercotel Playa Canteras | Las Palmas | £62 | £75 | £92 | £74 (flash) | -2% (LOSS at static markup) | static loses, dynamic wins |

**Key insight**: static 15% markup loses to B.com flash deals. Rate intelligence module (PriceLabs alternative) is existential, not optional.

### Why GAS Rate Intelligence beats PriceLabs

Three free data sources we already have:
1. Beds24/Hostaway/Smoobu/Hostfully data on operator-direct rates
2. Hotelbeds wholesale floor
3. Scrape B.com / Expedia public pages with Playwright

**Cost: ~£200-400/month for unlimited properties** vs PriceLabs at $20/property/month (≈£200k/year at platform scale). 50:1 cost-to-value advantage.

### Hotelbeds API status concern
- **Hotels Booking API has been YELLOW (service disruption) across all 3 regions for 7 consecutive days** (week of 2026-06-04).
- Plan: build with retry logic + circuit breaker + **second supplier (WebBeds or TBO Holidays)** from day 1 of agent extranet.
- Use the status board as leverage in SLA negotiation: "your API's been yellow for 7 days; reciprocal SLA terms please."

---

## 2. Regional Partner Network — Steve's killer differentiator

### The model
Existing GAS clients (operators in their geographies) opt in to handle Hotelbeds-sourced guest support in their territory. In exchange for 3-5% of GAS margin per booking.

- Guest issue at 11pm in Salou? Local partner handles it (€5 commission per booking).
- We get 24/7 global support without hiring.
- They get a new revenue line for work they're already equipped for.

### Pre-confirmed partners (by territory)

| Region | Partner | Anchor properties |
|---|---|---|
| **French Riviera** (Cannes/Antibes/Nice/Mougins/Cap d'Antibes/Vallauris/Grasse) | Riviera Keys (Yann) | 15 |
| **Florida East Coast** (Brevard, Melbourne area) | Atlantis Realty (Pedro) | 40 |
| **Cotswolds + UK Midlands** | Cotswold Retreats (Tracey) | 66 |
| **West Yorkshire / Hebden Bridge** | IOU Hostel (Sandra) | 2 (but full-time on-ground) |
| **Malta** | EasyLandlord | 67 |
| **Latvia** (Riga) | Bookin Riga | 40 |
| **Boracay PH** | MyBoracayGuide | 11 |
| **Prague CZ** | Dwellfort | 8 |
| **Gran Canaria + Maspalomas ES** | rent4natu | 69 |
| **Spanish Canarias (Fuerteventura)** | Invest jet Real estate SL | 43 |
| **Spanish San Sebastian** | San Sebastian Properties | 29 |

### Geographic gaps = BD prospect list
Italy (esp. Rome/Tuscany), Portugal (Lisbon/Algarve), Greece (Athens/islands), Croatia (Adriatic), Mexico (Cancun/Tulum), Brazil (Rio/Salvador), Thailand (Bangkok/Phuket), Vietnam (HCMC/Hanoi), Turkey (Istanbul/Antalya), UAE (Dubai), South Africa (Cape Town).

### Schema additions needed
- `accounts.regional_partner_enabled BOOLEAN`
- `accounts.regional_partner_territory` (geo polygon or country+region)
- `accounts.regional_partner_revenue_share_pct` (default 5)
- Booking router auto-assigns when Hotelbeds booking lat/lng falls in territory
- Inbox routing forwards guest support to assigned partner
- GoCardless monthly payouts (rails already exist)

---

## 3. Commercial terms with Hotelbeds — what to expect

### The 4-stage funnel
| Stage | What | Status |
|---|---|---|
| 1. Register | Free, 5-min signup | ✅ DONE |
| 2. Complete Profile | Tell them about GAS, volumes, markets | ✅ DONE (page 2) |
| 3. Get Certified | They audit code + business | Pending — likely 4-8 weeks |
| 4. Go Live | Sign contract, production keys | After certification |

### Realistic financial commitments at Stage 4
| Item | Range | GAS strategy |
|---|---|---|
| Annual volume commitment | £100k-500k turnover | Tier-2 distributor entry |
| Payment terms | Net 7-30 days | Negotiate net-30 from booking |
| Pre-payment / bank guarantee | £10k-50k | **AVOID** — use Stripe Connect split-payments instead |
| Cancellation liability | Operator carries | Standard merchant-of-record |
| Settlement currency | EUR | Accept FX spread or hedge |

### NOT charged on top
- No API access fee
- No per-call charge
- No monthly platform fee
- No commission on top of net rates (their margin is in the spread)

### Realistic upfront launch budget (B2B-only)
| Item | Cost |
|---|---|
| Public liability insurance | £500-1,000/yr |
| Legal T&C / contract review | £500-1,500 |
| Subdomain + hosting (agents.gas.travel) | £0 (existing infra) |
| Dev time (in-house) | £0 |
| **TOTAL UPFRONT** | **~£1,800** |

NB: B2B-only avoids ABTA bond (£5-30k), ABTA membership (£2-5k), full bespoke legal review. Those are B2C requirements we don't need.

### Multi-supplier resilience plan
Don't single-source Hotelbeds. Run:
1. **Hotelbeds** — primary (255k hotels, content quality, brand)
2. **WebBeds** — secondary (overlapping inventory, sometimes better Asia/Pac)
3. **TBO Holidays** — tertiary (India, MENA, SEA gaps)
4. **GAS-native operators** — premium (unique inventory, no third-party commission)

Search hits all four; returns best-rate + best-availability across them.

### Contacts at Hotelbeds
- `apitude@hotelbeds.com` — accommodation technical support (NOT commercial)
- `integrations.btb@hotelbeds.com` — activities/transfers technical support (NOT commercial)
- **Commercial conversation** routes via:
  - Profile completion in developer dashboard (auto-routed to BD)
  - Corporate site → Solutions for Tour Operators → Contact
  - LinkedIn search: "Hotelbeds Business Development EMEA/UK"

---

## 4. Spanish Compliance Stack — the 3 mandatory registers

### Background
Spanish short-term rental hosts must register on THREE separate systems (all now required since 2024-2025). Without all three: Airbnb/B.com/Vrbo can suspend listings.

### The 3 registers

| Register | Authority | Mandatory since | Per-property? |
|---|---|---|---|
| **Regional tourist licence** | CCAA (Canarias / Cataluña / Baleares / etc.) | Already in force | Yes |
| **SES Hospedajes** | Ministry of Interior | **2 Dec 2024** | Yes (one per property + global account) |
| **National registration number** | Colegio de Registradores | **Jul 2025** (NEW) | Yes |

### SES Hospedajes — what it does
- Replaces old Hospederías (Webpol) system
- Operator submits guest registration data within 24h of check-in
- Govt purpose: control rentals, tax cross-reference, public security
- Penalties: €600 light, €601-30,000 serious, >€30,000 very serious

### SES — what we know about the API
- **Protocol**: SOAP (NOT REST)
- **Authentication**: Mutual TLS with **FNMT digital certificate** (X.509) or Cl@ve
- **Wire model**: SOAP envelope → cabecera + solicitud, where solicitud = `zip(xml).base64()` (double-wrapped)
- **Service namespace**: `http://www.soap.servicios.hospedajes.mir.es/comunicacion`
- **Cancellation namespace**: `http://www.neg.hospedajes.mir.es/anularComunicacion`
- **Endpoints**: ⚠️ Pending exact URLs — still to be extracted from official PDF spec
- **Spec doc**: `MIR-HOSPE-DSI-WS-Servicio-de-Hospedajes-Comunicaciones-v3.1.2.pdf` (Ministry of Interior)

### SES — operations supported
| Code | Operation | Purpose |
|---|---|---|
| A | Alta | New submission |
| C | Consulta | Query batch status |
| B | Baja | Cancel prior submission |

### SES — communication types
| Code | Type |
|---|---|
| PV | Parte de Viajeros (guest registration) |
| RH | Reserva Hotelera |
| AV | Anulación Viajeros |
| RV | Reserva Viajeros |

### SES — required fields per guest
- name, apellido1, apellido2
- tipoDocumento (NIF / PAS / DNI / NIE)
- numeroDocumento + soporteDocumento
- fechaNacimiento
- nacionalidad (ISO 3166-1 Alpha-3, e.g. ESP)
- sexo (H/M)
- direccion (street, complement, codigoMunicipio (INE 5-digit for Spain), codigoPostal, pais)
- telefono, correo
- parentesco (for minors only)
- **Children under 14: counted but not individually declared**

### SES — booking fields (`contrato`)
- referencia, fechaContrato, fechaEntrada, fechaSalida
- numPersonas, numHabitaciones, internet
- pago block (tipoPago, fechaPago, medioPago, titular, caducidadTarjeta)

### SES — common error codes
| Code | Meaning |
|---|---|
| 0 | OK |
| 10100/10101 | Operator code missing |
| 10103 | Operator code unknown |
| 10111 | Format wrong (must be zip+base64 XML UTF-8) |
| 10118 | XML schema violation |
| 10120 | Operator not enabled for webservice |
| 10121 | Validation error |
| 10131 | Required field missing |
| 10999 | Uncontrolled error |

### CRITICAL setup detail
During SES establishment registration, operator MUST tick the checkbox:

> **"Envío de comunicaciones por servicio web"**

Without this checkbox, the API is disabled and all submissions must be manual. **This must be on every GAS Spanish onboarding checklist.**

### Operator setup workflow
1. Get FNMT digital certificate (€14, 1-2 weeks online — sede.fnmt.gob.es) OR Cl@ve
2. Register establishment at sede.mir.gob.es → get unique `codigoArrendador`
3. **TICK "Envío de comunicaciones por servicio web"** during registration
4. Upload cert + codigoArrendador to GAS (encrypted in payment_configurations)
5. GAS auto-submits on every booking confirmation

### Competitive landscape (incumbent SES tools we replace)
| Tool | Cost |
|---|---|
| Hola Huésped | €10-20/property/month |
| Civitfun | €10-20/property/month |
| Check-in Scan | similar |
| Avantio | similar |
| Smily | similar |
| Lodgify SES module | similar |

**GAS pricing**: free with subscription OR €5/property/month add-on. Undercuts by 50-75%.

### Build complexity
~1-2 weeks for `sesHospedajesAdapter.js` once we have:
1. Endpoint URLs (sandbox + production)
2. Operator FNMT cert + codigoArrendador
3. Test establishment in sandbox

### Related tasks
- **#92**: SES Hospedajes adapter
- **#94**: Colegio de Registradores adapter
- **#95**: FNMT digital certificate onboarding flow in GAS admin

---

## 5. Invest jet Real estate SL — Migration Plan (Task #93)

### Profile
- 43 properties in Canarias (Fuerteventura, Corralejo, Costa Calma, Costa Lajares, La Oliva, Morro Jable)
- Currently using **7 different systems** — full consolidation candidate

### Probable systems she's juggling
1. PMS / booking engine (likely Beds24 — verify)
2. Channel manager (Beds24 or SiteMinder)
3. SES compliance tool (Hola Huésped €10-20/property/mo OR manual)
4. Guest comms (WhatsApp manual or Hospitable)
5. Smart locks (RemoteLock / Igloohome — verify)
6. Accounting (Holded / external gestor)
7. Tourist tax + cadastral compliance

### Cost savings vs current stack
**€600-1,500/month** across 43 properties. Strong commercial incentive.

### Migration order
- **Week 0**: Discovery call — confirm tools, channel mix, regulatory status (does she have all 3 registers?)
- **Week 1**: GAS account provisioned + channel manager connected
- **Week 2**: 5 pilot properties migrated + SES integration tested live + "Envío por servicio web" checkbox verified
- **Week 3-4**: Bulk migrate remaining 38 + train + handover

### Template reusable for other Spanish accounts
Same migration pattern fits **rent4natu** (69 props), **San Sebastian Properties** (29), **Unerav** (1), and any future Spanish acquisitions.

### WhatsApp dependency for Invest jet
She specifically needs WhatsApp — see section 6 below.

---

## 6. WhatsApp / Meta integration status (for Invest jet + other clients)

### Already shipped (memory: project_whatsapp_integration.md)
- **WhatsApp Cloud API integration shipped 2026-05-21**
- **Park Row Hotel's WABA wired end-to-end** (outbound + inbound + Messages UI)
- **Tech Provider verification pending Meta** at the time (~5 days)
- Templates + booking lifecycle hooks: still TODO

### Pending tasks (relevant to Spanish clients)
- **Task #47**: WhatsApp Embedded Signup — waiting on Meta App Review
  - Allows new operators (like Invest jet) to self-onboard their own WhatsApp Business Account via embedded signup flow
  - Until Meta approves the App Review, new WABAs need manual Tech Provider work

### What we can offer Invest jet on day one
- Inbound + outbound WhatsApp messaging via the existing infrastructure
- Templates require Tech Provider work per WABA (current process)
- Booking lifecycle templates (check-in code, balance reminder, post-stay review) need to be built/queued

### Meta-related references
- WhatsApp Cloud API onboarding requires:
  1. Facebook Business Manager account
  2. Verified domain (gas.travel — already verified for other Meta products)
  3. Phone number provisioned for WABA
  4. Meta App Review for Embedded Signup (in progress per task #47)
- Tech Provider verification was queued for completion around 2026-05-26
- Status to confirm: did Meta App Review come through? Worth checking the Meta business dashboard.

### Where Meta info lives
- Memory: `project_whatsapp_integration.md` (full setup details)
- Memory: `reference_steve_email_accounts.md` (Steve's connected Meta accounts)
- Task #47 (pending — Meta App Review)
- Park Row Hotel is the reference WABA for testing

---

## 7. Tonight's task list summary

| # | Task | Status |
|---|---|---|
| 47 | WhatsApp Embedded Signup — waiting on Meta App Review | Pending (Meta-blocked) |
| 90 | Hotelbeds Connect API pilot — agent extranet inventory | Pending (in active dev) |
| 91 | Regional-partner network — Hotelbeds inventory local concierge model | Pending |
| 92 | SES Hospedajes integration for Spanish properties | Pending |
| 93 | Invest jet Real estate SL — full migration to GAS (43 Canarian props) | Pending |
| 94 | Colegio de Registradores national rental registration adapter | Pending |
| 95 | FNMT digital certificate onboarding flow in GAS admin | Pending |

---

## 8. Quick links

### Hotelbeds
- Dashboard: https://developer.hotelbeds.com/dashboard/
- Status: https://developer.hotelbeds.com/api-status/
- Sandbox API base: https://api.test.hotelbeds.com
- Solutions for Tour Operators (read this for their pitch): https://www.hotelbeds.com/

### Spanish Compliance
- SES Hospedajes portal: https://sede.mir.gob.es (Ministry of Interior, electronic seat)
- Old Webpol (being phased out): https://webpol.policia.es
- FNMT digital certificate request: https://sede.fnmt.gob.es
- Cl@ve (alternative auth): https://clave.gob.es
- Catastro (cadastral reference lookup): https://catastro.minhap.gob.es
- Legal framework: Real Decreto 933/2021 (BOE-A-2021-17630)
- Sanctions framework: Ley Orgánica 4/2015 (BOE-A-2015-3442)
- SES Spec PDF: `MIR-HOSPE-DSI-WS-Servicio-de-Hospedajes-Comunicaciones-v3.1.2.pdf`

### Competitive Spanish compliance SaaS (to undercut)
- Hola Huésped, Civitfun, Check-in Scan, Avantio, Smily, Lodgify SES

### Booking.com retail-price spot checks (live tests from 2026-06-10)
- Whitelaw Hotel Miami Beach: £86 — wholesale £41.50 = 42% saving
- Best Western Plus Cannes Riviera: £177 — wholesale £105.50 = 28% saving
- Hotel LIVVO Fataga Las Palmas: £117 (£88 flash) — wholesale £59 = 19-39%
- Sercotel Playa Canteras Las Palmas: £92 (£74 flash) — wholesale £62 = 17% retail or LOSS at flash

---

## 9. Key strategic decisions captured tonight

1. **Default GAS markup on Hotelbeds = 15%**, variable via per-property and per-account override
2. **Rate intelligence module is existential**, not optional — required for dynamic markup to beat B.com flash deals
3. **Build with 2+ suppliers from day 1** (Hotelbeds primary, WebBeds secondary) — Hotelbeds API has been yellow for 7 days
4. **B2B-only launch** avoids ABTA bonding requirements — total launch cost ~£1,800
5. **Local concierge network** via existing GAS clients is the moat vs Travelomatix-style wrappers
6. **Spanish compliance bundle** (SES + FNMT + Colegio + tourist licence) is GAS's wedge into the Spanish market
7. **Whatsapp + Meta integration** is critical for Spanish clients but partially blocked on Meta App Review (task #47)

---

*Maintained by Steve Driver. Update sections as decisions evolve.*
