# GAS — Global Accommodation System
## Claude Code Instructions — Read this at the start of every session

---

## CRITICAL RULES — NEVER VIOLATE

- **NEVER** overwrite existing third-party webhook URLs
- **NEVER** modify live client data during debugging
- **NEVER** batch-change files without explicit approval
- **ALWAYS** check existing data before any write operation
- **ALWAYS** check `site_status` before any SCP/SSH deploy to a client site — NEVER push to a frozen site
- Surgical edits only

---

## API DOCUMENTATION — ENDPOINT UPDATES

Every time a new field is added to any endpoint in server.js, the
corresponding Swagger example payload in public/api-docs.html MUST
be updated in the same commit.

This is non-negotiable — if Elevate or any partner cannot see a field
in the Swagger example they will not know it exists.

Checklist before committing any server.js endpoint change:
1. Is the new field in the request example?
2. Is the new field in the response example?
3. Is the field described in the parameters/description?
4. If a field was removed — is it removed from the Swagger too?

Failure to update Swagger examples causes partner integration failures.

---

## ELEVATE INTEGRATION — CHANGE MANAGEMENT

Elevate (contact: Adi) must be notified BEFORE any changes to:
- Any `/api/elevate/*` endpoint
- Any `/api/partner/*` endpoint
- Any webhook payload format
- Any field name changes in the partner API

Never remove or rename existing endpoints without a deprecation notice period.
Always maintain backwards compatibility for Elevate's integration.
Add new endpoints alongside old ones, never replace.

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
- Push endpoint accepts `blog_id` as alternative to `site_url + account_id`, and `raw_block_markup` for custom sections (template ID 0)
- **WordPress plugin**: `gas-template-push` v1.1.0 — receives templates via REST API, auto-detects format
- Plugin also has `GET /gas/v1/page-content/:page_id` — returns raw `post_content` for section parsing
- **GAS Admin UI**: Templates nav section (master-only), card grid with filter bar
- **Tiers**: standard (Instant Website), pro (Instant Website Pro), bespoke (Custom Bespoke)

### Hostvana Integration
- **Status**: Hybrid approach — V2 API for `createBooking` (inquiry status), V1 API for messages
- **Plugin**: `gas-hostvana` — needs licensing extension (currently only gas-booking has licensing)
- **Testing**: End-to-end test with Pedro pending
- **Needs**: Inject property ID from booking plugin context, Beds24 master API key integration

### Hebden Bridge Migration
- **Account**: account_id 169, blog_id 75
- **Theme**: gas-theme-burger (Pro tier reference site)
- **Custom server**: 31.97.119.90 — hebdenbridgehostel.custom.gas.travel
- **Status**: Homepage content pushed via gas-template-push, header/logo/CTA styled
- **Remaining**: Complete page content migration, verify booking flow, DNS cutover

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

## CURRENT PRIORITIES — 15 March 2026

1. **Site Protection & Performance** — see section below (TOP PRIORITY)
2. **Pro Site Builder** — WYSIWYG text not saving/rendering on site (bug from today)
3. **Pro Site Builder** — Show existing page sections, reorder/delete
4. **Pro Site Builder** — Image upload for image blocks
5. **Pro Site Builder** — Header & Footer settings tab wired up
6. **Web Builder IMPORTANT fixes** (from audit):
   - CTA link in header — hardcoded /book-now/ needs to be configurable
   - FAQ sections — theme doesn't render them
   - Footer layout toggle — ignored by footer.php
   - Meta title/description SEO output
7. **Swagger update** — add missing fields from audit, fix hero search object docs
8. **Hebden Bridge** — connect Beds24 for account 169, upload logo, configure Web Builder
9. **Hostvana** — end to end test with Pedro

---

## SITE PROTECTION & PERFORMANCE

