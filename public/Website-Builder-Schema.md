# GAS Website Builder - Database Schema

## Overview

The Website Builder uses a per-website settings system with two-way sync to WordPress. Each website can have its own theme and settings, independent of other websites in the same account.

---

## Tables

### websites (Enhanced)

The main website table with new columns for setup tracking.

```sql
-- Existing columns
id SERIAL PRIMARY KEY
public_id VARCHAR(20) UNIQUE NOT NULL    -- WEB-ABC123
owner_type VARCHAR(20) NOT NULL           -- 'account' or 'agency'
owner_id INTEGER NOT NULL
name VARCHAR(255) NOT NULL
slug VARCHAR(100)
template_code VARCHAR(50)                 -- Links to theme_registry.code
site_url VARCHAR(500)
admin_url VARCHAR(500)
custom_domain VARCHAR(255)
instawp_site_id VARCHAR(255)
instawp_data JSONB DEFAULT '{}'
website_type VARCHAR(30) DEFAULT 'portfolio'
status VARCHAR(20) DEFAULT 'draft'        -- draft, active, paused, deleted
default_currency VARCHAR(3) DEFAULT 'GBP'
timezone VARCHAR(50) DEFAULT 'Europe/London'
created_at TIMESTAMP
updated_at TIMESTAMP

-- NEW columns
setup_complete BOOLEAN DEFAULT false      -- Has completed setup wizard?
setup_progress JSONB DEFAULT '{}'         -- {"header": true, "hero": true, ...}
theme_mode VARCHAR(20) DEFAULT 'developer' -- starter, pro, developer
last_synced_at TIMESTAMP                  -- Last sync with WordPress
sync_source VARCHAR(20)                   -- 'gas' or 'wordpress' (last edit source)
```

### theme_registry (New)

Defines available themes and their configurable sections/fields.

