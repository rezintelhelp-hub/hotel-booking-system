const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  console.log('🔄 Setting up database...');
  
  try {
    // Properties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        property_type VARCHAR(50),
        star_rating INTEGER,
        check_in_time TIME,
        check_out_time TIME,
        hero_image_url TEXT,
        thumbnail_url TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Properties table created');

    // Property images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        original_url TEXT NOT NULL,
        thumbnail_url TEXT,
        card_url TEXT,
        gallery_url TEXT,
        hero_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Property images table created');

    // Rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        room_type VARCHAR(50),
        max_occupancy INTEGER,
        max_adults INTEGER,
        max_children INTEGER,
        bed_configuration TEXT,
        size_sqm DECIMAL(10, 2),
        base_price DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'USD',
        quantity INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Rooms table created');

    // Room amenities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_amenities (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        amenity VARCHAR(100) NOT NULL,
        icon VARCHAR(50)
      )
    `);
    console.log('✅ Room amenities table created');

    // Room images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_images (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        original_url TEXT NOT NULL,
        thumbnail_url TEXT,
        card_url TEXT,
        gallery_url TEXT,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Room images table created');

    // Availability calendar table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        available_quantity INTEGER NOT NULL,
        price DECIMAL(10, 2),
        min_stay INTEGER DEFAULT 1,
        closed BOOLEAN DEFAULT false,
        UNIQUE(room_id, date)
      )
    `);
    console.log('✅ Availability table created');

    // Bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        room_id INTEGER REFERENCES rooms(id),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        num_adults INTEGER NOT NULL,
        num_children INTEGER DEFAULT 0,
        guest_first_name VARCHAR(100) NOT NULL,
        guest_last_name VARCHAR(100) NOT NULL,
        guest_email VARCHAR(255) NOT NULL,
        guest_phone VARCHAR(50),
        total_price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        special_requests TEXT,
        source VARCHAR(50) DEFAULT 'website',
        external_booking_id VARCHAR(255),
        channel_manager VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table created');

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id),
        guest_name VARCHAR(100),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        response TEXT,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Reviews table created');

    // Channel manager sync table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel_sync (
        id SERIAL PRIMARY KEY,
        channel_name VARCHAR(50) NOT NULL,
        property_id INTEGER REFERENCES properties(id),
        room_id INTEGER REFERENCES rooms(id),
        external_property_id VARCHAR(255),
        external_room_id VARCHAR(255),
        api_credentials TEXT,
        sync_enabled BOOLEAN DEFAULT true,
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Channel sync table created');

    console.log('\n🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase();

module.exports = { pool };
