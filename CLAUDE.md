# GAS — Global Accommodation System
## Claude Code Instructions — Read this at the start of every session

---

## CRITICAL RULES — NEVER VIOLATE

- **NEVER** overwrite existing third-party webhook URLs
- **NEVER** modify live client data during debugging
- **NEVER** batch-change files without explicit approval
- **ALWAYS** check existing data before any write operation
- Surgical edits only

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

### 6. OLD SERVER (Linode/Akamai — app3)
- **IP**: 139.162.234.112
- **SSH**: `ssh -i ~/.ssh/id_ed25519 root@139.162.234.112`
- **STATUS**: READ ONLY — for reference and migration purposes only
- **DO NOT** decommission, delete, edit or modify anything on this server
- Still live — runs existing client sites being migrated to GAS
- Contains: client configs, API keys, Beds24 credentials, site data, templates
- **MySQL**: `mysql -u setseed_master -p'hrDpymeXhGjcBgvT8GTZ' setseed_master`
- **App config**: `/var/www/html/app/configuration.php`
- **Key paths**:
  - Client sites: `/var/www/html/sites/{sitename}/`
  - Theme templates: `/var/www/html/themes/global_design_mode_theme*/templates/`
  - App classes/functions: `/var/www/html/app/classes/`, `/var/www/html/app/functions/`
  - Each client has own DB: `setseed_{sitename}`

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

### GAS Theme Burger (Pro Theme)
- **Location**: `/var/www/wordpress/wp-content/themes/gas-theme-burger/` on multisite VPS only (not in git repo)
- **Architecture**: Standalone theme — renders WordPress block content via `the_content()`
- **NOT like developer-dark/light** — does NOT use GAS API PHP sections (hero, rooms grid, etc.)
- **Header**: Burger menu (hamburger icon left, logo centre, Book Now right), reads from `developer_get_api_settings()`
- **Footer**: Dark footer with copyright, reads colours/text from GAS API
- **Slide menu**: In functions.php via `wp_footer`, tries 'Primary Menu' then 'Main Menu'
- **Block styles**: Explicitly enqueued (cover, columns, buttons, group, image, heading, paragraph)
- **`align-wide`**: Enabled for `alignfull`/`alignwide` blocks
- **CSS**: gas-hebden styles + burger header styles, 80px content padding, 100px hero margins
- **Copied from**: gas-hebden theme on Hebden Bridge custom server (31.97.119.90)
- **DO NOT** touch developer-dark or developer-light when editing burger theme

### GAS Template Library
- **Table**: `gas_templates` in PostgreSQL — `block_markup` (TEXT) + `elementor_json` (JSONB, nullable)
- **Endpoints**: CRUD at `/api/templates`, push at `/api/templates/:id/push`
- **WordPress plugin**: `gas-template-push` v1.1.0 — receives templates via REST API, auto-detects format
- **GAS Admin UI**: Templates nav section (master-only), card grid with filter bar
- **Tiers**: standard (Instant Website), pro (Instant Website Pro), bespoke (Custom Bespoke)
- **Pro Site Builder** (roadmap): Page manager → Page builder → Header/footer builder → Save & publish via gas-template-push

---

## CURRENT PARTNERS & CLIENTS

| Name | Type | Notes |
|------|------|-------|
| Elevate Schweiz | Partner/Agency | account_id: 92, API key: gas_96f1f22c3103c0a504ed8ca0ee14661d08f0592d8597e40b |
| Discover St. Charles | Client | Active site on multisite |
| RocketStay | Client | Custom site, GAS Custom Light theme |
| IOU Hebden Bridge Hostel | Client | account_id: 169, blog_id: 75, gas-theme-burger, Pro tier reference site |

---

## COMMON MISTAKES TO AVOID

- **Wrong server**: sites.gas.travel WordPress plugin talks to admin.gas.travel (Railway), NOT the VPS. Fixes to public API endpoints go in server.js on Railway.
- **Wrong deployment**: gas-admin.html is on Railway, not the VPS. Don't SCP it.
- **Cache**: After deploying plugin JS, always bump version number or browser will serve old cached file.
- **Language keys**: Always lowercase (en/fr/de), never uppercase (EN/FR/DE).
- **loadLanguageSettings**: Must be awaited before rendering any lang tabs in a modal.
- **Plugin deploy**: Must SCP both gas-booking.php AND gas-booking.js — and bump version in both.

---

## CURRENT PRIORITIES — 14 March 2026

