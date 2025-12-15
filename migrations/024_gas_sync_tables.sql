-- GasSync Database Schema

-- Available channel managers
CREATE TABLE IF NOT EXISTS gas_sync_adapters (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    api_base_url VARCHAR(500),
    auth_type VARCHAR(50) NOT NULL,
    capabilities JSONB DEFAULT '[]',
    rate_limit_rpm INTEGER DEFAULT 60,
    supports_webhooks BOOLEAN DEFAULT false,
    webhook_events JSONB DEFAULT '[]',
    config_schema JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account connections to channel managers
CREATE TABLE IF NOT EXISTS gas_sync_connections (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    adapter_code VARCHAR(50) NOT NULL REFERENCES gas_sync_adapters(code),
    credentials JSONB NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    last_error TEXT,
    last_error_at TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 15,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    webhook_registered BOOLEAN DEFAULT false,
    external_account_id VARCHAR(255),
    external_account_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, adapter_code)
);

CREATE INDEX IF NOT EXISTS idx_sync_connections_account ON gas_sync_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_connections_status ON gas_sync_connections(status);

-- Synced properties
CREATE TABLE IF NOT EXISTS gas_sync_properties (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    gas_property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    external_url VARCHAR(500),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'GBP',
    check_in_time TIME,
    check_out_time TIME,
    is_active BOOLEAN DEFAULT true,
    is_listed BOOLEAN DEFAULT true,
    amenities JSONB DEFAULT '[]',
    house_rules JSONB DEFAULT '{}',
    raw_data JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_properties_connection ON gas_sync_properties(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_properties_gas ON gas_sync_properties(gas_property_id);

-- Synced room types
CREATE TABLE IF NOT EXISTS gas_sync_room_types (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_property_id INTEGER NOT NULL REFERENCES gas_sync_properties(id) ON DELETE CASCADE,
    gas_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_guests INTEGER DEFAULT 2,
    bedrooms INTEGER DEFAULT 1,
    beds INTEGER DEFAULT 1,
    bathrooms DECIMAL(3, 1) DEFAULT 1,
    size_value DECIMAL(10, 2),
    size_unit VARCHAR(10) DEFAULT 'sqm',
    base_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    amenities JSONB DEFAULT '[]',
    unit_count INTEGER DEFAULT 1,
    raw_data JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_room_types_connection ON gas_sync_room_types(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_room_types_property ON gas_sync_room_types(sync_property_id);

-- Synced reservations
CREATE TABLE IF NOT EXISTS gas_sync_reservations (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER REFERENCES gas_sync_room_types(id) ON DELETE SET NULL,
    gas_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    channel VARCHAR(100),
    channel_reference VARCHAR(255),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    booked_at TIMESTAMP,
    guest_first_name VARCHAR(100),
    guest_last_name VARCHAR(100),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    subtotal DECIMAL(10, 2),
    taxes DECIMAL(10, 2),
    fees DECIMAL(10, 2),
    total DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    status VARCHAR(50) DEFAULT 'confirmed',
    payment_status VARCHAR(50),
    special_requests TEXT,
    guest_notes TEXT,
    host_notes TEXT,
    raw_data JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_reservations_connection ON gas_sync_reservations(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_reservations_dates ON gas_sync_reservations(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_sync_reservations_status ON gas_sync_reservations(status);

-- Synced images
CREATE TABLE IF NOT EXISTS gas_sync_images (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_property_id INTEGER REFERENCES gas_sync_properties(id) ON DELETE CASCADE,
    sync_room_type_id INTEGER REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    original_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    gas_image_id INTEGER,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    image_type VARCHAR(50) DEFAULT 'property',
    width INTEGER,
    height INTEGER,
    is_downloaded BOOLEAN DEFAULT false,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_images_property ON gas_sync_images(sync_property_id);

-- Sync log
CREATE TABLE IF NOT EXISTS gas_sync_log (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    error_details JSONB,
    request_data JSONB,
    response_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_log_connection ON gas_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON gas_sync_log(started_at);

-- Webhook events
CREATE TABLE IF NOT EXISTS gas_sync_webhook_events (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    payload JSONB NOT NULL,
    headers JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(connection_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_webhooks_connection ON gas_sync_webhook_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_webhooks_status ON gas_sync_webhook_events(status);

-- Insert default adapters
INSERT INTO gas_sync_adapters (code, name, description, api_base_url, auth_type, capabilities, supports_webhooks, webhook_events)
VALUES 
    ('beds24', 'Beds24', 'Full-featured channel manager with V1 and V2 APIs', 'https://beds24.com/api/v2', 'invite_code', 
     '["properties", "room_types", "availability", "rates", "reservations", "images"]'::jsonb, true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'::jsonb),
    
    ('hostaway', 'Hostaway', 'Property management and channel manager', 'https://api.hostaway.com/v1', 'oauth2',
     '["properties", "room_types", "availability", "rates", "reservations"]'::jsonb, true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'::jsonb),
    
    ('smoobu', 'Smoobu', 'Vacation rental software and channel manager', 'https://login.smoobu.com/api', 'api_key',
     '["properties", "room_types", "availability", "rates", "reservations"]'::jsonb, true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'::jsonb),
    
    ('calry', 'Calry (Unified)', 'Unified API for 40+ PMS systems', 'https://prod.calry.app/api/v2', 'oauth2',
     '["properties", "room_types", "availability", "rates", "reservations"]'::jsonb, true,
     '["reservation.created", "reservation.updated", "reservation.cancelled"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    api_base_url = EXCLUDED.api_base_url,
    capabilities = EXCLUDED.capabilities,
    supports_webhooks = EXCLUDED.supports_webhooks,
    webhook_events = EXCLUDED.webhook_events,
    updated_at = CURRENT_TIMESTAMP;
