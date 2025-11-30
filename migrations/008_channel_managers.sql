-- Migration: Channel Managers
-- Master list of channel managers and user requests for integrations

-- =====================================================
-- CHANNEL MANAGERS - Master List
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_managers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'pms_cm',  -- pms_cm, vr_allinone, vr_pms, vr_cm, hotel_cm
    status VARCHAR(50) DEFAULT 'not_started',  -- not_started, researching, awaiting_api, building, testing, live
    website_url VARCHAR(255),
    api_docs_url VARCHAR(255),
    logo_url VARCHAR(255),
    description TEXT,
    market_focus VARCHAR(100),  -- e.g. 'VR', 'Hotels', 'B&B', 'All'
    regions VARCHAR(255),  -- e.g. 'Global', 'UK', 'Europe', 'US'
    priority INTEGER DEFAULT 0,  -- higher = more important to integrate
    request_count INTEGER DEFAULT 0,  -- auto-updated from requests
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_channel_managers_status ON channel_managers(status);
CREATE INDEX IF NOT EXISTS idx_channel_managers_slug ON channel_managers(slug);

-- =====================================================
-- SEED DATA - Known Channel Managers
-- =====================================================

INSERT INTO channel_managers (name, slug, type, status, website_url, market_focus, regions, priority, description) VALUES
-- Already integrated
('Beds24', 'beds24', 'pms_cm', 'live', 'https://beds24.com', 'All', 'Global', 100, 'PMS + powerful channel manager with preferred partnerships'),
('Hostaway', 'hostaway', 'vr_allinone', 'live', 'https://hostaway.com', 'VR', 'Global', 100, 'All-in-one vacation rental software with deep OTA integrations'),

-- High priority - large market share
('Guesty', 'guesty', 'vr_pms', 'not_started', 'https://guesty.com', 'VR', 'Global', 90, 'Large VR PMS with strong channel management'),
('Guesty for Hosts', 'guesty-hosts', 'vr_pms', 'not_started', 'https://guesty.com', 'VR', 'Global', 85, 'Smaller version of Guesty for individual hosts'),
('Cloudbeds', 'cloudbeds', 'pms_cm', 'not_started', 'https://cloudbeds.com', 'Hotels', 'Global', 88, 'PMS + channel manager for hotels and VR managers'),
('eviivo', 'eviivo', 'allinone', 'not_started', 'https://eviivo.com', 'B&B', 'UK', 87, 'All-in-one for small hotels, B&Bs, self-catering'),
('Lodgify', 'lodgify', 'vr_cm', 'not_started', 'https://lodgify.com', 'VR', 'Global', 86, 'VR software with integrated channel manager + website builder'),
('SiteMinder', 'siteminder', 'hotel_cm', 'not_started', 'https://siteminder.com', 'Hotels', 'Global', 85, 'Big global hotel channel manager, supports VR'),
('Smoobu', 'smoobu', 'vr_pms', 'not_started', 'https://smoobu.com', 'VR', 'Europe', 84, 'VR PMS + channel manager + website builder'),
('OwnerRez', 'ownerrez', 'vr_cm', 'not_started', 'https://ownerrez.com', 'VR', 'US', 83, 'Vacation rental software - no % of revenue fee'),

-- Medium priority
('Amenitiz', 'amenitiz', 'pms_cm', 'not_started', 'https://amenitiz.com', 'Hotels', 'Europe', 70, 'PMS + channel manager, 120+ OTAs'),
('Avantio', 'avantio', 'vr_pms', 'not_started', 'https://avantio.com', 'VR', 'Europe', 70, 'Vacation-rental-specific PMS + channel manager'),
('Hosthub', 'hosthub', 'vr_cm', 'not_started', 'https://hosthub.com', 'VR', 'Global', 68, '200+ channels, zero-double-booking guarantee'),
('Hospitable', 'hospitable', 'vr_allinone', 'not_started', 'https://hospitable.com', 'VR', 'Global', 67, 'Super app for vacation rental hosts'),
('Hostfully', 'hostfully', 'vr_pms', 'not_started', 'https://hostfully.com', 'VR', 'Global', 66, 'VR PMS + channel manager'),
('Rentals United', 'rentals-united', 'vr_cm', 'not_started', 'https://rentalsunited.com', 'VR', 'Global', 65, 'VR channel manager connecting to 90+ channels'),
('Uplisting', 'uplisting', 'vr_allinone', 'not_started', 'https://uplisting.io', 'VR', 'Global', 64, 'All-in-one VR platform, strong Airbnb/Booking/Vrbo'),

-- Standard priority
('DiBooq', 'dibooq', 'vr_pms', 'not_started', 'https://dibooq.com', 'VR', 'Germany', 50, 'Modern VR software from Germany'),
('Guestline', 'guestline', 'pms_cm', 'not_started', 'https://guestline.com', 'Hotels', 'UK', 50, 'Property management + channel management'),
('iGMS', 'igms', 'vr_cm', 'not_started', 'https://igms.com', 'VR', 'Global', 50, 'Vacation rental channel manager / PMS'),
('Icnea', 'icnea', 'pms_cm', 'not_started', 'https://icnea.com', 'All', 'Europe', 45, 'PMS + channel manager for VR and small hotels'),
('Lodgix', 'lodgix', 'vr_cm', 'not_started', 'https://lodgix.com', 'VR', 'US', 40, 'Channel management for vacation rentals (legacy)'),
('STAAH', 'staah', 'hotel_cm', 'not_started', 'https://staah.com', 'Hotels', 'Global', 45, 'OTA channel manager for hotels and alternative accom'),
('Tokeet', 'tokeet', 'vr_pms', 'not_started', 'https://tokeet.com', 'VR', 'Global', 45, 'PMS + channel manager for short-term rentals')

ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- CHANNEL MANAGER REQUESTS - User Integration Requests
-- =====================================================

CREATE TABLE IF NOT EXISTS channel_manager_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    channel_manager_id INTEGER REFERENCES channel_managers(id) ON DELETE SET NULL,
    cm_name_other VARCHAR(100),  -- If they select "Other"
    status VARCHAR(50) DEFAULT 'pending',  -- pending, contacted, in_progress, completed, cancelled
    api_access_status VARCHAR(50) DEFAULT 'unknown',  -- unknown, requested, received, denied
    notes TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cm_requests_status ON channel_manager_requests(status);
CREATE INDEX IF NOT EXISTS idx_cm_requests_user ON channel_manager_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_requests_cm ON channel_manager_requests(channel_manager_id);

-- =====================================================
-- FUNCTION: Auto-update request count on channel_managers
-- =====================================================

CREATE OR REPLACE FUNCTION update_cm_request_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.channel_manager_id IS NOT NULL THEN
        UPDATE channel_managers 
        SET request_count = (
            SELECT COUNT(*) FROM channel_manager_requests 
            WHERE channel_manager_id = NEW.channel_manager_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.channel_manager_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_cm_request_count ON channel_manager_requests;

CREATE TRIGGER trigger_update_cm_request_count
AFTER INSERT OR DELETE ON channel_manager_requests
FOR EACH ROW
EXECUTE FUNCTION update_cm_request_count();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE channel_managers IS 'Master list of all known channel managers/PMS systems';
COMMENT ON TABLE channel_manager_requests IS 'User requests for channel manager integrations';
COMMENT ON COLUMN channel_managers.status IS 'Integration status: not_started, researching, awaiting_api, building, testing, live';
COMMENT ON COLUMN channel_managers.priority IS 'Higher number = higher priority for integration';
COMMENT ON COLUMN channel_managers.request_count IS 'Auto-updated count of user requests';
