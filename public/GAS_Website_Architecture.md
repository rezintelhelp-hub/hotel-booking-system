# GAS Website Architecture - Multi-Site, Unit-Based Distribution

## Core Concept

> **The Room/Unit is the PRODUCT. Websites are SHOPPING WINDOWS.**

A single unit can be displayed and sold through multiple websites simultaneously:
- Owner's main portfolio site
- Owner's niche/themed site (e.g., "Beach Properties")
- Individual unit microsite
- Agency portfolio site
- Travel Agent curated collection
- Future: OTA integrations, affiliate sites

---

## Database Architecture

### 1. WEBSITES Table (Independent Entities)

```sql
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(20) UNIQUE NOT NULL,           -- e.g., "WEB-A1B2C3"
    
    -- Ownership
    owner_type VARCHAR(20) NOT NULL,                  -- 'account', 'agency', 'travel_agent'
    owner_id INTEGER NOT NULL,                        -- References accounts.id
    
    -- Identity
    name VARCHAR(255) NOT NULL,                       -- "Hostvana Beach Collection"
    slug VARCHAR(100),                                -- "beach-collection"
    
    -- Hosting
    site_url VARCHAR(500),                            -- "hostvana-beach.instawp.site"
    admin_url VARCHAR(500),                           -- WordPress admin URL
    custom_domain VARCHAR(255),                       -- "beach.hostvana.com"
    
    -- InstaWP Integration
    instawp_site_id VARCHAR(255),
    instawp_data JSONB DEFAULT '{}',
    
    -- Configuration
    template VARCHAR(50) DEFAULT 'developer',         -- WordPress theme
    status VARCHAR(20) DEFAULT 'draft',               -- 'draft', 'creating', 'active', 'paused'
    website_type VARCHAR(30) DEFAULT 'portfolio',     -- 'portfolio', 'single_property', 'microsite', 'agent'
    
    -- Settings
    default_currency VARCHAR(3) DEFAULT 'GBP',
    timezone VARCHAR(50) DEFAULT 'Europe/London',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_websites_owner ON websites(owner_type, owner_id);
CREATE INDEX idx_websites_status ON websites(status);
```

### 2. WEBSITE_UNITS Table (Many-to-Many Junction)

```sql
CREATE TABLE website_units (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    unit_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
    
    -- Display options per website
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    custom_name VARCHAR(255),                         -- Override unit name for this site
    custom_description TEXT,                          -- Override description for this site
    custom_price_modifier DECIMAL(5,2),               -- e.g., +10% for agent sites
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(website_id, unit_id)
);

CREATE INDEX idx_website_units_website ON website_units(website_id);
CREATE INDEX idx_website_units_unit ON website_units(unit_id);
```

### 3. WEBSITE_SETTINGS Table (Per-Website Content)

```sql
CREATE TABLE website_settings (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,                     -- 'header', 'hero', 'footer', etc.
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(website_id, section)
);

CREATE INDEX idx_website_settings_website ON website_settings(website_id);
```

### 4. WEBSITE_PAGES Table (Custom Pages)

