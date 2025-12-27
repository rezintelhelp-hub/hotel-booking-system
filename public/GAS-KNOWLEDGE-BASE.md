# GAS Knowledge Base
## AI Support Documentation

**Version:** 1.0
**Last Updated:** December 2024

---

# SECTION 1: WHAT IS GAS?

## Overview

GAS (Global Accommodation System) is a **FREE Accommodation Inventory Management System** for hotels, B&Bs, hostels, vacation rentals, and self-catering properties.

**Key Points:**
- Property owners upload their units for FREE
- ONE REQUIREMENT: Must connect via a Channel Manager (Beds24, Smoobu, Hostaway, etc.)
- GAS is NOT a booking engine - bookings flow through the property's Channel Manager
- Optional paid services: GAS-hosted websites, travel agent distribution, premium features

## What GAS Does

1. **Stores Property Information** - Details, photos, amenities, room types
2. **Syncs with Channel Managers** - Real-time availability and pricing
3. **Provides Websites** - Beautiful, booking-enabled websites for properties
4. **Offers Marketing Tools** - Blog posts, local attractions, SEO optimization
5. **Manages Pricing** - Standard, Corporate, and Travel Agent rate tiers

## What GAS Does NOT Do

- Process payments (Channel Manager handles this)
- Replace your booking engine
- Require you to leave your current systems

---

# SECTION 2: GETTING STARTED

## Step 1: Create Your Account

When you first arrive at GAS, our AI assistant will guide you through:
1. Your property name
2. Property type (Hotel, B&B, Hostel, Vacation Rental, Self-Catering)
3. Location (town/city and country)
4. Which Channel Manager you use
5. Your email address

## Step 2: Connect Your Channel Manager

GAS currently supports direct integration with:
- **Beds24** - Full integration with property sync, room import, and pricing
- **Hostaway** - Coming soon
- **Smoobu** - Coming soon
- **Calry** - Meta-integration supporting 40+ channel managers

### Beds24 Connection Process

1. Go to **Connections** in GAS Admin
2. Click **+ Add Connection**
3. Select **Beds24**
4. You'll need your Beds24 API credentials:
   - API Key (from Beds24 > Settings > Account Access > API)
   - Prop Key (property-specific key)
5. Click **Connect** - GAS will verify and import your properties

### What Gets Imported from Beds24

- Property details (name, address, description)
- Room types and units
- Photos
- Pricing (daily rates)
- Availability calendar

## Step 3: Review Your Properties

After connecting, go to **Properties** to see your imported properties. Each property shows:
- Name and type
- Location
- Currency
- Connection status
- Account assignment

## Step 4: Set Up Your Website (Optional)

GAS can create a professional booking website for your property:
1. Go to **Websites** > **Deployed Sites**
2. Click **+ Deploy New Site**
3. Select your property
4. Choose a template
5. Your site will be live at `yourproperty.sites.gas.travel`

---

# SECTION 3: GAS ADMIN DASHBOARD

## Main Navigation

### 🏠 Dashboard
Overview of your account with quick stats and recent activity.

### 🏨 Properties
Manage your properties - view details, edit information, assign to accounts.

### 🔗 Connections
Connect and manage Channel Manager integrations (Beds24, etc.).

### 💰 Offers & Pricing
Create special offers and manage pricing tiers.

### 🌐 Websites
Manage deployed websites and website builder settings.

### ✍️ Blog
AI-powered blog post creation for your properties.

### 🎯 Attractions
Manage local attractions and points of interest near your properties.

### ⚙️ Settings
Account settings, user management, and system configuration.

---

# SECTION 4: CONNECTIONS (CHANNEL MANAGERS)

## Understanding Connections

A Connection links GAS to your Channel Manager. This allows:
- Automatic property import
- Real-time availability sync
- Pricing updates
- Booking notifications

## Connection Status

- **✅ Connected** - Active and syncing
- **⚠️ Needs Attention** - Credentials may need updating
- **❌ Disconnected** - Not currently syncing

## Beds24 Integration Details

### Initial Setup
1. Log into your Beds24 account
2. Go to Settings > Account Access > API
3. Generate or copy your API Key
4. For each property, get the Prop Key from Settings > Properties

### What Syncs
- **Properties** - Name, address, description, photos
- **Rooms** - Room types, bed configurations, amenities
- **Rates** - Daily pricing, minimum stays
- **Availability** - Calendar blocks, reservations

### Troubleshooting Beds24

**"Invalid API Key" error:**
- Check the API key is copied correctly (no extra spaces)
- Ensure API access is enabled in Beds24

**"Property not found" error:**
- Verify the Prop Key is correct
- Check the property is active in Beds24

**Rooms not importing:**
- Rooms must be set up in Beds24 first
- Check room visibility settings in Beds24

---

# SECTION 5: PROPERTIES

## Property Information

