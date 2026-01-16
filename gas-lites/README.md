# GAS Lites

Free property micro-sites hosted at `lite.gas.travel`

## Features

- **Mobile-first card design** - Looks great on phones
- **QR code built-in** - Print and leave at property
- **Same GAS data** - No duplication, always in sync
- **Offer integration** - Turbines can add discount badges
- **Free tier** - Basic lite is free, upsell to full WordPress site

## Routes

### Public Pages
- `GET /:slug` - View the lite page
- `GET /:slug/qr` - Get QR code image (PNG)
- `GET /:slug/print` - Printable A6 card (auto-prints)

### API (for GAS Admin)
- `GET /api/check-slug/:slug` - Check if slug available
- `GET /api/property/:propertyId` - Get lite for a property
- `GET /api/account/:accountId` - Get all lites for account
- `POST /api/lites` - Create new lite
- `PUT /api/lites/:id` - Update lite
- `DELETE /api/lites/:id` - Delete lite
- `GET /api/lites/:id/stats` - Get view count

## Database Table

```sql
CREATE TABLE gas_lites (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  account_id INTEGER REFERENCES accounts(id),
  slug VARCHAR(100) UNIQUE NOT NULL,
  custom_title VARCHAR(255),
  custom_tagline VARCHAR(500),
  theme VARCHAR(50) DEFAULT 'default',
  accent_color VARCHAR(7) DEFAULT '#3b82f6',
  show_pricing BOOLEAN DEFAULT true,
  show_availability BOOLEAN DEFAULT true,
  show_reviews BOOLEAN DEFAULT true,
  show_qr BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Deployment

Deploy as separate Railway service:
1. Connect to same PostgreSQL database
2. Set `DATABASE_URL` environment variable
3. Configure custom domain: `lite.gas.travel`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (same as main GAS)
- `PORT` or `LITES_PORT` - Server port (default: 3002)

## Turbines Integration

When Turbines detects availability gaps, it:
1. Creates a time-limited offer with promo code
2. Generates social media post linking to `lite.gas.travel/slug?offer=CODE`
3. The lite page shows the discount badge and adjusted prices