```sql
CREATE TABLE website_pages (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    page_type VARCHAR(50) NOT NULL,                   -- 'about', 'contact', 'terms', 'privacy', 'custom'
    slug VARCHAR(100),                                -- For custom pages
    title VARCHAR(255),
    content JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(website_id, page_type, slug)
);
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ACCOUNTS                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Hostvana   │  │   Lehmann    │  │   Elevate    │  │  TravelCo    │     │
│  │ (Admin)      │  │  (Admin)     │  │ (Agency)     │  │ (Agent)      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEBSITES                                        │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│  │ Hostvana.com   │ │ Beach Villas   │ │ Lehmann House  │ │ Elevate Port.  ││
│  │ (All 20 units) │ │ (5 units)      │ │ (8 units)      │ │ (28 units)     ││
│  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘│
│          │                  │                  │                  │         │
│  ┌───────┴────────┐ ┌───────┴────────┐         │          ┌───────┴────────┐│
│  │ Studio 111     │ │ TravelCo       │         │          │ (managed accts)││
│  │ (1 unit only)  │ │ Beach Picks    │         │          │                ││
│  │ [microsite]    │ │ (3 units)      │         │          │                ││
│  └───────┬────────┘ └───────┬────────┘         │          └────────────────┘│
└──────────┼──────────────────┼──────────────────┼────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEBSITE_UNITS (Junction)                           │
│  Links websites to specific rooms/units with custom settings per site       │
└─────────────────────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BOOKABLE_UNITS                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │Studio111│ │Studio111│ │Studio111│ │Studio111│ │ Lehmann │ │ Lehmann │   │
│  │ Orange  │ │  Loft   │ │  Krone  │ │  Blue   │ │ Suite 1 │ │ Suite 2 │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│       ▲           ▲           ▲           ▲           ▲           ▲        │
│       │           │           │           │           │           │        │
│   On 3 sites  On 2 sites  On 1 site   On 2 sites  On 2 sites  On 2 sites  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Use Cases

### 1. Property Owner - Hostvana (20 Units)

| Website | Type | Units |
|---------|------|-------|
| hostvana.com | Portfolio | All 20 units |
| beach.hostvana.com | Themed | 5 beach units |
| studio111orange.com | Microsite | 1 unit only |

### 2. Agency - Elevate (Manages 3 Accounts)

| Website | Type | Units |
|---------|------|-------|
| elevate-rentals.com | Agency Portfolio | All units from managed accounts |
| swiss-apartments.com | Themed | Units in Switzerland only |

### 3. Travel Agent - TravelCo

| Website | Type | Units |
|---------|------|-------|
| travelco-holidays.com | Agent Curated | Only units they have distribution access to |
| beach-escapes.com | Themed | Subset - beach properties |

---

## API Endpoints

### Websites CRUD

```javascript
// List websites for current account/agency/agent
GET /api/websites
    ?owner_type=account&owner_id=5

// Get single website with units
GET /api/websites/:id
    → { website, units: [...], settings: {...} }

// Create new website
POST /api/websites
    { name, website_type, owner_type, owner_id }

// Update website
PUT /api/websites/:id
    { name, custom_domain, status, ... }

// Delete website
DELETE /api/websites/:id
```

### Website Units Management

```javascript
// Get units on a website
GET /api/websites/:id/units

// Add units to website
POST /api/websites/:id/units
    { unit_ids: [1, 2, 3] }

// Remove unit from website
DELETE /api/websites/:id/units/:unitId

// Update unit display settings on this website
PUT /api/websites/:id/units/:unitId
    { display_order, is_featured, custom_name, custom_price_modifier }

// Get available units to add (not already on this website)
GET /api/websites/:id/available-units
```

### Website Builder (Content)

```javascript
// Get section settings for a website
GET /api/websites/:id/builder/:section

// Save section settings
POST /api/websites/:id/builder/:section
    { settings: {...} }

// Get all builder sections
GET /api/websites/:id/builder

