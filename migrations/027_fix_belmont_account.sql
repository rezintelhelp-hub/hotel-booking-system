-- Migration: Fix Belmont properties to belong to Belmont Properties account
-- Belmont Properties account ID is 54, properties are currently on account 1

-- Update Belmont Hotel (property 101, beds24_property_id 75888)
UPDATE properties SET account_id = 54 WHERE id = 101;

-- Update Adelphi Holiday Flats (property 100, beds24_property_id 125676)  
UPDATE properties SET account_id = 54 WHERE id = 100;

-- Also update the GasSync connection to link to account 54
UPDATE gas_sync_connections SET account_id = 54 WHERE id = 3;
