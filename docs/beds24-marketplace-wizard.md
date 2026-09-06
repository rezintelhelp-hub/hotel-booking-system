# Beds24 Marketplace Onboarding Wizard — Spec

**Owner:** Steve
**Status:** Draft — build tonight
**Estimate:** 3-4 focused sessions
**Goal:** Beds24 client clicks Rezintel in their Beds24 marketplace → 60 seconds later they have a live GAS website. No forms, no wait. Post-launch checklist walks them through polishing.

---

## Trigger — one click from Beds24

Beds24 marketplace "GO TO RezIntel Sitebuilder" button opens:

```
https://admin.gas.travel/beds24-signup?master={masterId}&owner={ownerId}&prop={propId}&email={beds24AccountEmail}
```

The Beds24 marketplace UI already lets the client tick which rooms to enable — those choices are respected by our `getPropertyContent` sync since it returns per-room data.

---

## The 60-second flow

### 1. Public landing page (`/beds24-signup`)
- Reads URL params
- Shows: "Setting up your website for [property name — pulled live from marketplace API]"
- Progress steps visible: Create account → Import from Beds24 → Build site → Done
- No form. Just a big "Start" button (or auto-start on load with a 3-second countdown).

### 2. Account creation (server-side, no user input)
- Look up the email in `accounts` — if exists, log them in via magic link and skip to step 3
- Otherwise: create account with `email` from URL, generated password, `role='admin'`
- Send them a password-set email in the background (they can set one later; today they're using the magic session)
- Issue a session token, drop into localStorage
- Uses existing `/api/onboarding/create-account` shape

### 3. Marketplace link + sync (existing endpoints)
- Call `/api/accounts/:id/beds24v2/link` with `{ownerId, propId, propName, rooms}` (rooms filtered to enabled per the marketplace list)
- Call `/api/gas-sync/connections/:connectionId/sync-marketplace` — pulls all the existing rich data (name, address, coords, currency, check-in/out, phone, description, room configs, amenities, images) into `properties` + `bookable_units` + `gas_sync_properties`
- Existing plumbing at `server.js:33359` (link) + `server.js:33435` (sync) does all the heavy lifting — do not rebuild

### 4. AI-fill any missing content
For each missing required field, generate with Claude:

- **Property description** (if `properties.description` empty or `<50 chars`):
  Prompt: `"Write a warm 80-word intro for {name}, a {property_type} in {city}, {country}. It has {N} rooms/units. Amenities include {top 5 amenities}. Tone: welcoming, factual, no marketing fluff."`
- **Room descriptions** (per room where empty):
  Prompt: `"Write 40 words about the '{roomName}' at {property_name}. It sleeps {maxPeople}. Amenities: {list}."`

Store AI-generated copy in the normal `description` fields but flag `content_source='ai_generated'` (new column) so the post-launch checklist can nudge to replace.

### 5. Auto-provision WP site (new)
- Pick a subdomain from property name (slugify + collision check on `deployed_sites.site_url`)
- Default theme: `gas-theme-developer-light` (per CLAUDE.md — "for all new sites unless explicitly bespoke")
- Create WP multisite via existing `wp` CLI shell-out (already used elsewhere)
- Push initial content via `gas-template-push` plugin:
  - **Hero:** property name + city + first Beds24 image
  - **Intro:** AI-generated / imported description
  - **Rooms grid:** from imported bookable_units + images
  - **Contact:** address + coords + phone
- Store new `deployed_sites` row linking WP blog_id → GAS account_id + property_id

### 6. Land in Admin
- Redirect to `/gas-admin.html#dashboard`
- Auto-show "🎉 Your site is live" modal with:
  - Site preview thumbnail (screenshot API or iframe)
  - "Open site" button (opens the new subdomain)
  - "Post-launch checklist" call-to-action

---

## Post-launch checklist (progressive enrichment)

Dashboard widget listing what's still AI-generated / missing, each with:
- Human-readable label ("Your property description is AI-generated")
- Two action buttons:
  - **"Fix in Beds24"** → deep-link with Beds24 breadcrumb path (`Settings > Properties > Description > Property Description`) — GAS re-syncs on next tick
  - **"Ask AI to improve it"** → regenerate with a longer/refined Claude prompt

Checklist items (in priority order):
1. Replace AI-generated property intro
2. Replace AI-generated room descriptions
3. Add gallery images (target: 5+)
4. Fill amenities list (Beds24 feature codes)
5. House rules text
6. Cancellation policy
7. Verify address + auto-geocoded coords
8. Connect Stripe for direct payments
9. Set VAT if UK-registered
10. Custom domain (Instant Website Pro tier)

Every real Beds24 update → sync-marketplace re-fires → checklist re-scores → any items that are now filled with real content flip green.

---

## Data flow (Beds24 → GAS mapping)

| GAS field | Source | Fallback |
|---|---|---|
| accounts.email | URL `email` param | Beds24 `getPropertyContent.contactEmail` |
| accounts.name | Beds24 owner username | Property name |
| properties.name | `getPropertyContent.name` | `propName` from URL |
| properties.description | `texts.propertyDescription1.EN` | Claude AI-fill |
| properties.address / city / country / postcode | `getPropertyContent.*` | (blank — checklist item) |
| properties.latitude / longitude | `getPropertyContent.latitude / longitude` | Auto-geocode from address |
| properties.currency | `getPropertyContent.currency` | 'GBP' |
| properties.check_in_time / check_out_time | `checkInStartHour / checkOutEndHour` | 15:00 / 11:00 |
| properties.phone | `getPropertyContent.phone / mobile` | (blank) |
| bookable_units | `roomIds` object | (blank — critical, block if none) |
| bookable_units.max_guests | `maxPeople` | 2 |
| bookable_units.description | `roomTexts.roomDescription1.EN` | Claude AI-fill |
| Amenities | `featureCodes` (existing mapping table) | (blank) |
| Images | `getPropertyContent.images` (first 6) | (blank — checklist item, no stock fallback) |

All existing at `server.js:33473` onwards — do NOT reimplement.

---

## New endpoints / files needed

| Path | Purpose | Est. LOC |
|---|---|---|
| `public/beds24-signup.html` | Public landing page — 3-second countdown + progress UI | ~120 |
| `POST /api/onboarding/beds24-marketplace-signup` | Orchestrates the 60-sec flow: account create → link → sync → AI-fill → WP provision | ~200 |
| `POST /api/admin/properties/:id/ai-generate-description` | Standalone AI-fill for post-launch "Ask AI to improve" button | ~50 |
| `properties.content_source` column | Track ai_generated vs beds24 vs operator | ALTER TABLE |
| `properties.description_source` column | Same for room descriptions | ALTER TABLE |
| Post-launch checklist widget in `gas-admin.html` dashboard | Dashboard component + scoring fn | ~150 |

---

## Blockers / open questions

1. **How do we know what images the client "enabled"?** Beds24 marketplace UI ticks rooms, not images. Assume: import all images from `getPropertyContent`; client curates in Beds24 or via post-launch checklist.
2. **Password path** — do we email a set-password link on completion, or push them into GAS's password-set flow after they see the 🎉 screen?
3. **WP provisioning atomicity** — WP subdomain creation currently manual for new clients; we need a scripted path. Does one already exist for other onboarding flows?
4. **Slug collision** — if a slugified property name is taken, append a number? Ask the client?
5. **Failure mode** — what if `getPropertyContent` returns empty rooms? Show "Setup incomplete — go back to Beds24 and confirm rooms exist"?

---

## Rollout / risks

- **Test on Steve's own gites first** (account 197, testbed per `feedback_use_steves_gites_as_testbed.md`)
- **Feature flag** `beds24_marketplace_wizard_enabled` account-level, default off
- **Manual approval gate** for the first N signups — signup lands in a queue, Steve reviews before WP provision fires. Once flow is proven, remove the gate
- **Delete/undo path** — if a client abandons, need a script to nuke the account + WP site + connection cleanly

---

---

## Phase 2 — Cold prospects (no Beds24 account yet)

### Why this matters

The Phase 1 flow assumes the operator already has a Beds24 account. Half the addressable market doesn't. Currently `booking-assist.com` (Verena's operation — see `docs/booking-assist.md`) captures cold prospects and MANUALLY sets up their Beds24 account, property, pricing. €195/mo per 2 properties. 73 properties on that platform, 5 owners active. Manual bottleneck caps growth ~20-30 properties.

