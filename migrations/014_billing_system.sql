-- GAS Billing System
-- Migration: 014_billing_system.sql
-- Date: 2025-12-06
-- Flexible products, plans, add-ons, subscriptions

-- =====================================================
-- PRODUCTS (individual sellable items)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,          -- e.g., 'wp-theme-developer', 'app-blogger'
    name VARCHAR(100) NOT NULL,                 -- Display name
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',     -- template, plugin, app, addon, service
    
    -- Pricing (if sold individually)
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,       -- Discount for annual
    price_once DECIMAL(10,2) DEFAULT 0,         -- One-time purchase option
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Feature flags this product unlocks
    feature_flags JSONB DEFAULT '[]',           -- e.g., ["website_builder", "blog_app"]
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,             -- Show in pricing page
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PLANS (bundles of products)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,           -- e.g., 'free', 'starter', 'growth'
    name VARCHAR(100) NOT NULL,                  -- Display name
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Limits
    max_properties INTEGER DEFAULT 1,
    max_rooms INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 1,
    
    -- Styling
    is_featured BOOLEAN DEFAULT FALSE,          -- Highlight on pricing page
    badge_text VARCHAR(50),                      -- e.g., "Most Popular", "Best Value"
    color VARCHAR(7) DEFAULT '#6366f1',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PLAN PRODUCTS (which products in which plans)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_plan_products (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES billing_products(id) ON DELETE CASCADE,
    
    UNIQUE(plan_id, product_id)
);

