-- GAS Billing System
-- Migration: 014_billing_system.sql
-- Run manually if auto-migration fails

-- =====================================================
-- PRODUCTS (individual sellable items)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    feature_flags JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PLANS (bundles of products)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'GBP',
    
    max_properties INTEGER DEFAULT 1,
    max_rooms INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 1,
    
    is_featured BOOLEAN DEFAULT FALSE,
    badge_text VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6366f1',
    
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
    currency VARCHAR(3) DEFAULT 'GBP',
    
    feature_flags JSONB DEFAULT '[]',
    extra_properties INTEGER DEFAULT 0,
    extra_rooms INTEGER DEFAULT 0,
    extra_users INTEGER DEFAULT 0,
    
    requires_plan_codes JSONB DEFAULT '[]',
    
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
    account_id INTEGER NOT NULL,
    
    plan_id INTEGER REFERENCES billing_plans(id),
    plan_code VARCHAR(50),
    
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    status VARCHAR(20) DEFAULT 'active',
    
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    provider VARCHAR(20) DEFAULT 'airwallex',
    provider_subscription_id VARCHAR(100),
    provider_customer_id VARCHAR(100),
    
    locked_price DECIMAL(10,2),
    locked_currency VARCHAR(3) DEFAULT 'GBP',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUBSCRIPTION ADD-ONS
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
-- INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_invoices (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    subscription_id INTEGER REFERENCES billing_subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending',
    provider VARCHAR(20),
    provider_invoice_id VARCHAR(100),
    provider_payment_id VARCHAR(100),
    paid_at TIMESTAMP,
    line_items JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AFFILIATE TIERS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_tiers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    min_referrals INTEGER DEFAULT 0,
    min_revenue DECIMAL(10,2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#CD7F32',
    icon VARCHAR(10) DEFAULT '🥉',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AFFILIATES
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL UNIQUE,
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    referral_link VARCHAR(255),
    tier_id INTEGER REFERENCES affiliate_tiers(id),
    tier_code VARCHAR(20) DEFAULT 'bronze',
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    lifetime_earnings DECIMAL(10,2) DEFAULT 0,
    payout_method VARCHAR(20) DEFAULT 'airwallex',
    payout_details JSONB DEFAULT '{}',
    min_payout DECIMAL(10,2) DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AFFILIATE REFERRALS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    referred_account_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    converted_at TIMESTAMP,
    churned_at TIMESTAMP,
    referral_source VARCHAR(50),
    UNIQUE(referred_account_id)
);

-- =====================================================
-- AFFILIATE COMMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    referral_id INTEGER REFERENCES affiliate_referrals(id),
    source_type VARCHAR(20) NOT NULL,
    source_id INTEGER,
    gross_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending',
    payout_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AFFILIATE PAYOUTS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending',
    payout_method VARCHAR(20),
    provider_payout_id VARCHAR(100),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON billing_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_account ON billing_invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_account ON affiliates(account_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);

-- =====================================================
-- SEED DATA
-- =====================================================
INSERT INTO billing_products (code, name, description, category, price_monthly, price_yearly, display_order) VALUES
('wp-theme-developer', 'Developer Theme', 'Professional WordPress theme for hotels & B&Bs', 'template', 15, 150, 1),
('wp-plugin-booking', 'WP Booking Plugin', 'Booking widget for WordPress sites', 'plugin', 10, 100, 2),
('app-blogger', 'Smart Blogger', 'AI-powered blog content generator', 'app', 9, 90, 3),
('app-attractions', 'Attractions & SEO', 'Local attractions and SEO booster', 'app', 9, 90, 4),
('app-marketing', 'Marketing Tools', 'Social media campaigns & offers', 'app', 12, 120, 5),
('portal-builder', 'Portal Builder', 'Create niche travel portals', 'template', 29, 290, 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO billing_plans (code, name, description, price_monthly, price_yearly, max_properties, max_rooms, is_featured, badge_text, display_order) VALUES
('free', 'Free', 'Get started with inventory management', 0, 0, 1, 5, FALSE, NULL, 1),
('starter', 'Starter', 'Perfect for small properties', 19, 190, 1, 10, FALSE, NULL, 2),
('growth', 'Growth', 'Everything you need to grow', 39, 390, 3, 50, TRUE, 'Most Popular', 3),
('portal', 'Portal', 'Build your travel empire', 49, 490, 10, 100, FALSE, 'For Entrepreneurs', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO billing_addons (code, name, description, price_monthly, extra_properties, display_order) VALUES
('extra-property', 'Extra Property', 'Add one additional property', 5, 1, 1),
('extra-5-properties', 'Property Pack', 'Add 5 additional properties', 20, 5, 2),
('priority-support', 'Priority Support', '24/7 priority email & chat support', 15, 0, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO affiliate_tiers (code, name, commission_rate, min_referrals, min_revenue, color, icon, display_order) VALUES
('bronze', 'Bronze', 5.00, 0, 0, '#CD7F32', '🥉', 1),
('silver', 'Silver', 10.00, 5, 0, '#C0C0C0', '🥈', 2),
('gold', 'Gold', 15.00, 10, 500, '#FFD700', '🥇', 3)
ON CONFLICT (code) DO NOTHING;

