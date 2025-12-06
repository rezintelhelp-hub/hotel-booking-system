-- Property Terms & Policies Table
-- Migration: 012_property_terms.sql
-- Date: 2025-12-06
-- Database: PostgreSQL

-- Property Terms Table
CREATE TABLE IF NOT EXISTS property_terms (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL UNIQUE,
    
    -- Check-in / Check-out
    checkin_from VARCHAR(10) DEFAULT '15:00',
    checkin_until VARCHAR(10) DEFAULT '22:00',
    checkout_by VARCHAR(10) DEFAULT '11:00',
    late_checkout_fee DECIMAL(10,2) NULL,
    self_checkin BOOLEAN DEFAULT FALSE,
    checkin_24hr BOOLEAN DEFAULT FALSE,
    
    -- Smoking Policy (no, designated, allowed)
    smoking_policy VARCHAR(20) DEFAULT 'no',
    smoking_fine DECIMAL(10,2) NULL,
    
    -- Pet Policy (no, yes, request)
    pet_policy VARCHAR(20) DEFAULT 'no',
    pet_deposit DECIMAL(10,2) NULL,
    pet_fee_per_night DECIMAL(10,2) NULL,
    dogs_allowed BOOLEAN DEFAULT TRUE,
    cats_allowed BOOLEAN DEFAULT FALSE,
    small_pets_only BOOLEAN DEFAULT FALSE,
    max_pets INTEGER DEFAULT 2,
    
    -- Children & Guests (all, 5plus, 12plus, adults18, adults21)
    children_policy VARCHAR(20) DEFAULT 'all',
    cots_available BOOLEAN DEFAULT FALSE,
    highchairs_available BOOLEAN DEFAULT FALSE,
    cot_fee_per_night DECIMAL(10,2) NULL,
    
    -- Events & Parties (no, small, contact)
    events_policy VARCHAR(20) DEFAULT 'no',
    
    -- Accessibility
    wheelchair_accessible BOOLEAN DEFAULT FALSE,
    step_free_access BOOLEAN DEFAULT FALSE,
    accessible_bathroom BOOLEAN DEFAULT FALSE,
    grab_rails BOOLEAN DEFAULT FALSE,
    roll_in_shower BOOLEAN DEFAULT FALSE,
    elevator_access BOOLEAN DEFAULT FALSE,
    ground_floor_available BOOLEAN DEFAULT FALSE,
    
    -- House Rules
    quiet_hours_from VARCHAR(10) DEFAULT '22:00',
    quiet_hours_until VARCHAR(10) DEFAULT '08:00',
    no_outside_guests BOOLEAN DEFAULT FALSE,
    id_required BOOLEAN DEFAULT FALSE,
    additional_rules TEXT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_property_terms_property FOREIGN KEY (property_id) 
        REFERENCES properties(id) ON DELETE CASCADE
);

-- Bed Configuration Table
CREATE TABLE IF NOT EXISTS property_beds (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL,
    room_id INTEGER NULL,  -- NULL = property default, otherwise room-specific
    bed_type VARCHAR(20) NOT NULL,  -- king, queen, double, twin, sofa, bunk, cot
    quantity INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_property_beds_property FOREIGN KEY (property_id) 
        REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_property_beds_room FOREIGN KEY (room_id) 
        REFERENCES bookable_units(id) ON DELETE CASCADE
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_beds_property ON property_beds(property_id);
CREATE INDEX IF NOT EXISTS idx_property_beds_room ON property_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_property_terms_property ON property_terms(property_id);
