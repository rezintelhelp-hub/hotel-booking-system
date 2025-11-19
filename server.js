require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const BEDS24_TOKEN = process.env.BEDS24_TOKEN;
const BEDS24_API = 'https://beds24.com/api/v2';

async function beds24Request(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BEDS24_API}${endpoint}`,
      headers: { 'token': BEDS24_TOKEN, 'Content-Type': 'application/json' }
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: !!process.env.DATABASE_URL, beds24: !!BEDS24_TOKEN });
});

app.get('/api/setup-database', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS properties (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, address TEXT, city VARCHAR(100), country VARCHAR(100), property_type VARCHAR(50), star_rating INTEGER, hero_image_url TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, description TEXT, max_occupancy INTEGER, max_adults INTEGER, max_children INTEGER, base_price DECIMAL(10, 2), currency VARCHAR(3) DEFAULT 'USD', quantity INTEGER DEFAULT 1, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id), room_id INTEGER REFERENCES rooms(id), check_in DATE NOT NULL, check_out DATE NOT NULL, num_adults INTEGER NOT NULL, num_children INTEGER DEFAULT 0, guest_first_name VARCHAR(100) NOT NULL, guest_last_name VARCHAR(100) NOT NULL, guest_email VARCHAR(255) NOT NULL, guest_phone VARCHAR(50), total_price DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'confirmed', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    res.json({ success: true, message: 'Database tables created!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/setup-users', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, company VARCHAR(255), account_type VARCHAR(50) DEFAULT 'owner', api_key VARCHAR(255) UNIQUE, subscription_status VARCHAR(50) DEFAULT 'free', subscription_plan VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    res.json({ success: true, message: 'Users table created!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, company, account_type } = req.body;
  try {
    const passwordHash = Buffer.from(password).toString('base64');
    const apiKey = 'gas_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const result = await pool.query(`INSERT INTO users (name, email, password_hash, company, account_type, api_key) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, account_type, api_key`, [name, email, passwordHash, company, account_type, apiKey]);
    res.json({ success: true, user: result.rows[0], token: apiKey });
  } catch (error) {
    if (error.code === '23505') {
      res.json({ success: false, error: 'Email already registered' });
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const passwordHash = Buffer.from(password).toString('base64');
    const result = await pool.query('SELECT id, name, email, account_type, api_key FROM users WHERE email = $1 AND password_hash = $2', [email, passwordHash]);
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }
    res.json({ success: true, user: result.rows[0], token: result.rows[0].api_key });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/db/properties', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE active = true');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/db/properties', async (req, res) => {
  const { name, description, address, city, country, property_type, star_rating } = req.body;
  try {
    const result = await pool.query(`INSERT INTO properties (name, description, address, city, country, property_type, star_rating) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [name, description, address, city, country, property_type, star_rating]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/db/rooms', async (req, res) => {
  const { propertyId } = req.query;
  try {
    const result = await pool.query('SELECT * FROM rooms WHERE property_id = $1 AND active = true', [propertyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/db/rooms', async (req, res) => {
  const { property_id, name, description, max_occupancy, max_adults, max_children, base_price, quantity } = req.body;
  try {
    const result = await pool.query(`INSERT INTO rooms (property_id, name, description, max_occupancy, max_adults, max_children, base_price, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [property_id, name, description, max_occupancy, max_adults, max_children, base_price, quantity]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/db/book', async (req, res) => {
  const { property_id, room_id, check_in, check_out, num_adults, num_children, guest_first_name, guest_last_name, guest_email, guest_phone, total_price } = req.body;
  try {
    const result = await pool.query(`INSERT INTO bookings (property_id, room_id, check_in, check_out, num_adults, num_children, guest_first_name, guest_last_name, guest_email, guest_phone, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed') RETURNING *`, [property_id, room_id, check_in, check_out, num_adults, num_children, guest_first_name, guest_last_name, guest_email, guest_phone, total_price]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/db/bookings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/properties', async (req, res) => {
  const result = await beds24Request('/properties');
  res.json(result);
});

app.post('/api/setup-auth', async (req, res) => {
  const { inviteCode } = req.body;
  try {
    const response = await axios.get(`https://beds24.com/api/v2/authentication/setup?code=${encodeURIComponent(inviteCode)}`);
    res.json({ success: true, refreshToken: response.data.refreshToken });
  } catch (error) {
    res.json({ success: false, error: error.response?.data || error.message });
  }
});

// Import property from Airbnb/Booking.com URL
app.post('/api/import-property', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.json({ success: false, error: 'URL required' });
  }
  
  try {
    // Fetch the page content
    const pageResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const htmlContent = pageResponse.data;
    
    // Extract text content (remove HTML tags)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 15000); // Limit to 15k chars
    
    // Use Claude API to extract and structure the data
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract property information from this webpage content and return ONLY a JSON object (no markdown, no explanation):

${textContent}

Return this exact JSON structure:
{
  "property_name": "extracted name",
  "description": "rewritten unique description (2-3 paragraphs, avoid copying exactly)",
  "property_type": "Hotel/Apartment/Villa/etc",
  "address": "full address",
  "city": "city name",
  "country": "country name",
  "star_rating": 4,
  "amenities": ["WiFi", "Pool", "Parking", etc],
  "rooms": [
    {
      "name": "room type name",
      "description": "room description",
      "max_adults": 2,
      "max_children": 1,
      "base_price": 100
    }
  ]
}`
      }],
      temperature: 0.7
    }, {
      headers: {
  'Content-Type': 'application/json',
  'x-api-key': process.env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01'
}
    });
    
    // Parse Claude's response
    const claudeText = claudeResponse.data.content[0].text;
    const cleanJson = claudeText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const propertyData = JSON.parse(cleanJson);
    
    res.json({
      success: true,
      data: propertyData,
      message: 'Property data extracted successfully'
    });
    
  } catch (error) {
    console.error('Import error:', error.message);
    res.json({
      success: false,
      error: 'Failed to import property: ' + error.message
    });
  }
});

// Setup Beds24-compatible database schema
app.get('/api/setup-beds24-schema', async (req, res) => {
  try {
    // Update Properties table
    await pool.query(`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fax VARCHAR(50),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS check_in_time TIME,
      ADD COLUMN IF NOT EXISTS check_out_time TIME,
      ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
      ADD COLUMN IF NOT EXISTS house_rules TEXT,
      ADD COLUMN IF NOT EXISTS beds24_property_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS beds24_last_sync TIMESTAMP
    `);

    // Property Images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Property Amenities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_amenities (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        category VARCHAR(50),
        amenity VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, amenity)
      )
    `);

    // Update Rooms table
    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS size_sqm DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS bed_configuration TEXT,
      ADD COLUMN IF NOT EXISTS min_stay INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_stay INTEGER,
      ADD COLUMN IF NOT EXISTS beds24_room_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS beds24_last_sync TIMESTAMP
    `);

    // Room Images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_images (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Room Amenities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_amenities (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        category VARCHAR(50),
        amenity VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, amenity)
      )
    `);

    // Sync Log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        channel_name VARCHAR(50) NOT NULL,
        sync_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_beds24_id ON properties(beds24_property_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_beds24_id ON rooms(beds24_room_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_beds24_id ON bookings(beds24_booking_id)
    `);

    res.json({ 
      success: true, 
      message: 'Beds24 schema created successfully! Database is ready for sync.' 
    });

  } catch (error) {
    console.error('Schema setup error:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Setup complete schema with all fields
app.get('/api/setup-complete-schema', async (req, res) => {
  try {
    // Properties table - add all fields
    await pool.query(`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS property_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'Lodging',
      ADD COLUMN IF NOT EXISTS permit_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fax VARCHAR(50),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS currency_symbol_before VARCHAR(10),
      ADD COLUMN IF NOT EXISTS currency_symbol_after VARCHAR(10),
      ADD COLUMN IF NOT EXISTS price_rounding VARCHAR(20),
      ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS control_panel_priority INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS group_keywords TEXT,
      ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
      ADD COLUMN IF NOT EXISTS house_rules TEXT,
      ADD COLUMN IF NOT EXISTS external_property_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS channel_manager VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP
    `);

    // Rooms table - add all fields
    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS room_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS size_sqm DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS unit_names TEXT,
      ADD COLUMN IF NOT EXISTS unit_allocation VARCHAR(50),
      ADD COLUMN IF NOT EXISTS auto_allocate VARCHAR(50),
      ADD COLUMN IF NOT EXISTS unallocated_unit_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS min_price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS min_stay INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_stay INTEGER,
      ADD COLUMN IF NOT EXISTS restriction_strategy VARCHAR(50),
      ADD COLUMN IF NOT EXISTS block_dates_after_checkout INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overbooking_protection VARCHAR(50),
      ADD COLUMN IF NOT EXISTS highlight_colour VARCHAR(20),
      ADD COLUMN IF NOT EXISTS control_panel_priority INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS include_in_reporting BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS auxiliary_text TEXT,
      ADD COLUMN IF NOT EXISTS room_template_1 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_2 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_3 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_4 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_5 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_6 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_7 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS room_template_8 VARCHAR(100),
      ADD COLUMN IF NOT EXISTS sell_priority INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS collect_guest_count BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS room_description TEXT,
      ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bed_configuration TEXT,
      ADD COLUMN IF NOT EXISTS external_room_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS channel_manager VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP
    `);

    // Property amenities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_amenities (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        amenity VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, category, amenity)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_property_amenities_lookup 
      ON property_amenities(property_id, category)
    `);

    // Room amenities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_amenities (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        amenity VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, category, amenity)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_room_amenities_lookup 
      ON room_amenities(room_id, category)
    `);

    // Property images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        is_hero BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Room images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_images (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Availability calendar
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        available_quantity INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10, 2),
        min_stay INTEGER,
        closed BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_availability_date 
      ON availability(room_id, date)
    `);

    // Pricing rules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        rule_name VARCHAR(100),
        start_date DATE,
        end_date DATE,
        price DECIMAL(10, 2),
        min_stay INTEGER,
        priority INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Channel sync tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel_sync (
        id SERIAL PRIMARY KEY,
        channel_name VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        internal_id INTEGER NOT NULL,
        external_id VARCHAR(100) NOT NULL,
        sync_status VARCHAR(50) DEFAULT 'active',
        last_sync TIMESTAMP,
        sync_errors TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(channel_name, entity_type, internal_id)
      )
    `);

    // Sync log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        channel_name VARCHAR(50) NOT NULL,
        sync_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_log_lookup 
      ON sync_log(channel_name, entity_type, synced_at DESC)
    `);

    res.json({ 
      success: true, 
      message: 'Complete schema created! All fields added.' 
    });

  } catch (error) {
    console.error('Schema setup error:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
