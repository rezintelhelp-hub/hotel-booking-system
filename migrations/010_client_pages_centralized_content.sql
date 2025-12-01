-- Migration: 010_client_pages_centralized_content.sql
-- Description: Centralized content management - all site content lives in GAS
-- Date: 2024-12-01

-- =====================================================
-- CLIENT PAGES TABLE
-- Stores: About, Contact, Terms, Privacy, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS client_pages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Page identification
    page_type VARCHAR(50) NOT NULL, -- about, contact, terms, privacy, custom
    slug VARCHAR(100) NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    content TEXT, -- Rich HTML content
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Status
    is_published BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one page type per client
    UNIQUE(client_id, page_type)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_client_pages_client ON client_pages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pages_type ON client_pages(client_id, page_type);
CREATE INDEX IF NOT EXISTS idx_client_pages_slug ON client_pages(client_id, slug);

-- =====================================================
-- CLIENT CONTACT INFO TABLE
-- Separate table for structured contact data
-- =====================================================

CREATE TABLE IF NOT EXISTS client_contact_info (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Business info
    business_name VARCHAR(255),
    tagline VARCHAR(500),
    
    -- Contact details
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_secondary VARCHAR(50),
    whatsapp VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Map
    google_maps_embed TEXT, -- iframe embed code
    google_maps_url VARCHAR(500), -- link to Google Maps
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Business hours (JSON format)
    business_hours JSONB DEFAULT '{}',
    
    -- Social media
    facebook_url VARCHAR(500),
    instagram_url VARCHAR(500),
    twitter_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    youtube_url VARCHAR(500),
    tiktok_url VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_contact_client ON client_contact_info(client_id);

-- =====================================================
-- CLIENT BRANDING TABLE
-- Logo, colors, fonts for consistent theming
-- =====================================================

CREATE TABLE IF NOT EXISTS client_branding (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Logos
    logo_url VARCHAR(500),
    logo_dark_url VARCHAR(500), -- For dark backgrounds
    favicon_url VARCHAR(500),
    
    -- Colors
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#7c3aed',
    accent_color VARCHAR(20) DEFAULT '#f59e0b',
    text_color VARCHAR(20) DEFAULT '#1e293b',
    background_color VARCHAR(20) DEFAULT '#ffffff',
    
    -- Footer
    footer_bg_color VARCHAR(20) DEFAULT '#0f172a',
    footer_text_color VARCHAR(20) DEFAULT '#ffffff',
    copyright_text VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_branding_client ON client_branding(client_id);

-- =====================================================
-- BLOG POSTS TABLE
-- Blog managed centrally in GAS
-- =====================================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT, -- Rich HTML content
    featured_image_url VARCHAR(500),
    
    -- Categorization
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Author
    author_name VARCHAR(100),
    author_image_url VARCHAR(500),
    
    -- Settings
    read_time_minutes INTEGER DEFAULT 5,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_client ON blog_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(client_id, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(client_id, category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(client_id, is_featured) WHERE is_featured = true;

-- =====================================================
-- BLOG CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS blog_categories (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_client ON blog_categories(client_id);

-- =====================================================
-- ATTRACTIONS TABLE
-- Local attractions managed centrally in GAS
-- =====================================================

CREATE TABLE IF NOT EXISTS attractions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL, -- Optional: link to specific property
    
    -- Content
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    featured_image_url VARCHAR(500),
    
    -- Location
    address VARCHAR(500),
    city VARCHAR(100),
    distance_text VARCHAR(100), -- e.g., "5 min walk", "10 min drive"
    distance_value DECIMAL(10, 2), -- numeric distance in km
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    google_maps_url VARCHAR(500),
    
    -- Details
    category VARCHAR(100), -- restaurant, museum, park, beach, shopping, etc.
    phone VARCHAR(50),
    website_url VARCHAR(500),
    opening_hours TEXT,
    price_range VARCHAR(50), -- $, $$, $$$, $$$$, Free
    
    -- Rating
    rating DECIMAL(2, 1), -- 0.0 to 5.0
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Settings
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_attractions_client ON attractions(client_id);
CREATE INDEX IF NOT EXISTS idx_attractions_property ON attractions(property_id);
CREATE INDEX IF NOT EXISTS idx_attractions_category ON attractions(client_id, category);
CREATE INDEX IF NOT EXISTS idx_attractions_featured ON attractions(client_id, is_featured) WHERE is_featured = true;

-- =====================================================
-- ATTRACTION CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS attraction_categories (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(50), -- emoji or icon class
    description TEXT,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_attraction_categories_client ON attraction_categories(client_id);

-- =====================================================
-- ATTRACTION IMAGES TABLE
-- Multiple images per attraction
-- =====================================================

CREATE TABLE IF NOT EXISTS attraction_images (
    id SERIAL PRIMARY KEY,
    attraction_id INTEGER NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text VARCHAR(255),
    caption VARCHAR(500),
    
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attraction_images_attraction ON attraction_images(attraction_id);

-- =====================================================
-- NAVIGATION/MENU TABLE
-- Custom navigation items
-- =====================================================

CREATE TABLE IF NOT EXISTS client_navigation (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    menu_location VARCHAR(50) NOT NULL, -- header, footer, footer_quick_links, footer_legal
    
    label VARCHAR(100) NOT NULL,
    url VARCHAR(500),
    page_type VARCHAR(50), -- links to client_pages.page_type if internal
    
    target VARCHAR(20) DEFAULT '_self', -- _self, _blank
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_navigation_client ON client_navigation(client_id);
CREATE INDEX IF NOT EXISTS idx_client_navigation_location ON client_navigation(client_id, menu_location);

-- =====================================================
-- Insert default pages for existing clients
-- =====================================================

INSERT INTO client_pages (client_id, page_type, slug, title, content, is_published)
SELECT 
    id as client_id,
    'about' as page_type,
    'about' as slug,
    'About Us' as title,
    '' as content,
    false as is_published
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_pages WHERE client_pages.client_id = clients.id AND page_type = 'about'
);

INSERT INTO client_pages (client_id, page_type, slug, title, content, is_published)
SELECT 
    id as client_id,
    'contact' as page_type,
    'contact' as slug,
    'Contact Us' as title,
    '' as content,
    false as is_published
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_pages WHERE client_pages.client_id = clients.id AND page_type = 'contact'
);

INSERT INTO client_pages (client_id, page_type, slug, title, content, is_published)
SELECT 
    id as client_id,
    'terms' as page_type,
    'terms' as slug,
    'Terms & Conditions' as title,
    '' as content,
    false as is_published
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_pages WHERE client_pages.client_id = clients.id AND page_type = 'terms'
);

INSERT INTO client_pages (client_id, page_type, slug, title, content, is_published)
SELECT 
    id as client_id,
    'privacy' as page_type,
    'privacy' as slug,
    'Privacy Policy' as title,
    '' as content,
    false as is_published
FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_pages WHERE client_pages.client_id = clients.id AND page_type = 'privacy'
);

-- Create default contact info for existing clients
INSERT INTO client_contact_info (client_id)
SELECT id FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_contact_info WHERE client_contact_info.client_id = clients.id
);

-- Create default branding for existing clients
INSERT INTO client_branding (client_id)
SELECT id FROM clients
WHERE NOT EXISTS (
    SELECT 1 FROM client_branding WHERE client_branding.client_id = clients.id
);

COMMENT ON TABLE client_pages IS 'Centralized static pages (About, Contact, Terms, Privacy) managed in GAS';
COMMENT ON TABLE client_contact_info IS 'Structured contact information for each client';
COMMENT ON TABLE client_branding IS 'Logo, colors, and branding settings per client';
COMMENT ON TABLE blog_posts IS 'Blog posts managed centrally in GAS';
COMMENT ON TABLE blog_categories IS 'Blog post categories';
COMMENT ON TABLE attractions IS 'Local attractions managed centrally in GAS';
COMMENT ON TABLE attraction_categories IS 'Attraction categories (restaurants, museums, etc.)';
COMMENT ON TABLE attraction_images IS 'Multiple images per attraction';
COMMENT ON TABLE client_navigation IS 'Custom navigation menu items';
