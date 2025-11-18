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
  ssl: { rejectUnauthorized: false }
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: !!process.env.DATABASE_URL,
    beds24: !!BEDS24_TOKEN,
    timestamp: new Date().toISOString()
  });
});

// Database setup endpoint
app.get('/api/setup-database', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        property_type VARCHAR(50),
        star_rating INTEGER,
        hero_image_url TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        max_occupancy INTEGER,
        max_adults INTEGER,
        max_children INTEGER,
        base_price DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'USD',
        quantity INTEGER DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        guest_email V
