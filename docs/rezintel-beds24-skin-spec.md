# Rezintel Beds24 Skin — Product Spec

## Overview
Standalone white-label UI layer on top of Beds24's V2 API, sold to agencies and PMS resellers under the Rezintel brand (rezintel.net). Turns Beds24's complex backend into a clean, modern dashboard that non-technical property owners can actually use.

## Business Model
- **Price**: $5K per deployment (one-time setup + branding)
- **Hosting**: TBD — SaaS (Rezintel hosts, client pays monthly) vs self-hosted
- **SaaS recommended**: better recurring revenue, less support, you control updates
- **Target**: Beds24 power users / agencies managing 10+ properties who need a client-facing layer
- **First demo client**: Booking Assist

## Tech Stack (TBD)
- Standalone app — 100% separate from GAS
- Domain: rezintel.net
- Beds24 V2 API + master key model (agency manages all properties from one account)
- Frontend: React/Next.js or similar modern framework
- Auth: agency master key stored server-side, per-client property scoping

## Core Features (MVP)

### 1. Dashboard
- Today's arrivals / departures
- Occupancy rate (7-day, 30-day)
- Revenue summary
- Recent bookings feed

### 2. Calendar View
- Visual availability grid (the #1 Beds24 pain point)
- Drag to block dates
- Color-coded by booking source (direct, Booking.com, Airbnb, etc.)
- Multi-property view for agencies

### 3. Booking Management
- View all bookings with search/filter
- Booking detail: guest info, dates, source, payment status
- Modify dates / cancel with confirmation
- Add notes

### 4. Pricing
- Simple rate editor per room type
- Bulk date range updates
- Min-stay rules
- Seasonal pricing presets

### 5. Property & Room Setup
- Guided wizard (not Beds24's 50-tab nightmare)
- Room types, photos, descriptions, amenities
- Property details, location, policies

### 6. Reports
- Occupancy by period
- Revenue by channel
- Average daily rate (ADR)
- RevPAR
- Export to CSV

## What We Skip (Beds24 handles)
- OTA channel connections (Booking.com, Airbnb, Expedia API integrations)
- Payment processing
- iCal sync engine
- Rate distribution to channels
- Channel-specific content requirements

## White-Label Features
- Custom logo / branding per deployment
- Custom domain (client.rezintel.net or client's own domain)
- Colour scheme customisation
- Agency branding on client dashboards

## Revenue Potential
- 10 clients = $50K
- 20 clients = $100K
- Plus monthly hosting fees if SaaS model
- Near-zero marginal cost per deployment (same codebase, different config)

## Timeline
- Phase 1 (MVP): Dashboard + Calendar + Bookings — estimate TBD
- Phase 2: Pricing + Reports
- Phase 3: Property setup wizard
- Phase 4: White-label customisation panel

## Notes
- Beds24 master key: `Rezintel_jd6zZzL8GaCqLm8HXhKkWqJl6TvBsSeiUh` (V1)
- V2 token needs refresh from Beds24 (currently expired, waiting on them)
- Organization ID: `70_rezintelnet`
- V2 API docs: https://beds24.com/api/v2
