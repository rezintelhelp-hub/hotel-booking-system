-- Website Builder Settings per Client
-- Each client can have their own website builder settings stored by section

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
