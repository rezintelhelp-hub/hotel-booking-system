-- Migration: Property Marketing Features
-- This table stores marketing features/tags for properties
-- Used by travel agents to filter and find properties

CREATE TABLE IF NOT EXISTS property_features (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    is_custom BOOLEAN DEFAULT FALSE,
    excluded_room_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate features per property
    UNIQUE(property_id, feature_name)
);

-- Index for fast lookups by property
CREATE INDEX IF NOT EXISTS idx_property_features_property_id ON property_features(property_id);

-- Index for searching by feature name (for travel agent filtering)
CREATE INDEX IF NOT EXISTS idx_property_features_feature_name ON property_features(feature_name);

-- Index for category-based filtering
CREATE INDEX IF NOT EXISTS idx_property_features_category ON property_features(category);

-- Add comment for documentation
COMMENT ON TABLE property_features IS 'Marketing features and tags for properties - used by travel agents to filter accommodation';
COMMENT ON COLUMN property_features.feature_name IS 'Feature identifier e.g. pet-friendly, walking, beachfront';
COMMENT ON COLUMN property_features.category IS 'Category: activities, guest-types, themes, location, amenities, custom';
COMMENT ON COLUMN property_features.excluded_room_ids IS 'Array of room IDs where this feature does NOT apply';
