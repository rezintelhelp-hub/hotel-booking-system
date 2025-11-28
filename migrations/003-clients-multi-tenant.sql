-- =====================================================
-- GAS MULTI-TENANT CLIENTS MIGRATION
-- Run this against your Railway PostgreSQL database
-- =====================================================

-- 1. CLIENTS TABLE (Main account holder)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',
    
    -- Settings
    currency VARCHAR(3) DEFAULT 'GBP',
    timezone VARCHAR(50) DEFAULT 'Europe/London',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Subscription & Billing
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'agency')),
    plan_started_at TIMESTAMP,
    plan_expires_at TIMESTAMP,
    stripe_customer_id VARCHAR(100),
    
    -- API Access (for WordPress plugin)
    api_key VARCHAR(64) UNIQUE,
    api_key_created_at TIMESTAMP,
    api_requests_today INTEGER DEFAULT 0,
    api_requests_reset_at DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLIENT USERS TABLE (Multiple users per client)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_users (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Auth
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    
    -- Permissions
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invite_token VARCHAR(64),
    invite_expires_at TIMESTAMP,
    
    -- Tracking
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    login_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, email)
);

-- 3. ADD client_id TO EXISTING TABLES
-- =====================================================

-- Properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- Channel manager connections
ALTER TABLE channel_manager_connections 
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_api_key ON clients(api_key);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_plan ON clients(plan);

CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);

CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_client_id ON channel_manager_connections(client_id);

-- 5. HELPER FUNCTION: Generate API Key
-- =====================================================
CREATE OR REPLACE FUNCTION generate_api_key() 
RETURNS VARCHAR(64) AS $$
DECLARE
    key VARCHAR(64);
BEGIN
    key := 'gas_' || encode(gen_random_bytes(28), 'hex');
    RETURN key;
END;
$$ LANGUAGE plpgsql;

-- 6. AUTO-UPDATE updated_at TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at
    BEFORE UPDATE ON client_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. CREATE DEFAULT CLIENTS FOR EXISTING DATA
-- =====================================================

-- Create client for Lehmann House (Beds24 properties)
INSERT INTO clients (name, email, currency, plan, status, api_key, api_key_created_at)
VALUES (
    'Lehmann House',
    'info@lehmannhouse.com',
    'GBP',
    'free',
    'active',
    'gas_' || encode(gen_random_bytes(28), 'hex'),
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Create client for Hostaway properties
INSERT INTO clients (name, email, currency, plan, status, api_key, api_key_created_at)
VALUES (
    'Hostaway Demo',
    'demo@hostaway.com',
    'GBP',
    'free',
    'active',
    'gas_' || encode(gen_random_bytes(28), 'hex'),
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- 8. ASSIGN EXISTING PROPERTIES TO CLIENTS
-- =====================================================

-- Assign Beds24 properties to Lehmann House client
UPDATE properties p
SET client_id = c.id
FROM clients c, channel_manager_connections cmc
WHERE c.email = 'info@lehmannhouse.com'
AND cmc.property_id = p.id
AND cmc.channel_manager = 'beds24'
AND p.client_id IS NULL;

-- Assign Hostaway properties to Hostaway Demo client
UPDATE properties p
SET client_id = c.id
FROM clients c, channel_manager_connections cmc
WHERE c.email = 'demo@hostaway.com'
AND cmc.property_id = p.id
AND cmc.channel_manager = 'hostaway'
AND p.client_id IS NULL;

-- Also update the channel_manager_connections
UPDATE channel_manager_connections cmc
SET client_id = p.client_id
FROM properties p
WHERE cmc.property_id = p.id
AND cmc.client_id IS NULL;

-- 9. VIEW: Client Summary
-- =====================================================
CREATE OR REPLACE VIEW client_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.plan,
    c.status,
    c.api_key,
    c.created_at,
    COUNT(DISTINCT p.id) as property_count,
    COUNT(DISTINCT r.id) as room_count,
    COUNT(DISTINCT b.id) as booking_count
FROM clients c
LEFT JOIN properties p ON p.client_id = c.id
LEFT JOIN rooms r ON r.property_id = p.id
LEFT JOIN bookings b ON b.room_id = r.id
GROUP BY c.id, c.name, c.email, c.plan, c.status, c.api_key, c.created_at;

-- 10. DONE!
-- =====================================================
-- Run this query to see your clients:
-- SELECT * FROM client_summary;
