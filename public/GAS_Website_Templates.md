# GAS Website Templates Architecture

## Overview

Each website template defines:
1. **Visual Design** - WordPress theme/layout
2. **Available Sections** - Which CMS sections are available
3. **Section Variants** - Different layouts within a section
4. **Required Fields** - What must be filled in
5. **Optional Modules** - Add-on features

---

## Database Structure

### WEBSITE_TEMPLATES Table

```sql
CREATE TABLE website_templates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,              -- 'boutique-hotel', 'beach-villa', 'city-apartment'
    name VARCHAR(100) NOT NULL,                     -- "Boutique Hotel"
    description TEXT,
    category VARCHAR(50),                           -- 'hotel', 'villa', 'apartment', 'bnb', 'agency'
    
    -- Visual
    thumbnail_url VARCHAR(500),                     -- Preview image
    demo_url VARCHAR(500),                          -- Live demo site
    
    -- Configuration (JSONB for flexibility)
    sections JSONB NOT NULL,                        -- Available sections & their config
    color_presets JSONB,                            -- Pre-defined color schemes
    font_presets JSONB,                             -- Pre-defined font combinations
    
    -- Features
    features JSONB,                                 -- List of features/capabilities
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,              -- Premium templates for higher plans
    min_plan VARCHAR(20) DEFAULT 'starter',        -- Minimum plan required
    
    -- Metadata
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Template Definition

```json
{
  "code": "boutique-hotel",
  "name": "Boutique Hotel",
  "category": "hotel",
  "sections": {
    "header": {
      "enabled": true,
      "required": true,
      "variants": ["classic", "modern", "minimal"],
      "fields": {
        "logo": { "type": "image", "required": false },
        "site_name": { "type": "text", "required": true },
        "tagline": { "type": "text", "required": false },
        "nav_style": { "type": "select", "options": ["horizontal", "hamburger"] },
        "cta_button": { "type": "text", "default": "Book Now" }
      }
    },
    "hero": {
      "enabled": true,
      "required": true,
      "variants": ["fullscreen", "split", "video", "slider"],
      "fields": {
        "headline": { "type": "text", "required": true },
        "subheadline": { "type": "text" },
        "image": { "type": "image", "required": true },
        "video_url": { "type": "url", "variant": "video" },
        "show_search": { "type": "boolean", "default": true },
        "overlay_opacity": { "type": "range", "min": 0, "max": 100, "default": 40 }
      }
    },
    "intro": {
      "enabled": true,
      "required": false,
      "variants": ["standard", "with-image", "stats"],
      "fields": {
        "title": { "type": "text" },
        "content": { "type": "richtext" },
        "image": { "type": "image", "variant": "with-image" },
        "stats": { "type": "repeater", "variant": "stats", "fields": ["label", "value"] }
      }
    },
    "rooms": {
      "enabled": true,
      "required": true,
      "variants": ["grid", "list", "carousel", "featured"],
      "fields": {
        "title": { "type": "text", "default": "Our Rooms" },
        "subtitle": { "type": "text" },
        "layout": { "type": "select", "options": ["grid-2", "grid-3", "grid-4", "list"] },
        "show_prices": { "type": "boolean", "default": true },
        "show_availability": { "type": "boolean", "default": true }
      }
    },
    "amenities": {
      "enabled": true,
      "required": false,
      "variants": ["icons", "images", "list"],
      "fields": {
        "title": { "type": "text", "default": "Hotel Amenities" },
        "items": { "type": "amenity-picker" }
      }
    },
    "restaurant": {
      "enabled": true,
      "required": false,
      "category_specific": ["hotel", "resort"],
      "variants": ["standard", "with-menu", "gallery"],
      "fields": {
        "title": { "type": "text" },
        "description": { "type": "richtext" },
        "hours": { "type": "hours" },
        "menu_pdf": { "type": "file", "variant": "with-menu" },
        "gallery": { "type": "gallery", "variant": "gallery" },
        "reservation_link": { "type": "url" }
      }
    },
    "spa": {
      "enabled": true,
      "required": false,
      "category_specific": ["hotel", "resort"],
      "variants": ["standard", "treatments", "booking"],
      "fields": {
        "title": { "type": "text" },
        "description": { "type": "richtext" },
        "treatments": { "type": "repeater", "variant": "treatments" },
        "booking_link": { "type": "url", "variant": "booking" }
      }
    },
    "reviews": {
      "enabled": true,
      "required": false,
      "variants": ["carousel", "grid", "featured", "aggregate"],
      "fields": {
        "title": { "type": "text", "default": "Guest Reviews" },
        "source": { "type": "select", "options": ["manual", "tripadvisor", "google", "booking"] },
        "tripadvisor_id": { "type": "text" },
        "google_place_id": { "type": "text" },
        "manual_reviews": { "type": "repeater" }
      }
    },
    "location": {
      "enabled": true,
      "required": false,
      "variants": ["map", "directions", "attractions"],
      "fields": {
        "title": { "type": "text", "default": "Location" },
        "address": { "type": "address" },
        "map_embed": { "type": "textarea" },
        "directions": { "type": "richtext" },
        "nearby": { "type": "repeater", "variant": "attractions" }
      }
    },
    "cta": {
      "enabled": true,
      "required": false,
      "variants": ["banner", "split", "minimal"],
      "fields": {
        "headline": { "type": "text" },
        "subtext": { "type": "text" },
        "button_text": { "type": "text" },
        "button_link": { "type": "url" },
        "background": { "type": "image" }
      }
    },
    "footer": {
      "enabled": true,
      "required": true,
      "variants": ["standard", "minimal", "expanded"],
      "fields": {
        "about_text": { "type": "textarea" },
        "address": { "type": "textarea" },
        "phone": { "type": "text" },
        "email": { "type": "email" },
        "social_links": { "type": "social" },
        "copyright": { "type": "text" }
      }
    }
  },
  "pages": {
    "about": { "enabled": true, "required": false },
    "gallery": { "enabled": true, "required": false },
    "contact": { "enabled": true, "required": true },
    "blog": { "enabled": true, "required": false },
    "attractions": { "enabled": true, "required": false },
    "dining": { "enabled": true, "required": false, "category_specific": ["hotel", "resort"] },
    "events": { "enabled": true, "required": false, "category_specific": ["hotel", "resort", "venue"] },
    "terms": { "enabled": true, "required": true },
    "privacy": { "enabled": true, "required": true }
  },
  "color_presets": [
    { "name": "Classic", "primary": "#1e3a5f", "secondary": "#c9a227", "accent": "#ffffff" },
    { "name": "Modern", "primary": "#0f172a", "secondary": "#3b82f6", "accent": "#f8fafc" },
    { "name": "Warm", "primary": "#7c2d12", "secondary": "#f59e0b", "accent": "#fef3c7" }
  ],
  "font_presets": [
    { "name": "Elegant", "headings": "Playfair Display", "body": "Lato" },
    { "name": "Modern", "headings": "Montserrat", "body": "Open Sans" },
    { "name": "Classic", "headings": "Cormorant Garamond", "body": "Source Sans Pro" }
  ]
}
```

---

## Template Categories & Their Unique Sections

### 🏨 Hotel / Resort
```
Standard Sections + Restaurant, Spa, Events, Meetings, Pool/Beach
```

### 🏖️ Beach Villa / Holiday Home
```
Standard Sections + Beach Info, Water Sports, BBQ Area, Pool, Local Guide
```

### 🏙️ City Apartment
```
Standard Sections + Transport Links, Neighborhood, Parking, Workspace
```

### 🏡 B&B / Guesthouse
```
Standard Sections + Breakfast, Host Story, Local Tips, House Rules
```

### 🏢 Agency Portfolio
```
Standard Sections + Property Search, Destinations, Team, Testimonials
```

### ✈️ Travel Agent
```
Standard Sections + Curated Collections, Deals, Trip Planning, Booking Enquiry
```

---

## Section Variants Examples

### Hero Section Variants

| Variant | Description | Unique Fields |
|---------|-------------|---------------|
| `fullscreen` | Full viewport image | overlay_opacity, text_position |
| `split` | Image one side, text other | image_position (left/right) |
| `video` | Background video | video_url, fallback_image |
| `slider` | Multiple slides | slides[] array |
| `parallax` | Parallax scroll effect | parallax_speed |

### Rooms Section Variants

| Variant | Description | Unique Fields |
|---------|-------------|---------------|
| `grid` | Card grid layout | columns (2/3/4) |
| `list` | Horizontal list | show_description |
| `carousel` | Sliding carousel | auto_scroll, items_visible |
| `featured` | Hero room + others | featured_unit_id |
| `masonry` | Pinterest-style | - |

### Reviews Section Variants

| Variant | Description | Unique Fields |
|---------|-------------|---------------|
| `carousel` | Sliding testimonials | auto_rotate |
| `grid` | Card grid | columns |
| `featured` | One large + smaller | featured_review_id |
| `aggregate` | Score summary + list | show_breakdown |
| `social` | Embedded from platforms | platform_ids |

---

## Template-Aware Website Settings

### Modified WEBSITE_SETTINGS Table

```sql
CREATE TABLE website_settings (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    variant VARCHAR(50),                              -- Which variant is selected
    settings JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,                  -- Can disable optional sections
    display_order INTEGER DEFAULT 0,                  -- Custom section ordering
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(website_id, section)
);
```

---

## UI: Template Selection

### When Creating New Website

```
┌─────────────────────────────────────────────────────────────────┐
│ Choose a Template                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ HOTELS & RESORTS                                                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ [Preview]   │ │ [Preview]   │ │ [Preview]   │                │
│ │             │ │             │ │             │                │
│ │ Boutique    │ │ Luxury      │ │ Modern      │                │
│ │ Hotel       │ │ Resort      │ │ Hotel       │                │
│ │             │ │ ⭐ Premium  │ │             │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
│ VILLAS & HOLIDAY HOMES                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ [Preview]   │ │ [Preview]   │ │ [Preview]   │                │
│ │             │ │             │ │             │                │
│ │ Beach       │ │ Mountain    │ │ Country     │                │
│ │ Villa       │ │ Cabin       │ │ Cottage     │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
│ APARTMENTS                                                       │
│ ┌─────────────┐ ┌─────────────┐                                 │
│ │ [Preview]   │ │ [Preview]   │                                 │
│ │             │ │             │                                 │
│ │ City        │ │ Studio      │                                 │
│ │ Apartment   │ │ Microsite   │                                 │
│ └─────────────┘ └─────────────┘                                 │
│                                                                 │
│ AGENCIES & AGENTS                                                │
│ ┌─────────────┐ ┌─────────────┐                                 │
│ │ [Preview]   │ │ [Preview]   │                                 │
│ │             │ │             │                                 │
│ │ Agency      │ │ Travel      │                                 │
│ │ Portfolio   │ │ Agent       │                                 │
│ └─────────────┘ └─────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Template Preview Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Boutique Hotel Template                              [X]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                    [LIVE PREVIEW]                           │ │
│ │                                                             │ │
│ │                    Demo website shown                       │ │
│ │                    in iframe                                │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ INCLUDED SECTIONS                     UNIQUE FEATURES           │
│ ✓ Header & Navigation                 ✓ Restaurant Menu         │
│ ✓ Hero (5 variants)                   ✓ Spa & Treatments        │
│ ✓ Room Showcase                       ✓ Events Calendar         │
│ ✓ Amenities                           ✓ Meeting Rooms           │
│ ✓ Reviews Integration                 ✓ Gift Vouchers           │
│ ✓ Location & Map                                                │
│ ✓ Footer                              IDEAL FOR                 │
│                                        • Boutique Hotels         │
│ PAGES INCLUDED                         • Small Resorts           │
│ ✓ About  ✓ Gallery  ✓ Contact         • Historic Inns           │
│ ✓ Blog   ✓ Events   ✓ Dining                                   │
│                                                                 │
│         [View Live Demo]              [Use This Template]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Builder: Section Variant Selection

