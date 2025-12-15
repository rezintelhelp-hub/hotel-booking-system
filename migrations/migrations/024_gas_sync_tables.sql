-- =====================================================
-- GasSync Database Schema
-- Channel Manager Integration Layer
-- =====================================================

-- =====================================================
-- CHANNEL MANAGER CONNECTIONS
-- =====================================================

-- Available channel managers
CREATE TABLE IF NOT EXISTS gas_sync_adapters (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,          -- 'beds24', 'hostaway', 'smoobu', 'calry'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    api_base_url VARCHAR(500),
    auth_type VARCHAR(50) NOT NULL,            -- 'api_key', 'oauth2', 'invite_code'
    capabilities JSONB DEFAULT '[]',           -- ['properties', 'availability', 'reservations', 'images']
    rate_limit_rpm INTEGER DEFAULT 60,         -- Requests per minute
    supports_webhooks BOOLEAN DEFAULT false,
    webhook_events JSONB DEFAULT '[]',         -- Supported webhook event types
    config_schema JSONB,                       -- JSON Schema for required credentials
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account connections to channel managers
CREATE TABLE IF NOT EXISTS gas_sync_connections (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    adapter_code VARCHAR(50) NOT NULL REFERENCES gas_sync_adapters(code),
    
    -- Connection credentials (encrypted in practice)
    credentials JSONB NOT NULL,                -- { api_key, token, refresh_token, etc. }
    
    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    
    -- Connection status
    status VARCHAR(50) DEFAULT 'pending',      -- 'pending', 'connected', 'error', 'disabled'
    last_error TEXT,
    last_error_at TIMESTAMP,
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 15,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    
    -- Webhook settings
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    webhook_registered BOOLEAN DEFAULT false,
    
    -- Metadata
    external_account_id VARCHAR(255),          -- CM's account/workspace ID
    external_account_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(account_id, adapter_code)
);

CREATE INDEX idx_sync_connections_account ON gas_sync_connections(account_id);
CREATE INDEX idx_sync_connections_status ON gas_sync_connections(status);
CREATE INDEX idx_sync_connections_next_sync ON gas_sync_connections(next_sync_at) WHERE sync_enabled = true;

-- =====================================================
-- SYNCED PROPERTIES
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_properties (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    gas_property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    
    -- External identifiers
    external_id VARCHAR(255) NOT NULL,
    external_url VARCHAR(500),
    
    -- Property data (Calry v2 schema)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100),
    
    -- Address
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Settings
    timezone VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'GBP',
    check_in_time TIME,
    check_out_time TIME,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_listed BOOLEAN DEFAULT true,
    
    -- Amenities & features
    amenities JSONB DEFAULT '[]',
    house_rules JSONB DEFAULT '{}',
    
    -- Raw data from CM
    raw_data JSONB,
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_hash VARCHAR(64),                     -- Hash of data to detect changes
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(connection_id, external_id)
);

CREATE INDEX idx_sync_properties_connection ON gas_sync_properties(connection_id);
CREATE INDEX idx_sync_properties_gas ON gas_sync_properties(gas_property_id);
CREATE INDEX idx_sync_properties_external ON gas_sync_properties(external_id);

-- =====================================================
-- SYNCED ROOM TYPES (Bookable entities in Calry v2)
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_room_types (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_property_id INTEGER NOT NULL REFERENCES gas_sync_properties(id) ON DELETE CASCADE,
    gas_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    
    -- External identifiers
    external_id VARCHAR(255) NOT NULL,
    
    -- Room type data
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Capacity
    max_guests INTEGER DEFAULT 2,
    bedrooms INTEGER DEFAULT 1,
    beds INTEGER DEFAULT 1,
    bathrooms DECIMAL(3, 1) DEFAULT 1,
    
    -- Size
    size_value DECIMAL(10, 2),
    size_unit VARCHAR(10) DEFAULT 'sqm',       -- 'sqm' or 'sqft'
    
    -- Pricing
    base_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    
    -- Amenities
    amenities JSONB DEFAULT '[]',
    
    -- Unit count (for hotels with multiple rooms of same type)
    unit_count INTEGER DEFAULT 1,
    
    -- Raw data
    raw_data JSONB,
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_hash VARCHAR(64),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(connection_id, external_id)
);

