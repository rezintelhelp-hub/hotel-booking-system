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
