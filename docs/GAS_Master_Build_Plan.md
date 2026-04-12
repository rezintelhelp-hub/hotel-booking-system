# GAS Master Build Plan — Registration, Billing, Freemium, Access Control and Homepage
**Global Accommodation Systems — gas.travel**
**April 2026 — For Claude Code execution**

---

## CRITICAL RULES — READ BEFORE TOUCHING ANY FILE

- NEVER regenerate server.js or gas-admin.html whole — surgical edits only
- NEVER use str_replace on non-unique strings — verify uniqueness first
- NEVER overwrite existing webhook URLs or endpoint registrations
- ALWAYS read full function context before editing anything inside it
- ALWAYS verify nothing was lost after any edit
- ALWAYS wait 3 minutes after git push then open gas.travel in Chrome to verify
- Take a screenshot after every major deployment to confirm visual result

---

## Part 1 — Database Schema Changes

### 1.1 Update accounts table

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'free';
-- Values: 'free', 'active', 'legacy', 'suspended', 'cancelled'

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS legacy_note TEXT;
-- Master admin notes on why account is legacy

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_grace_until TIMESTAMPTZ;
-- 3-day grace period on payment failure

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wp_plugin_licence_key VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wp_plugin_licence_active BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key_active BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS hostvana_api_key VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS hostvana_connected BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS repuso_widget_key VARCHAR(100);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS repuso_connected BOOLEAN DEFAULT false;
```

### 1.2 Replace billing_plans table with correct product suite

```sql
TRUNCATE TABLE billing_plans;

INSERT INTO billing_plans (product, name, base_price_usd, base_units, billing_period, stripe_price_id, is_active) VALUES
('gas_direct_commission',   'GAS Direct — Commission',        0.00,   5,  'monthly', NULL,   true),
('gas_direct_monthly',      'GAS Direct — Monthly',          19.00,   5,  'monthly', NULL,   true),
('web_builder',             'Web Builder',                   29.00,  10,  'monthly', NULL,   true),
('pro_builder',             'Pro Builder',                   59.00,  10,  'monthly', NULL,   true),
('blog_attractions',        'Blog + Attractions AI',         19.99,   0,  'monthly', NULL,   true),
('social_campaign',         'Social Campaign Manager',       19.99,   0,  'monthly', NULL,   true),
('wp_plugin_licence',       'WP Plugin Licence',             19.99,   0,  'monthly', NULL,   true),
('support_2hr',             'Support Bundle 2hr',            49.00,   0,  'one_time', NULL,  true),
('support_5hr',             'Support Bundle 5hr',            99.00,   0,  'one_time', NULL,  true),
('support_10hr',            'Support Bundle 10hr',          179.00,   0,  'one_time', NULL,  true),
('api_licence_starter',     'White-label API Starter',      250.00, 200,  'monthly', NULL,   true),
('api_licence_growth',      'White-label API Growth',       500.00, 500,  'monthly', NULL,   true),
('api_licence_scale',       'White-label API Scale',          0.00,   0,  'monthly', NULL,   true),
('agent_gas_direct',        'GAS Direct — Agent',            38.00,   5,  'monthly', NULL,   true),
('agent_web_builder',       'Web Builder — Agent',           58.00,  10,  'monthly', NULL,   true),
('agent_pro_builder',       'Pro Builder — Agent',          118.00,  10,  'monthly', NULL,   true);
```

### 1.3 Room pricing tiers table (incremental)

```sql
CREATE TABLE IF NOT EXISTS gas_room_tiers (
  id SERIAL PRIMARY KEY,
  product VARCHAR(50) NOT NULL,
  min_rooms INT NOT NULL,
  max_rooms INT,
  price_per_room DECIMAL(10,4) NOT NULL
);

TRUNCATE TABLE gas_room_tiers;

