-- Migration 004: SEO Foundation
-- Run via: POST /api/admin/migrate-004-seo-foundation
-- Or execute this SQL directly in database

-- 1. FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER,
  property_id INTEGER,
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  category VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  
  show_on_website BOOLEAN DEFAULT true,
  include_in_schema BOOLEAN DEFAULT true,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faqs_property ON faqs(property_id);
CREATE INDEX IF NOT EXISTS idx_faqs_account ON faqs(account_id);

-- 2. SEO Settings table
CREATE TABLE IF NOT EXISTS seo_settings (
  id SERIAL PRIMARY KEY,
  account_id INTEGER,
  property_id INTEGER,
  
  custom_title VARCHAR(70),
  custom_description VARCHAR(170),
  keywords TEXT[],
  
  google_search_console_site VARCHAR(255),
  google_analytics_id VARCHAR(50),
  google_tag_manager_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  
  auto_generate_meta BOOLEAN DEFAULT true,
  include_schema_markup BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(property_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_settings_property ON seo_settings(property_id);
CREATE INDEX IF NOT EXISTS idx_seo_settings_account ON seo_settings(account_id);
