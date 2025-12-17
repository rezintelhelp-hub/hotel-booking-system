-- Migration: Add V1 API credentials to Beds24 connection
-- Adds apiKey to connection and propKey to each property for image downloads

-- Update connection 3 with V1 API key
UPDATE gas_sync_connections 
SET credentials = credentials || '{"apiKey": "wdyg5h36jj7j7kblue"}'::jsonb
WHERE id = 3;

-- Add prop_key column if it doesn't exist
ALTER TABLE gas_sync_properties ADD COLUMN IF NOT EXISTS prop_key VARCHAR(255);

-- Update Belmont Hotel (external_id 75888) with its prop key
UPDATE gas_sync_properties 
SET prop_key = '89dy9c9sa7cdcp97agcpa7c8ca8p7add'
WHERE external_id = '75888' AND connection_id = 3;

-- Update Adelphi Holiday Flats (external_id 125676) with its prop key
UPDATE gas_sync_properties 
SET prop_key = '987yv097c9dc09c08a7dc87aaa3'
WHERE external_id = '125676' AND connection_id = 3;
