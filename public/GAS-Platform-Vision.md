# GAS Platform Vision

## What GAS Is

**GAS is a FREE Accommodation Inventory Management System.**

Property owners upload their units for free. The one requirement: they must connect via a Channel Manager (their booking engine). They don't have to have a website, use our apps, or promote their properties on our Travel Agent network - those are optional paid services.

**GAS is NOT a booking engine.** Bookings always flow through the property owner's Channel Manager.

---

## Core Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                              GAS CORE                                    │
│               Accommodation Inventory Management System                  │
│                                                                          │
│   • FREE to upload and store Units                                      │
│   • Central inventory hub                                               │
│   • Property details, photos, amenities, pricing display               │
│   • Guest data, reviews aggregation                                    │
│                                                                          │
│   REQUIREMENT: Must connect via a Channel Manager                       │
│   (That's where bookings actually happen)                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐         ┌──────────┐
        │  Beds24  │          │  Smoobu  │         │  Calry   │
        │ BOOKING  │          │ BOOKING  │         │  (40+)   │
        │ ENGINE   │          │ ENGINE   │         │ ENGINES  │
        └──────────┘          └──────────┘         └──────────┘
```

---

## Who Uses What

### Property Owner
- Uploads units to GAS (FREE)
- Connects their CM (Beds24, Smoobu, etc.) - REQUIRED
- Optional: GAS website, travel agent distribution, apps

### Travel Agent
- Browses GAS inventory network
- Creates curated property collections
- Own branded site with GAS widgets (no iframes)
- Books via property's CM (earns commission)

### Guest
- Finds property via: Owner's site, Travel Agent site, or GAS directory
- Books via the property's CM
- Never knows GAS exists (it's infrastructure)

---

## GAS as the Hub

```
                    ┌─────────────────┐
                    │   TRAVEL AGENT  │
                    │     SITES       │
                    └────────┬────────┘
                             │
┌──────────────┐     ┌───────┴───────┐     ┌──────────────┐
│   OWNER'S    │     │               │     │    GAS       │
│   WEBSITE    ├────►│   GAS CORE    │◄────┤  DIRECTORY   │
│  (optional)  │     │  (Inventory)  │     │  (optional)  │
└──────────────┘     └───────┬───────┘     └──────────────┘
                             │
                    ┌────────┴────────┐
                    │  CHANNEL MANAGER │
                    │  (Booking Engine)│
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │     OTAs        │
                    │ Airbnb/Booking  │
                    └─────────────────┘
```

---

## Booking Flow

```
User searches on GAS-powered site
              │
              ▼
GAS returns availability (synced from CM)
              │
              ▼
User selects room/dates
              │
              ▼
Redirect to CM booking page
OR embedded CM checkout
(GAS never processes payment)
              │
              ▼
CM confirms booking
              │
              ▼
CM syncs reservation back to GAS
(for display/management only)
```

---

## FREE vs PAID

| FREE | PAID (Optional) |
|------|-----------------|
| Upload unlimited units | GAS-hosted websites |
| Store property details | Custom domains |
| Connect to your CM | Travel agent distribution |
| Basic dashboard | Premium themes |
| Inventory management | Apps (future) |
| | Advanced analytics |
| | Multi-property tools |

---

## Revenue Streams

1. **Websites** - Build & host sites for properties
2. **Distribution** - List on GAS Travel Agent network
3. **Premium Features** - Advanced tools, analytics, themes
4. **Travel Agent Subscriptions** - Agents pay to access inventory
5. **Transaction Fees** - Optional % on bookings via GAS sites/agents

---

## User Segments & Product Tiers

### Segment A: "Just Works"
- Non-technical property owners
- Want turnkey website solution
- Don't want to see WordPress
- **Product: Starter Tier**

### Segment B: "Some Control"
- Semi-technical, Wix-level comfort
- Want some customization
- **Product: Pro Tier**

### Segment C: "Has Developer"
- Tech-savvy or has web dev
- Wants full access, may self-host
- **Product: Developer Tier**

### Segment D: "Existing Site"
- Already has WordPress site
- Just wants GAS widgets/plugin
- **Product: Plugin Only**

### Segment E: "Travel Agent"
- Sells multiple properties
- Own branding, curated collections
- **Product: Agent Portal**

---

## Product Tiers

| Feature | Starter | Pro | Developer | Plugin Only |
|---------|---------|-----|-----------|-------------|
| GAS Inventory (free) | ✅ | ✅ | ✅ | ✅ |
| CM Connection (required) | ✅ | ✅ | ✅ | ✅ |
| GAS Website Builder | ✅ | ✅ | ✅ | ❌ |
| Pre-built Theme | ✅ Locked | ✅ Limited | ✅ Full | ❌ |
| WordPress Admin | ❌ Hidden | ⚠️ Limited | ✅ Full | N/A |
| Add Sub-pages | ❌ | ✅ Simple | ✅ Full | N/A |
| Install Plugins | ❌ | ❌ | ✅ | N/A |
| Self-host Option | ❌ | ❌ | ✅ | ✅ |
| Custom Domain | ✅ | ✅ | ✅ | N/A |

---

## Theme Architecture

One theme with multiple modes:

```
gas-theme/
├── functions.php          # Mode detection + restrictions
├── inc/
│   ├── mode-starter.php   # Lock everything
│   ├── mode-pro.php       # Limited access
│   └── mode-developer.php # Full access
└── ...
```

Mode set via:
```php
define('GAS_THEME_MODE', 'starter'); // starter | pro | developer
define('GAS_WEBSITE_ID', 'WEB-ABC123');
```

---

## Website Builder Flow

### Step 1: Create Website
- Enter website name
- Select template (Developer, Boutique, Minimal, etc.)
- Creates website record (status: DRAFT)

### Step 2: Setup Wizard (in GAS)
- Template schema defines required/optional sections
- User completes: Header, Hero, Rooms, Footer (required)
- Progress tracked
- Preview available

### Step 3: Deploy
- All required sections complete
- Click "Deploy Site"
- GAS provisions WordPress site
- Pushes settings
- Status: ACTIVE

### Step 4: Live - Edit Anywhere
- Edit in GAS Website Builder → Push to WordPress
- Edit in WordPress Customizer → Push to GAS
- Two-way sync keeps both in sync

---

## Two-Way Sync

```
┌─────────────────┐                         ┌─────────────────┐
│   GAS Admin     │   GAS → WordPress       │   WordPress     │
│   Website       │ ───────────────────────→│   Customizer    │
│   Builder       │                         │                 │
│                 │   WordPress → GAS       │                 │
│   website_      │ ←───────────────────────│   theme_mods    │
│   settings      │                         │                 │
└─────────────────┘                         └─────────────────┘
```

---

## GasSync Integration Buffer

All external integrations flow through GasSync - never touch GAS core directly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL WORLD                                  │
│   Partners    Beds24    Smoobu    Calry    Future CMs    Travel Agents  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ★ GASSYNC ★                                    │
│                       Integration Buffer                                 │
│                                                                          │
│   • Standardised API (Calry-compatible schema)                          │
│   • Buffer tables: int_sources, int_properties, int_reservations       │
│   • Maps to GAS core via int_mappings                                   │
│   • Protects core from external corruption                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           GAS CORE                                       │
│   accounts, properties, bookable_units, bookings, guests, websites      │
│   ★ NO external system fields ★ NO CM-specific columns ★ Protected    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Widgets (No iFrames)

Native JavaScript, renders in-page:

```html
<div id="gas-search"></div>
<script src="https://gas.travel/widget.js"></script>
<script>
  GAS.init({
    websiteId: 'WEB-ABC123',
    container: '#gas-search',
    type: 'search',
    onBook: function(dates, unit) {
      // Redirects to CM's booking page
    }
  });
</script>
```

**Widget types:** Search, Room Grid, Single Room, Booking Form, Reviews

---

## Future Platform Expansion

```
                    ┌─────────────────┐
                    │  GAS CORE API   │
                    └────────┬────────┘
                             │
       ┌──────────┬──────────┼──────────┬──────────┐
       ▼          ▼          ▼          ▼          ▼
  WordPress    Wix       Squarespace  GoDaddy   Custom
   Plugin    Widget       Widget      Widget     API
```

---

## Implementation Phases

**Phase 1: Foundation (Current)**
- ✅ Core inventory system
- ✅ Developer theme
- ✅ GAS Admin dashboard
- ✅ Multi-website structure
- 🔄 Website Builder (per-website settings)

**Phase 2: Website Builder Complete**
- Theme schema system
- Setup wizard flow
- Two-way sync (GAS ↔ WordPress)

**Phase 3: Tier Lockdown**
- Theme modes (starter/pro/developer)
- WordPress restrictions per tier
- Billing enforcement

**Phase 4: GasSync Buffer**
- Integration layer tables
- Calry-compatible API
- Partner integration framework

**Phase 5: Platform Expansion**
- Universal embed widgets
- Wix/Squarespace plugins
- Travel agent portal

---

## The Vision

> **GAS is a FREE Accommodation Inventory Management System where property owners upload their units (must connect via a Channel Manager). GAS provides optional paid services: websites, travel agent distribution, and apps. Bookings always flow through the owner's Channel Manager - GAS never processes payments. Travel agents access the GAS inventory network to curate and sell properties, booking via the property's CM.**

*GAS is a facilitator. Data flows in, GAS does its magic, data flows out. Clean, protected, independent.*
