-- Migration 003: External Vendor System
-- Allows property owners to set up external vendors (taxis, tours, etc.)
-- and automatically notify them when their services are purchased

-- ============================================
-- 1. VENDORS TABLE - The vendor companies
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL,              -- Property owner who created this vendor
  name VARCHAR(255) NOT NULL,               -- "ABC Taxis", "City Tours Ltd"
  contact_name VARCHAR(255),                -- Primary contact person
  email VARCHAR(255) NOT NULL,              -- For notifications
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,                               -- Internal notes from property owner
  
  -- Login credentials for vendor portal
  login_email VARCHAR(255) UNIQUE,          -- Vendor's login (may differ from notification email)
  password_hash VARCHAR(255),               -- bcrypt hashed
  
  status VARCHAR(20) DEFAULT 'active',      -- active, inactive, suspended
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_vendors_account ON vendors(account_id);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(login_email);

-- ============================================
-- 2. VENDOR PERMISSIONS - What data vendor can see
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_permissions (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- Guest information
  can_see_guest_name BOOLEAN DEFAULT true,
  can_see_guest_email BOOLEAN DEFAULT false,
  can_see_guest_phone BOOLEAN DEFAULT true,
  
  -- Booking information
  can_see_check_in_date BOOLEAN DEFAULT true,
  can_see_check_out_date BOOLEAN DEFAULT true,
  can_see_property_name BOOLEAN DEFAULT true,
  can_see_room_name BOOLEAN DEFAULT false,
  can_see_booking_total BOOLEAN DEFAULT false,
  can_see_guest_count BOOLEAN DEFAULT true,
  can_see_special_requests BOOLEAN DEFAULT true,
  
  -- Address (for transfers etc)
  can_see_guest_address BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(vendor_id)
);

-- ============================================
-- 3. SERVICE REQUESTS - When a vendor service is purchased
-- ============================================
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,              -- Links to bookings table
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  
  -- What was purchased
  source_type VARCHAR(20) NOT NULL,         -- 'upsell' or 'voucher'
  source_id INTEGER NOT NULL,               -- upsell_id or voucher_id
  service_name VARCHAR(255) NOT NULL,       -- Cached name at time of purchase
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  
  -- Service details
  service_date DATE,                        -- When service is needed (if applicable)
  service_time TIME,                        -- Time if applicable
  service_notes TEXT,                       -- Special instructions from guest
  
  -- Status tracking
  status VARCHAR(30) DEFAULT 'pending',     -- pending, notified, confirmed, completed, cancelled
  notified_at TIMESTAMP,                    -- When email was sent
  viewed_at TIMESTAMP,                      -- When vendor first viewed
  confirmed_at TIMESTAMP,                   -- When vendor confirmed receipt
  completed_at TIMESTAMP,                   -- When vendor marked complete
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Vendor response
  vendor_notes TEXT,                        -- Notes from vendor
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_service_requests_booking ON service_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_vendor ON service_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- ============================================
-- 4. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add vendor support to upsells
ALTER TABLE upsells ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
ALTER TABLE upsells ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;

-- Add vendor support to vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;

-- ============================================
-- 5. VENDOR NOTIFICATION LOG - Track all emails sent
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_notifications (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  service_request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
  
  notification_type VARCHAR(50) NOT NULL,   -- 'new_request', 'reminder', 'cancellation'
  email_to VARCHAR(255),
  email_subject VARCHAR(255),
  email_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor ON vendor_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_request ON vendor_notifications(service_request_id);