### Site Protection (when 100+ sites live)
- Add `site_status` column to `deployed_sites`: `'development'`, `'live'`, `'frozen'`
- When status = `'live'` or `'frozen'`, Claude Code must NOT SCP theme files to that site without explicit override confirmation
- GAS Admin UI: show status badge on each site, allow status changes with confirmation
- Theme deployments: check `site_status` before any SCP, skip live/frozen sites automatically
- Add to CLAUDE.md safety rules: always check `site_status` before deploying

### Performance & Caching (IMPLEMENTED)
- **API transient cache**: `developer_get_api_settings()` caches Railway API response for 5 minutes via `set_transient('gas_api_settings_{blog_id}')` — reduced TTFB from 10s to 2s
- **Cache bust on save**: `POST /api/deployed-sites/:id/settings/:section` calls `gas-api.php?action=flush_transient` after saving to clear the transient immediately
- **WP Super Cache**: Installed on multisite (not network-activated). Activated per-site for live sites only.
- **Auto-activate on status change**: When a site's `site_status` is changed to `'live'`, the status endpoint must automatically activate WP Super Cache for that site via `gas-api.php` calling `wp plugin activate wp-super-cache --url={site_host}`. When changed away from `'live'`, deactivate it.
- Per-site cache control: `development` = cache OFF, `live` = cache ON, `frozen` = cache ON

---

## PRO SITE BUILDER ROADMAP

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Page manager — list pages, open editor | Done |
| Phase 2 | Page builder — Add Section (Quick Add templates + Custom Build), push to WordPress | Done |
| Phase 3 | Style controls — font, size, colour, spacing, background per block | Next |
| Phase 4 | Header & Footer Builder — visual editor for burger theme header/footer | Planned |
| Phase 5 | Save & Publish — preview, draft/publish toggle, revision history | Planned |

- **subscription_tier** column on `accounts` table gates access (`pro`, `bespoke`)
- **Build Site** button only shows for pro/bespoke tier in deployed sites
- Uses `gas-template-push` plugin to push block markup to WordPress pages
- Three-tier architecture: Content Areas (Hero/Content) → Layouts (Full/50-50/60-40/40-60/33-33-33) → Theme Blocks (Heading/Text/Image/Button/Search/Rooms/Spacer/Slider)
- Both Quick Add (premade templates) and Custom Build (layout → blocks) approaches
- GAS WYSIWYG component (`gasWysiwyg()`) used for text/heading blocks — NOT yet in Web Builder

---

## PRODUCT TIERS

- **Instant Website (standard)** — GAS hosted, standard theme (developer-dark/light), Web Builder, basic template access
- **Instant Website Pro (pro)** — everything in standard + Pro Site Builder, full Template Library, burger/editorial themes, WYSIWYG block editing
- **Plugin Only** — booking plugin for client's own WordPress site, $19.99/mo
- **Custom Bespoke (bespoke)** — fully custom built site, $2,500 setup + $99/mo. Example: Hebden Bridge Hostel

---

## WEB BUILDER (Standard Tier)

- Input IDs: `wb-{section}-{field}` pattern
- `saveWebsiteSection(section)` auto-collects all matching inputs
- `loadWebsiteBuilderSection(section)` auto-restores them
- Image uploads: `previewWebsiteImage(section)` expects `wb-{section}-image`, `wb-{section}-image-preview`, `wb-{section}-image-url`
- All text fields are plain text currently — WYSIWYG planned but NOT yet applied
- Do NOT add `gasWysiwyg()` to Web Builder until proven working in Pro Site Builder

---

## SERVER INFRASTRUCTURE

- **GAS Railway (Node.js + PostgreSQL)** — admin.gas.travel
- **GAS WordPress Multisite VPS** — 72.61.207.109, /var/www/wordpress (NOT /var/www/html/)
- **app3 Linode (READ ONLY)** — 139.162.234.112, Rezintel/old clients, reference only for migration, DO NOT modify
- **Old Linode (READ ONLY)** — 178.79.158.188, ~10 old clients, needs password reset to access
- **Hebden Bridge custom site** — 31.97.119.90, /var/www/hebdenbridgehostel.custom.gas.travel

---

## SESSION LOG — 14 March 2026