-- =====================================================
-- ADD-ONS (extras on top of plans)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_addons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    price_once DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- What it provides
    feature_flags JSONB DEFAULT '[]',
    extra_properties INTEGER DEFAULT 0,         -- +X properties
    extra_rooms INTEGER DEFAULT 0,              -- +X rooms
    extra_users INTEGER DEFAULT 0,              -- +X users
    
    -- Restrictions
    requires_plan_codes JSONB DEFAULT '[]',     -- Only available with certain plans
    
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUBSCRIPTIONS (who's paying for what)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,                -- Links to accounts table
    
    -- Current plan
    plan_id INTEGER REFERENCES billing_plans(id),
    plan_code VARCHAR(50),                      -- Denormalized for quick access
    
    -- Billing cycle
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',        -- active, cancelled, past_due, trialing
    
    -- Dates
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Payment provider
    provider VARCHAR(20) DEFAULT 'airwallex',   -- airwallex, stripe, manual
    provider_subscription_id VARCHAR(100),      -- External ID
    provider_customer_id VARCHAR(100),
    
    -- Pricing at time of subscription (in case plan prices change)
    locked_price DECIMAL(10,2),
    locked_currency VARCHAR(3) DEFAULT 'GBP',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUBSCRIPTION ADD-ONS (extras attached to subscription)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_subscription_addons (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES billing_subscriptions(id) ON DELETE CASCADE,
    addon_id INTEGER NOT NULL REFERENCES billing_addons(id),
    addon_code VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    
    locked_price DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(subscription_id, addon_id)
);

-- =====================================================
-- INVOICES (payment history)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_invoices (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    subscription_id INTEGER REFERENCES billing_subscriptions(id),
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE,
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',       -- pending, paid, failed, refunded
    
    -- Payment
    provider VARCHAR(20),
    provider_invoice_id VARCHAR(100),
    provider_payment_id VARCHAR(100),
    
    paid_at TIMESTAMP,
    
    -- Line items stored as JSON
    line_items JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON billing_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_account ON billing_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON billing_invoices(status);

-- =====================================================
-- SEED DATA: Default Products
-- =====================================================
INSERT INTO billing_products (code, name, description, category, price_monthly, feature_flags, display_order) VALUES
('wp-theme-developer', 'Developer Theme', 'Professional WordPress theme for hotels & B&Bs', 'template', 15, '["website_builder"]', 1),
('wp-plugin-booking', 'WP Booking Plugin', 'Booking widget for WordPress sites', 'plugin', 10, '["booking_widget"]', 2),
('app-blogger', 'Smart Blogger', 'AI-powered blog content generator', 'app', 9, '["blog_app"]', 3),
('app-attractions', 'Attractions & SEO', 'Local attractions and SEO booster', 'app', 9, '["attractions_app"]', 4),
('app-marketing', 'Marketing Tools', 'Social media campaigns & offers', 'app', 12, '["marketing_app"]', 5),
('portal-builder', 'Portal Builder', 'Create niche travel portals', 'template', 29, '["portal_builder"]', 6)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Plans
-- =====================================================
INSERT INTO billing_plans (code, name, description, price_monthly, price_yearly, max_properties, max_rooms, is_featured, badge_text, display_order) VALUES
('free', 'Free', 'Get started with inventory management', 0, 0, 1, 5, FALSE, NULL, 1),
('starter', 'Starter', 'Perfect for small properties', 19, 190, 1, 10, FALSE, NULL, 2),
('growth', 'Growth', 'Everything you need to grow', 39, 390, 3, 50, TRUE, 'Most Popular', 3),
('portal', 'Portal', 'Build your travel empire', 49, 490, 10, 100, FALSE, 'For Entrepreneurs', 4)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Add-ons
-- =====================================================
INSERT INTO billing_addons (code, name, description, price_monthly, extra_properties, display_order) VALUES
('extra-property', 'Extra Property', 'Add one additional property', 5, 1, 1),
('extra-5-properties', 'Property Pack', 'Add 5 additional properties', 20, 5, 2),
('priority-support', 'Priority Support', '24/7 priority email & chat support', 15, 0, 3)
ON CONFLICT (code) DO NOTHING;


-- =====================================================
-- AFFILIATE SYSTEM
-- =====================================================

-- Affiliate tiers
CREATE TABLE IF NOT EXISTS affiliate_tiers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,           -- bronze, silver, gold
    name VARCHAR(50) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,      -- e.g., 5.00, 10.00, 15.00
    min_referrals INTEGER DEFAULT 0,            -- minimum active referrals to qualify
    min_revenue DECIMAL(10,2) DEFAULT 0,        -- OR minimum monthly revenue to qualify
    color VARCHAR(7) DEFAULT '#CD7F32',         -- for display
    icon VARCHAR(10) DEFAULT '🥉',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliates (accounts that can refer others)
CREATE TABLE IF NOT EXISTS affiliates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL UNIQUE,         -- links to accounts table
    
    -- Referral tracking
    referral_code VARCHAR(20) NOT NULL UNIQUE,  -- unique code like "LEHMANN20"
    referral_link VARCHAR(255),                 -- full URL
    
    -- Current tier
    tier_id INTEGER REFERENCES affiliate_tiers(id),
    tier_code VARCHAR(20) DEFAULT 'bronze',
    
    -- Stats (denormalized for quick access)
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    lifetime_earnings DECIMAL(10,2) DEFAULT 0,
    
    -- Payout settings
    payout_method VARCHAR(20) DEFAULT 'airwallex', -- airwallex, bank, paypal
    payout_details JSONB DEFAULT '{}',             -- bank account, paypal email, etc.
    min_payout DECIMAL(10,2) DEFAULT 50,           -- minimum payout threshold
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals (who referred who)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    referred_account_id INTEGER NOT NULL,       -- the account that was referred
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',       -- pending, active, churned, cancelled
    
    -- When they converted
    signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    converted_at TIMESTAMP,                     -- when they started paying
    churned_at TIMESTAMP,
    
    -- Attribution
    referral_source VARCHAR(50),                -- link, email, manual
    
    UNIQUE(referred_account_id)                 -- each account can only be referred once
);

-- Affiliate commissions (earnings per transaction)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    referral_id INTEGER REFERENCES affiliate_referrals(id),
    
    -- Source of commission
    source_type VARCHAR(20) NOT NULL,           -- subscription, addon, one_time (NOT booking fees!)
    source_id INTEGER,                          -- invoice_id or booking_id
    
    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,        -- original transaction amount
    commission_rate DECIMAL(5,2) NOT NULL,      -- rate at time of transaction
    commission_amount DECIMAL(10,2) NOT NULL,   -- actual commission earned
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',       -- pending, approved, paid, cancelled
    
    -- Payout tracking
    payout_id INTEGER,                          -- links to affiliate_payouts when paid
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliate payouts (when we pay affiliates)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    
    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',       -- pending, processing, paid, failed
    
    -- Payment details
    payout_method VARCHAR(20),
    provider_payout_id VARCHAR(100),            -- Airwallex transfer ID
    
    -- Dates
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    notes TEXT
);

-- Indexes for affiliate system
CREATE INDEX IF NOT EXISTS idx_affiliates_account ON affiliates(account_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON affiliate_referrals(referred_account_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);

-- =====================================================
-- SEED DATA: Affiliate Tiers
-- =====================================================
INSERT INTO affiliate_tiers (code, name, commission_rate, min_referrals, min_revenue, color, icon, display_order) VALUES
('bronze', 'Bronze', 5.00, 0, 0, '#CD7F32', '🥉', 1),
('silver', 'Silver', 10.00, 5, 0, '#C0C0C0', '🥈', 2),
('gold', 'Gold', 15.00, 10, 500, '#FFD700', '🥇', 3)
ON CONFLICT (code) DO NOTHING;