**Wizard Phase 2 automates what Verena's team does by hand.** Also opens Path B for direct GAS marketing: "Sign up here — we set up your channel manager + website in 10 minutes."

### Path B flow (no Beds24)

1. **Public entry** `/signup-new-property` — captures basics: property name, city/country, email, rooms count, property type
2. **GAS creates the Beds24 sub-account programmatically** via marketplace API (Rezintel has master partnership — needs to confirm sub-account creation endpoint is exposed)
3. **GAS creates a starter property in Beds24** with the captured basics + generates default room types
4. **GAS immediately connects that new Beds24 property back to itself** via the Phase 1 wizard (link + sync + AI-fill + WP provision)
5. **Client receives:**
   - GAS admin login
   - Beds24 account credentials (so they can extend / configure OTAs themselves later)
   - Live GAS website
6. **Post-launch checklist** guides them through Beds24 field completion (same UI as Phase 1)

### What Phase 2 replaces

- `booking-assist.com` — the whole manual funnel
- Verena's team's Beds24 setup work
- Owner-facing form + spam handling (474 submissions, 1% conversion, rest bots)

### Blockers to solve before Phase 2

1. **Beds24 sub-account creation API** — need to confirm Rezintel master partnership can programmatically create sub-accounts + starter properties. If not exposed, Phase 2 needs a Beds24 partnership conversation.
2. **Room type templates** — for a fresh property, generate sensible default rooms from a picker (Studio / 1BR Apartment / 3BR House / Hostel-dorm etc.)
3. **Pricing seed** — need at least one price so the site isn't empty. Prompt for a starting rate per room type
4. **OTA connection guidance** — post-Phase-2, client still needs to connect Airbnb / BDC etc. Wizard should nudge into the Channex wizard for that (or a similar Beds24 OTA-connect walkthrough)

