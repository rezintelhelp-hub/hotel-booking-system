# GAS Media Library — Specification

**Status**: Specification — not yet built
**Owner**: Steve Driver
**Scope**: Master + client admin (foundational, every site)
**Created**: June 2026

---

## Problem

Every section in the GAS website builders has its own upload widget
(hero image, USP image, logo, favicon, slide-1..n, about image, blog
post image, room image, gallery, footer logo, …). Each widget calls
its own upload path. Some paths insert a `gas_media_library` row, most
don't. As a result:

| Site | Images stored in section settings (on R2) | Rows in `gas_media_library` |
|---|---|---|
| Hotel Caracas | 24 | **0** |
| Cozy Crafters | 16 | 1 |
| Walnut Canyon | 14 | 23 |
| Lehmann House | 18 | 9 |
| Seaspray | 12 | 6 |
| Mornington Rose | 8 | 7 |

Consequences:
- Operators cannot browse what they've already uploaded → re-upload the
  same logo to 3 sections → 3 R2 files for 1 logo.
- Deletion never cleans R2 → orphan files accumulate forever.
- No alt-text discipline → SEO leakage on every site.
- Cross-site bleed risk: stale form values can leak image URLs from
  site A into site B (the server-side URL guard is a band-aid).
- No way to replace an image in place across all sections that
  reference it — operator has to swap by hand in every section.

## Solution

One unified ingestion path, one persisted table, one library UI panel,
one image-picker component that every upload widget reuses.

---

## Where It Sits in GAS Admin

Top-level sidebar entry between **Website Builder** and **Properties** —
**Media**. Inside, three tabs:

- **Library** — thumbnail grid, search, filters (site / property / tag / unused)
- **Uploads** — drag-drop bulk upload
- **Cleanup** — orphan finder (R2 files not referenced anywhere)

Every upload widget that today shows "Upload image" becomes "Pick or
upload" — opens an inline picker modal scoped to the current site,
defaulting to the most recently used images. Operator clicks an
existing image → URL gets stamped into the field; or uploads a new one
→ stored in library + stamped in field.

---

## Data Model

### `gas_media_library` — extends the existing table

Current columns (keep):
- `id`, `account_id`, `deployed_site_id`, `property_id`
- `file_url`, `file_name`, `file_type`, `file_size`
- `thumbnail_url`, `alt_text`, `tags` (JSONB)
- `created_at`

Add:
- `r2_key` (TEXT) — the canonical R2 object key (so we can re-derive
  signed URLs, delete from R2, and detect orphans)
- `width`, `height` (INT) — captured at upload time for browser hints
- `usage_count` (INT, default 0) — incremented by `media_references`
- `last_used_at` (TIMESTAMP)
- `replaced_by_id` (INT, FK to self) — when an image is "replaced in
  place", the old row stays for audit but points at its successor
- `deleted_at` (TIMESTAMP) — soft delete; orphan cleanup hard-deletes
  rows older than 30 days

### `media_references` (NEW)

One row per place a library image is used. Lets us answer "what
references this image?" in O(1) and refuse deletes that would
break references.

```
id              SERIAL PK
media_id        INT FK → gas_media_library(id)
deployed_site_id INT
section         TEXT     -- e.g. 'hero', 'usp', 'page-blog'
field_key       TEXT     -- e.g. 'image-url', 'usp-item-1-image-url'
created_at      TIMESTAMP
UNIQUE (media_id, deployed_site_id, section, field_key)
```

Populated by:
- The ingestion helper at upload time (the field it was uploaded for)
- The settings-save endpoint, after a successful UPDATE, scans every
  string value that matches `pub-{R2_BUCKET}.r2.dev/...` and upserts
  references. Stale references (URL removed from settings) get deleted.

### `gas_media_audit_log` (NEW, small)

Append-only log of upload / delete / replace events for forensics.
One row per action, retention 6 months.

---

## Single Ingestion API

One server-side helper used by every upload endpoint:

