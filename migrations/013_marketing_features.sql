-- Marketing Features Tables (Property & Room Level)
-- Migration: 013_marketing_features.sql
-- Date: 2025-12-06
-- Database: PostgreSQL

-- Property/Room Features Table
CREATE TABLE IF NOT EXISTS property_features (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL,
    room_id INTEGER NULL,  -- NULL = property-wide, otherwise room-specific
    feature_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'custom',
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_property_features_property FOREIGN KEY (property_id) 
        REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_property_features_room FOREIGN KEY (room_id) 
        REFERENCES bookable_units(id) ON DELETE CASCADE
);

-- Room Exclusions for Property-Level Features
-- (when a property-level feature doesn't apply to certain rooms)
CREATE TABLE IF NOT EXISTS property_feature_exclusions (
    id SERIAL PRIMARY KEY,
    feature_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_exclusion_feature FOREIGN KEY (feature_id) 
        REFERENCES property_features(id) ON DELETE CASCADE,
    CONSTRAINT fk_exclusion_room FOREIGN KEY (room_id) 
        REFERENCES bookable_units(id) ON DELETE CASCADE,
    UNIQUE(feature_id, room_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_features_property ON property_features(property_id);
CREATE INDEX IF NOT EXISTS idx_property_features_room ON property_features(room_id);
CREATE INDEX IF NOT EXISTS idx_property_features_category ON property_features(category);
CREATE INDEX IF NOT EXISTS idx_feature_exclusions_feature ON property_feature_exclusions(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_exclusions_room ON property_feature_exclusions(room_id);