Each property in GAS stores:
- **Basic Info** - Name, type, description
- **Location** - Address, city, country, coordinates
- **Contact** - Phone, email, website
- **Media** - Photos, virtual tours
- **Amenities** - WiFi, parking, pool, etc.
- **Policies** - Check-in/out times, cancellation policy

## Property Types

- Hotel
- B&B / Guesthouse
- Hostel
- Vacation Rental
- Self-Catering
- Aparthotel
- Resort

## Rooms / Units

Each property has rooms or units:
- **Room Type** - Standard, Deluxe, Suite, etc.
- **Capacity** - Max guests, beds
- **Amenities** - Room-specific features
- **Pricing** - Base rate, seasonal rates
- **Photos** - Room images

---

# SECTION 6: OFFERS & PRICING

## Understanding Pricing Tiers

GAS supports multiple pricing tiers:

### Standard Tier
- Your regular public rates
- Shows on your website
- Can include discount offers (e.g., "Save 20%")

### Corporate Tiers (1, 2, 3)
- Negotiated rates for business clients
- Can be a percentage adjustment (+/- from standard)
- Or a fixed negotiated rate
- No discount badges shown - this IS their price

### Travel Agent Tiers (1, 2, 3)
- Commission-based rates for travel agents
- Similar to corporate - percentage or fixed
- Separate from public pricing

## Creating Offers

Offers are promotional discounts shown to guests:

1. Go to **Offers & Pricing**
2. Click **+ Add Offer**
3. Set:
   - Offer name (e.g., "Early Bird Discount")
   - Discount percentage or fixed amount
   - Valid dates
   - Which rooms it applies to
   - Minimum stay requirements

## How Pricing Shows to Guests

**Standard visitors see:**
- Base price with any applicable offers
- "Save 20%" badges on discounted rates
- Multiple rate options if configured

**Corporate/Agent visitors see:**
- Their negotiated rate only
- No discount badges
- Clean, professional pricing

---

# SECTION 7: WEBSITES

## GAS-Hosted Websites

GAS can create and host a professional website for your property:
- Custom subdomain (yourname.sites.gas.travel)
- Or your own domain
- Mobile-responsive design
- Built-in booking integration
- SEO optimized

## Website Sections

### Pages Available
- **Home** - Hero section, featured rooms, highlights
- **Rooms** - All room types with booking
- **About** - Property story and team
- **Gallery** - Photo gallery
- **Attractions** - Local things to do
- **Blog** - News and articles
- **Contact** - Contact form and map
- **Terms** - Terms and conditions
- **Privacy** - Privacy policy

### Customization Options
- Colors and branding
- Logo upload
- Section content
- Photo selection
- Custom CSS (Developer tier)

## Website Tiers

| Feature | Starter | Pro | Developer |
|---------|---------|-----|-----------|
| GAS subdomain | ✅ | ✅ | ✅ |
| Custom domain | ✅ | ✅ | ✅ |
| Theme customization | Limited | More | Full |
| WordPress access | Hidden | Limited | Full |
| Install plugins | ❌ | ❌ | ✅ |

---

# SECTION 8: BLOG

## AI-Powered Blog Creation

GAS includes AI tools to create SEO-optimized blog content for your property.

### How It Works

1. Go to **Blog** in the main menu
2. Click **🤖 Get Ideas** to generate blog topic ideas
3. Select a category:
   - **Attractions & Places** - Local guides, museums, parks
   - **Events & What's On** - Festivals, seasonal events
4. Choose a specific topic from the dropdown
5. Click **Generate Ideas**

### Blog Ideas vs Drafts

- **Ideas Tab** - AI-generated topic suggestions (not yet written)
- **Drafts Tab** - Full blog posts ready for review
- **Scheduled Tab** - Posts scheduled for future publication
- **Published Tab** - Live posts on your website

### Creating a Blog Post

1. From the Ideas tab, click **✨ Create Post** on any idea
2. AI generates the full article with:
   - SEO-optimized title
   - Content (600-800 words)
   - Meta description
   - FAQ schema for Google
3. Review and edit if needed
4. Save as draft or publish immediately

### Blog Categories

Categories help organize your content:
- Events & Holidays
- Events & Festivals
- Events & Seasonal
- Attractions & Museums
- Attractions & Parks
- Attractions & Nature
- Local Guide
- Travel Tips
- Food & Drink

---

# SECTION 9: ATTRACTIONS

## Local Attractions Feature

Add local points of interest to help guests discover the area around your property.

### How It Works

1. Go to **Attractions** in the main menu
2. Click **🤖 Suggest Places** for AI recommendations
3. Select a category:
   - 🏛️ Museums & Galleries
   - 🏰 Historic Sites & Landmarks
   - 🌳 Parks & Gardens
   - 🏖️ Beaches
   - 🎭 Entertainment
   - 🛍️ Shopping
   - 🍽️ Restaurants & Dining
   - ☕ Cafes & Coffee
   - 🌃 Nightlife & Bars
   - ⚽ Sports & Activities
   - 🌲 Nature & Outdoors
   - 👨‍👩‍👧 Family Fun