CREATE INDEX idx_sync_room_types_connection ON gas_sync_room_types(connection_id);
CREATE INDEX idx_sync_room_types_property ON gas_sync_room_types(sync_property_id);
CREATE INDEX idx_sync_room_types_gas ON gas_sync_room_types(gas_room_id);

-- =====================================================
-- SYNCED UNITS (Individual rentable units)
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_units (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER NOT NULL REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
    gas_bookable_unit_id INTEGER REFERENCES bookable_units(id) ON DELETE SET NULL,
    
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',    -- 'available', 'maintenance', 'blocked'
    
    raw_data JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(connection_id, external_id)
);

CREATE INDEX idx_sync_units_room_type ON gas_sync_units(sync_room_type_id);

-- =====================================================
-- SYNCED AVAILABILITY
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_availability (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER NOT NULL REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    units_available INTEGER DEFAULT 1,
    
    -- Stay restrictions
    min_stay INTEGER DEFAULT 1,
    max_stay INTEGER,
    check_in_allowed BOOLEAN DEFAULT true,
    check_out_allowed BOOLEAN DEFAULT true,
    
    -- Pricing
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50),                        -- 'cm' or 'gas' (who last updated)
    
    UNIQUE(sync_room_type_id, date)
);

CREATE INDEX idx_sync_availability_room_date ON gas_sync_availability(sync_room_type_id, date);
CREATE INDEX idx_sync_availability_date ON gas_sync_availability(date);

-- =====================================================
-- SYNCED RATES
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_rates (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER NOT NULL REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    -- Rate plan (optional)
    rate_plan_id VARCHAR(255),
    rate_plan_name VARCHAR(255),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'GBP',
    
    -- Guest-based pricing
    extra_guest_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- Discounts
    weekly_discount_percent DECIMAL(5, 2) DEFAULT 0,
    monthly_discount_percent DECIMAL(5, 2) DEFAULT 0,
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50),
    
    UNIQUE(sync_room_type_id, date, COALESCE(rate_plan_id, 'default'))
);

CREATE INDEX idx_sync_rates_room_date ON gas_sync_rates(sync_room_type_id, date);

-- =====================================================
-- SYNCED RESERVATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_reservations (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER REFERENCES gas_sync_room_types(id) ON DELETE SET NULL,
    gas_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- External identifiers
    external_id VARCHAR(255) NOT NULL,
    channel VARCHAR(100),                      -- 'airbnb', 'booking.com', 'direct', etc.
    channel_reservation_id VARCHAR(255),       -- ID from the OTA
    
    -- Dates
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    booked_at TIMESTAMP,
    
    -- Guest counts
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    
    -- Guest info
    guest_first_name VARCHAR(100),
    guest_last_name VARCHAR(100),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_language VARCHAR(10),
    guest_address JSONB,
    
    -- Pricing
    subtotal DECIMAL(10, 2),
    cleaning_fee DECIMAL(10, 2) DEFAULT 0,
    taxes DECIMAL(10, 2) DEFAULT 0,
    fees DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'confirmed',    -- 'pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show'
    
    -- Additional info
    notes TEXT,
    special_requests TEXT,
    arrival_time TIME,
    
    -- Raw data
    raw_data JSONB,
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_direction VARCHAR(10),                -- 'pull' (from CM) or 'push' (to CM)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(connection_id, external_id)
);

CREATE INDEX idx_sync_reservations_connection ON gas_sync_reservations(connection_id);
CREATE INDEX idx_sync_reservations_dates ON gas_sync_reservations(check_in, check_out);
CREATE INDEX idx_sync_reservations_status ON gas_sync_reservations(status);
CREATE INDEX idx_sync_reservations_gas ON gas_sync_reservations(gas_booking_id);
CREATE INDEX idx_sync_reservations_channel ON gas_sync_reservations(channel);