```
┌─────────────────────────────────────────────────────────────────┐
│ Hero Section                                    [Enabled ✓]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ LAYOUT VARIANT                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓ ░░░ │ │ ▶ VIDEO  │ │ ◀ ▓▓▓ ▶ │           │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓ ░░░ │ │          │ │         │           │
│ │  TEXT    │ │     TEXT│ │   TEXT   │ │ SLIDER  │           │
│ │Fullscreen│ │  Split  │ │  Video   │ │         │           │
│ │   [✓]    │ │   [ ]   │ │   [ ]    │ │   [ ]   │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│ SETTINGS (for Fullscreen variant)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Headline: [Welcome to Our Hotel________________]            │ │
│ │ Subheadline: [Experience luxury like never before]          │ │
│ │ Background Image: [Choose File] [Preview]                   │ │
│ │ Overlay Opacity: [====●=====] 40%                           │ │
│ │ Text Position: [Center ▼]                                   │ │
│ │ Show Search Widget: [✓]                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                          [💾 Save & Sync]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## API: Template Management

```javascript
// List available templates
GET /api/templates
    ?category=hotel
    ?plan=professional     // Filter by user's plan

// Get template details
GET /api/templates/:code
    → { template with full section definitions }

// Get sections for a template (for builder)
GET /api/templates/:code/sections
    → { sections: [...] with field definitions }