### Pro Site Builder Phase 1 & 2
- Added `subscription_tier` column to accounts table, set account 169 to 'pro'
- Build Site button (pro/bespoke only) in deployed sites
- Pro Builder view with Pages/Settings/Header & Footer tabs
- Page editor with section stack, Add Section (Quick Add + Custom Build)
- Three-tier page builder: Areas → Layouts → Blocks with markup generation
- `blockToMarkup()` generates WordPress block markup from block data
- `buildAndPushSection()` syncs WYSIWYG then pushes via API

### GAS WYSIWYG Component
- Reusable `gasWysiwyg()` function with contenteditable + floating toolbar
- Bold, Italic, Underline, Link, Align Left/Centre/Right, colour picker
- Wired into Pro Site Builder heading/text blocks ONLY (NOT Web Builder yet)

### Single Room Sync Regression Fix
- `syncRoomPricing()` was syncing ALL rooms instead of just the clicked room
- Fixed: frontend passes `roomId`, backend filters rooms query with `AND bu.id = $2`
- Guard comment added to prevent future regression

### Section Parser Fix
- Added `GET /gas/v1/page-content/:page_id` to gas-template-push plugin (raw post_content)
- Server.js uses plugin endpoint with depth-tracking block comment parser
- Still has issues — sections not fully visible in backend (needs debugging)

### gas-theme-burger Styling (VPS)
- Header: flex-start layout (burger → logo → Book Now grouped left), 100px padding
- Logo: downloaded from custom server, imported to WP media library, set as custom_logo theme mod
- Burger lines: orange #F97224, removed header border, reduced to 20px width
- Logo height increased to 70px, vertical alignment fix applied
- All orange references updated to #F97224

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

## WEB BUILDER AUDIT — 14 March 2026

Full field-by-field audit of every Web Builder section across UI → API → DB → Swagger → Theme.

### CRITICAL (settings saved but never render)

| # | Bug | Root Cause | Files |
|---|-----|-----------|-------|
| 1 | **Hero badge link** | UI saves `button-link`, theme reads `badge-link` | functions.php:2615 |
| 2 | **Hero overlay opacity** | UI saves `overlay`, theme reads `opacity` | functions.php:2609 |
| 3 | **Custom CSS** | Theme reads `get_theme_mod()` only, ignores API value | functions.php:2879 |
| 4 | **Contact opening hours** | Full UI + DB + Swagger, but functions.php doesn't map them and template-contact.php doesn't render | functions.php, template-contact.php |
| 5 | **About images 2/3/4** | UI saves `image-2-url` etc, front-page.php reads `$api['about_image_2']`, but functions.php never maps them | functions.php:2649 |
| 6 | **Hero height** | CSS output reads `get_theme_mod()` not `$api` | functions.php:2948 |
| 7 | **Hero trust text colour** | front-page.php reads `get_theme_mod()` not `$api` | front-page.php:63 |
| 8 | **Header underline colour** | CSS reads `get_theme_mod()` not `$api` | functions.php:3120 |
| 9 | **Section BG colours (4)** | `featured-bg`, `about-bg`, `testimonials-bg`, `cta-bg` all read `get_theme_mod()` | functions.php:2928-2931 |
| 10 | **Footer BG/text** | CSS reads `get_theme_mod()` not `$api` | functions.php:2934-2935 |
| 11 | **Contact show-email/phone/address** | Toggles in UI + API but template always shows if values non-empty | template-contact.php |

### IMPORTANT (missing UI or incomplete features)

