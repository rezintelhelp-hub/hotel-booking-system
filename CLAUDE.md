# GAS — Global Accommodation System
## Claude Code Instructions — Read this at the start of every session

---

## WHAT GAS IS

GAS (Global Accommodation System) is a full-stack hotel booking and property management SaaS platform built and maintained by Steve Driver. It connects property owners directly with guests and travel agents, free from big platform fees.

---

## ARCHITECTURE — READ CAREFULLY

### 1. Main API Server — Railway
- **URL**: https://admin.gas.travel
- **Railway URL**: https://hotel-booking-system-production-d6db.up.railway.app
- **File**: `server.js` (40-70k lines — never regenerate)
- **Database**: PostgreSQL on Railway
- **Deploy**: Git push to main → Railway auto-deploys automatically. Never manually deploy server.js.
- **Cannot**: Query Railway directly via SSH or CLI. All server changes go via git push.

### 2. GAS Admin UI
- **File**: `public/gas-admin.html` (40-70k lines — never regenerate)
- **Served by**: Railway (same server.js)
- **URL**: https://admin.gas.travel/gas-admin.html
- **Deploy**: Git push to main → auto-deploys with server.js

### 3. WordPress Multisite VPS
- **IP**: 72.61.207.109
- **URL**: sites.gas.travel (*.sites.gas.travel for client sites)
- **SSH**: `ssh -i ~/.ssh/id_ed25519 root@72.61.207.109`
- **WordPress path**: `/var/www/html/wp-content/`
- **Plugin**: `plugins/gas-booking/` in repo → deploy via SCP
- **Deploy plugin**: 
  ```
  scp -i ~/.ssh/id_ed25519 plugins/gas-booking/gas-booking.php root@72.61.207.109:/var/www/html/wp-content/plugins/gas-booking/
  scp -i ~/.ssh/id_ed25519 plugins/gas-booking/assets/js/gas-booking.js root@72.61.207.109:/var/www/html/wp-content/plugins/gas-booking/assets/js/
  ```
- **Plugin API URL**: sites.gas.travel WordPress sites call `admin.gas.travel` (Railway) not the VPS

### 4. GAS Lites Server
- Separate lightweight booking server
- Different from the main server.js
- Handles lite.gas.travel

### 5. GitHub Repo
- `rezintelhelp-hub/hotel-booking-system`
- All changes via git commit and push
- Railway auto-deploys on push to main

---

## CODING RULES — ALWAYS FOLLOW

1. **NEVER regenerate whole files** — server.js and gas-admin.html are 40-70k lines. Always use surgical str_replace edits only.
2. **Always read context first** — before any edit, read the relevant function and surrounding code.
3. **Show plan before changes** — always list what will be changed before making any changes.
4. **Surgical edits only** — add the minimum lines needed. Never rewrite functions unless explicitly asked.
5. **Never add unrequested features** — if the task says fix X, fix only X. Do not add Y and Z.
6. **Always verify after editing** — confirm nothing was lost or broken after each edit.
7. **Steve is dyslexic** — always display exact console commands in code blocks for direct copy-paste.

---

## DEPLOYMENT RULES

| What | How |
|------|-----|
| server.js changes | `git add . && git commit -m "message" && git push` → Railway auto-deploys |
| gas-admin.html changes | Same git push — served by Railway |
| WordPress plugin changes | SCP files directly to VPS (see path above) AND bump plugin version number |
| Plugin version | Always increment version in gas-booking.php AND in the JS file to bust browser cache |

---

## KEY PATTERNS IN THE CODEBASE

### Authentication
- Master admin: `role === 'master_admin'`
- Client roles: `admin`, `submaster_admin`, `agency_admin`
- `isMasterAdmin` variable used throughout gas-admin.html
- API auth uses `authHeaders()` function

### Multilingual
- Languages stored as JSONB: `{ "en": "text", "fr": "texte", "de": "Text" }`
- Plain text column (e.g. `name`) = English fallback
- JSONB column (e.g. `name_ml`) = all language translations
- `parseMultilingualField()` — parses stored value into object
- `mlStr()` — extracts English string from multilingual object
- `getAccountLanguages()` — returns enabled languages for account
- `loadLanguageSettings()` — must be called with `await` before rendering lang tabs
- Language keys are lowercase: `en`, `fr`, `de`, `nl`, `es`, `ja`
- Every modal that renders language tabs must call `await loadLanguageSettings()` first

### Channel Manager Adapter Pattern
- All channel managers use a standardised adapter interface
- Direct connections: Beds24, Hostaway, Hostfully
- Calry-routed: Smoobu, Lodgify
- Each has a multi-step wizard in gas-admin.html
- Sync connections stored in `gas_sync_connections` table

### Payments
- Three independent payment systems:
  1. Stripe (online card payments)
  2. Direct/Bank Transfer (manual)
  3. Card Guarantee via Enigma
- Each is completely separate — never mix them

### AI Chat
- Endpoint: `POST /api/ai-chat`
- Uses knowledge base: `kb_articles` table (full-text search)
- Unanswered questions logged to `kb_unanswered` + Slack webhook
- Client AI panel: always visible for non-master users, context-aware per view
- Master admin floating widget: removed

### Currency
- Property currency is source of truth everywhere
- Never hardcode EUR, GBP, USD, £
- Currency passed via checkout URL to prevent race conditions

---

## CURRENT PARTNERS & CLIENTS

| Name | Type | Notes |
|------|------|-------|
| Elevate Schweiz | Partner/Agency | account_id: 92, API key: gas_96f1f22c3103c0a504ed8ca0ee14661d08f0592d8597e40b |
| Discover St. Charles | Client | Active site on multisite |
| RocketStay | Client | Custom site, GAS Custom Light theme |

---

## COMMON MISTAKES TO AVOID

- **Wrong server**: sites.gas.travel WordPress plugin talks to admin.gas.travel (Railway), NOT the VPS. Fixes to public API endpoints go in server.js on Railway.
- **Wrong deployment**: gas-admin.html is on Railway, not the VPS. Don't SCP it.
- **Cache**: After deploying plugin JS, always bump version number or browser will serve old cached file.
- **Language keys**: Always lowercase (en/fr/de), never uppercase (EN/FR/DE).
- **loadLanguageSettings**: Must be awaited before rendering any lang tabs in a modal.
- **Plugin deploy**: Must SCP both gas-booking.php AND gas-booking.js — and bump version in both.

---

## CURRENT PRIORITIES (update as needed)

1. Knowledge base — articles needed for every GAS feature
2. Swagger audit — verify all Elevate partner endpoints
3. Airwallex payment integration
4. UI improvements — client dashboard tiles and navigation
5. Translation pipeline — ensure all Bookings & Revenue fields translate to website

---

## SWAGGER / API DOCS

- URL: https://admin.gas.travel/api/docs
- Partner API key for testing (Elevate): `gas_96f1f22c3103c0a504ed8ca0ee14661d08f0592d8597e40b`
- Provisioning keys (GAS-PROVISION-*) are NOT valid for partner endpoints
- Elevate core endpoints: images, room update, pricing push, availability — all confirmed working

---

## KNOWLEDGE BASE MANAGEMENT

- Articles stored in `kb_articles` PostgreSQL table
- Import via: `POST /api/kb/import` with JSON array
- View/edit in GAS Admin → Knowledge Base (master admin only)
- When building a new feature, add a KB article in the same commit
- Unanswered client questions appear in GAS Admin → Knowledge Base → Unanswered

---

*Last updated: March 2026*
*Maintained by Steve Driver*
