# GAS Marketing Suite

## Complete Documentation & Schema Reference

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Product Tiers](#product-tiers)
4. [Feature Breakdown](#feature-breakdown)
5. [Database Schema](#database-schema)
6. [SEO Rules & Standards](#seo-rules--standards)
7. [Build Phases](#build-phases)
8. [API Endpoints](#api-endpoints)

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

## Product Tiers

| Tier | Price | Features |
|------|-------|----------|
| **SEO Basic** | Free | Auto meta tags, sitemap, basic schema, Open Graph |
| **SEO Pro** | £25/mo | Blog, attractions, guides, GSC integration, keyword reports |
| **Social Connect** | £35/mo | Connect platforms, manual posting, scheduling, basic analytics |
| **Marketing Suite** | £75/mo | AI gap scanner, auto-content, email campaigns, full CRM, ROI tracking |
| **Enterprise** | £150/mo | Everything + dedicated support + API access + custom integrations |

### Revenue Projection

- 100 clients × SEO Pro (£25) = £2,500/month
- 50 clients × Social Connect (£35) = £1,750/month
- 30 clients × Marketing Suite (£75) = £2,250/month
- 10 clients × Enterprise (£150) = £1,500/month

**Total potential: £8,000/month = £96,000/year**

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
- `LocalBusiness` for attractions

#### Technical SEO
- Auto-generated sitemap.xml
- Robots.txt management
- Canonical URLs
- Open Graph tags (Facebook)
- Twitter Card tags

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
- `utm_source`: facebook, instagram, email, google
- `utm_medium`: social, email, organic, paid
- `utm_campaign`: campaign name
- `utm_content`: specific post/email
- `utm_term`: keyword (if applicable)

#### Attribution Models
- **First touch**: What originally brought them in
- **Last touch**: What triggered the booking
- **Linear**: Credit spread across all touchpoints

#### Revenue Tracking
- Bookings linked to campaigns
- Revenue per email campaign
- Revenue per social post
- ROI calculations

---

## SEO Rules & Standards

### Meta Title
- **Length**: 50-60 characters (truncates at ~60)
- **Format**: `Primary Keyword | Secondary | Brand`
- **Rules**:
  - Front-load important keywords
  - Each page unique
  - Include location
  - Use `|` or `-` separators
  - No keyword stuffing

**Examples**:
```
Good: "Luxury Cottage in Bath | Hot Tub & Garden | Book Direct"
Bad:  "Cottage Bath UK Holiday Rental Accommodation Booking"
```

### Meta Description
- **Length**: 150-160 characters
- **Purpose**: Sell the click
- **Include**:
  - Call to action
  - Unique selling point
  - Location
- **Rules**:
  - Each page unique
  - No quotes (breaks tag)
  - Active voice

**Examples**:
```
Good: "Charming 3-bed cottage in central Bath with private hot tub. 
       Walk to Roman Baths. Free parking. Book direct for best rates."
Bad:  "This is a cottage in Bath. It has 3 bedrooms and a hot tub."
```

### Open Graph Tags
```html
<meta property="og:title" content="Title (same as or similar to meta)">
<meta property="og:description" content="Can be up to 200 chars">
<meta property="og:image" content="1200x630px image URL">
<meta property="og:url" content="Canonical URL">
<meta property="og:type" content="website">
```

### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Title">
<meta name="twitter:description" content="Description">
<meta name="twitter:image" content="Image URL">
```

### Schema.org - LodgingBusiness
```json
{
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": "Property Name",
  "description": "Property description",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Bath",
    "addressRegion": "Somerset",
    "postalCode": "BA1 1AA",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "51.3811",
    "longitude": "-2.3590"
  },
  "image": ["url1", "url2"],
  "priceRange": "££",
  "telephone": "+44 1234 567890",
  "url": "https://property-url.com",
  "amenityFeature": [
    {"@type": "LocationFeatureSpecification", "name": "Hot Tub"},
    {"@type": "LocationFeatureSpecification", "name": "Free Parking"},
    {"@type": "LocationFeatureSpecification", "name": "WiFi"}
  ],
  "checkinTime": "15:00",
  "checkoutTime": "10:00"
}
```

### Schema.org - FAQPage
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
        "text": "Check-in is from 3pm. Early check-in may be available on request."
      }
    },
    {
      "@type": "Question",
      "name": "Is parking available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, free private parking is available on-site for up to 2 vehicles."
      }
    }
  ]
}
```

### Canonical URLs
```html
<link rel="canonical" href="https://domain.com/property/property-slug">
```

### Sitemap.xml Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://domain.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://domain.com/property/lovely-cottage</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## Database Schema

### 1. SEO Settings

```sql
CREATE TABLE seo_settings (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- Meta overrides (null = auto-generate)
  custom_title VARCHAR(70),
  custom_description VARCHAR(170),
  keywords TEXT[],
  
  -- Connections
  google_search_console_site VARCHAR(255),
  google_analytics_id VARCHAR(50),
  google_tag_manager_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  
  -- Settings
  auto_generate_meta BOOLEAN DEFAULT true,
  include_schema_markup BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Blog Posts

```sql
CREATE TABLE blog_posts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT,
  featured_image VARCHAR(500),
  
  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(170),
  keywords TEXT[],
  
  -- Categorisation
  category VARCHAR(100),
  tags TEXT[],
  
  -- Publishing
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  author_name VARCHAR(255),
  
  -- AI tracking
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  
  -- Stats
  views INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, slug)
);

CREATE INDEX idx_blog_posts_account ON blog_posts(account_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status, published_at);
```

### 3. Attractions

```sql
CREATE TABLE attractions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- Details
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  postcode VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(5, 2),
  
  -- External
  google_place_id VARCHAR(255),
  website VARCHAR(500),
  phone VARCHAR(50),
  
  -- Media
  images TEXT[],
  
  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(170),
  
  -- Status
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attractions_property ON attractions(property_id);
CREATE INDEX idx_attractions_category ON attractions(category);
```

### 4. Guides (Lead Magnets)

```sql
CREATE TABLE guides (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image VARCHAR(500),
  
  -- File
  file_url VARCHAR(500),
  file_type VARCHAR(20) DEFAULT 'pdf',
  
  -- Content settings
  include_attractions BOOLEAN DEFAULT true,
  attraction_categories TEXT[],
  include_property_info BOOLEAN DEFAULT true,
  custom_content TEXT,
  
  -- Lead capture
  require_email BOOLEAN DEFAULT true,
  require_name BOOLEAN DEFAULT false,
  require_phone BOOLEAN DEFAULT false,
  
  -- Stats
  downloads INTEGER DEFAULT 0,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Contacts

```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  -- Identity
  email VARCHAR(255) NOT NULL,
  email_hash VARCHAR(64),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  region VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(2),
  
  -- Source tracking
  source VARCHAR(50),
  source_id INTEGER,
  source_property_id INTEGER REFERENCES properties(id),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Consent & compliance
  email_consent BOOLEAN DEFAULT false,
  email_consent_at TIMESTAMP,
  email_consent_source VARCHAR(100),
  sms_consent BOOLEAN DEFAULT false,
  sms_consent_at TIMESTAMP,
  gdpr_lawful_basis VARCHAR(50),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  unsubscribed_at TIMESTAMP,
  bounce_type VARCHAR(20),
  bounced_at TIMESTAMP,
  
  -- Engagement scoring
  engagement_score INTEGER DEFAULT 0,
  last_email_opened TIMESTAMP,
  last_email_clicked TIMESTAMP,
  last_booking TIMESTAMP,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  
  -- Spam/quality checks
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  spam_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, email)
);

CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email_hash);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_source ON contacts(source);
```

### 6. Contact Tags

```sql
CREATE TABLE contact_tags (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  description TEXT,
  auto_apply_rules JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, name)
);

CREATE TABLE contact_tag_assignments (
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES contact_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(50),
  PRIMARY KEY (contact_id, tag_id)
);
```

### 7. Contact Lists

```sql
CREATE TABLE contact_lists (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'static',
  dynamic_rules JSONB,
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contact_list_members (
  list_id INTEGER REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (list_id, contact_id)
);
```

### 8. Contact Activity

```sql
CREATE TABLE contact_activity (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  activity_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_activity_contact ON contact_activity(contact_id);
CREATE INDEX idx_contact_activity_type ON contact_activity(activity_type);
```

### 9. Email Templates

```sql
CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  preview_text VARCHAR(255),
  
  -- Content
  html_content TEXT,
  text_content TEXT,
  template_type VARCHAR(50),
  
  -- Design
  design_json JSONB,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 10. Email Campaigns

```sql
CREATE TABLE email_campaigns (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  preview_text VARCHAR(255),
  from_name VARCHAR(100),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  
  -- Content
  template_id INTEGER REFERENCES email_templates(id),
  html_content TEXT,
  text_content TEXT,
  
  -- Targeting
  list_ids INTEGER[],
  tag_ids INTEGER[],
  segment_rules JSONB,
  
  -- Scheduling
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- AI generation
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  gap_offer_id INTEGER,
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,
  
  -- Revenue tracking
  bookings_attributed INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_account ON email_campaigns(account_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
```

### 11. Email Sends

```sql
CREATE TABLE email_sends (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Personalization snapshot
  to_email VARCHAR(255),
  to_name VARCHAR(255),
  subject_rendered VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Tracking
  opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMP,
  open_count INTEGER DEFAULT 0,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  
  -- Issues
  bounce_type VARCHAR(20),
  bounce_reason TEXT,
  bounced_at TIMESTAMP,
  complained_at TIMESTAMP,
  
  -- External IDs
  esp_message_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact ON email_sends(contact_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
```

### 12. Email Clicks

```sql
CREATE TABLE email_clicks (
  id SERIAL PRIMARY KEY,
  send_id INTEGER REFERENCES email_sends(id) ON DELETE CASCADE,
  url TEXT,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

### 13. Email Sequences

```sql
CREATE TABLE email_sequences (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50),
  trigger_config JSONB,
  
  status VARCHAR(20) DEFAULT 'draft',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER REFERENCES email_sequences(id) ON DELETE CASCADE,
  
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  
  -- Content
  subject VARCHAR(255),
  template_id INTEGER REFERENCES email_templates(id),
  html_content TEXT,
  
  -- Conditions
  send_conditions JSONB,
  
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_sequence_enrollments (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  
  enrolled_at TIMESTAMP DEFAULT NOW(),
  next_send_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  UNIQUE(sequence_id, contact_id)
);
```

### 14. Social Connections

```sql
CREATE TABLE social_connections (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  platform VARCHAR(50) NOT NULL,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  
  -- Platform-specific IDs
  platform_user_id VARCHAR(255),
  platform_page_id VARCHAR(255),
  platform_page_name VARCHAR(255),
  platform_page_url VARCHAR(500),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  last_post_at TIMESTAMP,
  
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, platform, platform_page_id)
);
```

### 15. Social Posts

```sql
CREATE TABLE social_posts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[],
  link_url VARCHAR(500),
  link_title VARCHAR(255),
  
  -- Targeting
  platforms TEXT[],
  
  -- Scheduling
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_for TIMESTAMP,
  
  -- AI generation
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  gap_offer_id INTEGER,
  
  -- Approval workflow
  approval_required BOOLEAN DEFAULT false,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE social_post_publishes (
  id SERIAL PRIMARY KEY,
  social_post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  connection_id INTEGER REFERENCES social_connections(id),
  
  platform VARCHAR(50),
  platform_post_id VARCHAR(255),
  platform_post_url VARCHAR(500),
  
  status VARCHAR(20) DEFAULT 'pending',
  posted_at TIMESTAMP,
  error_message TEXT,
  
  -- Engagement stats
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  stats_updated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_posts_account ON social_posts(account_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
```

### 16. Availability Rules (AI Gap Scanner)

```sql
CREATE TABLE availability_rules (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  -- What to look for
  min_gap_nights INTEGER DEFAULT 2,
  look_ahead_days INTEGER DEFAULT 60,
  
  -- Constraints
  min_days_before INTEGER DEFAULT 7,
  max_days_before INTEGER DEFAULT 45,
  max_discount_percent INTEGER DEFAULT 25,
  min_night_stay INTEGER DEFAULT 1,
  
  -- Exclusions
  excluded_dates JSONB,
  excluded_periods JSONB,
  excluded_days_of_week INTEGER[],
  
  -- Frequency limits
  max_posts_per_week INTEGER DEFAULT 3,
  max_emails_per_month INTEGER DEFAULT 4,
  
  -- Automation level
  auto_create_offers BOOLEAN DEFAULT false,
  auto_post_social BOOLEAN DEFAULT false,
  auto_send_email BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT true,
  
  -- Notification
  notify_email VARCHAR(255),
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 17. Availability Gaps (Detected)

```sql
CREATE TABLE availability_gaps (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  rule_id INTEGER REFERENCES availability_rules(id),
  
  -- Gap details
  gap_start DATE NOT NULL,
  gap_end DATE NOT NULL,
  gap_nights INTEGER,
  
  -- Context
  days_until_start INTEGER,
  surrounding_occupancy DECIMAL(5, 2),
  
  -- AI recommendations
  suggested_discount INTEGER,
  suggested_offer_text TEXT,
  suggested_social_post TEXT,
  suggested_email_subject TEXT,
  
  -- Actions taken
  offer_created BOOLEAN DEFAULT false,
  offer_id INTEGER,
  social_post_created BOOLEAN DEFAULT false,
  social_post_id INTEGER,
  email_campaign_created BOOLEAN DEFAULT false,
  email_campaign_id INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'new',
  actioned_at TIMESTAMP,
  filled_at TIMESTAMP,
  
  detected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_availability_gaps_property ON availability_gaps(property_id);
CREATE INDEX idx_availability_gaps_dates ON availability_gaps(gap_start, gap_end);
CREATE INDEX idx_availability_gaps_status ON availability_gaps(status);
```

### 18. Link Tracking

```sql
CREATE TABLE link_tracking (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  -- Original and short URL
  original_url TEXT NOT NULL,
  short_code VARCHAR(20) UNIQUE,
  
  -- UTM parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  
  -- Source reference
  source_type VARCHAR(50),
  source_id INTEGER,
  
  -- Stats
  click_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE link_clicks (
  id SERIAL PRIMARY KEY,
  link_id INTEGER REFERENCES link_tracking(id),
  
  contact_id INTEGER REFERENCES contacts(id),
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  clicked_at TIMESTAMP DEFAULT NOW()
);
```

### 19. Booking Attribution

```sql
CREATE TABLE booking_attribution (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  
  -- Attribution chain
  first_touch_source VARCHAR(100),
  first_touch_medium VARCHAR(100),
  first_touch_campaign VARCHAR(100),
  first_touch_at TIMESTAMP,
  
  last_touch_source VARCHAR(100),
  last_touch_medium VARCHAR(100),
  last_touch_campaign VARCHAR(100),
  last_touch_at TIMESTAMP,
  
  -- Specific attributions
  email_campaign_id INTEGER REFERENCES email_campaigns(id),
  social_post_id INTEGER REFERENCES social_posts(id),
  gap_offer_id INTEGER,
  
  -- Revenue
  booking_value DECIMAL(10, 2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 20. FAQs

```sql
CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  property_id INTEGER REFERENCES properties(id),
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  category VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  
  -- Where to show
  show_on_website BOOLEAN DEFAULT true,
  include_in_schema BOOLEAN DEFAULT true,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_faqs_property ON faqs(property_id);
```

### 21. Contact Imports

```sql
CREATE TABLE contact_imports (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  
  filename VARCHAR(255),
  file_url VARCHAR(500),
  
  -- Mapping
  column_mapping JSONB,
  
  -- Stats
  total_rows INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  invalid INTEGER DEFAULT 0,
  
  -- Spam check results
  spam_checked BOOLEAN DEFAULT false,
  high_risk_count INTEGER DEFAULT 0,
  
  -- Settings
  default_tags INTEGER[],
  default_list_id INTEGER REFERENCES contact_lists(id),
  consent_source VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  
  imported_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## Build Phases

### Phase 1 - SEO Foundation (Free Tier)
- [ ] Auto-generate meta title/description for properties
- [ ] Add Open Graph and Twitter Card tags
- [ ] Generate Schema.org LodgingBusiness markup
- [ ] Create sitemap.xml endpoint
- [ ] Create robots.txt endpoint
- [ ] FAQs table and admin UI
- [ ] FAQ Schema markup generation
- [ ] SEO settings table (for future overrides)

### Phase 2 - Content System (SEO Pro)
- [ ] Blog posts CRUD
- [ ] Blog list/detail pages
- [ ] Attractions CRUD
- [ ] Guides (lead magnets) system
- [ ] Guide download with email capture
- [ ] Basic contacts table (from guide downloads)

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

### SEO

```
GET  /api/seo/settings/:propertyId
PUT  /api/seo/settings/:propertyId
GET  /api/seo/meta/:propertyId          # Returns generated/custom meta
GET  /sitemap.xml
GET  /robots.txt
```

### FAQs

```
GET    /api/admin/faqs?property_id=X
POST   /api/admin/faqs
PUT    /api/admin/faqs/:id
DELETE /api/admin/faqs/:id
GET    /api/public/faqs/:propertyId     # For website display
```

### Blogs

```
GET    /api/admin/blogs
POST   /api/admin/blogs
PUT    /api/admin/blogs/:id
DELETE /api/admin/blogs/:id
GET    /api/public/blogs/:accountId     # Published posts
GET    /api/public/blog/:slug           # Single post
```

### Attractions

```
GET    /api/admin/attractions?property_id=X
POST   /api/admin/attractions
PUT    /api/admin/attractions/:id
DELETE /api/admin/attractions/:id
GET    /api/public/attractions/:propertyId
```

### Guides

```
GET    /api/admin/guides
POST   /api/admin/guides
PUT    /api/admin/guides/:id
DELETE /api/admin/guides/:id
GET    /api/public/guide/:slug
POST   /api/public/guide/:id/download   # Captures email, returns PDF
```

### Contacts

```
GET    /api/admin/contacts?list_id=X&tag_id=Y
POST   /api/admin/contacts
PUT    /api/admin/contacts/:id
DELETE /api/admin/contacts/:id
POST   /api/admin/contacts/import       # CSV upload
GET    /api/admin/contacts/:id/activity
```

### Tags & Lists

```
GET    /api/admin/contact-tags
POST   /api/admin/contact-tags
PUT    /api/admin/contact-tags/:id
DELETE /api/admin/contact-tags/:id

GET    /api/admin/contact-lists
POST   /api/admin/contact-lists
PUT    /api/admin/contact-lists/:id
DELETE /api/admin/contact-lists/:id
POST   /api/admin/contact-lists/:id/members
DELETE /api/admin/contact-lists/:id/members/:contactId
```

### Email Campaigns

```
GET    /api/admin/email-templates
POST   /api/admin/email-templates
PUT    /api/admin/email-templates/:id
DELETE /api/admin/email-templates/:id

GET    /api/admin/email-campaigns
POST   /api/admin/email-campaigns
PUT    /api/admin/email-campaigns/:id
DELETE /api/admin/email-campaigns/:id
POST   /api/admin/email-campaigns/:id/send
POST   /api/admin/email-campaigns/:id/schedule
GET    /api/admin/email-campaigns/:id/stats
```

### Social

```
GET    /api/admin/social-connections
POST   /api/admin/social-connections/connect/:platform
DELETE /api/admin/social-connections/:id

GET    /api/admin/social-posts
POST   /api/admin/social-posts
PUT    /api/admin/social-posts/:id
DELETE /api/admin/social-posts/:id
POST   /api/admin/social-posts/:id/publish
POST   /api/admin/social-posts/:id/schedule
```

### Gap Scanner

```
GET    /api/admin/availability-rules?property_id=X
POST   /api/admin/availability-rules
PUT    /api/admin/availability-rules/:id
DELETE /api/admin/availability-rules/:id

GET    /api/admin/availability-gaps?property_id=X&status=new
PUT    /api/admin/availability-gaps/:id/action   # approve, reject, ignore
POST   /api/admin/availability-gaps/scan         # Manual trigger
```

### Tracking

```
GET    /api/track/click/:shortCode      # Redirect with tracking
GET    /api/track/open/:sendId          # Pixel tracking
POST   /api/track/unsubscribe/:contactId
```

---

## Notes

### Email Service Provider Options
- **SendGrid** - Good deliverability, reasonable pricing
- **Postmark** - Excellent for transactional, premium deliverability
- **Amazon SES** - Cheapest at scale, more setup required
- **Mailgun** - Good balance of features and price

### Social API Limitations
- **Facebook/Instagram** - Requires Business verification, limited post types
- **Twitter/X** - API access now paid, limited free tier
- **Google Business** - Great for local SEO, posts expire after 7 days

### GDPR Considerations
- Always capture consent with timestamp
- Provide easy unsubscribe
- Honor data deletion requests
- Keep audit trail of consent

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: GAS Development Team*