// Validate website settings against template
POST /api/templates/:code/validate
    { settings: {...} }
    → { valid: true/false, errors: [...] }
```

---

## Migration: Adding Templates to Existing Websites

```sql
-- Add template reference to websites table
ALTER TABLE websites ADD COLUMN template_code VARCHAR(50) 
    REFERENCES website_templates(code);

-- Default existing websites to a generic template
UPDATE websites SET template_code = 'starter' 
    WHERE template_code IS NULL;
```

---

## Template Versioning

When templates are updated:

```sql
CREATE TABLE template_versions (
    id SERIAL PRIMARY KEY,
    template_code VARCHAR(50) NOT NULL,
    version VARCHAR(10) NOT NULL,
    sections JSONB NOT NULL,
    changelog TEXT,
    released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_code, version)
);
```

Websites store which version they're using, allowing:
- Gradual rollouts
- Rollback if issues
- "Upgrade available" notifications

---

## Summary

| Component | Purpose |
|-----------|---------|
| `website_templates` | Master template definitions |
| `template.sections` | Which CMS sections available |
| `section.variants` | Layout options per section |
| `section.fields` | What can be edited |
| `category_specific` | Sections only for certain types |
| `color_presets` | Quick color scheme selection |
| `font_presets` | Typography combinations |
| `is_premium` | Upsell opportunity |

This architecture allows:
- ✅ Different templates with different capabilities
- ✅ Variant selection within sections
- ✅ Dynamic field rendering based on variant
- ✅ Template-specific validation
- ✅ Premium template upsells
- ✅ Version control for templates
- ✅ Easy addition of new templates
