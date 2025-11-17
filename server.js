require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
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

// Beds24 helper function
async function beds24Request(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BEDS24_API}${endpoint}`,
      headers: {
        'token': BEDS24_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Beds24 API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// ==================== DATABASE API ROUTES ====================

// Get all properties from database
app.get('/api/db/properties', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM rooms WHERE property_id = p.id AND active = true) as room_count,
        (SELECT AVG(rating) FROM reviews WHERE property_id = p.id) as avg_rating
      FROM properties p
      WHERE active = true
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get single property
app.get('/api/db/properties/:id', async (req, res) => {
  try {
    const property = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    const rooms = await pool.query('SELECT * FROM rooms WHERE property_id = $1 AND active = true', [req.params.id]);
    const images = await pool.query('SELECT * FROM property_images WHERE property_id = $1 ORDER BY sort_order', [req.params.id]);
    const reviews = await pool.query('SELECT * FROM reviews WHERE property_id = $1 ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    
    res.json({
      success: true,
      data: {
        property: property.rows[0],
        rooms: rooms.rows,
        images: images.rows,
        reviews: reviews.rows
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create property
app.post('/api/db/properties', async (req, res) => {
  const { name, description, address, city, country, property_type, star_rating } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO properties (name, description, address, city, country, property_type, star_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, address, city, country, property_type, star_rating]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get rooms for a property
app.get('/api/db/rooms', async (req, res) => {
  const { propertyId } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE property_id = $1 AND active = true ORDER BY base_price',
      [propertyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create room
app.post('/api/db/rooms', async (req, res) => {
  const { property_id, name, description, room_type, max_occupancy, max_adults, max_children, base_price, quantity } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO rooms (property_id, name, description, room_type, max_occupancy, max_adults, max_children, base_price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [property_id, name, description, room_type, max_occupancy, max_adults, max_children, base_price, quantity]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check availability
app.post('/api/db/availability', async (req, res) => {
  const { roomId, checkIn, checkOut } = req.body;
  try {
    // Check if room has availability records
    const result = await pool.query(
      `SELECT date, available_quantity, price, closed 
       FROM availability 
       WHERE room_id = $1 AND date >= $2 AND date < $3
       ORDER BY date`,
      [roomId, checkIn, checkOut]
    );
    
    const isAvailable = result.rows.length > 0 && 
                        result.rows.every(day => !day.closed && day.available_quantity > 0);
    
    res.json({ 
      success: true, 
      available: isAvailable,
      calendar: result.rows
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create booking
app.post('/api/db/book', async (req, res) => {
  const {
    property_id, room_id, check_in, check_out,
    num_adults, num_children, guest_first_name, guest_last_name,
    guest_email, guest_phone, total_price, special_requests
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO bookings 
       (property_id, room_id, check_in, check_out, num_adults, num_children,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        total_price, special_requests, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmed')
       RETURNING *`,
      [property_id, room_id, check_in, check_out, num_adults, num_children,
       guest_first_name, guest_last_name, guest_email, guest_phone,
       total_price, special_requests]
    );
    
    // Reduce availability
    await pool.query(
      `UPDATE availability 
       SET available_quantity = available_quantity - 1
       WHERE room_id = $1 AND date >= $2 AND date < $3`,
      [room_id, check_in, check_out]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all bookings
app.get('/api/db/bookings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, p.name as property_name, r.name as room_name
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== BEDS24 SYNC ROUTES ====================

// Sync property from Beds24 to database
app.post('/api/sync/property-from-beds24', async (req, res) => {
  const { beds24PropertyId } = req.body;
  
  try {
    // Get property from Beds24
    const beds24Property = await beds24Request(`/properties/${beds24PropertyId}`);
    
    if (!beds24Property.success) {
      return res.json({ success: false, error: 'Failed to fetch from Beds24' });
    }
    
    // Insert into our database
    const prop = beds24Property.data;
    const result = await pool.query(
      `INSERT INTO properties (name, description, address, city, country)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [prop.name, prop.description, prop.address, prop.city, prop.country]
    );
    
    // Save sync mapping
    await pool.query(
      `INSER
