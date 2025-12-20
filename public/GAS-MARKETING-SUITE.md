# GAS Marketing Suite

## Complete Documentation & Schema Reference

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [WordPress Plugin Ecosystem](#wordpress-plugin-ecosystem)
4. [Product Tiers](#product-tiers)
5. [Feature Breakdown](#feature-breakdown)
6. [Database Schema](#database-schema)
7. [SEO Rules & Standards](#seo-rules--standards)
8. [Build Phases](#build-phases)
9. [API Endpoints](#api-endpoints)

---

## Overview

The GAS Marketing Suite is an integrated system that combines:

- **SEO Management** - Auto-generated and customisable meta tags, schema markup, sitemaps
- **Content System** - Blogs, attractions, downloadable guides (lead magnets)
- **Contact Management** - Full CRM with source tracking, segmentation, consent management
- **Email Marketing** - Campaigns, sequences, automation, full analytics
- **Social Media** - Multi-platform posting, scheduling, engagement tracking
- **AI Automation** - Gap detection, content generation, smart targeting
- **Attribution Tracking** - Full ROI measurement across all channels

**Key Principle:** The system works via WordPress plugins, meaning clients benefit from SEO and marketing features regardless of whether they use GAS themes or their own WordPress themes.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         GAS MARKETING SUITE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   DATA SOURCES                     PROCESSING              OUTPUTS         │
│   ────────────                     ──────────              ───────         │
│                                                                            │
│   ┌──────────────┐                                    ┌─────────────────┐  │
│   │ BOOKINGS     │──┐                                 │ SOCIAL POSTS    │  │
│   │ Guest emails │  │                                 │ FB/IG/X/Google  │  │
│   └──────────────┘  │                                 └─────────────────┘  │
│                     │         ┌──────────────┐                 ▲           │
│   ┌──────────────┐  │         │              │                 │           │
│   │ LEAD MAGNETS │──┼────────▶│  AI ENGINE   │─────────────────┤           │
│   │ Guide d/loads│  │         │              │                 │           │
│   └──────────────┘  │         │ - Gap scan   │        ┌─────────────────┐  │
│                     │         │ - Targeting  │        │ EMAIL CAMPAIGNS │  │
│   ┌──────────────┐  │         │ - Content    │        │ Newsletters     │  │
│   │ UPLOADED     │──┤         │ - Segments   │────────│ Offers          │  │
│   │ CONTACTS     │  │         │              │        │ Sequences       │  │
│   └──────────────┘  │         └──────────────┘        └─────────────────┘  │
│                     │                │                         ▲           │
│   ┌──────────────┐  │                │                         │           │
│   │ AVAILABILITY │──┘                │                ┌─────────────────┐  │
│   │ Dead spots   │                   │                │ BLOG/SEO        │  │
│   └──────────────┘                   │                │ Content pages   │  │
│                                      ▼                └─────────────────┘  │
│                            ┌──────────────────┐                            │
│                            │ TRACKING & ROI   │                            │
│                            │ Opens/Clicks     │                            │
│                            │ Bookings         │                            │
│                            │ Revenue          │                            │
│                            └──────────────────┘                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Contact Sources Flow

```
BOOKINGS ──────────────┐
                       │    ┌─────────────┐
GUIDE DOWNLOADS ───────┼───▶│  CONTACTS   │───▶ TAGS ───▶ SEGMENTS
                       │    │  DATABASE   │
UPLOADS (washed) ──────┤    └─────────────┘
                       │           │
WEBSITE SIGNUP ────────┘           ▼
                            ┌─────────────┐
                            │  CAMPAIGNS  │
                            │  - Email    │
                            │  - Social   │
                            │  - Offers   │
                            └─────────────┘
```

---

## WordPress Plugin Ecosystem

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORDPRESS SITE                                        │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         wp_head() Hook                               │   │
│   │                    (All plugins inject here)                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│          ▲              ▲              ▲              ▲              ▲      │
│          │              │              │              │              │      │
│   ┌──────┴──────┐ ┌─────┴─────┐ ┌──────┴──────┐ ┌─────┴─────┐ ┌──────┴────┐ │
│   │GAS Booking  │ │GAS Blog   │ │GAS Reviews  │ │GAS Attract│ │  ANY SEO  │ │
│   │  Plugin     │ │  Plugin   │ │   Plugin    │ │  Plugin   │ │  PLUGIN   │ │
│   │             │ │           │ │             │ │           │ │(Yoast etc)│ │
│   │ - Rooms     │ │ - Posts   │ │ - Reviews   │ │ - Places  │ │           │ │
│   │ - Checkout  │ │ - Article │ │ - Review    │ │ - Tourist │ │           │ │
│   │ - Search    │ │   Schema  │ │   Schema    │ │   Schema  │ │           │ │
│   │ - SEO*      │ │ - Meta    │ │             │ │ - Meta    │ │           │ │
│   └─────────────┘ └───────────┘ └─────────────┘ └───────────┘ └───────────┘ │
│          │              │              │              │                     │
│          └──────────────┼──────────────┼──────────────┘                     │
│                         ▼              ▼                                    │
│                  ┌─────────────────────────────┐                            │
│                  │       GAS API Server        │                            │
│                  │   (Syncs settings & data)   │                            │
│                  └─────────────────────────────┘                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     THEME (Any WordPress Theme)                      │   │
│   │                                                                     │   │
│   │   - GAS Developer Dark        - Divi                               │   │
│   │   - GAS Developer Light       - Elementor                          │   │
│   │   - (Future GAS themes)       - Astra                              │   │
│   │                               - Any theme with wp_head()           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

* SEO features built into GAS Booking plugin = works with ANY theme
```

### Plugin Overview

| Plugin | Version | Purpose | SEO Features | Revenue |
|--------|---------|---------|--------------|---------|
| **GAS Booking** | 1.0.108 | Core booking widget, rooms, checkout | Meta, OG, Schema (adding) | Free (drives platform) |
| **GAS Blog** | 1.0.0 | Blog posts for properties | Article schema, Meta tags | £15/mo add-on |
| **GAS Attractions** | 1.0.0 | Local guides, things to do | TouristAttraction schema | £15/mo add-on |
| **GAS Reviews** | 1.0.0 | Aggregate review display | Review schema (adding) | £15/mo add-on |

### GAS Booking Plugin (Core - Free)

**Current Features:**
- Room grid display (`[gas_rooms]`)
- Room detail pages (`[gas_room]`)
- Search widget (`[gas_search]`)
- Checkout flow (`[gas_checkout]`)
- Offers display (`[gas_offers]`)
- About/Contact/Terms/Privacy pages
- Footer shortcode
- Sync from GAS Admin (settings, styles, content)
- Custom CSS per section

**Adding (Phase 1):**
- SEO meta tags injection via `wp_head()`
- Open Graph tags
- Twitter Card tags
- Schema.org LodgingBusiness markup
- FAQPage schema (from GAS FAQs)
- Google Analytics injection
- Facebook Pixel injection

**Shortcodes:**
```
[gas_search]           - Date/guest search widget
[gas_rooms]            - Room grid with filtering
[gas_room]             - Single room detail page
[gas_checkout]         - Booking checkout flow
[gas_offers]           - Special offers display
[gas_about]            - About page content
[gas_contact]          - Contact page with map
[gas_terms]            - Terms & conditions
[gas_privacy]          - Privacy policy
[gas_footer]           - Site footer
```

### GAS Blog Plugin (£15/mo)

**Features:**
- Custom post type `gas_blog`
- Categories taxonomy
- SEO meta box (title, description, keywords)
- Featured posts
- Read time tracking
- Article schema on single posts
- Meta description injection

**Shortcodes:**
```
[gas_blog]             - Blog post grid
[gas_blog_featured]    - Featured posts only
[gas_blog_categories]  - Category filter
```

### GAS Attractions Plugin (£15/mo)

**Features:**
- Custom post type `gas_attraction`
- Categories (restaurants, activities, museums, etc.)
- Location details (address, distance, hours, price)
- Google Maps integration
- TouristAttraction schema on single pages

**Shortcodes:**
```
[gas_attractions]           - Attractions grid
[gas_attractions_map]       - Map view (future)
[gas_attractions_categories] - Category filter
```

### GAS Reviews Plugin (£15/mo)

**Features:**
- Pulls reviews from aggregator widget
- Multiple display styles (grid, slider, badge)
- Source logos (TripAdvisor, Booking.com, Google)
- Caching for performance
- Star ratings display

**Shortcodes:**
```
[gas_reviews]          - Reviews grid
[gas_reviews_badge]    - Compact badge
[gas_reviews_summary]  - Rating summary
[gas_reviews_slider]   - Carousel slider
```

**Adding:**
- Review schema markup
- AggregateRating schema

### Theme Overview

| Theme | Style | Status |
|-------|-------|--------|
| **GAS Developer Dark** | Modern dark, professional | Available |
| **GAS Developer Light** | Clean light, minimal | Available |
| (Future themes) | Various styles | Planned |

**Theme Features:**
- Auto-creates pages on activation (Home, Book Now, Room, Checkout, etc.)
- Auto-creates navigation menu
- Customizer integration for colors, fonts, layouts
- Syncs styling from GAS Admin
- Multiple header layouts (logo left/center/right, stacked)
- Hero sections, featured rooms, testimonials
- Footer with social links

**Key Point:** Themes are optional. All plugin functionality works with ANY WordPress theme that includes `<?php wp_head(); ?>` in the header.

### Data Flow: GAS Admin → WordPress

```
GAS Admin (Website Builder)
         │
         │  /api/public/client/{id}/site-config
         ▼
    ┌─────────────────────────────────────┐
    │   Settings Synced:                  │
    │   - Header (logo, colors, nav)      │
    │   - Hero (images, text, CTA)        │
    │   - Featured rooms                  │
    │   - About/Contact content           │
    │   - Footer (social, address)        │
    │   - SEO (meta, schema, analytics)*  │
    │   - FAQs*                           │
    │   - Styles (colors, fonts)          │
    └─────────────────────────────────────┘
         │
         │  Plugin "Sync from GAS" button
         ▼
    WordPress Options/Theme Mods
         │
         ▼
    Site Renders with Settings

* New SEO features being added
```

### SEO Injection Flow (New)

```
Page Load
    │
    ▼
wp_head() Hook Fires
    │
    ├──▶ GAS Booking Plugin checks:
    │         │
    │         ├── Is this a property/room page?
    │         │      └── Fetch SEO from /api/public/seo/room/{id}
    │         │
    │         ├── Is there synced SEO settings?
    │         │      └── Use custom meta title/description
    │         │
    │         ├── Are there FAQs for this property?
    │         │      └── Inject FAQPage schema
    │         │
    │         ├── Is Google Analytics configured?
    │         │      └── Inject GA script
    │         │
    │         └── Is Facebook Pixel configured?
    │                └── Inject pixel code
    │
    ├──▶ GAS Blog Plugin (if active):
    │         └── Article schema on blog posts
    │
    ├──▶ GAS Attractions Plugin (if active):
    │         └── TouristAttraction schema
    │
    └──▶ GAS Reviews Plugin (if active):
              └── Review/AggregateRating schema
```

---

## Product Tiers

| Tier | Price | Features |
|------|-------|----------|
| **SEO Basic** | Free | Auto meta tags, sitemap, basic schema, Open Graph |
| **SEO Pro** | £25/mo | Blog, attractions, guides, GSC integration, keyword reports |
| **Social Connect** | £35/mo | Connect platforms, manual posting, scheduling, basic analytics |
| **Marketing Suite** | £75/mo | AI gap scanner, auto-content, email campaigns, full CRM, ROI tracking |
| **Enterprise** | £150/mo | Everything + dedicated support + API access + custom integrations |

### Plugin Pricing (Standalone)

| Plugin | Price | Notes |
|--------|-------|-------|
| **GAS Booking** | Free | Core booking - drives platform adoption |
| **GAS Blog** | £15/mo | Or included in SEO Pro |
| **GAS Attractions** | £15/mo | Or included in SEO Pro |
| **GAS Reviews** | £15/mo | Standalone or bundled |
| **All Plugins Bundle** | £35/mo | Save vs individual |

### Revenue Projection

**Platform Subscriptions:**
- 100 clients × SEO Pro (£25) = £2,500/month
- 50 clients × Social Connect (£35) = £1,750/month
- 30 clients × Marketing Suite (£75) = £2,250/month
- 10 clients × Enterprise (£150) = £1,500/month

**Plugin Add-ons:**
- 200 clients × Blog (£15) = £3,000/month
- 150 clients × Attractions (£15) = £2,250/month
- 300 clients × Reviews (£15) = £4,500/month

**Total potential: £17,750/month = £213,000/year**

---

## Feature Breakdown

### 1. SEO Management

#### Auto-Generated Meta Tags
- **Title**: `{Property Name} | {City} | Book Direct` (50-60 chars)
- **Description**: First 120 chars of property description + location + CTA (150-160 chars)
- **Keywords**: Derived from property type, amenities, location

#### Schema.org Markup
- `LodgingBusiness` for all properties
- `Hotel`, `VacationRental`, `BedAndBreakfast` subtypes
- `FAQPage` for property FAQs
- `TouristAttraction` for attractions (via plugin)
- `Article` for blog posts (via plugin)
- `Review` / `AggregateRating` for reviews (via plugin)

#### Technical SEO
- Auto-generated sitemap.xml
- Robots.txt management
- Canonical URLs
- Open Graph tags (Facebook)
- Twitter Card tags

#### WordPress Plugin SEO Injection

All SEO is injected via `wp_head()` hook, meaning it works with:
- GAS themes
- Third-party themes (Divi, Elementor, Astra, etc.)
- Custom themes
- Any theme that follows WordPress standards

### 2. Content System

#### Blogs
- Full WYSIWYG editor
- SEO fields per post (title, description, keywords)
- Categories and tags
- Scheduling and drafts
- AI generation tracking
- View analytics

#### Attractions & Guides
- Local attractions database
- Categories: restaurants, activities, landmarks, transport, shopping
- Distance from property calculated
- Google Places integration (optional)
- Downloadable PDF guides (lead magnets)

#### Lead Magnets
- Guides require email to download
- Auto-capture to contacts database
- Source tracking
- Consent management

### 3. Contact Management

#### Data Sources
| Source | Auto-Capture | Consent |
|--------|--------------|---------|
| Bookings | Yes | Contract basis |
| Guide downloads | Yes | Explicit consent |
| Website signup | Yes | Explicit consent |
| Manual upload | Yes | Must declare basis |

#### Contact Fields
- Email, name, phone, address
- Source tracking (where they came from)
- UTM parameters
- Consent flags with timestamps
- GDPR lawful basis
- Engagement scoring
- Booking history

#### Segmentation
- **Tags**: Manual or auto-applied labels
- **Lists**: Static groupings
- **Segments**: Dynamic rules-based groups

#### Spam Protection
- Email verification on import
- Spam scoring
- Bounce tracking
- Complaint handling
- Auto-unsubscribe on hard bounce

### 4. Email Marketing

#### Campaign Types
- One-off newsletters
- Promotional offers
- Property updates
- Seasonal campaigns

#### Email Sequences (Drip Campaigns)
- Trigger: booking confirmed, guide download, tag added
- Multi-step with delays
- Conditional logic (only send if opened previous)

#### Analytics
- Sent, delivered, opened, clicked
- Unsubscribes, bounces, complaints
- Revenue attribution
- A/B testing (future)

#### Compliance
- Unsubscribe link in all emails
- Physical address required
- Consent tracking
- GDPR compliant

### 5. Social Media

#### Supported Platforms
| Platform | API | Features |
|----------|-----|----------|
| Facebook | Meta Business API | Pages, posts, offers |
| Instagram | Meta Business API | Posts, stories |
| Twitter/X | X API v2 | Tweets, threads |
| Google Business | GBP API | Posts, offers, reviews, Q&A |
| Pinterest | Pinterest API | Pins, boards |
| LinkedIn | LinkedIn API | Company posts |

#### Features
- OAuth connection per platform
- Multi-platform posting
- Scheduling
- Media upload
- Engagement tracking
- Approval workflow

### 6. AI Automation - "Fill My Gaps"

#### Gap Detection
The system scans availability calendars daily to find:
- Unbooked periods
- Gaps between bookings
- Low-demand periods
- Patterns (always empty on Tuesdays)

#### Client Rules
```
- Minimum gap to flag: 2 nights
- Look ahead: 60 days
- Don't discount more than: 25%
- Minimum days before arrival: 7
- Maximum days before arrival: 45
- Excluded dates: [Christmas, New Year]
- Max posts per week: 3
- Max emails per month: 4
- Auto-approve: Yes/No
```

#### AI Generates
- Offer with suggested discount
- Social post copy with hashtags
- Email subject and body
- Blog post for recurring gaps
- **FAQs based on property data** (new)

#### Workflow
1. AI detects gap
2. Creates draft content
3. If auto-approve: publishes within rules
4. If approval required: queues for review
5. Client approves/edits/rejects
6. Content published
7. Tracking begins

### 7. Attribution & Tracking

#### UTM Parameters
All links include:
- `utm_source` - Where from (email, facebook, google)
- `utm_medium` - Type (cpc, social, email)
- `utm_campaign` - Campaign name
- `utm_content` - Specific link/variant

#### Tracking Flow
```
Click Link with UTM
       │
       ▼
  Landing Page
       │
       ▼
 Session Stored
       │
       ▼
  Booking Made
       │
       ▼
Attribution Logged
       │
       ▼
  Revenue Tracked
```

---

## Database Schema

### 1. SEO Settings

```sql
CREATE TABLE seo_settings (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- Meta overrides (NULL = auto-generate)
  custom_title VARCHAR(70),
  custom_description VARCHAR(170),
  keywords TEXT,
  
  -- Open Graph
  og_image_url VARCHAR(500),
  og_site_name VARCHAR(100),
  
  -- Analytics
  google_analytics_id VARCHAR(20),
  google_tag_manager_id VARCHAR(20),
  facebook_pixel_id VARCHAR(20),
  
  -- Schema.org business info
  business_type VARCHAR(50) DEFAULT 'LodgingBusiness',
  business_name VARCHAR(100),
  business_phone VARCHAR(30),
  business_email VARCHAR(100),
  business_address TEXT,
  business_geo_lat DECIMAL(10,8),
  business_geo_lng DECIMAL(11,8),
  
  -- Toggles
  auto_generate_meta BOOLEAN DEFAULT true,
  include_schema_markup BOOLEAN DEFAULT true,
  include_og_tags BOOLEAN DEFAULT true,
  include_twitter_cards BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_seo_settings_property ON seo_settings(property_id) WHERE property_id IS NOT NULL;
CREATE UNIQUE INDEX idx_seo_settings_account ON seo_settings(account_id) WHERE property_id IS NULL;
```

### 2. FAQs

```sql
CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  
  show_on_website BOOLEAN DEFAULT true,
  include_in_schema BOOLEAN DEFAULT true,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_faqs_property ON faqs(property_id);
CREATE INDEX idx_faqs_account ON faqs(account_id);
```

### 3-24. [Additional Tables]

*(Blog Posts, Attractions, Guides, Contacts, Tags, Lists, Email Campaigns, Social Posts, etc. - see full schema in previous version)*

---

## SEO Rules & Standards

### Meta Title
- **Length**: 50-60 characters
- **Format**: `{Primary Keyword} | {Secondary} | {Brand}`
- **Example**: `Luxury Suite | Downtown Chicago | The Grand Hotel`

### Meta Description
- **Length**: 150-160 characters
- **Must include**: Location, unique selling point, call-to-action
- **Example**: `Book our stunning luxury suite in downtown Chicago. King bed, city views, complimentary breakfast. Best rate guaranteed - book direct and save!`

### Schema.org Markup

#### LodgingBusiness (Property)
```json
{
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": "The Grand Hotel",
  "description": "Luxury hotel in downtown Chicago...",
  "url": "https://thegrandhotel.com",
  "telephone": "+1-312-555-0100",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "Chicago",
    "addressRegion": "IL",
    "postalCode": "60601",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.8781,
    "longitude": -87.6298
  },
  "priceRange": "$$$"
}
```

#### FAQPage
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What time is check-in?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Check-in is from 3:00 PM. Early check-in may be available on request."
      }
    }
  ]
}
```

### Open Graph Tags
```html
<meta property="og:title" content="The Grand Hotel | Chicago">
<meta property="og:description" content="Luxury hotel in downtown Chicago...">
<meta property="og:image" content="https://thegrandhotel.com/og-image.jpg">
<meta property="og:url" content="https://thegrandhotel.com">
<meta property="og:type" content="website">
```

### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Grand Hotel | Chicago">
<meta name="twitter:description" content="Luxury hotel in downtown Chicago...">
<meta name="twitter:image" content="https://thegrandhotel.com/twitter-card.jpg">
```

---

## Build Phases

### Phase 1 - SEO Foundation (Free Tier) ✅ COMPLETE
- [x] FAQs table created (Migration 004)
- [x] FAQs API endpoints (CRUD + public + schema)
- [x] FAQs admin UI in gas-admin.html
- [x] FAQ Schema markup generation endpoint
- [x] SEO tab in Website Builder (GAS Admin)
- [x] Per-page SEO fields (meta title/description for each page)
- [x] SEO injection in GAS Booking plugin (wp_head hook)
- [x] Page-type detection for WordPress
- [x] Add Open Graph and Twitter Card tags
- [x] Generate Schema.org LodgingBusiness markup
- [x] Inject FAQPage schema on WordPress
- [x] Google Analytics 4 injection
- [x] Google Tag Manager injection
- [x] Facebook Pixel injection
- [x] Sitemap.xml endpoint
- [x] Robots.txt endpoint
- [x] Per-page SEO sync from GAS Admin to WordPress

**Endpoints Added:**
- `GET /api/public/faqs/:clientId` - Public FAQs list
- `GET /api/public/faqs/:clientId/schema` - FAQPage JSON-LD
- `GET /api/public/client/:clientId/sitemap.xml?baseUrl=...` - Dynamic sitemap
- `GET /api/public/client/:clientId/robots.txt?baseUrl=...` - Dynamic robots.txt

**WordPress Plugin (v1.0.114):**
- SEO tab with all settings
- Auto-injects meta tags per page type
- LodgingBusiness schema injection
- FAQPage schema injection (cached 1 hour)
- Analytics scripts injection

### Phase 2 - Content System (SEO Pro) ✅ IN PROGRESS
- [x] Blog posts CRUD in GAS Admin
- [x] Blog modal with rich text formatting
- [x] Blog categories
- [x] Blog SEO fields (meta title/description)
- [x] Attractions CRUD in GAS Admin
- [x] Attractions modal with full fields
- [x] Attractions categories
- [x] Attractions SEO fields
- [ ] Blog → WordPress sync (GAS Blog plugin)
- [ ] Attractions → WordPress sync (GAS Attractions plugin)
- [ ] Guides (lead magnets) system
- [ ] Guide download with email capture
- [ ] Basic contacts table (from guide downloads)
- [ ] AI FAQ generation from property data

### Phase 3 - Contact Management (Marketing Suite)
- [ ] Full contacts CRUD
- [ ] Contact tags system
- [ ] Contact lists (static)
- [ ] Contact import with CSV upload
- [ ] Email verification/spam scoring
- [ ] Capture contacts from bookings
- [ ] Contact activity logging

### Phase 4 - Email Marketing (Marketing Suite)
- [ ] Email templates CRUD
- [ ] Email campaigns CRUD
- [ ] Campaign sending (via SendGrid/Postmark/SES)
- [ ] Open/click tracking
- [ ] Unsubscribe handling
- [ ] Bounce handling
- [ ] Campaign analytics

### Phase 5 - Social Media (Social Connect)
- [ ] OAuth for Facebook/Instagram
- [ ] OAuth for Google Business Profile
- [ ] OAuth for Twitter/X
- [ ] Social posts CRUD
- [ ] Multi-platform publishing
- [ ] Scheduling
- [ ] Basic engagement tracking

### Phase 6 - AI Automation (Marketing Suite)
- [ ] Availability gap detection
- [ ] Automation rules configuration
- [ ] AI content generation prompts
- [ ] Approval workflow
- [ ] Auto-publishing within rules

### Phase 7 - Advanced Features (Enterprise)
- [ ] Email sequences (drip campaigns)
- [ ] Dynamic segments
- [ ] Full attribution tracking
- [ ] ROI reporting dashboard
- [ ] A/B testing
- [ ] Advanced analytics

---

## API Endpoints

### SEO & Sitemap (Phase 1 - Complete)
```
# Site Configuration (includes SEO settings)
GET  /api/public/client/:clientId/site-config

# Sitemap & Robots
GET  /api/public/client/:clientId/sitemap.xml?baseUrl=https://example.com
GET  /api/public/client/:clientId/robots.txt?baseUrl=https://example.com
```

### FAQs (Phase 1 - Complete)
```
# Admin (authenticated)
GET    /api/admin/faqs?account_id=X
GET    /api/admin/faqs/:id
POST   /api/admin/faqs
PUT    /api/admin/faqs/:id
DELETE /api/admin/faqs/:id
POST   /api/admin/faqs/reorder

# Public
GET    /api/public/faqs/:clientId              # For website display
GET    /api/public/faqs/:clientId/schema       # JSON-LD FAQPage
```

### Blogs (Phase 2 - Pending)
```
GET    /api/admin/blogs
POST   /api/admin/blogs
PUT    /api/admin/blogs/:id
DELETE /api/admin/blogs/:id
GET    /api/public/client/:clientId/blog
GET    /api/public/client/:clientId/blog/:slug
```

### Attractions (Phase 2 - Pending)
```
GET    /api/admin/attractions?account_id=X
POST   /api/admin/attractions
PUT    /api/admin/attractions/:id
DELETE /api/admin/attractions/:id
GET    /api/public/client/:clientId/attractions
GET    /api/public/client/:clientId/attractions/:slug
```

---

## WordPress Plugin Development Notes

### GAS Booking Plugin SEO Features (v1.0.114)

The SEO injection is built into the GAS Booking plugin:

1. **No extra plugin installation** - SEO comes free with booking
2. **Unified sync mechanism** - Uses existing site-config sync
3. **Works with any theme** - Injects via standard `wp_head()` hook
4. **Per-page SEO** - Detects page type and uses specific meta tags

#### Implementation Approach (Baby Steps)

**Step 1:** Add new settings group for SEO
```php
register_setting('gas_booking_seo', 'gas_seo_enabled');
register_setting('gas_booking_seo', 'gas_seo_title_template');
register_setting('gas_booking_seo', 'gas_seo_description');
register_setting('gas_booking_seo', 'gas_google_analytics_id');
```

**Step 2:** Add wp_head hook
```php
add_action('wp_head', array($this, 'inject_seo_meta'), 1);
```

**Step 3:** Inject basic meta tags
```php
public function inject_seo_meta() {
    if (!get_option('gas_seo_enabled', true)) return;
    // Inject meta description
    // Inject Open Graph
    // Inject Twitter Cards
}
```

**Step 4:** Add Schema.org JSON-LD
```php
public function inject_schema() {
    // LodgingBusiness schema
    // FAQPage schema (fetched from GAS API)
}
```

**Step 5:** Add Analytics injection
```php
public function inject_analytics() {
    $ga_id = get_option('gas_google_analytics_id');
    if ($ga_id) {
        // Inject GA4 script
    }
}
```

---

*Document Version: 2.0*
*Last Updated: December 2024*
*Author: GAS Development Team*
