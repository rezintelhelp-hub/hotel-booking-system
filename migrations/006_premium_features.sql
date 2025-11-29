-- Migration: Add premium features support
-- File: migrations/006_premium_features.sql

-- Add image_url and category to upsells
ALTER TABLE upsells ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE upsells ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add plan/subscription columns to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);

-- Create indexes for faster public API queries
CREATE INDEX IF NOT EXISTS idx_offers_active_website ON offers(active, available_website);
CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_upsells_active ON upsells(active);
CREATE INDEX IF NOT EXISTS idx_upsells_user_id ON upsells(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_clients_plan ON clients(plan);

-- Update existing clients to have a plan (default free)
UPDATE clients SET plan = 'free' WHERE plan IS NULL;

-- Sample data for testing (comment out in production)
/*
INSERT INTO upsells (user_id, name, description, price, charge_type, category, active) VALUES
(1, 'Breakfast Basket', 'Fresh pastries, fruit, juice and coffee delivered to your room', 25.00, 'per_guest_per_night', 'Food & Dining', true),
(1, 'Late Checkout', 'Extend your stay until 2pm', 35.00, 'per_booking', 'Services', true),
(1, 'Welcome Champagne', 'Bottle of champagne on arrival', 45.00, 'per_booking', 'Extras', true),
(1, 'Airport Transfer', 'Private car service to/from airport', 75.00, 'per_booking', 'Transport', true),
(1, 'Spa Package', 'Couples massage in our wellness center', 150.00, 'per_booking', 'Wellness', true);

INSERT INTO offers (user_id, name, description, discount_type, discount_value, min_nights, available_website, active) VALUES
(1, 'Stay 3+ Nights', 'Save 10% when you stay 3 or more nights', 'percentage', 10, 3, true, true),
(1, 'Early Bird', 'Book 30+ days ahead and save 15%', 'percentage', 15, 1, true, true),
(1, 'Last Minute Deal', 'Book within 7 days for 20% off', 'percentage', 20, 1, true, true);
*/