```js
async function gasMediaIngest({
  fileBuffer, fileName, contentType, fileSize,
  accountId, deployedSiteId, propertyId = null,
  section, fieldKey,
  altText = null, tags = []
}) {
  // 1. Sanitise filename + derive R2 key:
  //    website/{section}/{deployed_site_id}/{uuid}-{slug}.{ext}
  // 2. PUT to R2
  // 3. Generate thumbnail (cf-images on the fly, or @sharp at upload)
  // 4. INSERT into gas_media_library + media_references
  // 5. Return { id, file_url, thumbnail_url, width, height }
}
```

Every upload endpoint in `server.js` is rewritten to call this
helper. Today's endpoints (incomplete list — to be audited):
- `POST /api/media/upload` (Web Builder uploads)
- `POST /api/upload-favicon`
- `POST /api/upload-hero-image`
- `POST /api/upload-logo`
- `POST /api/upload-room-image`
- `POST /api/upload-gallery-image`
- `POST /api/upload-blog-image`
- Pro Builder image-block uploads (when shipped)

After consolidation: a single `POST /api/media` that all client UIs
hit, plus the legacy paths kept as thin wrappers for backwards
compatibility for ~30 days, then removed.

---

## Settings-Save Reference Sync

When `POST /api/deployed-sites/:id/settings/:section` succeeds:

1. Scan `mergedSettings` for any string value matching the R2 bucket URL.
2. For each, find or create the `gas_media_library` row by `file_url`.
3. Upsert into `media_references (media_id, deployed_site_id, section, field_key)`.
4. Find references that previously existed for `(deployed_site_id, section)`
   but are not in the new settings → DELETE them.
5. Increment `usage_count` / refresh `last_used_at` on referenced rows.

This means: even sections updated via partner API or direct DB writes
get their references tracked, not just UI uploads.

---

## UI — Library Panel

Layout:
- **Left rail**: filter chips (Site, Property, Tag, Section, Unused, Orphan)
- **Main grid**: 8-col thumbnails, hover shows filename + dimensions, click opens detail
- **Detail drawer**:
  - Preview at full size
  - Filename, dimensions, file size, content type, upload date
  - Alt text editor (saves immediately)
  - Tag editor (saves immediately)
  - "Used in" list (one entry per reference, click to jump to that section)
  - Actions: **Replace** (upload a new file, all references swap), **Delete**
    (refused if `usage_count > 0` unless operator confirms "force-orphan all references")

Search:
- Free-text across filename + alt + tags
- Type-ahead

Bulk actions:
- Select multiple → bulk tag, bulk delete (with reference check)

---

## UI — Image Picker (Reusable Component)

Inline modal opened by any upload widget:
- Header: current site name + "Pick from library or upload new"
- Tabs: **Recent** (last 20 from this site), **All this site**, **All my sites** (master only), **Upload**
- Click image → fires the same `onChange(url)` the original `<input type="file">` would
- "Upload" tab is a drop zone that runs through the ingestion helper

Every Web Builder upload widget today (`<input type="file" id="wb-{section}-image">`)
becomes a button that opens the picker. The hidden URL input
(`<input type="hidden" id="wb-{section}-image-url">`) is what gets
stamped. No change to the surrounding save logic.

---

## Backfill Strategy

Two-pass, dry-run first, never destructive:

**Pass 1: settings scan**
- Read every `website_settings` row across all sites.
- For each string value matching the R2 bucket URL, derive a
  candidate `gas_media_library` row + `media_references` row.
- Compare against current library — produce a diff report:
  `sites_processed`, `urls_found`, `urls_already_in_library`,
  `urls_to_insert`, `references_to_insert`.

**Pass 2: R2 scan**
- List every object in the R2 bucket under `website/`.
- For each, check if it's in `gas_media_library` (after Pass 1).
- If not, it's an orphan candidate — insert as `gas_media_library`
  with `usage_count = 0`, no references.
- Operator can review orphans and decide: keep / delete.