4. AI finds real local places
5. Click **Add This Place** to create the attraction

### Attraction Information

Each attraction includes:
- Name and category
- Short description (for cards)
- Full description
- Distance from your property
- Address
- Website link
- Google Maps link
- Price range
- Duration (how long to visit)

### Publishing Attractions

Attractions start as drafts. When ready:
1. Open the attraction
2. Review all details
3. Toggle **Published** on
4. Save

Published attractions appear on your website's Attractions page.

---

# SECTION 10: WORDPRESS PLUGINS

## GAS Booking Plugin

The core plugin that powers GAS websites.

**Shortcodes:**
- `[gas_search]` - Date/guest search widget
- `[gas_rooms]` - Room grid display
- `[gas_room]` - Single room detail
- `[gas_checkout]` - Booking checkout
- `[gas_offers]` - Special offers
- `[gas_about]` - About page content
- `[gas_contact]` - Contact form with map
- `[gas_footer]` - Site footer

## GAS Blog Plugin

Displays blog posts from GAS.

**Shortcodes:**
- `[gas_blog]` - Blog post grid
- `[gas_blog_featured]` - Featured posts
- `[gas_blog_categories]` - Category filter

**Settings:**
- GAS API URL
- Client ID
- Property ID (optional filter)

## GAS Attractions Plugin

Displays local attractions from GAS.

**Shortcodes:**
- `[gas_attractions]` - Attractions grid
- `[gas_attractions_categories]` - Category filter

**Settings:**
- GAS API URL
- Client ID
- Property ID (optional filter)

---

# SECTION 11: TROUBLESHOOTING

## Common Issues

### "Can't connect to Beds24"
**Cause:** Invalid API credentials
**Solution:**
1. Log into Beds24
2. Go to Settings > Account Access > API
3. Regenerate API key
4. Copy carefully (no spaces)
5. Update in GAS Connections

### "Properties not showing"
**Cause:** Not imported or wrong account
**Solution:**
1. Check Connection status is "Connected"
2. Click "Resync" on the connection
3. Verify property is active in Beds24
4. Check property is assigned to correct account

### "Rooms showing wrong prices"
**Cause:** Pricing not synced or wrong tier
**Solution:**
1. Check Beds24 has correct prices
2. Resync from Connections
3. Verify pricing tier setting on the website

### "Blog/Attractions not showing on website"
**Cause:** Not published or wrong property
**Solution:**
1. Check items are set to "Published"
2. Verify property ID matches
3. Check WordPress plugin is active
4. Flush WordPress permalinks (Settings > Permalinks > Save)

### "Website changes not appearing"
**Cause:** Caching or sync delay
**Solution:**
1. Clear browser cache
2. Wait 30 seconds for sync
3. Check GAS Admin shows the changes
4. Try hard refresh (Ctrl+Shift+R)

### "Booking button not working"
**Cause:** Channel Manager not connected properly
**Solution:**
1. Verify Connection is active
2. Check rooms have valid Beds24 room IDs
3. Test booking flow in Beds24 directly

---

# SECTION 12: GLOSSARY

**Channel Manager (CM):** Software that distributes your inventory to booking sites (Beds24, Smoobu, Hostaway, etc.)

**Property:** A single accommodation business (hotel, B&B, etc.)

**Unit/Room:** Individual bookable spaces within a property

**Offer:** A promotional discount or special rate

**Pricing Tier:** Different rate levels (Standard, Corporate, Agent)

**GasSync:** GAS integration layer that connects to external systems

**Account:** The business entity that owns one or more properties

**Client ID:** Unique identifier for an account in GAS

**Property ID:** Unique identifier for a property in GAS

**Slug:** URL-friendly version of a name (e.g., "grand-hotel" from "Grand Hotel")

---

# SECTION 13: SUPPORT CONTACTS

**Email:** hello@gas.travel
**Documentation:** https://docs.gas.travel (coming soon)
**Status Page:** https://status.gas.travel (coming soon)

---

# SECTION 14: QUICK REFERENCE

## Keyboard Shortcuts

(In GAS Admin)
- `?` - Show help for current section
- `Esc` - Close modal/popup

## Status Indicators

- 🟢 Green - Active/Connected/Published
- 🟡 Yellow - Pending/Draft/Warning
- 🔴 Red - Error/Disconnected/Failed
- ⚪ Gray - Inactive/Disabled

## URL Patterns

- GAS Admin: `https://gas.travel/admin`
- Property Site: `https://[name].sites.gas.travel`
- Blog Post: `https://[site]/blog/[slug]`
- Attraction: `https://[site]/attractions/[slug]`
- Room: `https://[site]/room/[slug]`

---

*This knowledge base is maintained by the GAS team and updated as features are added.*
