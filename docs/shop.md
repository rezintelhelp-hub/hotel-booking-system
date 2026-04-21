# GAS Ecommerce Module — Spec & Roadmap

## Overview

Basic ecommerce for GAS clients. Services/digital products only — no physical shipping in MVP. Subscription-gated (separate monthly add-on, no commission on sales).

---

## MVP Scope

### Database Schema (Railway PostgreSQL)

**`shop_products`**
```sql
CREATE TABLE IF NOT EXISTS shop_products (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_ml JSONB DEFAULT '{}',
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  description_ml JSONB DEFAULT '{}',
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  image_url TEXT,
  image_thumbnail_url TEXT,
  gallery_urls JSONB DEFAULT '[]',
  category VARCHAR(100),
  stock_quantity INTEGER,
  stock_tracking BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, slug)
);
```

**`shop_orders`**
```sql
CREATE TABLE IF NOT EXISTS shop_orders (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  status VARCHAR(30) DEFAULT 'pending',
  payment_status VARCHAR(30) DEFAULT 'unpaid',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_config_id_snapshot INTEGER,
  fulfilled_at TIMESTAMP,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**`shop_order_items`**
```sql
CREATE TABLE IF NOT EXISTS shop_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES shop_products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}'
);
```

**Accounts columns:**
```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS shop_enabled BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS shop_stripe_config_id INTEGER REFERENCES payment_configurations(id);
```

### Stripe Config

- `accounts.shop_stripe_config_id` — FK to `payment_configurations`. Operator selects which Stripe account receives shop sales.
- Admin UI: "Shop Settings" card with dropdown of available payment configs for the account.
- Public shop: shows "Purchases currently unavailable" if no config selected.
- Checkout: uses the selected config's Stripe credentials. Uses the JSONB-safe credential helper (typeof guard, no double-parse — see payment bug fix from 2026-04-20).
- `shop_orders.stripe_config_id_snapshot` — captures the config ID at order creation time. If operator changes config later, pending orders keep charging the original account.

### Order Number Format

`SH-{YYYYMMDD}-{4-digit-sequence}` (e.g., `SH-20260421-0001`)

---

## Build Plan — Three Commits

### Commit 1: Schema + Admin UI + Spec Doc

**server.js (~350 lines):**
- 3 CREATE TABLE IF NOT EXISTS (startup migrations)
- 2 ALTER TABLE accounts (shop_enabled, shop_stripe_config_id)
- 10 API endpoints:
  - `GET /api/admin/shop/products` — list for account
  - `POST /api/admin/shop/products` — create (with R2 image upload)
  - `PUT /api/admin/shop/products/:id` — update
  - `DELETE /api/admin/shop/products/:id` — soft-delete
  - `GET /api/admin/shop/orders` — list, filterable by status
  - `GET /api/admin/shop/orders/:id` — detail with items
  - `PUT /api/admin/shop/orders/:id/fulfill` — mark fulfilled
  - `PUT /api/admin/shop/orders/:id/status` — update status
  - `GET /api/public/client/:clientId/shop/products` — public listing
  - `GET /api/public/client/:clientId/shop/products/:slug` — public detail

**gas-admin.html (~400 lines):**
- Nav item: "Shop" under Generators, gated by `data-requires-feature="shop_module"`
- Products tab: table + add/edit modal
- Orders tab: table + detail modal + "Mark Fulfilled"
- Shop Settings card: Stripe config dropdown, save button
- JS: loadShopProducts, saveShopProduct, loadShopOrders, fulfillShopOrder, loadShopSettings, saveShopSettings

**docs/shop.md:** This file.

**Commit message:** `Add ecommerce: products/orders admin + schema`

### Commit 2: Public Shop Plugin

**plugins/gas-shop/gas-shop.php (~550 lines, new file):**
- URL routing: `/shop/`, `/shop/{slug}/`, `/shop/cart/`, `/shop/checkout/`, `/shop/thank-you/`
- Product grid (same card pattern as blog/attractions)
- Single product detail page
- Cart (localStorage, no accounts)
- Checkout form → Stripe Checkout session
- Thank you page (clears cart)
- Colours/fonts from app-settings (cached transient)
- 404 when shop_enabled = false

**gas-admin.html:** `page-shop` sub-tab in Web Builder

**gas-booking.php:** Add `page-shop` to page sync config

**Commit message:** `Add public shop page to booking sites`

### Commit 3: Stripe + Webhooks + Emails

**server.js (~320 lines):**
- `POST /api/public/shop/create-checkout-session` — validate products, calculate totals server-side, create Stripe session, create pending order with `stripe_config_id_snapshot`
- `POST /api/webhooks/stripe-shop` — handle `checkout.session.completed` (update order, atomic inventory decrement, emails) and `checkout.session.expired`
- Customer email: order confirmation with items, total, next steps
- Operator email: new order notification
- Subscription gating: billing webhook toggles `shop_enabled` + `shop_module` feature flag

**Commit message:** `Wire up shop payment flow`

---

## Subscription Gating

- `accounts.shop_enabled` (boolean) — master switch
- `gas_feature_flags` row with `feature = 'shop_module'` — UI gating
- When false: admin nav hidden, public /shop/ returns 404
- Toggled by Stripe billing subscription lifecycle webhook
- Separate Stripe product for shop add-on (set up in Stripe dashboard)

---

## Not in MVP

- Physical shipping (no calculator, weights, addresses)
- Tax calculation by region (inclusive prices, done)
- Discount codes / promo codes
- Multiple currencies per shop
- Product variants (size/colour)
- Reviews / ratings on products
- Customer accounts (guest checkout only)
- Cross-operator marketplace
- Subscription products (one-time purchases only)
- Returns / refund workflow in UI (manual via Stripe dashboard)

---

## Future Roadmap

| Phase | Feature | Notes |
|-------|---------|-------|
| MVP+1 | Discount codes | Simple percentage or fixed amount |
| MVP+2 | Product variants | Size/colour with separate stock per variant |
| MVP+3 | Digital delivery | Automatic file/link delivery on purchase |
| MVP+4 | Subscription products | Recurring billing for memberships |
| MVP+5 | Customer accounts | Order history, reorder, saved details |
| MVP+6 | Multi-currency | Per-product currency override |
| MVP+7 | Tax rules | Region-based tax calculation |
| MVP+8 | Physical shipping | Weight-based rates, address collection |

---

## Pricing Model (TBD)

Options under consideration:
- Flat monthly add-on (e.g., EUR 9.99/month) — simplest
- Tiered by product count (free up to 5 products, paid above)
- Included in higher subscription tiers (Business/Enterprise)
- No commission on sales — this is confirmed

---

## Technical Notes

- Images: upload to R2 via `processAndUploadImage()`, section `shop-product`
- Stripe: uses operator's existing payment_configurations, no Connect needed
- Credentials: use `typeof creds === 'string' ? JSON.parse(creds) : creds` pattern (JSONB-safe)
- Plugin pattern: follows gas-blog/gas-attractions exactly (singleton class, rewrite rules, transient-cached colours, get_header/get_footer)
- Cart: localStorage-based, structure: `{ product_id, slug, name, price, currency, quantity, image_url }`
- Order snapshots: `shop_order_items` stores `product_name` and `unit_price` at time of order, not FK lookups

---

## Related Docs

- `docs/blogimport.md` — migration runbook (plugin + theme deployment patterns)
- `docs/booking-assist.md` — Verena's operation (potential shop use case)
- `CLAUDE.md` — GAS architecture, deployment rules, Stripe integration patterns

---

*Created: 21 April 2026*
*Status: Spec complete, build pending*
