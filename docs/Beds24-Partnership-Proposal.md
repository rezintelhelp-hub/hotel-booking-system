# GAS x Beds24 — Partnership Proposal

## The Opportunity

Beds24 has 10,000+ property owners who need websites. Most are using generic templates, paying commissions to OTAs, or have no direct booking presence at all. GAS turns their Beds24 data into a professional, bookable website in under 60 seconds — no technical knowledge required.

One click in the Beds24 marketplace, instant website, direct bookings, more revenue for the property owner.

Every website GAS creates is a client that stays on Beds24 longer, books more, and earns more.

---

## The Marketplace Experience

### Inside Beds24 — Two Tabs

Just like the Airbnb and Booking.com integrations, the GAS marketplace page gives clients a familiar two-tab experience:

**Tab 1: Connection**
- Property dropdown (select which property to build a website for)
- Room mapping: enable/disable which rooms appear on the website
- Connection status indicator
- Save button

**Tab 2: Website Content**
- Checklist showing which Beds24 fields are complete for website creation
- Each field links directly to the Beds24 settings page where the client fills it in
- Progress bar showing completion status
- Green ticks for complete fields, red crosses for missing ones
- When all required fields are done, the "Create Your Website" button activates

**Required Fields (from existing Beds24 data):**
- Property name and description
- Street address, city, country, postcode
- Latitude/longitude
- Property type
- Property images (minimum 3)
- Room names and descriptions
- Room images
- Max guests per room
- Currency
- Language

Most clients will already have this completed for their OTA listings.

### On GAS — The Quick Wizard

When the client clicks "Create Your Website", they land on GAS with all their Beds24 data already loaded:

**Step 1: Design Your Site**
- Pick a template (3 professional designs with live previews)
- Choose a primary colour (or auto-detected from their images)
- Upload a logo (optional — property name used if none)
- Select hero image (auto-picked from their best property photo)

**Step 2: Confirm and Launch**
- Live preview of their website with all Beds24 data populated
- Choose domain: yourname.gas.travel (free) or enter a custom domain
- Select subscription tier
- Click "Launch My Website"

**Done. Site is live.**

GAS account created. WordPress site deployed. All Beds24 data synced. Ongoing availability, pricing, and booking sync via master API key and webhooks.

---

## What GAS Creates From Beds24 Data

| Beds24 Data | GAS Website Output |
|---|---|
| Property name and description | Homepage hero, about section |
| Room types and descriptions | Rooms page with live availability |
| Property and room images | Hero images, galleries, room photos |
| Pricing and availability | Real-time booking engine |
| Check-in/out times | Automated guest communications |
| Location/address | Contact page with interactive map |
| Amenities | Property features display |

### Plus GAS adds:
- AI-generated SEO content (blog posts, meta descriptions)
- Multilingual support (11 languages with auto-translate)
- Guest reviews integration
- Mobile-optimised responsive design
- SSL certificates, custom domains
- Channel manager sync (Beds24 stays the source of truth)

---

## Revenue Model

### Subscription Tiers

| Tier | Monthly | Annual | What They Get |
|---|---|---|---|
| Instant Website | $29/mo | $290/yr | Professional website, booking engine, basic templates |
| Instant Website Pro | $49/mo | $490/yr | + Pro Site Builder, WYSIWYG editing, premium templates |
| Plugin Only | $19.99/mo | $199/yr | Booking widget for existing website |

### Revenue Share: 20% to Beds24

| Scenario | Monthly Revenue | Beds24 Share (20%) |
|---|---|---|
| 100 clients at Instant Website | $2,900/mo | $580/mo |
| 500 clients at Instant Website | $14,500/mo | $2,900/mo |
| 1,000 clients at mixed tiers | $35,000/mo | $7,000/mo |

Revenue share applies to both monthly subscriptions and annual plans.

### Setup Fees (Custom/Bespoke Sites)

| Tier | Setup Fee | Beds24 Share (20%) |
|---|---|---|
| Custom Bespoke | $2,500 | $500 |

---

## Reporting and Transparency

GAS provides Beds24 with:

**Real-time dashboard** accessible at any time:
- Total referred clients
- Active subscriptions by tier
- Monthly recurring revenue
- Beds24's 20% share calculated automatically
- Client list with sign-up dates, status, and revenue

**Monthly summary report** via PDF/email with full revenue breakdown.

**API endpoint** if Beds24 wants to pull reporting data into their own systems.

---

## Technical Integration

### What We Need From Beds24

1. Master API key — V2 token refresh (existing V1 key is active)
2. Marketplace listing update — rebrand "Rezintel" to "GAS" with new description and logo
3. Two-tab marketplace layout — Connection tab + Website Content tab (matching Airbnb/Booking.com pattern)
4. "Create Your Website" button URL pointing to GAS with the client's Beds24 account ID
5. Wiki page update — replace old Rezintel instructions with GAS onboarding guide

### What GAS Handles (Zero Effort From Beds24)

- Website creation and hosting
- SSL certificates and DNS management
- Booking engine and payment processing
- Content sync from Beds24 (real-time via webhooks + daily full sync)
- AI content generation for SEO
- Multilingual translations (11 languages)
- Customer support for all website-related issues
- Revenue tracking, reporting, and share calculations

### Architecture

The integration uses the Beds24 Master API Key. No per-client tokens, no invite codes, no manual setup.

Client clicks "Create Your Website" in Beds24 marketplace. GAS receives their Beds24 account ID. GAS uses the master key to pull all property data (rooms, images, pricing, availability). GAS creates the account, deploys the website, and starts ongoing sync. Beds24 webhooks keep availability and bookings in real-time sync.

---

## Live Examples

Sites already built on GAS:

- hotelbalduin.de
- kiwicasas.es
- hotelmonpas.com
- beachbreakguesthouse.com
- thehotelcaracas.com
- pensionaussie.com
- sansebastianguesthouses.com
- book.rocketstay.com
- lgstays.com

Full gallery: admin.gas.travel/gallery

---

## Timeline

| Phase | What | When |
|---|---|---|
| Now | Rebrand marketplace listing, refresh API tokens | This week |
| Week 1-2 | Build Beds24 onboarding wizard and content checklist | 2 weeks |
| Week 2 | Revenue reporting dashboard | Same sprint |
| Week 3 | Beta test with 5 Beds24 clients | 1 week |
| Week 4 | Live launch in marketplace | Go live |

---

## Summary

- Beds24 clients get a professional website in 60 seconds
- Zero content entry — everything pulled from what they already have in Beds24
- Familiar interface — same tab pattern as Airbnb and Booking.com setup
- Beds24 earns 20% recurring revenue with zero development effort
- GAS handles everything — build, host, support, sync
- Clients stay on Beds24 and book MORE through it
- Real-time revenue reporting and full transparency

---

Steve Driver
GAS — Global Accommodation System
steve@gas.travel | gas.travel