-- =====================================================
-- SYNCED IMAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_images (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_property_id INTEGER REFERENCES gas_sync_properties(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
    gas_image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    
    -- External identifiers
    external_id VARCHAR(255),
    
    -- Image data
    original_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    local_path VARCHAR(500),                   -- If downloaded locally
    
    -- Metadata
    caption VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    image_type VARCHAR(50) DEFAULT 'property', -- 'property', 'room', 'amenity', 'floor_plan'
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Download status
    is_downloaded BOOLEAN DEFAULT false,
    downloaded_at TIMESTAMP,
    download_error TEXT,
    
    -- Sync tracking
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_images_property ON gas_sync_images(sync_property_id);
CREATE INDEX idx_sync_images_room ON gas_sync_images(sync_room_type_id);
CREATE INDEX idx_sync_images_downloaded ON gas_sync_images(is_downloaded);

-- =====================================================
-- SYNC LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_log (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    
    -- Sync details
    sync_type VARCHAR(50) NOT NULL,            -- 'full', 'incremental', 'webhook', 'push'
    entity_type VARCHAR(50),                   -- 'property', 'room_type', 'availability', 'reservation', 'image'
    entity_id VARCHAR(255),
    
    -- Direction
    direction VARCHAR(10) NOT NULL,            -- 'pull' or 'push'
    
    -- Status
    status VARCHAR(50) NOT NULL,               -- 'started', 'success', 'partial', 'error'
    
    -- Stats
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    
    -- Error details
    error_message TEXT,
    error_details JSONB,
    
    -- Request/response for debugging
    request_data JSONB,
    response_data JSONB
);

CREATE INDEX idx_sync_log_connection ON gas_sync_log(connection_id);
CREATE INDEX idx_sync_log_started ON gas_sync_log(started_at);
CREATE INDEX idx_sync_log_status ON gas_sync_log(status);
CREATE INDEX idx_sync_log_type ON gas_sync_log(sync_type, entity_type);

-- =====================================================
-- WEBHOOK EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS gas_sync_webhook_events (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,          -- 'reservation.created', 'availability.updated', etc.
    event_id VARCHAR(255),                     -- CM's event ID for deduplication
    
    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending',      -- 'pending', 'processing', 'processed', 'failed'
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(connection_id, event_id)
);

CREATE INDEX idx_sync_webhooks_connection ON gas_sync_webhook_events(connection_id);
CREATE INDEX idx_sync_webhooks_status ON gas_sync_webhook_events(status);
CREATE INDEX idx_sync_webhooks_received ON gas_sync_webhook_events(received_at);

-- =====================================================
-- FIELD MAPPINGS
-- =====================================================

-- Custom field mappings between GAS and CM fields
CREATE TABLE IF NOT EXISTS gas_sync_field_mappings (
    id SERIAL PRIMARY KEY,
    adapter_code VARCHAR(50) NOT NULL REFERENCES gas_sync_adapters(code),
    entity_type VARCHAR(50) NOT NULL,          -- 'property', 'room_type', 'reservation'
    
    gas_field VARCHAR(100) NOT NULL,           -- GAS field name
    cm_field VARCHAR(100) NOT NULL,            -- CM field name/path (can be dot notation)
    
    -- Transformation
    transform_type VARCHAR(50),                -- 'direct', 'map', 'format', 'custom'
    transform_config JSONB,                    -- { map: {}, format: '', function: '' }
    
    -- Direction
    direction VARCHAR(10) DEFAULT 'both',      -- 'pull', 'push', 'both'
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(adapter_code, entity_type, gas_field)
);

-- =====================================================
-- INSERT DEFAULT ADAPTERS
-- =====================================================

INSERT INTO gas_sync_adapters (code, name, description, api_base_url, auth_type, capabilities, supports_webhooks, webhook_events)
VALUES 
    ('beds24', 'Beds24', 'Full-featured channel manager with V1 and V2 APIs', 'https://beds24.com/api/v2', 'invite_code', 
     '["properties", "room_types", "availability", "rates", "reservations", "images", "conversations"]', true,
     '["reservation.created", "reservation.updated", "reservation.cancelled", "availability.updated"]'),
    
    ('hostaway', 'Hostaway', 'Property management and channel manager', 'https://api.hostaway.com/v1', 'oauth2',
     '["properties", "room_types", "availability", "rates", "reservations", "conversations"]', true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'),
    
    ('smoobu', 'Smoobu', 'Vacation rental software and channel manager', 'https://login.smoobu.com/api', 'api_key',
     '["properties", "room_types", "availability", "rates", "reservations"]', true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'),
    
    ('calry', 'Calry (Unified)', 'Unified API for 40+ PMS systems', 'https://prod.calry.app/api/v2', 'oauth2',
     '["properties", "room_types", "availability", "rates", "reservations", "conversations"]', true,
     '["reservation.created", "reservation.updated", "reservation.cancelled", "availability.updated", "message.received"]')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    api_base_url = EXCLUDED.api_base_url,
    capabilities = EXCLUDED.capabilities,
    supports_webhooks = EXCLUDED.supports_webhooks,
    webhook_events = EXCLUDED.webhook_events,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_gas_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS update_gas_sync_connections_timestamp ON gas_sync_connections;
CREATE TRIGGER update_gas_sync_connections_timestamp
    BEFORE UPDATE ON gas_sync_connections
    FOR EACH ROW EXECUTE FUNCTION update_gas_sync_timestamp();

DROP TRIGGER IF EXISTS update_gas_sync_properties_timestamp ON gas_sync_properties;
CREATE TRIGGER update_gas_sync_properties_timestamp
    BEFORE UPDATE ON gas_sync_properties
    FOR EACH ROW EXECUTE FUNCTION update_gas_sync_timestamp();

DROP TRIGGER IF EXISTS update_gas_sync_room_types_timestamp ON gas_sync_room_types;
CREATE TRIGGER update_gas_sync_room_types_timestamp
    BEFORE UPDATE ON gas_sync_room_types
    FOR EACH ROW EXECUTE FUNCTION update_gas_sync_timestamp();

DROP TRIGGER IF EXISTS update_gas_sync_reservations_timestamp ON gas_sync_reservations;
CREATE TRIGGER update_gas_sync_reservations_timestamp
    BEFORE UPDATE ON gas_sync_reservations
    FOR EACH ROW EXECUTE FUNCTION update_gas_sync_timestamp();

-- =====================================================
-- VIEWS
-- =====================================================

-- Connection status overview
CREATE OR REPLACE VIEW gas_sync_connection_status AS
SELECT 
    c.id,
    c.account_id,
    a.name as account_name,
    c.adapter_code,
    ad.name as adapter_name,
    c.status,
    c.last_sync_at,
    c.next_sync_at,
    c.last_error,
    (SELECT COUNT(*) FROM gas_sync_properties WHERE connection_id = c.id) as property_count,
    (SELECT COUNT(*) FROM gas_sync_room_types WHERE connection_id = c.id) as room_type_count,
    (SELECT COUNT(*) FROM gas_sync_reservations WHERE connection_id = c.id AND status = 'confirmed') as active_reservations
FROM gas_sync_connections c
JOIN accounts a ON c.account_id = a.id
JOIN gas_sync_adapters ad ON c.adapter_code = ad.code;

-- Recent sync activity
CREATE OR REPLACE VIEW gas_sync_recent_activity AS
SELECT 
    l.id,
    l.connection_id,
    c.adapter_code,
    a.name as account_name,
    l.sync_type,
    l.entity_type,
    l.direction,
    l.status,
    l.records_processed,
    l.records_created,
    l.records_updated,
    l.records_failed,
    l.started_at,
    l.duration_ms,
    l.error_message
FROM gas_sync_log l
JOIN gas_sync_connections c ON l.connection_id = c.id
JOIN accounts a ON c.account_id = a.id
ORDER BY l.started_at DESC
LIMIT 100;