### Revenue model implication

Phase 1 + Phase 2 together = GAS becomes a full "sign up here → up and running" pipeline for holiday-let owners. Verena's price point (€195/mo per 2 properties) is proven market rate for the value.

Path B could be tiered:
- **Free** — GAS site + up to N direct bookings
- **£X/mo** — GAS site + Beds24 + OTA connections
- **£XX/mo** — everything + full support (Verena-style managed service tier)

Discuss with Steve after Phase 1 ships.

### Notes for build

- Do NOT build Phase 2 as part of tonight's session — Phase 1 first, ship, prove
- Once Phase 1 is live: verify Beds24 sub-account creation API is available in our marketplace tier
- Coordinate with Verena on booking-assist.com migration — she's the ideal Phase-2 tester per her `docs/booking-assist.md` note

---

## Related work

- `project_channex_in_gas_wizard.md` — sibling wizard (Channex go-live)
- `project_tomorrow_queue_20260825.md` — Belmont migration sequence
- `feedback_use_steves_gites_as_testbed.md` — first-connected-account pattern
- `docs/beds24-outbound-push.md` — the OUTBOUND spec (this is INBOUND)
- Existing plumbing at `server.js:33359` (`/beds24v2/link`) and `server.js:33435` (`sync-marketplace`) — heart of what's being wrapped