| # | Gap | Details |
|---|-----|---------|
| 1 | **CTA link in header** | Hardcoded `/book-now/` — no `wb-header-cta-link` input exists |
| 2 | **FAQ sections** | `faq-enabled` + FAQ list in Contact, About, Blog, Attractions, Rooms — theme doesn't render any |
| 3 | **Footer layout toggle** | Dropdown (standard/minimal/centered) saved but footer.php ignores it |
| 4 | **Meta title/description** | Contact + About page save these but no SEO rendering in theme |
| 5 | **Rooms filter toggles** | Theme reads `show-filters`, `show-property-filter`, `show-date-filters`, `show-guest-filter` — no UI |
| 6 | **Blog/Attractions menu-order** | Theme reads `page_blog_menu_order` / `page_attractions_menu_order` — no UI input |
| 7 | **Offers page content disconnect** | UI saves title/subtitle/content but `[gas_offers]` shortcode uses separate WP options |
| 8 | **Privacy ext-heading/ext-text** | In UI, saved to DB, but never consumed by theme |
| 9 | **Terms/Privacy section enables** | 7 terms + 8 privacy sub-section enabled/title fields — in DB but no UI toggles |
| 10 | **Powered-by toggle** | Hardcoded "Powered by GAS" in footer.php — no way to hide |

### NICE TO HAVE (gaps and inconsistencies)

| # | Issue | Details |
|---|-------|---------|
| 1 | **Rooms missing DE tab** | Blog + Attractions have 5 lang tabs, Rooms only 4 (no German) |
| 2 | **Contact duplicated checkboxes** | `show-map`, `show-directions`, `show-form` appear twice in UI |
| 3 | **Terms/Privacy title key** | Uses bare `title` not `title-en` like other sections |
| 4 | **SECTION_DEFAULTS gaps** | Footer: heading-quicklinks, heading-legal, company/tax numbers. Styles: subheading-font, subheading-size, section-spacing. Header: border-style-color/type, favicon, apple-icon. Hero: show-badge, title-color, subtitle-color. Contact: 18+ fields missing defaults. |
| 5 | **Swagger gaps** | Header: 12 undocumented fields. Hero: 20+ undocumented fields. Footer: no example payload. Blog/Attractions: no dedicated endpoints. |
| 6 | **Rooms enabled hardcoded** | Theme hardcodes `page_rooms_enabled => true` — UI checkbox misleading |
| 7 | **Footer dual data path** | footer.php reads colours from old `branding.footer` path, other fields from `$api_settings` |
| 8 | **About page content-image-2** | In UI + functions.php but template-about.php doesn't render it |
| 9 | **btn-secondary-bg/text** | Theme reads these from styles but no UI or defaults exist |
| 10 | **search-max-guests** | In UI + API + Swagger but theme never consumes it |

---

## ELEVATE API ALIAS

- `/api/elevate/*` is aliased to `/api/partner/*` via middleware at line 22177 of server.js
- **Do NOT remove this alias** — Elevate's integration depends on it
- The PDF documentation (`docs/Elevate-Partner-API-v7_8.pdf`) is correct — `/api/elevate/` paths work via this alias
- The `/webhooks/elevate/` routes (lines 57572-57877) are a separate, older set of endpoints — not used by the current integration

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

## NEW PRODUCTS

### GAS Unified Inbox

- **Spec**: `docs/GAS-Unified-Inbox-Spec.md`
- **Status**: Specification complete, not yet built
- **Scope**: Master Admin only — NOT visible to clients until productised
- **What**: Unified messaging inbox consolidating email, WhatsApp, Facebook, LinkedIn, Slack, and document collaboration into one GAS Admin interface
- **Monetisation**: £19/month per account as paid add-on (replaces Front at $25-65/user/month)
- **Sidebar position**: Top level, between Dashboard and Properties, with unread badge
- **Key tables**: `inbox_messages`, `inbox_channels`
- **Key endpoints**: `/api/inbox/*`, `/api/webhooks/whatsapp`, `/api/webhooks/facebook`, `/api/webhooks/gmail`
- **AI features**: Auto-draft replies, sentiment detection, auto-categorisation
- **Mobile**: PWA first (manifest.json + service worker), native app Phase 2
- **Build order**: DB schema → Gmail → UI → PWA → WhatsApp → Facebook → AI → Phase 2 channels → Phase 3 docs
- **IMPORTANT**: This is a standalone product — usable by ANY property owner, even without GAS properties registered

---

*Last updated: March 2026*
*Maintained by Steve Driver*