INSERT INTO gas_room_tiers (product, min_rooms, max_rooms, price_per_room) VALUES
('gas_direct_monthly',  6,   20,  1.50),
('gas_direct_monthly',  21,  50,  1.25),
('gas_direct_monthly',  51,  100, 1.00),
('gas_direct_monthly',  101, NULL, 0.75),
('web_builder',         11,  20,  1.50),
('web_builder',         21,  50,  1.25),
('web_builder',         51,  100, 1.00),
('web_builder',         101, NULL, 0.75),
('pro_builder',         11,  20,  1.50),
('pro_builder',         21,  50,  1.25),
('pro_builder',         51,  100, 1.00),
('pro_builder',         101, NULL, 0.75),
('agent_gas_direct',    6,   20,  1.50),
('agent_gas_direct',    21,  50,  1.25),
('agent_gas_direct',    51,  100, 1.00),
('agent_gas_direct',    101, NULL, 0.75),
('agent_web_builder',   11,  20,  1.50),
('agent_web_builder',   21,  50,  1.25),
('agent_web_builder',   51,  100, 1.00),
('agent_web_builder',   101, NULL, 0.75),
('agent_pro_builder',   11,  20,  1.50),
('agent_pro_builder',   21,  50,  1.25),
('agent_pro_builder',   51,  100, 1.00),
('agent_pro_builder',   101, NULL, 0.75);
```

### 1.4 Feature flags table

```sql
CREATE TABLE IF NOT EXISTS gas_feature_flags (
  id SERIAL PRIMARY KEY,
  account_id INT REFERENCES accounts(id),
  feature VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_by VARCHAR(20) DEFAULT 'system', -- 'system', 'payment', 'master_admin'
  enabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, feature)
);
```

---

## Part 2 — Pricing Calculator Function

Add to server.js — NEW function, do not modify existing code:

```javascript
// GAS Pricing Calculator — incremental room pricing
function calculateGASPrice(product, roomCount) {
  const bases = {
    gas_direct_monthly:  { base: 19.00, included: 5  },
    web_builder:         { base: 29.00, included: 10 },
    pro_builder:         { base: 59.00, included: 10 },
    agent_gas_direct:    { base: 38.00, included: 5  },
    agent_web_builder:   { base: 58.00, included: 10 },
    agent_pro_builder:   { base: 118.00, included: 10 },
  };

  const tiers = {
    gas_direct_monthly:  [[6,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
    web_builder:         [[11,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
    pro_builder:         [[11,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
    agent_gas_direct:    [[6,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
    agent_web_builder:   [[11,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
    agent_pro_builder:   [[11,20,1.50],[21,50,1.25],[51,100,1.00],[101,null,0.75]],
  };

  if (!bases[product]) return { base: 0, room_charge: 0, total: 0 };
  const config = bases[product];
  const productTiers = tiers[product] || [];

  let total = config.base;
  let roomCharge = 0;
  let above = roomCount - config.included;

  if (above > 0 && productTiers.length) {
    let remaining = above;
    for (const [min, max, rate] of productTiers) {
      if (remaining <= 0) break;
      const tierStart = min - config.included;
      const tierEnd = max ? max - config.included : Infinity;
      const tierSize = tierEnd - Math.max(0, tierStart - 1);
      const roomsInTier = Math.min(remaining, tierSize);
      if (roomsInTier > 0) {
        roomCharge += roomsInTier * rate;
        remaining -= roomsInTier;
      }
    }
    total += roomCharge;
  }

  return {
    base: config.base,
    room_charge: parseFloat(roomCharge.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    rooms_above_base: Math.max(0, roomCount - config.included)
  };
}
```

---

## Part 3 — Access Control Middleware

Add to server.js — NEW middleware function:

```javascript
// GAS Subscription Access Control Middleware
async function checkGASAccess(accountId, requiredFeature) {
  const account = await db.query(
    'SELECT account_status, subscription_grace_until FROM accounts WHERE id = $1',
    [accountId]
  );

  if (!account.rows[0]) return { allowed: false, reason: 'account_not_found' };

  const { account_status, subscription_grace_until } = account.rows[0];

  // Legacy accounts bypass all checks
  if (account_status === 'legacy') return { allowed: true, reason: 'legacy' };

  // Free features always allowed
  const FREE_FEATURES = [
    'dashboard', 'bookings', 'guests', 'rooms',
    'cm_sync', 'gas_direct_commission'
  ];
  if (FREE_FEATURES.includes(requiredFeature)) return { allowed: true, reason: 'free' };

  // Active subscription
  if (account_status === 'active') {
    const flag = await db.query(
      'SELECT enabled FROM gas_feature_flags WHERE account_id = $1 AND feature = $2',
      [accountId, requiredFeature]
    );
    if (flag.rows[0]?.enabled) return { allowed: true, reason: 'active' };
    return { allowed: false, reason: 'feature_not_enabled' };
  }

  // Grace period
  if (account_status === 'suspended' && subscription_grace_until) {
    if (new Date() < new Date(subscription_grace_until)) {
      return { allowed: true, reason: 'grace_period' };
    }
  }

  return { allowed: false, reason: 'not_subscribed' };
}

// API Key validation middleware
async function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-gas-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const account = await db.query(
    `SELECT a.id, a.account_status, a.api_key_active
     FROM accounts a
     WHERE a.api_key = $1`,
    [apiKey]
  );

  if (!account.rows[0]) return res.status(401).json({ error: 'Invalid API key' });

  const acc = account.rows[0];

  // Legacy bypass
  if (acc.account_status === 'legacy') { req.accountId = acc.id; return next(); }

  // Must have active API key flag
  if (!acc.api_key_active) return res.status(403).json({ error: 'API access not active. Please check your subscription.' });

  if (acc.account_status !== 'active') {
    return res.status(403).json({ error: 'Subscription required for API access.' });
  }

  req.accountId = acc.id;
  next();
}
```

---

## Part 4 — Registration Endpoints

Add NEW endpoints to server.js:

```
POST /api/register                    — create account, send welcome email
POST /api/billing/calculate-price     — live price calculator
POST /api/billing/create-subscription — Stripe subscription creation
POST /api/billing/wp-plugin-licence   — generate WP plugin licence key
POST /api/billing/activate-feature    — activate feature flag on payment
GET  /api/billing/my-subscription     — current account subscription status
POST /api/billing/cancel              — cancel subscription
POST /api/partner/hostvana/connect    — save Hostvana API key + activate
POST /api/partner/repuso/connect      — save Repuso widget key + activate
GET  /api/partner/hostvana/status     — check Hostvana connection
GET  /api/partner/repuso/status       — check Repuso connection
```

### Registration flow logic

```javascript
// POST /api/register
// 1. Validate email not already registered
// 2. Hash password (bcrypt)
// 3. Create account with account_status = 'free'
// 4. Create default feature flags (all free features enabled)
// 5. Send welcome email
// 6. Return JWT token + account_id
// 7. Redirect to /onboarding step 1
```

### Stripe subscription creation

```javascript
// POST /api/billing/create-subscription
// Body: { account_id, product, room_count, payment_method_id }
// 1. Calculate price using calculateGASPrice()
// 2. Create/retrieve Stripe customer
// 3. Create Stripe subscription with correct price
// 4. On success: set account_status = 'active'
// 5. Enable feature flags for purchased product
// 6. For wp_plugin_licence: generate licence key, store in accounts.wp_plugin_licence_key
// 7. For api products: generate API key, store in accounts.api_key, set api_key_active = true
// 8. Return subscription details
```

### WP Plugin Licence key generation

```javascript
function generateLicenceKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substr(2, 5).toUpperCase());
  }
  return 'GAS-' + segments.join('-');
  // Format: GAS-XXXXX-XXXXX-XXXXX-XXXXX
}
```

---

## Part 5 — Stripe Webhook Updates

In the existing `/api/webhooks/stripe-billing` handler, ADD handling for:

```javascript
case 'customer.subscription.created':
  // Set account_status = 'active'
  // Enable feature flags for the product
  // Generate API key if api product
  break;

case 'customer.subscription.deleted':
  // Set account_status = 'cancelled'
  // Disable all paid feature flags
  // Keep data intact — never delete
  break;

case 'invoice.payment_failed':
  // Set account_status = 'suspended'
  // Set subscription_grace_until = NOW() + 3 days
  // Send payment failed email to account owner
  break;

case 'invoice.payment_succeeded':
  // Set account_status = 'active'
  // Clear subscription_grace_until
  // Re-enable feature flags if they were suspended
  break;
```

---

## Part 6 — Freemium Gates Per Product

### The principle: taste it, want it, pay for it

For each product, implement a preview mode that lets users experience value before hitting a paywall.

```javascript
// Add to existing feature endpoints — check before executing:

// GAS Direct monthly
// Preview: show fully built booking page
// Gate: attempting to go live or remove GAS branding → paywall modal

// Web Builder / Pro Builder  
// Preview: full editor access, build the site completely
// Gate: hitting Publish → paywall modal
// Message: "Your site looks great! One step to go live."

// Blog + Attractions AI
// Preview: generate 3 blog posts + 3 attraction pages, fully readable
// Gate: 4th generation attempt → paywall modal
// Counter stored in: accounts.blog_preview_count, accounts.attractions_preview_count

// Social Campaign Manager
// Preview: generate 5 social cards, fully viewable
// Gate: Schedule or Post button → paywall modal
// Counter stored in: accounts.social_preview_count

// API / Swagger
// No preview — completely hidden from UI unless account_status = 'active' or 'legacy'
// api_key field in GAS Admin only visible to master admin or active paid accounts

// WP Plugin
// No preview — download button hidden until wp_plugin_licence_active = true
```

### Paywall modal content

```javascript
// When user hits a gate, show modal:
{
  title: "Ready to go live?",
  message: "You're one step away. Choose your plan to activate this feature.",
  cta: "See pricing",
  link: "/pricing"
}
// NOT: "Upgrade required" — keep it positive
```

---

## Part 7 — Legacy Account Toggle in GAS Admin

In `gas-admin.html`, in the account edit modal, ADD a Legacy toggle:

```html
<!-- Add to account edit modal, master admin only -->
<div class="form-group" id="legacy-toggle-section">
  <label>Account Status</label>
  <select id="account-status-select">
    <option value="free">Free</option>
    <option value="active">Active</option>
    <option value="legacy">Legacy</option>
    <option value="suspended">Suspended</option>
    <option value="cancelled">Cancelled</option>
  </select>
  <input type="text" id="legacy-note" placeholder="Legacy reason (optional)" />
  <small>Legacy accounts bypass all payment checks. Use for existing clients on grandfathered terms.</small>
</div>
```

Server endpoint:
```
PUT /api/admin/accounts/:id/status
Body: { status, legacy_note }
Master admin only — check req.user.role === 'master'
```

---

## Part 8 — GAS Direct (rename from GAS Lites)

Search server.js and gas-admin.html for ALL instances of:
- `gas_lites`, `GAS Lites`, `gasLites`, `lites`, `GAS-Lites`

Replace with:
- `gas_direct`, `GAS Direct`, `gasDirectss`, `direct`, `GAS-Direct`

**Before making any replacement:**
1. Run: `grep -n "lites\|Lites\|LITES" server.js | wc -l` — count total instances
2. Make replacements
3. Verify count matches
4. Test that no functionality is broken

Also update:
- URL routes: `/lites/*` → `/direct/*` (keep old routes as redirects for existing bookmarks)
- Database column names: do NOT rename — add aliases instead to avoid breaking existing data
- Email templates referencing GAS Lites

---

## Part 9 — Hostvana Integration Flow

### In GAS Admin — new HOSTVANA section under APPS

```
APPS
  AI Messaging (Hostvana)
  Reviews (Repuso)
  Social Media (Turbines)
```

### Hostvana connection UI

```html
<!-- If not connected -->
<div class="partner-card">
  <h3>Hostvana AI Messaging</h3>
  <p>Automate guest messaging with AI. Hostvana reads your bookings 
     and responds to guests automatically — 24/7, in their language.</p>
  <p>GAS and Hostvana are mutual partners. No commission on either side.</p>
  <a href="https://hostvana.com/register?ref=gas" target="_blank" class="btn-primary">
    Get Hostvana Free
  </a>
  <hr>
  <p>Already have a Hostvana account?</p>
  <input type="text" id="hostvana-api-key" placeholder="Enter your Hostvana API key" />
  <button onclick="connectHostvana()">Connect</button>
</div>

<!-- If connected -->
<div class="partner-card connected">
  <span class="badge-connected">Connected</span>
  <h3>Hostvana AI Messaging</h3>
  <p>AI messaging is active on your properties.</p>
  <button onclick="disconnectHostvana()">Disconnect</button>
</div>
```

### Hostvana API endpoint

```javascript
// POST /api/partner/hostvana/connect
// Body: { account_id, hostvana_api_key }
// 1. Validate key format
// 2. Test key against Hostvana API (ping their /validate endpoint)
// 3. If valid: store in accounts.hostvana_api_key, set hostvana_connected = true
// 4. Enable hostvana feature flag
// 5. Return success
```

---

## Part 10 — Repuso Integration Flow

### Repuso connection UI

```html
<!-- If not connected -->
<div class="partner-card">
  <h3>Reviews — powered by Repuso</h3>
  <p>Collect and display reviews on your GAS website. 
     Import from Google, Airbnb, Booking.com and more.</p>
  <p>Free for GAS clients via our partner arrangement.</p>
  <a href="https://repuso.com/?ref=gas" target="_blank" class="btn-primary">
    Get Repuso Free
  </a>
  <hr>
  <p>Already have a Repuso account?</p>
  <input type="text" id="repuso-widget-key" placeholder="Enter your Repuso widget key" />
  <button onclick="connectRepuso()">Connect</button>
</div>
```

---

## Part 11 — gas.travel Homepage Rebuild

### File location
The homepage is served from server.js at route `GET /home.html` or `GET /`.
Find the route handler and update the HTML it serves.

### What to keep
- Dark navy hero with compass logo
- "GLOBAL ACCOMMODATION SYSTEMS" (note: Systems not System — fix this)
- Multilingual "No Boundaries" tagline animation
- "DISCOVER" scroll prompt
- Overall dark/minimal aesthetic

### New sections to add below the hero

**Section 1 — The problem (2 sentences max)**
```
Independent accommodation operators lose 15–25% of every booking to OTAs.
GAS gives them the infrastructure to own their direct channel — without the
technical complexity, without the commission, without the dependency.
```

**Section 2 — Stats bar**
```
70 live clients  |  33 CM integrations  |  165,000+ reachable operators  |  6 languages
```

**Section 3 — Two growth engines (side by side cards)**
```
For Operators                          For Destinations
Independent hotels, aparthotels        Local authorities, tourist boards,
and villa operators — manage your      travel agents and web developers —
property, take direct bookings,        build a destination portal pulling
engage guests.                         from all 33 CMs in one place.
[Register Free →]                      [Talk to us →]
```

**Section 4 — Product suite (grid of cards)**
```
GAS Direct    — direct booking pages, QR codes, commission or monthly
Web Builder   — fully hosted branded websites with booking engine
Pro Builder   — advanced site builder, WYSIWYG, premium design
Blog + AI     — SEO content generated automatically
Social        — social campaign manager and card generator
API           — white-label platform for partners and developers
```

**Section 5 — 33 CM integrations**
```
Heading: "Connect to 33 channel managers. Own your direct channel."
Show: grid of CM names (Beds24, Hostaway, Hostfully, Smoobu, Guesty, 
Lodgify, Cloudbeds, Mews, OwnerRez, Tokeet... and 23 more)
```

**Section 6 — Pricing teaser**
```
Start free. Scale as you grow.
Free account → GAS Direct from $19/mo → Web Builder from $29/mo → Pro Builder from $59/mo
[See all pricing →]
```

**Section 7 — For investors / partners (subtle section)**
```
Building the infrastructure layer for independent accommodation worldwide.
[Investment overview →]  [Partner with us →]
```

**Section 8 — Footer**
```
Global Accommodation Systems  |  gas.travel
No Boundaries.
Links: Products | Pricing | Partners | Login | Register
```

### Navigation update
Change nav items to:
```
Products  |  Pricing  |  For Destinations  |  Partners  |  Log In  |  Register Free
```

---

## Part 12 — New Routes Required

Add to server.js:

```
GET  /register          — registration page
GET  /onboarding        — post-registration onboarding flow
GET  /pricing           — full pricing page
GET  /partners          — partner/investor page
GET  /for-destinations  — portal product page
GET  /api-docs          — Swagger UI (protected — active accounts only)
```

---

## Part 13 — Environment Variables Required

Add to Railway if not already present:

```
STRIPE_SECRET_KEY=              (existing)
STRIPE_BILLING_WEBHOOK_SECRET=  (existing — just added)
HOSTVANA_PARTNER_REF=           gas
REPUSO_AFFILIATE_ID=            [get from Repuso dashboard]
GAS_LICENCE_SECRET=             [generate — used to sign WP licence keys]
```

---

## Build Order for Claude Code

```
Step 1:   Run SQL migrations (Parts 1.1 — 1.4)
Step 2:   Add calculateGASPrice() function to server.js
Step 3:   Add checkGASAccess() and validateAPIKey() middleware
Step 4:   Add registration endpoint POST /api/register
Step 5:   Add billing endpoints (calculate-price, create-subscription, wp-plugin-licence)
Step 6:   Update Stripe webhook handler (Part 5)
Step 7:   Add legacy status toggle to gas-admin.html account modal
Step 8:   Rename GAS Lites → GAS Direct throughout (count first, verify after)
Step 9:   Add Hostvana connection UI and endpoints
Step 10:  Add Repuso connection UI and endpoints
Step 11:  Add freemium preview counters to blog/attractions/social
Step 12:  Add paywall modal component
Step 13:  Hide API/Swagger from UI unless active/legacy
Step 14:  Rebuild gas.travel homepage (Part 11)
Step 15:  Add new routes (Part 12)
Step 16:  git add, commit, push
Step 17:  Wait 3 minutes, open gas.travel in Chrome, screenshot to verify
Step 18:  Check registration flow end-to-end: register → select product → Stripe → confirm
```

---

## Notes for Claude Code

- server.js is 40–70k lines — NEVER regenerate it whole
- gas-admin.html is 40–70k lines — NEVER regenerate it whole  
- All monetary values stored as DECIMAL(10,2) in USD
- accounts table already has: stripe_customer_id, airwallex_customer_id, stripe_billing_customer_id, stripe_billing_payment_method_id
- billing_mandate_status column already exists
- gas_billing_invoices table already exists — do not conflict with it
- The Stripe billing webhook at /api/webhooks/stripe-billing already has signature verification added today
- GoCardless and Airwallex are future payment methods — architecture should accommodate them but do not build them now
- Chrome is available via MCP tools — use it to verify deployments visually
- The existing on/off feature switches in gas-admin.html should be expanded to cover all new products, not replaced