1. **Plugin licensing system** — Extend licensing to cover gas-hostvana and all future plugins, tied to Stripe subscription status. Currently only gas-booking has licensing. Needs: license generation per plugin, subscription tier checks, activation/deactivation flow, expiry handling.
2. Footer — Terms and Privacy links broken
3. Contact page — map sizing
4. Footer — all page links not showing
5. Site go-live setup/checklist
6. Repuso API connection (white-label)
7. Blog page — header/subheader translation + category translations
8. Attractions page — header/subheader translation + category translations
9. Room page — Reviews tab (Repuso widget ID per room)
10. Cloudflare — speed optimisation strategy
11. Plugin management — repo, version control, downloadable from GAS, Claude Code awareness
12. Partner/Elevate white-label URLs — branded domains per partner
13. Theme marketplace — add new themes via UI, open to third-party theme builders, manage within GAS Admin
14. Web Builder text formatting — add basic rich text controls (bold, italic, colour picker, hyperlink) to all text fields in the standard Web Builder. Currently plain text only. Needed for all clients on standard tier.
15. Template Library UI — seeding more templates from existing GAS themes
16. Pro tier upgrade path — subscription_tier column on accounts, Stripe product for Pro, upgrade flow in GAS Admin, gated template access
17. Page builder / block system — reusable content blocks for Standard tier sites (text, image, button, columns) with ordering
18. Burger/hamburger theme — new theme for GAS multisite, editorial style, for Hebden Bridge type clients
19. Blog migration tool — SSH into app3, extract WordPress posts, AI categorisation, insert into GAS blog
20. Client migration plan — audit all clients on app3, score complexity (simple/medium/complex), batch migrate simple clients first
21. Hostvana — complete end to end test with Pedro, inject property ID from booking plugin context, Beds24 master API key

---

## PRODUCT TIERS

- **Instant Website (standard)** — GAS hosted, standard theme, Web Builder
- **Instant Website Pro (pro)** — everything in standard + Template Library, Elementor, burger themes
- **Plugin Only** — booking plugin for client's own WordPress site, $19.99/mo
- **Custom Bespoke (bespoke)** — fully custom built site, $2,500 setup + $99/mo. Example: Hebden Bridge Hostel

---

## SERVER INFRASTRUCTURE

- **GAS Railway (Node.js + PostgreSQL)** — admin.gas.travel
- **GAS WordPress Multisite VPS** — 72.61.207.109, /var/www/wordpress
- **app3 Linode (READ ONLY)** — 139.162.234.112, Rezintel/old clients, reference only for migration, DO NOT modify
- **Old Linode (READ ONLY)** — 178.79.158.188, ~10 old clients, needs password reset to access
- **Hebden Bridge custom site** — 31.97.119.90, /var/www/hebdenbridgehostel.custom.gas.travel

---

## SESSION LOG — 11 March 2026

### Blog Modal Redesign + WYSIWYG Editors
- Replaced raw HTML textareas with `contenteditable` WYSIWYG editors in both blog and attraction modals.
- Formatting toolbar: Bold, Italic, H2, H3, P, List, Link — uses `document.execCommand()`.
- Blog modal redesigned to single-column layout matching attractions: metadata grid, image upload, scheduling section.
- Updated `collectMultilingualField()`, `populateMultilingualField()`, `autoTranslateField()` to handle contenteditable `.innerHTML` vs textarea `.value`.
- `formatRichText()` replaced `formatBlogText()` — shared by both modals.

### Blog Category FK Constraint Fix
- `blog_categories.client_id` had FK to `clients` table but value was `account_id` — violated constraint.
- Startup migration drops the FK constraint.
- Manual fix endpoint: `GET /api/fix/blog-categories-fk`.
- Category INSERT wrapped in try/catch so blog creation isn't blocked.
- `openBlogModal()` adds missing category as dropdown option if not found.

### Language Filtering for Blog & Attraction Modals
- Added `filterModalLanguages(modalId)` — hides tabs/inputs for languages not in account settings.
- Called from `openBlogModal()` and `openAttractionModal()` after `await loadLanguageSettings()`.
- Fixed hardcoded `['en','fr','es','nl']` in `populateMultilingualField()` and `collectMultilingualField()` → now uses `getAccountLanguages()`.
- Added `await loadLanguageSettings()` to `generateAiBlog()` so translations run during AI blog generation.

### Blog Ideas Sub-Tabs from Feed Names
- Added `feed_id` column to `content_ideas` table.
- iCal and RSS fetch now store `feed_id` on content ideas.
- GET content-ideas endpoint accepts `feed_id` filter.
- Frontend: sub-tab bar in Ideas tab, tab management in Blog Settings.

### Favicon Swagger + GET Endpoint
- Added `GET /api/partner/websites/:websiteId/icons` to read favicon/Apple Touch Icon URLs.
- Updated Swagger docs with GET method, request/response schemas, examples.

### Previous Session — 9 March 2026

- Styles & Fonts load/save fix (wb-styles clone → move pattern).
- H2 Subheading Font & Size controls added.
- hotelbalduin.de custom domain — live (SSL, Nginx, WP domain mapping).
- About Image Slider — multi-image with dot navigation.
- USP Card Title/Description split.

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

## PRE-COMMIT CHECKLIST

Before every commit, Claude Code must ask Steve:

1. "This feature affects users — do you want me to add
   a KB article to knowledge-base/ now?"

2. "This adds a /api/partner/ endpoint — do you want me
   to add it to Swagger now?"

3. Plugin version bumped if gas-booking.php or
   gas-booking.js was changed — do this automatically
   without asking.

4. Never regenerate whole files — surgical edits only.

5. Always show plan before making changes.

---

*Last updated: March 2026*
*Maintained by Steve Driver*
