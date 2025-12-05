-- Website Builder Settings per Client
-- Each client can have their own website builder settings stored by section

-- First, try to rename client_id to account_id if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'website_settings' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE website_settings RENAME COLUMN client_id TO account_id;
    END IF;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS website_settings (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    section VARCHAR(50) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, section)
);

CREATE INDEX IF NOT EXISTS idx_website_settings_account ON website_settings(account_id);

-- Add settings column to accounts table for WordPress linking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
