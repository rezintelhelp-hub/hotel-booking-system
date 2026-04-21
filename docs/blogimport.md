# Blog Migration Runbook

## 1. Overview

`scripts/migrate-blog.js` migrates blog content from the old Rezintel SetSeed server (`139.162.234.112`) into the GAS `blog_posts` table on Railway PostgreSQL.

**Source**: MySQL databases on the old server, one per client site (`setseed_{invisible_key}`).
**Destination**: Railway PostgreSQL `blog_posts` and `blog_categories` tables.

### Migration Status

| Status | Site | Posts |
|--------|------|------:|
| **Done** | www.thecotswoldretreats.com | 156 |
| Remaining | 25 sites | 1,199 total |

See [Section 6](#6-per-site-parameters) for the full list of remaining sites.

---

## 2. Prerequisites

- **SSH key**: `~/.ssh/id_ed25519` with root access to `139.162.234.112`
- **Local `.env`**: Must contain `DATABASE_URL` (Railway Postgres connection string)
- **R2 credentials**: Required for image uploads (see [Section 3](#3-r2-credentials))
- **Node.js dependencies**: `mysql2`, `ssh2`, `pg`, `sharp`, `uuid`, `dotenv`, `@aws-sdk/client-s3` — all in `package.json`

---

## 3. R2 Credentials

Image uploads go to Cloudflare R2 (same bucket as all GAS property/blog images). The credentials live in **Railway environment variables** and must be copied into local `.env` temporarily before each migration run.

Add these to `.env` before running:

```
R2_ACCOUNT_ID=<from Railway>
R2_ACCESS_KEY_ID=<from Railway>
R2_SECRET_ACCESS_KEY=<from Railway>
R2_ENDPOINT=<from Railway>
R2_PUBLIC_URL=<from Railway>
R2_BUCKET_NAME=<from Railway>
```

**Remove all six values from `.env` after each run.** Do not commit them.

Verify removal:

```bash
grep '38e8a9b\|ad47ef\|539f44' .env  # should return nothing
```

If R2 credentials are missing, the script still imports posts but skips image uploads (featured images will be null).

---

## 4. How It Works

### Connection

1. Opens SSH tunnel to `139.162.234.112` via `ssh2`
2. Creates MySQL connection through the tunnel to `setseed_{invisible_key}`
3. Opens a persistent SFTP session for image downloads (single session, reused for all images)
4. Connects to Railway PostgreSQL via `DATABASE_URL`

### Blog Post Discovery

Two sources, checked in order:

**Strategy A — page_tags + static_pages** (primary):

```sql
-- Find the blog tag dynamically (NEVER hardcode the ID — it varies per site)
SELECT page_tagsid FROM page_tags
WHERE name IN ('Blog Articles', 'Blog', 'Articles', 'News')
ORDER BY CASE name WHEN 'Blog Articles' THEN 1 WHEN 'Blog' THEN 2
  WHEN 'Articles' THEN 3 ELSE 4 END
LIMIT 1;

-- Fetch tagged pages
SELECT sp.* FROM static_pages sp
JOIN page_has_tags pht ON pht.static_pages_id = sp.static_pagesid
WHERE pht.page_tags_id = ? AND sp.live = 'yes'
  AND (sp.deleted IS NULL OR sp.deleted = 0 OR sp.deleted = '');
```

**Strategy B — blog_entries table** (fallback, some sites use this instead):

```sql
SELECT * FROM blog_entries
WHERE live = 'yes' AND (deleted IS NULL OR deleted != 'yes');
```

Both sources are unified into the same output format.

### Content Cleanup

The `cleanContent()` function strips:

- `<div class="SETSEEDcomponent ...">` widget wrappers (4-deep nested divs)
- `<div class="bpe_split_divider ...">` section dividers
- `<a class="componentDelete">` editor buttons
- `data-element-id="..."` attributes (editor tracking)
- `class="Button_Medium"` and `class="Sidebar_Content"` SetSeed CSS classes
- `?width=&height=&shrink=` image URL resize params
- Empty `<div></div>` left behind after stripping

Remaining `style="text-align:left"` attributes are harmless (default alignment).

### Image Handling

1. Widget images resolved via: `widgets` table → `widgets_data` (var='image', value=page_images_id) → `page_images.filename`
2. Featured image priority: `pic_url` column on static_pages, then first widget image
3. Downloaded via SFTP from `/var/www/html/sites/{invisible_key}/images/{filename}`
4. Uploaded to R2 as `website/blog-image/{account_id}/{size}/{uuid}-{filename}.webp` (large, medium, thumbnail + JPG original)
5. R2 URL stored in `blog_posts.featured_image_url`

### Category Detection

1. Checks for secondary tags on the post (any tag other than the blog tag)
2. If no secondary tag, keyword-based detection from title:
   - Events & Festivals, Food & Drink, Walks & Nature, Things to Do, Accommodation, Guides & Inspiration
3. Falls back to "General"
4. Creates `blog_categories` row if missing (ON CONFLICT DO NOTHING)

### Idempotency

- Unique constraint: `(client_id, slug)` on `blog_posts`
- Uses `INSERT ... ON CONFLICT (client_id, slug) DO UPDATE SET ...`
- Re-running the script updates content, excerpt, featured_image_url, published_at
- Duplicate slugs within source data get `-2`, `-3` suffixes with a logged warning

### Excerpt

- 150 characters at word boundary + "..." suffix
- Uses `summary` field if available (blog_entries), otherwise strips HTML from content

---

## 5. Run Commands

### Dry-run (discovery, no writes)

```bash
node scripts/migrate-blog.js \
  --site {invisible_key} \
  --account-id {gas_account_id} \
  --dry-run
```

Shows what would be imported: post titles, slugs, categories, image filenames. Prints 3 sample JSON payloads.

### One-post live test

```bash
node scripts/migrate-blog.js \
  --site {invisible_key} \
  --account-id {gas_account_id} \
  --limit 1 \
  --live
```

Inserts one post + uploads its image. Verify in GAS Admin before proceeding.

### Full migration

```bash
node scripts/migrate-blog.js \
  --site {invisible_key} \
  --account-id {gas_account_id} \
  --live \
  --log migrate-{site}-$(date +%Y%m%d).log
```

### All CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--site` | required | Rezintel `invisible_key` |
| `--account-id` | required | GAS `client_id` / account ID |
| `--live` | off | Actually write to DB + R2. Without this, dry-run. |
| `--limit N` | all | Only process first N posts (for testing) |
| `--log FILE` | none | Write log to file |
| `--sample N` | 3 | Number of sample payloads in dry-run output |

---

## 6. Per-Site Parameters

### Completed

| Site | invisible_key | account_id | Posts | Date |
|------|--------------|-----------|------:|------|
| www.thecotswoldretreats.com | `wwwthecotswoldretreatscomyp5kz72d4ow` | 95 | 156 | 2026-04-20 |

### Remaining (25 sites with blog content)

| Site | invisible_key | account_id | Posts |
|------|--------------|-----------|------:|
| www.lehmannhouse.com | `wwwlehmannhousecom5x5gp57chag` | 4 | 271 |
| www.holidayhomesinyork.co.uk | `wwwholidayhomesinyorkcoukrzhxt5ndm48` | — | 193 |
| www.clevelandbandbtorquay.co.uk | `wwwclevelandbandbtorquaycoukdi8qedug3ae` | 102 | 113 |
| www.thebelmonthotel.co.uk | `wwwthebelmonthotelcoukovo4jwggtas` | 68 | 88 |
| www.adelphi-blackpool.com | `wwwadelphiblackpoolcompzbdykpoxro` | 68 | 79 |
| www.resortbreaks.com | `wwwresortbreakscomge6xfxpxsi0` | — | 76 |
| www.bookliverpool.com | `wwwbookliverpoolcomcxbaf0x5ix4` | — | 69 |
| www.walnutcanyoncabins.com | `wwwwalnutcanyoncabinscoms0vrf6knsk8` | — | 52 |
| www.bellavidabandb.com | `wwwbellavidabandbcomysqmcvh4wmn` | — | 35 |
| www.carboncountrysshadyrest.com | `wwwcarboncountrysshadyrestcomimportss9lvws` | 159 | 33 |
| www.bellavidahaus.com | `wwwbellavidahauscomjz0fd5ocoz5` | — | 31 |
| www.morningtonrose.com | `wwwmorningtonrosecom7cdavqna0ah` | 173 | 26 |
| www.moonriverbedandbreakfast.com | `wwwmoonriverbedandbreakfastcomsqx6twx73ei` | 201 | 21 |
| www.burleigh-house.co.uk | `wwwburleighhousecouk485fjgw0smk` | — | 14 |
| www.hebdenbridgehostel.org | `wwwhebdenbridgehostelorgotwvuppzmoc` | 169 | 13 |
| www.alakaibb.com | `wwwalakaibbcomgy0acq3x3ek` | — | 12 |
| www.rent4natu.fr | `wwwrent4natufryufb774vz44` | 141 | 8 |
| www.easystays.mt | `bookingseasylandlordcom5x7vx24m3f7` | 230 | 7 |
| www.lemacassar.com | `wwwlemacassarnewcr2eu3yn20p` | 79 | 6 |
| www.homega-rentals.com | `wwwhomegarentalscomk8wcy0fzj2b` | 224 | 6 |
| www.dpourpry.com | `wwwdpourprycome6argv6acje` | — | 4 |
| www.arancottages.uk | `wwwarancottagesukaaezd2u6b5k` | — | 4 |
| www.casamagnoliabandb.com | `wwwcasamagnoliabandbcom3m4iwaw3eng` | 165 | 3 |
| www.talwoodmanorbb.com | `wwwtalwoodmanorbbcom7cvsix678gs` | 162 | 2 |
| www.cartercobookings.co.uk | `wwwcartercobookingscoukq4dbbiq6by0` | 167 | 2 |

**Note**: Sites with `—` for account_id haven't been matched to GAS accounts yet. Look up by domain in `deployed_sites` or `accounts` table before running.

---

## 7. Post-Migration Checks

1. **GAS Admin**: Navigate to the account → Blog → Published. All imported posts should appear with titles, categories, and featured images.

2. **Public site**: Visit `https://{site_url}/blog/` and verify:
   - Posts render in the grid with featured images
   - View More button loads additional posts
   - Search filters posts by title/excerpt
   - Category tabs filter correctly
   - Click through to a single post — content renders cleanly

3. **Spot-check**: Open 3-4 individual posts and verify:
   - Featured image loads (R2 URL, not old server)
   - Content has no SetSeed widget markup remnants
   - No broken image references
   - Published date is reasonable

---

## 8. Known Issues / Gotchas

### Public blog feed JOIN fix (shipped)

The public blog API originally used `JOIN properties` which filtered out posts without a `property_id`. Fix shipped in commit `a118b43`: changed to `LEFT JOIN properties` with `WHERE bp.client_id = $1`.

### gas_property_id guard (fixed)

The `gas-blog` plugin's `fetch_posts()` returned empty array if `gas_property_id` WordPress option wasn't set. Fixed in v2.10.1 — now passes `property_id` as optional filter only.

### Content artifacts

- `style="text-align:left"` remains on `<p>` tags — harmless, default browser alignment
- Widget images are stripped from content body (they become the featured image). If a post had multiple widget images, only the first becomes featured; the rest are lost from the content. This matches how GAS blog posts work (single featured image, no inline images).

### Image URL cleanup

SetSeed appends `?width=123&height=456&shrink=only` to image URLs. The cleanup regex strips these. If new variants appear, update the regex in `cleanContent()`.

### Duplicate slugs

If two source posts have the same `url_str`, the second gets a `-2` suffix. Check the log for warnings: `Duplicate slug "xxx" → renaming to "xxx-2"`.

### blog_entries vs static_pages

Most sites store blog content in `static_pages` tagged with "Blog Articles". A few (Cleveland B&B, Lehmann House, Carbon Country) also have rows in `blog_entries`. The script imports from both — check the log for "Found N posts via page_tags" and "Found N posts via blog_entries".

---

## 9. Rollback

### Delete a client's imported posts

```sql
DELETE FROM blog_posts
WHERE client_id = {account_id}
  AND created_at > '{migration_start_timestamp}';
```

Use the timestamp from the migration log's first line.

### Delete associated categories

```sql
DELETE FROM blog_categories
WHERE client_id = {account_id}
  AND created_at > '{migration_start_timestamp}';
```

### Re-run

Just execute the script again. The `ON CONFLICT (client_id, slug) DO UPDATE` handles idempotency — existing posts are updated, not duplicated.

### Images

R2 images are not automatically cleaned up on rollback. They're harmless orphans (small storage cost). If needed, they live under `website/blog-image/{account_id}/` in the `gas-property-images` bucket.

---

# Attractions Migration Runbook

## 10. Overview

`scripts/migrate-attractions.js` migrates attraction pages from the old Rezintel SetSeed server into the GAS `attractions` table on Railway PostgreSQL.

Same prerequisites as blog migration (Section 2-3 above): SSH key, DATABASE_URL, R2 credentials.

### Migration Status

| Status | Site | Attractions |
|--------|------|------------|
| **Done** | www.thecotswoldretreats.com | 48 |

## 11. How It Works

### Key difference from blog migration

SetSeed stores attraction data in **two places**:
1. `static_pages.content` — often sparse (just widget images + dividers)
2. **`page_meta` table** — structured fields: `summary`, `attraction_type`, `street_address`, `latitude`, `longditude` (sic), `phone`, `opening_time`, `closing_time`, `adult_price`, `ss_page_title`, `ss_page_desc`, etc.

The script reads from `page_meta` as the primary data source. The `content` column is cleaned but usually empty after stripping SetSeed markup.

### Discovery

Finds attractions by tag name (dynamic, not hardcoded ID):

```sql
SELECT page_tagsid FROM page_tags
WHERE name IN ('Attractions', 'Things to Do', 'Places to Visit', 'Local Attractions')
LIMIT 1;
```

### Field Mapping

| GAS `attractions` column | Source | Notes |
|---|---|---|
| `name` | `page_meta.attraction_name` or `pagetitle` | |
| `slug` | `url_str` | |
| `description` | `page_meta.summary` | Primary content source |
| `short_description` | First 150 chars of summary | |
| `featured_image_url` | Widget image → R2 upload | `website/attraction-image/{account_id}/` |
| `category` | `page_meta.attraction_type` | e.g. "Historic House", "Theatre", "Golf Club" |
| `address` | `page_meta.street_address` or `directions` | |
| `city` | `page_meta.city` | Sparse — most empty |
| `latitude` | `page_meta.latitude` | 48/48 populated for Cotswolds |
| `longitude` | `page_meta.longditude` (sic) | Note the typo in source field |
| `phone` | `page_meta.phone` | 38/48 populated |
| `opening_hours` | `opening_time` + `closing_time` | Formatted as "Open: X | Close: Y" |
| `price_range` | `page_meta.adult_price` | Truncated to 50 chars |
| `meta_title` | `page_meta.ss_page_title` | 44/48 populated |
| `meta_description` | `page_meta.ss_page_desc` | 44/48 populated |
| `website_url` | Extracted from first `<a href="https://...">` in content | |

### Idempotency

Same as blog: unique constraint `(client_id, slug)`, upsert via `ON CONFLICT DO UPDATE`.

## 12. Run Commands

```bash
# Dry-run
node scripts/migrate-attractions.js --site {invisible_key} --account-id {gas_account_id} --dry-run

# One-post test
node scripts/migrate-attractions.js --site {invisible_key} --account-id {gas_account_id} --limit 1 --live

# Full migration
node scripts/migrate-attractions.js --site {invisible_key} --account-id {gas_account_id} --live --log migrate-attractions-{site}.log
```

Same CLI flags as blog migration: `--site`, `--account-id`, `--live`, `--limit`, `--log`, `--sample`.

## 13. Public Site Display

Both blog and attractions required these fixes to display on the public site:

### API endpoint fixes (server.js)

| Endpoint | Fix |
|----------|-----|
| `GET /api/public/client/:id/blog` | `JOIN` → `LEFT JOIN properties`, `WHERE bp.client_id = $1` |
| `GET /api/public/client/:id/blog/:slug` | Same LEFT JOIN fix |
| `GET /api/public/client/:id/attractions` | Same LEFT JOIN fix + search + total/has_more |
| `GET /api/public/client/:id/attractions/:slug` | Same LEFT JOIN fix |

Without LEFT JOIN, any post/attraction without a `property_id` (i.e. site-wide content, which is all migrated content) is invisible.

### Plugin fixes (SCP to VPS)

| Plugin | Fix | Version |
|--------|-----|---------|
| `gas-blog` | Removed `gas_property_id` empty guard, added search + View More + AJAX pagination | 2.10.1 |
| `gas-attractions` | Same: removed property_id guard, added search + View More + AJAX pagination | 2.8.0 |

Both plugins had a guard in `fetch_*()` that returned empty array when `gas_property_id` option wasn't set. Removed — the API already filters by `client_id`.

### View More + Search pattern

Both blog and attractions listing pages now have:
- Search input (debounced 350ms, resets grid with filtered results)
- Category tabs (server-side, full page reload on click)
- Initial load: 9 items
- "View More" button: AJAX fetches next 9, appends to grid, hides when exhausted
- Spinner animation while loading

### Deploy checklist for new sites

After migrating content for a new client:

1. Push server.js changes (Railway auto-deploys)
2. SCP plugin files to VPS:
   ```bash
   scp -i ~/.ssh/id_ed25519 plugins/gas-blog/gas-blog.php root@72.61.207.109:/var/www/wordpress/wp-content/plugins/gas-blog/
   scp -i ~/.ssh/id_ed25519 plugins/gas-attractions/gas-attractions.php root@72.61.207.109:/var/www/wordpress/wp-content/plugins/gas-attractions/
   ```
3. Hard refresh the public site `/blog/` and `/attractions/` pages
4. Verify posts/attractions appear with images, categories, and View More works

## 14. Rollback (Attractions)

```sql
DELETE FROM attractions
WHERE client_id = {account_id}
  AND created_at > '{migration_start_timestamp}';
```

R2 images live under `website/attraction-image/{account_id}/` in the `gas-property-images` bucket.

---

## 15. Per-Client Migration Plan

Sorted by total content descending. Run one at a time. Add R2 creds to `.env` before each session, remove after.

Both scripts support `--tag-name <name>` to override tag detection for sites with non-standard tag names.

### Tier 1 — Large clients (50+ items)

```bash
# Lehmann House (lehmannhouse.com) — 247 blog, 46 attractions
node scripts/migrate-blog.js --site wwwlehmannhousecom5x5gp57chag --account-id 4 --live
node scripts/migrate-attractions.js --site wwwlehmannhousecom5x5gp57chag --account-id 4 --live

# Holiday Homes in York (holidayhomesinyork.co.uk) — 193 blog, 52 attractions
# ⚠️  No deployed site in GAS yet — needs site creation first, then account_id lookup
# node scripts/migrate-blog.js --site wwwholidayhomesinyorkcoukrzhxt5ndm48 --account-id ??? --live
# node scripts/migrate-attractions.js --site wwwholidayhomesinyorkcoukrzhxt5ndm48 --account-id ??? --live

# Cleveland B&B (clevelandbandbtorquay.co.uk) — 56 blog + 12 news, 16 "Things to do" + 21 attractions
# ⚠️  Has "News" tag (12 extra posts) and "Things to do" tag (16 extra attractions)
# Run twice for blog: once default, once with --tag-name "News"
# Run twice for attractions: auto-detect finds "Things to do", then --tag-name "Attractions"
node scripts/migrate-blog.js --site wwwclevelandbandbtorquaycoukdi8qedug3ae --account-id 102 --live
node scripts/migrate-blog.js --site wwwclevelandbandbtorquaycoukdi8qedug3ae --account-id 102 --live --tag-name "News"
node scripts/migrate-attractions.js --site wwwclevelandbandbtorquaycoukdi8qedug3ae --account-id 102 --live
node scripts/migrate-attractions.js --site wwwclevelandbandbtorquaycoukdi8qedug3ae --account-id 102 --live --tag-name "Attractions"

# Belmont Hotel (thebelmonthotel.co.uk) — 88 blog, 11 attractions
# Note: same account as Adelphi (account 68)
node scripts/migrate-blog.js --site wwwthebelmonthotelcoukovo4jwggtas --account-id 68 --live
node scripts/migrate-attractions.js --site wwwthebelmonthotelcoukovo4jwggtas --account-id 68 --live

# Adelphi Blackpool (adelphi-blackpool.com) — 79 blog, 15 attractions
# Note: same account 68 as Belmont — slugs must not clash
node scripts/migrate-blog.js --site wwwadelphiblackpoolcompzbdykpoxro --account-id 68 --live
node scripts/migrate-attractions.js --site wwwadelphiblackpoolcompzbdykpoxro --account-id 68 --live

# Moonriver B&B (moonriverbedandbreakfast.com) — 21 blog + 19 "General Blogs", 24 attractions
node scripts/migrate-blog.js --site wwwmoonriverbedandbreakfastcomsqx6twx73ei --account-id 201 --live
node scripts/migrate-blog.js --site wwwmoonriverbedandbreakfastcomsqx6twx73ei --account-id 201 --live --tag-name "General Blogs"
node scripts/migrate-attractions.js --site wwwmoonriverbedandbreakfastcomsqx6twx73ei --account-id 201 --live

# Walnut Canyon Cabins — 52 blog, 15 attractions
# ⚠️  No deployed site — needs site creation first
# node scripts/migrate-blog.js --site wwwwalnutcanyoncabinscoms0vrf6knsk8 --account-id ??? --live
# node scripts/migrate-attractions.js --site wwwwalnutcanyoncabinscoms0vrf6knsk8 --account-id ??? --live
```

### Tier 2 — Medium clients (10-49 items)

```bash
# Carbon Country (carboncountrysshadyrest.com) — 24 blog, 17 attractions
node scripts/migrate-blog.js --site wwwcarboncountrysshadyrestcomimportss9lvws --account-id 159 --live
node scripts/migrate-attractions.js --site wwwcarboncountrysshadyrestcomimportss9lvws --account-id 159 --live

# Mornington Rose (morningtonrose.com) — 26 blog, 9 attractions
# ⚠️  Attractions tag is "Local Attractions" (auto-detected)
node scripts/migrate-blog.js --site wwwmorningtonrosecom7cdavqna0ah --account-id 173 --live
node scripts/migrate-attractions.js --site wwwmorningtonrosecom7cdavqna0ah --account-id 173 --live

# Casa Magnolia (casamagnoliabandb.com) — 3 blog, 17 attractions
node scripts/migrate-blog.js --site wwwcasamagnoliabandbcom3m4iwaw3eng --account-id 165 --live
node scripts/migrate-attractions.js --site wwwcasamagnoliabandbcom3m4iwaw3eng --account-id 165 --live

# Homega Rentals (homega-rentals.com) — 6 blog, 10 attractions
node scripts/migrate-blog.js --site wwwhomegarentalscomk8wcy0fzj2b --account-id 224 --live
node scripts/migrate-attractions.js --site wwwhomegarentalscomk8wcy0fzj2b --account-id 224 --live

# Hebden Bridge Hostel (hebdenbridgehostel.org) — 13 blog, 0 attractions
node scripts/migrate-blog.js --site wwwhebdenbridgehostelorgotwvuppzmoc --account-id 169 --live

# Le Macassar (lemacassar.com) — 6 blog, 7 attractions
node scripts/migrate-blog.js --site wwwlemacassarnewcr2eu3yn20p --account-id 79 --live
node scripts/migrate-attractions.js --site wwwlemacassarnewcr2eu3yn20p --account-id 79 --live

# EasyStays (easystays.mt) — 7 blog, 4 attractions
node scripts/migrate-blog.js --site bookingseasylandlordcom5x7vx24m3f7 --account-id 230 --live
node scripts/migrate-attractions.js --site bookingseasylandlordcom5x7vx24m3f7 --account-id 230 --live
```

### Tier 3 — Small clients (5-9 items)

```bash
# St Ives Hotel — 0 blog, 9 attractions
node scripts/migrate-attractions.js --site wwwstiveshotelcoukvz54yc26kjw --account-id 158 --live

# Tregarth House — 1 blog, 8 attractions
node scripts/migrate-blog.js --site wwwtregarthhousebandbcoukrqd3taamm4k --account-id 172 --live
node scripts/migrate-attractions.js --site wwwtregarthhousebandbcoukrqd3taamm4k --account-id 172 --live

# Rent4Natu — 8 blog, 0 attractions
node scripts/migrate-blog.js --site wwwrent4natufryufb774vz44 --account-id 141 --live

# Varley House — 1 blog, 6 attractions
node scripts/migrate-blog.js --site wwwvarleyhousecoukyro42p04bku --account-id 100 --live
node scripts/migrate-attractions.js --site wwwvarleyhousecoukyro42p04bku --account-id 100 --live

# Dwellfort — 1 blog, 4 attractions
node scripts/migrate-blog.js --site wanderlust2ar8ru --account-id 211 --live
node scripts/migrate-attractions.js --site wanderlust2ar8ru --account-id 211 --live

# Book-Jet — 1 blog, 4 attractions
node scripts/migrate-blog.js --site bookjetcoms7fjhgwodwu --account-id 152 --live
node scripts/migrate-attractions.js --site bookjetcoms7fjhgwodwu --account-id 152 --live

# John Rast House — 1 blog, 4 attractions
node scripts/migrate-blog.js --site wwwjohnrasthousecomvp6onu5k377 --account-id 164 --live
node scripts/migrate-attractions.js --site wwwjohnrasthousecomvp6onu5k377 --account-id 164 --live

# Rooms at 73 — 1 blog, 4 attractions
node scripts/migrate-blog.js --site wwwrooms73businesssitenxhghu4jrvh --account-id 168 --live
node scripts/migrate-attractions.js --site wwwrooms73businesssitenxhghu4jrvh --account-id 168 --live

# Oasis Corralejo — 1 blog, 4 attractions
node scripts/migrate-blog.js --site wwwoasiscorralejocom5qyb4cnkro4 --account-id 152 --live
node scripts/migrate-attractions.js --site wwwoasiscorralejocom5qyb4cnkro4 --account-id 152 --live

# Talwood Manor — 2 blog, 3 attractions
node scripts/migrate-blog.js --site wwwtalwoodmanorbbcom7cvsix678gs --account-id 162 --live
node scripts/migrate-attractions.js --site wwwtalwoodmanorbbcom7cvsix678gs --account-id 162 --live
```

### Tier 4 — Minimal content (1-2 items, likely template defaults)

```bash
# Mimo Stays — 1 blog, 1 attraction
node scripts/migrate-blog.js --site wwwmimostayscomvwzh0em4xxq --account-id 160 --live
node scripts/migrate-attractions.js --site wwwmimostayscomvwzh0em4xxq --account-id 160 --live

# Carter & Co — 1 blog, 0 attractions
node scripts/migrate-blog.js --site wwwcartercobookingscoukq4dbbiq6by0 --account-id 167 --live

# Chester House — 1 blog, 0 attractions
node scripts/migrate-blog.js --site wwwchesterhouseguesthousecoukbj7ji73invg --account-id 157 --live
```

### Skipped — No GAS account or no deployed site

| Old URL | invisible_key | Content | Reason |
|---------|--------------|---------|--------|
| www.bellavidabandb.com | `wwwbellavidabandbcomysqmcvh4wmn` | 35 blog, 45 attr | No deployed site |
| www.resortbreaks.com | `wwwresortbreakscomge6xfxpxsi0` | 76 blog, 3 attr | No deployed site |
| www.bookliverpool.com | `wwwbookliverpoolcomcxbaf0x5ix4` | 69 blog | No GAS account |
| www.bellavidahaus.com | `wwwbellavidahauscomjz0fd5ocoz5` | 31 blog, 36 attr | No GAS account |
| www.walnutcanyoncabins.com | `wwwwalnutcanyoncabinscoms0vrf6knsk8` | 52 blog, 15 attr | No deployed site |
| www.holidayhomesinyork.co.uk | `wwwholidayhomesinyorkcoukrzhxt5ndm48` | 193 blog, 52 attr | No deployed site |
| www.alakaibb.com | `wwwalakaibbcomgy0acq3x3ek` | 12 blog, 26 attr | No deployed site |
| www.burleigh-house.co.uk | `wwwburleighhousecouk485fjgw0smk` | 14 blog, 20 attr | No deployed site |
| www.trilliumvacationrentals.ca | `wwwtrilliumvacationrentalsca0vzzpk46s32` | 1 blog, 19 attr | No deployed site |
| www.bookinriga.com | `wwwbookinrigacompns0a3pjsop` | 1 blog, 8 attr | No GAS account |
| www.arancottages.uk | `wwwarancottagesukaaezd2u6b5k` | 4 blog, 4 attr | No GAS account |
| www.dpourpry.com | `wwwdpourprycome6argv6acje` | 7 blog | No deployed site |
| www.booking-assist.com | `wwwbookingassistcomvswnnby4umm` | 1 blog, 4 attr | No GAS account |
| www.brightonbreak.com | `wwwbrightonbreakcom8xm6qe2ydz2` | 1 blog, 4 attr | No GAS account |
| www.dfriedrich.at | `wwwdfriedrichatef8f3fj6jms` | 1 blog, 4 attr | No GAS account (Haus Schneeberg?) |
| www.pumicetinyhouse.com | `wwwpumicetinyhousecomj28h6a5s2sk` | 1 blog, 4 attr | No GAS account |
| www.feelwelcomebarcelona.com | `wwwfeelwelcomebarcelonacomwq7h8e3mjqy` | 1 blog | No GAS account |
| bookings.hebdenbridgehostel.org | `bookingshebdenbridgehostelorg72ne04mvb2o` | 1 blog, 4 attr | Duplicate of hebden bridge |
| www.rezintel.net | `rezintelnet73wumov7g2a` | 0 | Internal/demo |
| www.villa-lounge.com | `villaloungecoma2hx4ms4equ` | 0 | Empty |

### Tag Name Notes

Most sites auto-detect correctly. Exceptions requiring `--tag-name` or double-runs:

| Site | Issue | Action |
|------|-------|--------|
| Cleveland B&B | "News" (12 extra blog posts) | Run blog twice: default + `--tag-name "News"` |
| Cleveland B&B | "Things to do" (16 extra attractions) | Run attractions twice: default + `--tag-name "Attractions"` |
| Moonriver B&B | "General Blogs" (19 extra posts) | Run blog twice: default + `--tag-name "General Blogs"` |
| Mornington Rose | "Local Attractions" | Auto-detected — no override needed |
| Lehmann House | "Blog articles" (lowercase a) | Auto-detected — no override needed |
| Belmont/Adelphi | Same account 68 — watch for slug collisions | Idempotent, but check logs for `-2` suffix warnings |