// Upload image for website
POST /api/websites/:id/builder/upload
```

---

## UI Structure

### Website Manager (New View)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌐 My Websites                                     [+ New Site] │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🏨 Hostvana Vacation Rentals                              │   │
│ │ hostvana.instawp.site → hostvana.com                      │   │
│ │ 📦 20 units • ✅ Active                                   │   │
│ │                                                           │   │
│ │ [Edit Site] [Manage Units] [Builder] [View Site]          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🏖️ Beach Villas Collection                                │   │
│ │ hostvana-beach.instawp.site                               │   │
│ │ 📦 5 units • ✅ Active                                    │   │
│ │                                                           │   │
│ │ [Edit Site] [Manage Units] [Builder] [View Site]          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🏠 Studio 111 Orange                                      │   │
│ │ studio111orange.instawp.site                              │   │
│ │ 📦 1 unit • 🟡 Draft                                      │   │
│ │                                                           │   │
│ │ [Edit Site] [Manage Units] [Builder] [View Site]          │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Manage Units Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ 📦 Units on "Beach Villas Collection"                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ UNITS ON THIS SITE (5)                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⭐ Studio 111 - Orange      │ Featured │ Order: 1 │ [Remove]│ │
│ │    Studio 111 - Loft        │          │ Order: 2 │ [Remove]│ │
│ │    Studio 111 - Blue        │          │ Order: 3 │ [Remove]│ │
│ │    BC138 - Pondview Haven   │          │ Order: 4 │ [Remove]│ │
│ │    BC052 - Coastal Escape   │          │ Order: 5 │ [Remove]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ AVAILABLE UNITS TO ADD (15)                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☐ Studio 111 - Krone                                  [Add] │ │
│ │ ☐ BC010 - Serene Pondside                             [Add] │ │
│ │ ☐ BC104 - Cozy Beachside                              [Add] │ │
│ │ ... 12 more                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                              [Save Changes]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Website Builder (Modified)

```
┌─────────────────────────────────────────────────────────────────┐
│ SITE BUILDER                                                    │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Select Website: [Beach Villas Collection          ▼]      │   │
│ │                                                           │   │
│ │ 🌐 hostvana-beach.instawp.site • 5 units                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ▾ Header                                                        │
│   Logo & Navigation                                             │
│ ▾ Home Page                                                     │
│   Hero, Intro, Featured, Reviews, CTA                           │
│ ▾ Sub Pages                                                     │
│   About, Gallery, Contact, Blog                                 │
│ ▾ Footer                                                        │
│   Links, Social, Copyright                                      │
│ ▾ Styles                                                        │
│   Colors, Fonts, Global                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Permission Matrix

| Action | Owner | Agency (Managed) | Travel Agent |
|--------|-------|------------------|--------------|
| Create website | ✅ Own units | ✅ Managed units | ✅ Approved units |
| Add units to site | ✅ Own units | ✅ Managed units | ✅ Approved units |
| Edit website content | ✅ | ✅ | ✅ |
| Delete website | ✅ | ✅ | ✅ |
| Add units from other accounts | ❌ | ❌ | ❌ |

---

## Migration Path

### Phase 1: Create New Tables
```sql
-- Create websites table
-- Create website_units table  
-- Modify website_settings to use website_id instead of account_id
```

### Phase 2: Migrate Existing Data
```sql
-- For each account with website_settings:
--   1. Create a website record (owner_type='account')
--   2. Link all their units to this website
--   3. Update website_settings to use new website_id
```

### Phase 3: Update UI
- Add "My Websites" view
- Modify Website Builder to select website first
- Add "Manage Units" functionality

### Phase 4: Agency & Agent Websites
- Agencies can create sites with managed account units
- Travel Agents can create sites with approved units

---

## WordPress Integration

Each website creates a WordPress site via InstaWP. The WP site:

1. **Pulls units from API**: `GET /api/public/websites/:publicId/units`
2. **Displays only assigned units**
3. **Books through GAS**: Same booking flow, just filtered
4. **Uses website-specific settings**: Colors, content, etc.

### Public API for WP Sites

```javascript
// Get website public info + units
GET /api/public/websites/:publicId
    → { 
        name, 
        units: [...], 
        settings: { header, hero, footer, styles }
      }

// Search availability for units on this website
POST /api/public/websites/:publicId/search
    { check_in, check_out, guests }
    → Available units from this website only
```

---

## Future Enhancements

1. **Website Analytics**: Track views, bookings per website
2. **A/B Testing**: Different hero images per site
3. **Affiliate Tracking**: Commission tracking per website
4. **White-Label**: Remove GAS branding for premium plans
5. **Multi-Language**: Different websites for different languages
6. **Seasonal Sites**: Auto-enable/disable based on dates

---

## Summary

| Concept | Old Model | New Model |
|---------|-----------|-----------|
| Website ownership | 1 per account | Many per account/agency/agent |
| Content storage | By account_id | By website_id |
| Unit assignment | All account units | Selected units per website |
| Agency sites | Not possible | ✅ Can use managed units |
| Agent sites | Not possible | ✅ Can use approved units |
| Microsites | Not possible | ✅ Single unit websites |

This architecture turns GAS into a **powerful multi-channel distribution platform** where the Room/Unit is the atomic product that can be merchandised across unlimited websites!