Backfill ships as a CLI script first (`scripts/media_backfill.js
--dry-run` / `--apply`). UI surfaces backfill status in the Cleanup tab
once it's stable.

---

## Cleanup / Orphan Detection

- Nightly cron: for every `gas_media_library` row with `usage_count = 0`
  AND `created_at < NOW() - 30 days`, mark `deleted_at`. After another
  30 days of being soft-deleted, hard-delete the row AND the R2 object.
- Cleanup tab surfaces:
  - **Orphan candidates** (in library, no references, recent uploads)
  - **R2 orphans** (in R2, no library row)
  - **Broken references** (reference points at a library row whose
    R2 object 404s — flag for manual review)

Operator always reviews before any destructive action in Phase 1.
Phase 2 enables auto-delete with safeguards.

---

## Phases

### Phase 1 — Foundation (~2 days)
- Extend `gas_media_library` schema (migration)
- Create `media_references` + `gas_media_audit_log` tables
- Write `gasMediaIngest()` helper + audit logging
- Route the most-used upload endpoints through it (Web Builder image, hero, logo, USP)
- Settings-save reference sync
- Backfill script (dry-run + apply)

### Phase 2 — UI (~3 days)
- Media tab in GAS Admin (Library, Uploads, Cleanup)
- Image-picker modal component
- Replace every Web Builder upload widget with picker button
- Alt-text + tag editors with autosave

### Phase 3 — Polish (~3 days)
- Bulk operations (tag, delete, move)
- Pro Builder upload integration (when Pro Builder image blocks ship)
- Auto-delete orphans after retention period
- WP Customizer / WP Media Library sync (one-way mirror to WP per blog
  so WordPress editors still see images they need)
- Per-site quota + usage tracking dashboard

### Phase 4 — Stretch
- AI auto-alt-text on upload (vision model)
- Smart cropping / focal-point picker
- CDN warming after upload
- Bulk image optimisation (re-compress)

---

## Non-Goals

- Not replacing WP's media library wholesale — WP attachments for blog
  post inline images stay in WP; only GAS-managed images (hero, logo,
  USP, sections, gallery, room photos, etc.) live in the library.
- Not building a full DAM — no version history beyond replace-in-place,
  no AI tagging in Phase 1, no AI search.
- Not building per-image ACLs — same access model as the site (master
  or client admin only).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Backfill mis-attributes images to wrong sites | Dry-run first, diff report reviewed by Steve before apply |
| Image-picker UX confuses operators used to "click upload" | Keep upload as the default tab in the picker; pre-existing UX preserved |
| Reference sync misses URLs not matching R2 pattern (custom CDN, WP media) | Pattern is configurable; non-R2 URLs left untracked (no harm) |
| Bulk delete breaks live sites | `usage_count > 0` guard + "force orphan" confirmation modal |
| WordPress side still uploads to its own media library (blog post images) | Phase 3 mirror; until then accept the split — GAS-managed vs WP-managed |
| Migration of existing widget code is wide (20+ call sites) | Rewrite as one-line wrapper around `gasMediaIngest`, identical signature |

---

## What This Doesn't Fix (Out of Scope)

- The hardcoded colours in blog/attractions templates (separate ticket)
- The Web Builder load-race visual flicker (separate ticket — save-side
  guard already shipped 2026-06-24, load-side block pending)
- The duplicate-key footgun in `developer-light/dark functions.php` for
  pro-settings overrides (separate audit needed)

---

## Open Questions

- Per-image deletion via R2 API — do we want hard delete on the R2 side
  or just soft-delete in our DB and let R2 lifecycle policies expire
  unreferenced objects? (R2 doesn't have lifecycle policies for prefix
  TTL today — investigate.)
- Should the library show a `gas-template-push` indicator when an image
  is part of a template that's been pushed to multiple WP sites?
- How do we handle property-scoped images (room photos) — show per
  property or per site? Probably per site with property filter.
- WP Customizer's existing per-blog media: scan-and-import on site
  deploy, or lazy-import on first edit?

---

*Maintained by Steve Driver*
