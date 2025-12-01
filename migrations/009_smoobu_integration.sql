-- Migration: Add Smoobu Integration Support
-- Run this migration to add Smoobu ID columns to existing tables

-- Add smoobu_id to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS smoobu_id VARCHAR(50);

-- Add unique index for smoobu_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_smoobu_id 
ON properties(smoobu_id) 
WHERE smoobu_id IS NOT NULL;

-- Add smoobu_id to bookable_units table  
ALTER TABLE bookable_units 
ADD COLUMN IF NOT EXISTS smoobu_id VARCHAR(50);

-- Add unique index for smoobu_id on bookable_units
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookable_units_smoobu_id 
ON bookable_units(smoobu_id) 
WHERE smoobu_id IS NOT NULL;

-- Add channel_manager column to properties if not exists
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS channel_manager VARCHAR(50);

-- Update channel_manager values for existing records
-- (Only if they have beds24_id or hostaway_id but no channel_manager set)
UPDATE properties SET channel_manager = 'beds24' 
WHERE beds24_id IS NOT NULL AND channel_manager IS NULL;

UPDATE properties SET channel_manager = 'hostaway' 
WHERE hostaway_id IS NOT NULL AND channel_manager IS NULL;

-- Create index for channel_manager lookups
CREATE INDEX IF NOT EXISTS idx_properties_channel_manager 
ON properties(channel_manager);

-- Room amenities table (if not exists)
CREATE TABLE IF NOT EXISTS room_amenities (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, amenity_name)
);

-- Room availability table (if not exists)  
CREATE TABLE IF NOT EXISTS room_availability (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2),
    min_stay INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, date)
);

-- Index for availability lookups
CREATE INDEX IF NOT EXISTS idx_room_availability_room_date 
ON room_availability(room_id, date);

-- Client settings table (if not exists)
CREATE TABLE IF NOT EXISTS client_settings (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, setting_key)
);

-- Comments for documentation
COMMENT ON COLUMN properties.smoobu_id IS 'Smoobu apartment ID for syncing';
COMMENT ON COLUMN bookable_units.smoobu_id IS 'Smoobu apartment ID for syncing';
COMMENT ON COLUMN properties.channel_manager IS 'Channel manager source: beds24, hostaway, smoobu, or null for manual';