```sql
CREATE TABLE theme_registry (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,       -- 'developer', 'boutique', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  schema JSONB NOT NULL DEFAULT '{}',     -- Complete schema definition
  sections JSONB NOT NULL DEFAULT '{}',   -- Section definitions with fields
  color_presets JSONB DEFAULT '[]',
  font_presets JSONB DEFAULT '[]',
  thumbnail_url VARCHAR(500),
  preview_url VARCHAR(500),
  download_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  min_tier VARCHAR(20) DEFAULT 'starter', -- starter, pro, developer
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Theme Schema Structure

```json
{
  "code": "developer",
  "name": "GAS Developer Theme",
  "version": "1.0.0",
  "sections": {
    "header": {
      "label": "Header & Navigation",
      "required": true,
      "order": 1,
      "fields": {
        "developer_logo_text": {
          "type": "text",
          "label": "Logo Text",
          "default": "Your Property"
        },
        "developer_header_bg": {
          "type": "color",
          "label": "Background Color",
          "default": "#ffffff"
        },
        "developer_header_transparent": {
          "type": "toggle",
          "label": "Transparent on Homepage",
          "default": true
        }
      }
    },
    "hero": {
      "label": "Hero Section",
      "required": true,
      "order": 2,
      "fields": {
        "developer_hero_bg": {
          "type": "image",
          "label": "Background Image"
        },
        "developer_hero_opacity": {
          "type": "range",
          "label": "Overlay Opacity",
          "min": 0,
          "max": 100,
          "default": 30
        },
        "developer_featured_mode": {
          "type": "select",
          "label": "Display Mode",
          "options": ["all", "featured", "selected"],
          "default": "all"
        }
      }
    }
  }
}
```

#### Field Types

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `text` | Single line text input | `default`, `placeholder` |
| `textarea` | Multi-line text | `default`, `rows` |
| `color` | Color picker | `default` |
| `image` | Image upload | `default` |
| `toggle` | Boolean switch | `default` |
| `range` | Slider | `min`, `max`, `step`, `default` |
| `number` | Number input | `min`, `max`, `default` |
| `select` | Dropdown | `options[]`, `default` |

### website_settings (Enhanced)

Per-website section settings, now supports website_id.

```sql
CREATE TABLE website_settings (
  id SERIAL PRIMARY KEY,
  website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,  -- NEW
  account_id INTEGER,                     -- Kept for backwards compatibility
  section VARCHAR(50) NOT NULL,           -- 'header', 'hero', 'footer', etc.
  settings JSONB DEFAULT '{}',            -- The actual field values
  variant VARCHAR(50),                    -- For sections with variants
  is_enabled BOOLEAN DEFAULT true,        -- Can disable optional sections
  display_order INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP,               -- NEW
  sync_source VARCHAR(20),                -- NEW: 'gas' or 'wordpress'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_website_settings_website ON website_settings(website_id);
CREATE INDEX idx_website_settings_account ON website_settings(account_id);
CREATE UNIQUE INDEX idx_website_settings_unique 
  ON website_settings(website_id, section) 
  WHERE website_id IS NOT NULL;
```

#### Settings Data Example

```json
{
  "developer_hero_bg": "https://cdn.gas.travel/images/hero.jpg",
  "developer_hero_title": "Welcome to Lehmann House",
  "developer_hero_subtitle": "Your perfect getaway",
  "developer_hero_opacity": 40,
  "developer_hero_overlay_color": "#0f172a"
}
```

### website_pages (Enhanced)

Page content management with sub-page support.

```sql
CREATE TABLE website_pages (
  id SERIAL PRIMARY KEY,
  website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  page_type VARCHAR(50) NOT NULL,         -- 'home', 'about', 'contact', 'custom'
  slug VARCHAR(100),
  title VARCHAR(255),
  content JSONB DEFAULT '{}',             -- Block-based content
  parent_id INTEGER REFERENCES website_pages(id) ON DELETE SET NULL,  -- NEW
  template VARCHAR(50),                   -- NEW: page template
  seo_title VARCHAR(255),                 -- NEW
  seo_description TEXT,                   -- NEW
  featured_image VARCHAR(500),            -- NEW
  is_published BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_pages_parent ON website_pages(parent_id);
```

### website_sync_log (New)

Audit trail for sync operations.

```sql
CREATE TABLE website_sync_log (
  id SERIAL PRIMARY KEY,
  website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,         -- 'push' (GAS→WP) or 'pull' (WP→GAS)
  sections_synced JSONB DEFAULT '[]',     -- ["header", "hero", ...]
  status VARCHAR(20) DEFAULT 'success',   -- success, failed
  error_message TEXT,
  source_data JSONB,                      -- Original data for debugging
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_sync_log_website ON website_sync_log(website_id);
```

### website_units (Existing)

Links units to websites - no changes needed.

```sql
CREATE TABLE website_units (
  id SERIAL PRIMARY KEY,
  website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  custom_name VARCHAR(255),
  custom_description TEXT,
  custom_price_modifier DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(website_id, unit_id)
);
```

---

## API Endpoints

### Themes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/themes` | List all active themes |
| GET | `/api/themes/:code` | Get theme schema |

### Website Builder

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/websites/:id/builder` | Get website + all settings + theme schema |
| GET | `/api/websites/:id/builder/:section` | Get specific section settings |
| POST | `/api/websites/:id/builder/:section` | Save specific section settings |
| POST | `/api/websites/:id/builder` | Bulk save all settings |
| POST | `/api/websites/:id/complete-setup` | Mark setup as complete |
| POST | `/api/websites/:id/change-theme` | Change theme (resets settings) |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/websites/:id/sync-to-wordpress` | Push settings to WordPress |
| POST | `/api/websites/:id/sync-from-wordpress` | Pull settings from WordPress |
| GET | `/api/websites/:id/sync-log` | Get sync history |

---

## Setup Endpoint

Run once to create/enhance all tables:

```
GET /api/setup-website-builder
```

This will:
1. Add new columns to `websites` table
2. Enhance `website_templates` table
3. Add columns to `website_settings` table
4. Enhance `website_pages` table
5. Create `theme_registry` table
6. Create `website_sync_log` table
7. Insert Developer theme schema

---

## Data Flow

### Setup Flow (New Website)

```
1. User creates website → status: 'draft'
2. User selects template → template_code set
3. User goes through setup wizard:
   - For each section, POST /api/websites/:id/builder/:section
   - setup_progress updated: {"header": true, "hero": true, ...}
4. All required sections complete
5. POST /api/websites/:id/complete-setup → setup_complete: true
6. Deploy site (WordPress provisioning)
7. POST /api/websites/:id/sync-to-wordpress → Push all settings
8. status: 'active'
```

### Two-Way Sync Flow

```
Edit in GAS:
  1. User saves section in GAS Admin
  2. POST /api/websites/:id/builder/:section
  3. Settings saved with sync_source: 'gas'
  4. User clicks "Sync to WordPress"
  5. POST /api/websites/:id/sync-to-wordpress
  6. Settings pushed to WordPress theme_mods
  7. Logged in website_sync_log

Edit in WordPress:
  1. User edits in WordPress Customizer
  2. User saves in WordPress
  3. Hook triggers or user clicks "Sync" in GAS
  4. POST /api/websites/:id/sync-from-wordpress
  5. GAS fetches theme_mods from WordPress
  6. Settings saved with sync_source: 'wordpress'
  7. Logged in website_sync_log
```

---

## Migration Notes

### Backwards Compatibility

- Old endpoints using `account_id` still work
- `website_settings` table supports both `account_id` and `website_id`
- Legacy settings (account-level) remain accessible
- New per-website settings use `website_id`

### Migration Path

For existing accounts with `website_settings` data:

```sql
-- Associate existing settings with first website
UPDATE website_settings ws
SET website_id = (
  SELECT w.id FROM websites w 
  WHERE w.owner_id = ws.account_id 
  ORDER BY w.created_at LIMIT 1
)
WHERE ws.website_id IS NULL AND ws.account_id IS NOT NULL;
```

---

## Theme Mode Restrictions

| Mode | WordPress Admin | Page Creation | Theme Change |
|------|-----------------|---------------|--------------|
| `starter` | Hidden | No | No |
| `pro` | Limited | Simple builder | No |
| `developer` | Full | Full | Yes |

Enforced by theme code in WordPress:
```php
define('GAS_THEME_MODE', 'starter'); // Set during deployment
```
