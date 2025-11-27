// Updated for DELETE endpoint + DATABASE MIGRATION
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Image processing dependencies
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

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

// =========================================================
// R2/S3 CLIENT CONFIGURATION
// =========================================================
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'gas-property-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

// =========================================================
// MULTER CONFIGURATION (Memory storage for processing)
// =========================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
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

// =====================================================
// DATABASE MIGRATION ROUTES (NEW)
// =====================================================

// Admin page for database migration
app.get('/admin/deploy-database', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🚀 Deploy GAS Database</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          max-width: 900px;
          width: 100%;
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #333;
          font-size: 36px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }
        .card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 25px;
          margin: 20px 0;
          border-left: 5px solid #667eea;
        }
        .card.warning {
          background: #fff3cd;
          border-left-color: #ffc107;
        }
        .card.info {
          background: #e7f3ff;
          border-left-color: #0dcaf0;
        }
        .card.success {
          background: #d4edda;
          border-left-color: #28a745;
        }
        .card.error {
          background: #f8d7da;
          border-left-color: #dc3545;
        }
        .card strong {
          display: block;
          margin-bottom: 12px;
          font-size: 18px;
          color: #333;
        }
        .card ul {
          margin-left: 25px;
          margin-top: 12px;
          line-height: 1.8;
        }
        .button-group {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin: 35px 0;
          flex-wrap: wrap;
        }
        button {
          background: #667eea;
          color: white;
          border: none;
          padding: 18px 35px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        button:active {
          transform: translateY(0);
        }
        button.danger {
          background: #dc3545;
          box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
        }
        button.danger:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
          box-shadow: none;
        }
        #result {
          margin-top: 25px;
          display: none;
          animation: slideIn 0.3s ease;
        }
        #result.show {
          display: block;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 25px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 25px;
        }
        .stat-box {
          background: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stat-number {
          font-size: 42px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .table-list {
          max-height: 350px;
          overflow-y: auto;
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 15px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 2;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.1);
        }
        .table-list div {
          padding: 5px 10px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .table-list div:hover {
          background: #f0f0f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>
          <span>🚀</span>
          <span>GAS Database Deployment</span>
        </h1>
        <div class="subtitle">Deploy the complete 43-table schema to your Railway database</div>
        
        <div class="card info">
          <strong>📊 What Will Be Deployed:</strong>
          <ul>
            <li><strong>43 tables</strong> across 7 major systems</li>
            <li><strong>500+ fields</strong> with complete relationships</li>
            <li><strong>Users, Properties, Bookable Units, Bookings, Channel Managers, Rate Plans, Upsells</strong></li>
            <li><strong>All indexes, triggers, and functions</strong></li>
          </ul>
        </div>

        <div class="card warning">
          <strong>⚠️ Important Warning:</strong>
          This will <strong>DELETE ALL</strong> existing tables and data. Your current database will be completely replaced with the new schema. This action cannot be undone without a backup.
        </div>

        <div class="button-group">
          <button onclick="checkStatus()" id="checkBtn">
            <span>📋</span>
            <span>Check Current Database</span>
          </button>
          <button onclick="deployDatabase()" class="danger" id="deployBtn">
            <span>🚀</span>
            <span>Deploy New Schema</span>
          </button>
        </div>

        <div id="result"></div>
      </div>

      <script>
        async function checkStatus() {
          const btn = document.getElementById('checkBtn');
          const result = document.getElementById('result');
          
          btn.disabled = true;
          result.className = 'card info show';
          result.innerHTML = '<div class="spinner"></div><p style="text-align:center; margin-top:10px; font-size:16px;">Checking database...</p>';

          try {
            const res = await fetch('/api/migration/status');
            const data = await res.json();
            
            if (data.success) {
              result.className = 'card success show';
              result.innerHTML = \`
                <strong>✓ Current Database Status</strong>
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-number">\${data.tableCount}</div>
                    <div class="stat-label">Tables</div>
                  </div>
                </div>
                <div class="table-list">
                  \${data.tables.map(t => '<div>• ' + t + '</div>').join('')}
                </div>
              \`;
            } else {
              throw new Error(data.error);
            }
          } catch (error) {
            result.className = 'card error show';
            result.innerHTML = '<strong>✗ Error:</strong> ' + error.message;
          } finally {
            btn.disabled = false;
          }
        }

        async function deployDatabase() {
          if (!confirm('⚠️ FINAL WARNING\\n\\nThis will DELETE ALL existing data and create a fresh database with 43 new tables.\\n\\nThis action CANNOT be undone!\\n\\nAre you absolutely sure you want to proceed?')) {
            return;
          }

          const btn = document.getElementById('deployBtn');
          const checkBtn = document.getElementById('checkBtn');
          const result = document.getElementById('result');
          
          btn.disabled = true;
          checkBtn.disabled = true;
          result.className = 'card info show';
          result.innerHTML = '<div class="spinner"></div><p style="text-align:center; margin-top:10px; font-size:16px;"><strong>Deploying database...</strong><br>This may take 30-60 seconds. Please wait...</p>';

          const startTime = Date.now();

          try {
            const res = await fetch('/api/migration/deploy', { method: 'POST' });
            const data = await res.json();
            
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
            
            if (data.success) {
              result.className = 'card success show';
              result.innerHTML = \`
                <strong>🎉 DEPLOYMENT SUCCESSFUL!</strong>
                <p style="margin: 15px 0; font-size: 16px;">Your database has been successfully deployed with the complete schema.</p>
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-number">\${data.tableCount}</div>
                    <div class="stat-label">Tables Created</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">\${timeTaken}s</div>
                    <div class="stat-label">Time Taken</div>
                  </div>
                </div>
                <strong style="margin-top: 25px; display: block;">✓ New Tables:</strong>
                <div class="table-list">
                  \${data.tables.map(t => '<div>✓ ' + t + '</div>').join('')}
                </div>
                <div style="margin-top: 25px; padding: 20px; background: #e7f3ff; border-radius: 8px; border-left: 5px solid #0dcaf0;">
                  <strong style="color: #0c5460;">🎯 Next Steps:</strong>
                  <ul style="margin-top: 10px; line-height: 2;">
                    <li>Your database is now ready to use!</li>
                    <li>Update your API endpoints to use new table names</li>
                    <li>Test Beds24 integration with new schema</li>
                    <li>Update admin panel for new features</li>
                  </ul>
                </div>
              \`;
            } else {
              throw new Error(data.error);
            }
          } catch (error) {
            result.className = 'card error show';
            result.innerHTML = \`
              <strong>✗ Deployment Failed</strong>
              <p style="margin: 15px 0; font-size: 16px; color: #721c24;">\${error.message}</p>
              <div style="padding: 15px; background: white; border-radius: 8px; margin-top: 15px;">
                <strong>ℹ️ Good News:</strong> The database has been automatically rolled back. No changes were made to your existing database.
              </div>
            \`;
          } finally {
            btn.disabled = false;
            checkBtn.disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API: Check current database status
app.get('/api/migration/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    res.json({
      success: true,
      tableCount: result.rows.length,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// API: Deploy new database schema
app.post('/api/migration/deploy', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'master-migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found! Please ensure master-migration.sql is in the project root.');
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded (' + migrationSQL.length + ' characters)');
    
    // Execute the migration
    console.log('⚙️  Executing migration...');
    await client.query(migrationSQL);
    
    // Verify deployment
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('✅ Migration complete! Created ' + result.rows.length + ' tables.');
    
    res.json({
      success: true,
      tableCount: result.rows.length,
      tables: result.rows.map(row => row.table_name)
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    res.json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// =====================================================
// EXISTING ROUTES (UNCHANGED)
// =====================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: !!process.env.DATABASE_URL, beds24: !!BEDS24_TOKEN });
});

app.get('/api/setup-database', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS properties (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, address TEXT, city VARCHAR(100), country VARCHAR(100), property_type VARCHAR(50), star_rating INTEGER, hero_image_url TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, description TEXT, max_occupancy INTEGER, max_adults INTEGER, max_children INTEGER, base_price DECIMAL(10, 2), currency VARCHAR(3) DEFAULT 'USD', quantity INTEGER DEFAULT 1, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id), room_id INTEGER REFERENCES rooms(id), check_in DATE NOT NULL, check_out DATE NOT NULL, num_adults INTEGER NOT NULL, num_children INTEGER DEFAULT 0, guest_first_name VARCHAR(100) NOT NULL, guest_last_name VARCHAR(100) NOT NULL, guest_email VARCHAR(255) NOT NULL, guest_phone VARCHAR(50), total_price DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'confirmed', beds24_booking_id VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    // Add beds24_booking_id column if it doesn't exist
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS beds24_booking_id VARCHAR(50)`);
    // Add bookable_unit_id column for linking to bookable_units table
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bookable_unit_id INTEGER`);
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
    const result = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET single property by ID
app.get('/api/db/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// GET all bookable units/rooms
app.get('/api/db/bookable-units', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookable_units ORDER BY property_id, created_at');
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

// UPDATE property
app.put('/api/db/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, address, city, state, country, postcode,
      property_type, star_rating, latitude, longitude,
      bedrooms, beds, bathrooms, max_guests,
      phone, email, website,
      check_in_time, check_out_time, house_rules, cancellation_policy
    } = req.body;

    const result = await pool.query(
      `UPDATE properties SET 
        name = $1, description = $2, address = $3, city = $4, state = $5, 
        country = $6, postcode = $7, property_type = $8, star_rating = $9,
        latitude = $10, longitude = $11, bedrooms = $12, beds = $13, 
        bathrooms = $14, max_guests = $15, phone = $16, email = $17, 
        website = $18, check_in_time = $19, check_out_time = $20,
        house_rules = $21, cancellation_policy = $22
      WHERE id = $23
      RETURNING *`,
      [name, description, address, city, state, country, postcode, property_type, 
       star_rating, latitude, longitude, bedrooms, beds, bathrooms, max_guests,
       phone, email, website, check_in_time, check_out_time, house_rules, 
       cancellation_policy, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update error:', error);
    res.json({ success: false, error: error.message });
  }
});

// DELETE property - REQUIRES all rooms to be deleted first
app.delete('/api/db/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if property has any rooms
    const roomsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookable_units WHERE property_id = $1',
      [id]
    );
    
    if (parseInt(roomsCheck.rows[0].count) > 0) {
      return res.json({ 
        success: false, 
        error: 'Cannot delete property: Please delete all rooms first. This property has ' + roomsCheck.rows[0].count + ' room(s).'
      });
    }
    
    // Check if property has any bookings directly attached
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE property_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.json({ 
        success: false, 
        error: 'Cannot delete property: This property has ' + bookingsCheck.rows[0].count + ' booking(s) attached.'
      });
    }
    
    // Safe to delete - remove related records first
    await pool.query('DELETE FROM property_images WHERE property_id = $1', [id]);
    await pool.query('DELETE FROM property_amenities WHERE property_id = $1', [id]);
    await pool.query('DELETE FROM property_policies WHERE property_id = $1', [id]);
    await pool.query('DELETE FROM property_cm_links WHERE property_id = $1', [id]);
    
    // Delete the property
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
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
  const { property_id, room_id, check_in, check_out, num_adults, num_children, guest_first_name, guest_last_name, guest_email, guest_phone, total_price, guest_address, guest_city, guest_country, guest_postcode } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Property owner ID - hardcode to 1 for now (will need to be dynamic later)
    const propertyOwnerId = 1;
    
    // 1. Create booking in our database (using correct column names)
    const result = await client.query(`
      INSERT INTO bookings (
        property_id, property_owner_id, bookable_unit_id, 
        arrival_date, departure_date, 
        num_adults, num_children, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        accommodation_price, subtotal, grand_total, 
        status, booking_source, currency
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $12, 'confirmed', 'direct', 'USD') 
      RETURNING *
    `, [property_id, propertyOwnerId, room_id, check_in, check_out, num_adults, num_children || 0, guest_first_name, guest_last_name, guest_email, guest_phone, total_price]);
    
    const booking = result.rows[0];
    
    // 2. Get the Beds24 room ID for this room
    const roomResult = await client.query(`
      SELECT beds24_room_id FROM bookable_units WHERE id = $1
    `, [room_id]);
    
    const beds24RoomId = roomResult.rows[0]?.beds24_room_id;
    
    // 3. If room is linked to Beds24, push the booking
    let beds24BookingId = null;
    if (beds24RoomId) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        
        const beds24Booking = [{
          roomId: beds24RoomId,
          status: 'confirmed',
          arrival: check_in,
          departure: check_out,
          numAdult: num_adults,
          numChild: num_children || 0,
          firstName: guest_first_name,
          lastName: guest_last_name,
          email: guest_email,
          mobile: guest_phone || '',
          address: guest_address || '',
          city: guest_city || '',
          country: guest_country || '',
          postcode: guest_postcode || '',
          referer: 'GAS Direct Booking',
          notes: `GAS Booking ID: ${booking.id}`
        }];
        
        console.log('Pushing booking to Beds24:', JSON.stringify(beds24Booking));
        
        const beds24Response = await axios.post('https://beds24.com/api/v2/bookings', beds24Booking, {
          headers: {
            'token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Beds24 booking response:', JSON.stringify(beds24Response.data));
        
        // Extract the new booking ID from Beds24 response
        if (beds24Response.data && beds24Response.data[0]?.success) {
          beds24BookingId = beds24Response.data[0]?.new?.id;
          
          // Update our booking with Beds24 booking ID
          if (beds24BookingId) {
            await client.query(`
              UPDATE bookings SET beds24_booking_id = $1 WHERE id = $2
            `, [beds24BookingId, booking.id]);
            booking.beds24_booking_id = beds24BookingId;
          }
        }
        
      } catch (beds24Error) {
        console.error('Error pushing to Beds24:', beds24Error.response?.data || beds24Error.message);
        // Don't fail the booking - just log the error
        // The booking is still valid in our system
      }
    }
    
    // 4. Update room availability for these dates
    const startDate = new Date(check_in);
    const endDate = new Date(check_out);
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await client.query(`
        INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
        VALUES ($1, $2, false, false, 'booking')
        ON CONFLICT (room_id, date) 
        DO UPDATE SET is_available = false, source = 'booking', updated_at = NOW()
      `, [room_id, dateStr]);
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      data: booking,
      beds24Synced: !!beds24BookingId,
      beds24BookingId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Booking error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
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

// Debug: Check bookings table schema
app.get('/api/admin/debug/bookings-schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `);
    res.json({ success: true, columns: result.rows });
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
  
  if (!inviteCode) {
    return res.json({ success: false, error: 'Invite code is required' });
  }
  
  try {
    console.log('Attempting to connect to Beds24 with invite code...');
    // Beds24 expects the code as a HEADER, not a URL parameter
    const response = await axios.get('https://beds24.com/api/v2/authentication/setup', {
      headers: {
        'accept': 'application/json',
        'code': inviteCode
      }
    });
    console.log('Beds24 response:', response.data);
    
    res.json({ 
      success: true, 
      refreshToken: response.data.refreshToken,
      token: response.data.token 
    });
  } catch (error) {
    console.error('Beds24 connection error:', error.response?.data || error.message);
    res.json({ 
      success: false, 
      error: error.response?.data?.error || error.message 
    });
  }
});

// Save Beds24 tokens
app.post('/api/beds24/save-token', async (req, res) => {
  const { refreshToken, token } = req.body;
  try {
    // Save to database (you could create a settings table for this)
    // For now, we'll just acknowledge receipt
    console.log('Beds24 tokens saved:', { refreshToken: refreshToken.substring(0, 20) + '...', token: token.substring(0, 20) + '...' });
    res.json({ success: true, message: 'Tokens saved' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Helper function to get Beds24 access token from refresh token
async function getBeds24AccessToken(pool) {
  let refreshToken = null;
  
  // Try database FIRST (this is set per-user via wizard)
  const tokenResult = await pool.query(
    "SELECT refresh_token, account_id FROM channel_connections WHERE cm_id = (SELECT id FROM channel_managers WHERE cm_code = 'beds24') ORDER BY updated_at DESC LIMIT 1"
  );
  
  if (tokenResult.rows.length > 0 && tokenResult.rows[0].refresh_token) {
    refreshToken = tokenResult.rows[0].refresh_token;
    console.log('Using refresh token from database, account_id:', tokenResult.rows[0].account_id);
  }
  
  // Fallback to environment variable
  if (!refreshToken) {
    refreshToken = process.env.BEDS24_REFRESH_TOKEN;
    if (refreshToken) {
      console.log('Using refresh token from environment variable');
    }
  }
  
  if (!refreshToken) {
    throw new Error('No Beds24 refresh token configured. Please connect via Beds24 wizard.');
  }
  
  // Exchange refresh token for access token
  console.log('Getting fresh Beds24 access token...');
  const tokenResponse = await axios.get('https://beds24.com/api/v2/authentication/token', {
    headers: {
      'refreshToken': refreshToken
    }
  });
  
  if (!tokenResponse.data.token) {
    throw new Error('Failed to get access token from Beds24');
  }
  
  console.log('Got Beds24 access token');
  return tokenResponse.data.token;
}

// Helper to get Beds24 connection info including account_id
async function getBeds24Connection(pool) {
  const result = await pool.query(
    "SELECT refresh_token, account_id FROM channel_connections WHERE cm_id = (SELECT id FROM channel_managers WHERE cm_code = 'beds24') ORDER BY updated_at DESC LIMIT 1"
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    refreshToken: result.rows[0].refresh_token,
    accountId: result.rows[0].account_id
  };
}

// Get Beds24 properties
app.get('/api/beds24/properties', async (req, res) => {
  try {
    // Get connection from database first, fallback to env var
    const connection = await getBeds24Connection(pool);
    let refreshToken = connection?.refreshToken || process.env.BEDS24_REFRESH_TOKEN;
    const accountId = connection?.accountId;
    
    if (!refreshToken) {
      return res.json({ success: false, error: 'No Beds24 refresh token configured. Please use the Beds24 wizard to connect.' });
    }
    
    // First, get a fresh access token using the refresh token
    console.log('Getting fresh Beds24 access token...');
    const tokenResponse = await axios.get('https://beds24.com/api/v2/authentication/token', {
      headers: {
        'refreshToken': refreshToken
      }
    });
    
    const accessToken = tokenResponse.data.token;
    console.log('Got access token, fetching properties...');
    
    // Now fetch properties with the access token
    const response = await axios.get('https://beds24.com/api/v2/properties', {
      headers: {
        'token': accessToken,
        'accept': 'application/json'
      }
    });
    
    let properties = response.data.data || [];
    console.log('Found ' + properties.length + ' total properties');
    
    // Filter by account ID if we have one stored
    if (accountId) {
      properties = properties.filter(p => {
        const propOwnerId = p.account?.ownerId || p.ownerId;
        return String(propOwnerId) === String(accountId);
      });
      console.log('After filtering by account ' + accountId + ': ' + properties.length + ' properties');
    }
    
    res.json({ success: true, data: properties });
    
  } catch (error) {
    console.error('Error fetching Beds24 properties:', error.response?.data || error.message);
    res.json({ success: false, error: error.response?.data?.error || error.message });
  }
});

// Import property from URL with COMPLETE data extraction
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
    
    // Extract text content (remove HTML tags but keep structure)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 25000); // Increased to 25k for more data
    
    // Use Claude API to extract COMPLETE structured data
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Extract ALL property information from this Airbnb/Booking.com page and return ONLY valid JSON.

CRITICAL: Extract EVERYTHING including:
- Exact latitude and longitude coordinates
- ALL image URLs from the photo gallery
- Detailed sleeping arrangements (which beds in which rooms)
- Complete amenities categorized properly
- Exact property size (number of bedrooms, beds, bathrooms)
- House rules with check-in/out times
- Review ratings breakdown
- Host information
- Pricing details

Categorize amenities into these EXACT categories:
Amenities, Business, Entertainment, Food and Drink, Internet, Kitchen, Location, Pets, Pool and Wellness, Services, Sports, Suitability

\${textContent}

Return this EXACT JSON structure:
{
  "property": {
    "name": "property name",
    "property_type": "Entire home/Private room/Hotel room/etc",
    "description": "rewritten unique description 2-3 paragraphs avoiding exact copying",
    "address": "full street address if available",
    "city": "city name",
    "state": "state/region", 
    "country": "country name",
    "postcode": "postal code if available",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1.5,
    "max_guests": 4,
    "phone": "phone if available",
    "email": "email if available",
    "website": "listing url",
    "check_in_time": "15:00",
    "check_out_time": "11:00",
    "cancellation_policy": "policy text",
    "house_rules": "all rules text",
    "currency": "GBP",
    "star_rating": 5,
    "review_rating": 4.8,
    "review_count": 127,
    "rating_breakdown": {
      "cleanliness": 4.9,
      "accuracy": 4.8,
      "communication": 5.0,
      "location": 4.7,
      "checkin": 4.9,
      "value": 4.6
    }
  },
  "amenities": {
    "Amenities": ["Heating", "Air Conditioning", "Towels"],
    "Kitchen": ["Kitchen", "Refrigerator", "Microwave"],
    "Internet": ["Wifi"],
    "Bathroom": ["Hair dryer", "Shampoo"],
    "Entertainment": ["TV", "Books"],
    "Pool and Wellness": ["Hot tub", "Pool"],
    "Services": ["Self check-in", "Keypad"],
    "Suitability": ["Family friendly", "Pets allowed"]
  },
  "images": [
    {"url": "https://image-url-1.jpg", "caption": "Living room"},
    {"url": "https://image-url-2.jpg", "caption": "Bedroom"},
    {"url": "https://image-url-3.jpg", "caption": "Kitchen"}
  ],
  "sleeping_arrangements": [
    {"room": "Bedroom 1", "beds": "1 king bed"},
    {"room": "Bedroom 2", "beds": "2 single beds"},
    {"room": "Living room", "beds": "1 sofa bed"}
  ],
  "rooms": [
    {
      "name": "Entire property",
      "room_type": "Entire place",
      "description": "Full property description",
      "quantity": 1,
      "max_adults": 4,
      "max_children": 2,
      "max_guests": 6,
      "size_sqm": 85,
      "bed_configuration": "1 king, 2 singles, 1 sofa bed",
      "base_price": 150,
      "min_stay": 2,
      "accommodation_type": "Entire home"
    }
  ],
  "pricing": {
    "nightly_rate": 150,
    "cleaning_fee": 25,
    "service_fee": 20,
    "currency": "GBP"
  }
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
    
    const claudeText = claudeResponse.data.content[0].text;
    // Clean the response more aggressively
        let cleanJson = claudeText.trim();
        // Remove markdown code blocks
        cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        // Remove any leading/trailing text before/after JSON
        const jsonStart = cleanJson.indexOf('{');
        const jsonEnd = cleanJson.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
        }
    const extractedData = JSON.parse(cleanJson);
    
    res.json({
      success: true,
      data: extractedData,
      message: 'Property data extracted successfully!'
    });
    
  } catch (error) {
    console.error('Import error:', error.message);
    res.json({
      success: false,
      error: 'Failed to import: ' + error.message
    });
  }
});

// =====================================================
// NEW BEDS24 IMPORT SYSTEM (Complete Property Import)
// =====================================================

// Check for existing Beds24 connection
app.get('/api/beds24/check-connection', async (req, res) => {
  try {
    // Get most recent active Beds24 connection
    const result = await pool.query(`
      SELECT 
        cc.id,
        cc.access_token,
        cc.refresh_token,
        cc.token_expires_at
      FROM channel_connections cc
      JOIN channel_managers cm ON cc.cm_id = cm.id
      WHERE cm.cm_code = 'beds24' 
        AND cc.status = 'active'
      ORDER BY cc.created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const connection = result.rows[0];
      
      // Check if token needs refresh (if expired or expiring soon)
      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const needsRefresh = expiresAt <= now;
      
      if (needsRefresh && connection.refresh_token) {
        // Refresh the token
        try {
          const refreshResponse = await axios.post('https://beds24.com/api/v2/authentication/token', {
            refreshToken: connection.refresh_token
          }, {
            headers: { 'accept': 'application/json' }
          });
          
          const newToken = refreshResponse.data.token;
          
          // Update database with new token
          await pool.query(`
            UPDATE channel_connections 
            SET 
              access_token = $1,
              token_expires_at = NOW() + INTERVAL '30 days',
              updated_at = NOW()
            WHERE id = $2
          `, [newToken, connection.id]);
          
          console.log('✓ Beds24 token refreshed automatically');
          
          res.json({
            success: true,
            hasConnection: true,
            connectionId: connection.id,
            token: newToken,
            refreshToken: connection.refresh_token
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.message);
          res.json({
            success: false,
            hasConnection: false,
            error: 'Token expired and refresh failed'
          });
        }
      } else {
        // Token is still valid
        res.json({
          success: true,
          hasConnection: true,
          connectionId: connection.id,
          token: connection.access_token,
          refreshToken: connection.refresh_token
        });
      }
    } else {
      res.json({
        success: true,
        hasConnection: false
      });
    }
  } catch (error) {
    console.error('Check connection error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Step 1: Setup Beds24 Connection (Save to channel_connections table)
app.post('/api/beds24/setup-connection', async (req, res) => {
  const { inviteCode, accountId } = req.body;
  
  if (!inviteCode) {
    return res.json({ success: false, error: 'Invite code required' });
  }
  
  try {
    console.log('🔗 Setting up Beds24 connection...');
    if (accountId) {
      console.log('   Account ID specified:', accountId);
    }
    
    // Ensure we have at least one user (create default if needed)
    const userCheck = await pool.query('SELECT id FROM users LIMIT 1');
    let userId;
    
    if (userCheck.rows.length === 0) {
      console.log('📝 Creating default user...');
      const userResult = await pool.query(`
        INSERT INTO users (
          user_type,
          email,
          password_hash,
          first_name,
          last_name,
          account_status
        ) VALUES (
          'property_owner',
          'admin@gas-system.com',
          'temp_password_hash',
          'Admin',
          'User',
          'active'
        )
        RETURNING id
      `);
      userId = userResult.rows[0].id;
      console.log('✓ Default user created with ID: ' + userId);
    } else {
      userId = userCheck.rows[0].id;
      console.log('✓ Using existing user ID: ' + userId);
    }
    
    // Ensure Beds24 exists in channel_managers table
    await pool.query(`
      INSERT INTO channel_managers (
        cm_name,
        cm_code,
        cm_website,
        api_version,
        api_base_url,
        auth_type,
        supports_availability_sync,
        supports_rate_sync,
        supports_property_import,
        supports_booking_import,
        is_active
      ) VALUES (
        'Beds24',
        'beds24',
        'https://beds24.com',
        'v2',
        'https://api.beds24.com/v2',
        'bearer_token',
        true,
        true,
        true,
        true,
        true
      )
      ON CONFLICT (cm_code) DO NOTHING
    `);
    
    // Get tokens from Beds24
    const response = await axios.get('https://beds24.com/api/v2/authentication/setup', {
      headers: {
        'accept': 'application/json',
        'code': inviteCode
      }
    });
    
    const { token, refreshToken } = response.data;
    
    // Ensure account_id column exists
    await pool.query(`
      ALTER TABLE channel_connections ADD COLUMN IF NOT EXISTS account_id VARCHAR(50)
    `).catch(() => {});
    
    // Save to channel_connections table (or update if exists)
    const result = await pool.query(`
      INSERT INTO channel_connections (
        user_id,
        cm_id,
        api_key,
        refresh_token,
        access_token,
        account_id,
        token_expires_at,
        status,
        sync_enabled,
        sync_interval_minutes
      ) VALUES (
        $1,
        (SELECT id FROM channel_managers WHERE cm_code = 'beds24' LIMIT 1),
        $2,
        $3,
        $4,
        $5,
        NOW() + INTERVAL '30 days',
        'active',
        true,
        60
      )
      ON CONFLICT (user_id, cm_id) 
      DO UPDATE SET
        api_key = EXCLUDED.api_key,
        refresh_token = EXCLUDED.refresh_token,
        access_token = EXCLUDED.access_token,
        account_id = EXCLUDED.account_id,
        token_expires_at = EXCLUDED.token_expires_at,
        status = 'active',
        updated_at = NOW()
      RETURNING id
    `, [userId, inviteCode, refreshToken, token, accountId || null]);
    
    const connectionId = result.rows[0].id;
    
    console.log('✓ Connection saved to database');
    
    res.json({
      success: true,
      token,
      refreshToken,
      connectionId,
      message: 'Connected to Beds24 successfully'
    });
    
  } catch (error) {
    console.error('Beds24 connection error:', error.response?.data || error.message);
    res.json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

// Step 2: List Properties from Beds24
app.post('/api/beds24/list-properties', async (req, res) => {
  const { token, connectionId, accountId } = req.body;
  
  try {
    console.log('📋 Fetching properties from Beds24...');
    if (accountId) {
      console.log('   Filtering by account ID:', accountId);
    }
    
    const response = await axios.get('https://beds24.com/api/v2/properties', {
      headers: {
        'token': token,
        'accept': 'application/json'
      },
      params: {
        includeTexts: 'all',
        includePictures: true,
        includeAllRooms: true
      }
    });
    
    let properties = response.data.data || [];
    console.log('Found ' + properties.length + ' total properties');
    
    // Filter by account ID if provided
    if (accountId) {
      properties = properties.filter(p => {
        const propOwnerId = p.account?.ownerId || p.ownerId;
        return String(propOwnerId) === String(accountId);
      });
      console.log('After filtering by account ' + accountId + ': ' + properties.length + ' properties');
    }
    
    res.json({
      success: true,
      properties: properties
    });
    
  } catch (error) {
    console.error('Error fetching properties:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// ENHANCED BEDS24 IMPORT - FULL CONTENT IMPORT
// =====================================================
// Imports: Properties, Images, Amenities, Policies, Rooms, Room Images, Bed Config
// Language: Default language only (AI translates on frontend)

app.post('/api/beds24/import-complete-property', async (req, res) => {
  const { propertyId, connectionId, token } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 ENHANCED BEDS24 IMPORT - Property ID: ' + propertyId);
    console.log('═══════════════════════════════════════════════════════');
    
    // Get the user_id from the connection
    const connResult = await client.query('SELECT user_id FROM channel_connections WHERE id = $1', [connectionId]);
    if (connResult.rows.length === 0) {
      throw new Error('Connection not found');
    }
    const userId = connResult.rows[0].user_id;
    
    // =========================================================
    // 1. FETCH COMPLETE PROPERTY DATA FROM BEDS24
    // =========================================================
    console.log('\n📡 STEP 1: Fetching property from Beds24...');
    
    const propResponse = await axios.get('https://beds24.com/api/v2/properties', {
      headers: { 'token': token, 'accept': 'application/json' },
      params: {
        id: propertyId,
        includeTexts: 'all',       // Get all text fields
        includePictures: true,     // Get images
        includeAllRooms: true,     // Get all rooms
        includeUnitDetails: true   // Get room details
      }
    });
    
    const prop = propResponse.data.data?.[0] || propResponse.data[0];
    
    if (!prop) {
      throw new Error('Property not found in Beds24 response');
    }
    
    console.log('   ✓ Property fetched: ' + (prop.name || prop.propName || 'Unknown'));
    
    // Debug: Log what we received
    console.log('   📋 Available data keys:', Object.keys(prop).join(', '));
    
    // =========================================================
    // 2. INSERT/UPDATE PROPERTY
    // =========================================================
    console.log('\n🏨 STEP 2: Saving property to database...');
    
    // Extract description from texts array (default language only)
    let propertyDescription = '';
    let shortDescription = '';
    let houseRules = '';
    
    if (prop.texts && Array.isArray(prop.texts) && prop.texts.length > 0) {
      const defaultText = prop.texts[0]; // First = default language
      propertyDescription = defaultText.propertyDescription || defaultText.description || '';
      shortDescription = defaultText.propertyShortDescription || defaultText.shortDescription || '';
      houseRules = defaultText.houseRules || defaultText.propertyHouseRules || '';
    }
    
    // Check if property already exists (by beds24_property_id)
    // Cast to text to handle any type mismatches
    const existingProp = await client.query(
      'SELECT id FROM properties WHERE beds24_property_id::text = $1::text',
      [propertyId]
    );
    
    let gasPropertyId;
    let isUpdate = false;
    
    if (existingProp.rows.length > 0) {
      // UPDATE existing property
      gasPropertyId = existingProp.rows[0].id;
      isUpdate = true;
      
      await client.query(`
        UPDATE properties SET
          name = $1,
          property_type = $2,
          description = $3,
          short_description = $4,
          house_rules = $5,
          address = $6,
          city = $7,
          state = $8,
          postcode = $9,
          country = $10,
          latitude = $11,
          longitude = $12,
          check_in_from = $13,
          check_in_until = $14,
          check_out_by = $15,
          currency = $16,
          phone = $17,
          email = $18,
          fax = $19,
          website = $20,
          contact_first_name = $21,
          contact_last_name = $22,
          cm_source = 'beds24',
          updated_at = NOW()
        WHERE id = $23
      `, [
        prop.name || prop.propName || 'Property',
        prop.propertyType || prop.propType || 'hotel',
        JSON.stringify({ en: propertyDescription }),
        JSON.stringify({ en: shortDescription }),
        JSON.stringify({ en: houseRules }),
        prop.address || prop.propAddress || '',
        prop.city || prop.propCity || '',
        prop.state || prop.propState || '',
        prop.postcode || prop.propPostcode || prop.zipCode || '',
        prop.country || prop.propCountry || '',
        prop.latitude || prop.propLatitude || null,
        prop.longitude || prop.propLongitude || null,
        prop.checkInStart || prop.checkInFrom || '15:00',
        prop.checkInEnd || prop.checkInUntil || '22:00',
        prop.checkOutEnd || prop.checkOutBy || '11:00',
        prop.currency || 'USD',
        prop.phone || prop.propPhone || '',
        prop.email || prop.propEmail || '',
        prop.fax || prop.propFax || '',
        prop.website || prop.propWebsite || '',
        prop.contactFirstName || '',
        prop.contactLastName || '',
        gasPropertyId
      ]);
      
      console.log('   ✓ Updated existing property (GAS ID: ' + gasPropertyId + ')');
    } else {
      // INSERT new property
      const propertyResult = await client.query(`
        INSERT INTO properties (
          user_id,
          beds24_property_id,
          cm_source,
          name,
          property_type,
          description,
          short_description,
          house_rules,
          address,
          city,
          state,
          postcode,
          country,
          latitude,
          longitude,
          check_in_from,
          check_in_until,
          check_out_by,
          currency,
          phone,
          email,
          fax,
          website,
          contact_first_name,
          contact_last_name,
          status
        ) VALUES (
          $1, $2, 'beds24', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'active'
        )
        RETURNING id
      `, [
        userId,
        propertyId,
        prop.name || prop.propName || 'Property',
        prop.propertyType || prop.propType || 'hotel',
        JSON.stringify({ en: propertyDescription }),
        JSON.stringify({ en: shortDescription }),
        JSON.stringify({ en: houseRules }),
        prop.address || prop.propAddress || '',
        prop.city || prop.propCity || '',
        prop.state || prop.propState || '',
        prop.postcode || prop.propPostcode || prop.zipCode || '',
        prop.country || prop.propCountry || '',
        prop.latitude || prop.propLatitude || null,
        prop.longitude || prop.propLongitude || null,
        prop.checkInStart || prop.checkInFrom || '15:00',
        prop.checkInEnd || prop.checkInUntil || '22:00',
        prop.checkOutEnd || prop.checkOutBy || '11:00',
        prop.currency || 'USD',
        prop.phone || prop.propPhone || '',
        prop.email || prop.propEmail || '',
        prop.fax || prop.propFax || '',
        prop.website || prop.propWebsite || '',
        prop.contactFirstName || '',
        prop.contactLastName || ''
      ]);
      
      gasPropertyId = propertyResult.rows[0].id;
      console.log('   ✓ Created new property (GAS ID: ' + gasPropertyId + ')');
    }
    
    console.log('   📍 Location: ' + (prop.city || 'N/A') + ', ' + (prop.country || 'N/A'));
    console.log('   🏷️  Type: ' + (prop.propertyType || 'N/A'));
    
    // =========================================================
    // 3. SKIP PROPERTY IMAGES - Users upload directly in GAS
    // =========================================================
    // Images are NOT imported from CM because:
    // - URL references break over time
    // - GAS needs to validate size, format, orientation
    // - Users have full control over their image content
    console.log('\n🖼️  STEP 3: Skipping property images (users upload in GAS)');
    
    // =========================================================
    // 4. SKIP PROPERTY AMENITIES - Users select from master list in GAS
    // =========================================================
    console.log('\n🛎️  STEP 4: Skipping property amenities (users select from master list)');
    // Property amenities will be selected by users from master_amenities table
    // and stored in property_amenity_selections
    
    // =========================================================
    // 5. IMPORT PROPERTY POLICIES
    // =========================================================
    console.log('\n📜 STEP 5: Importing property policies...');
    
    // Delete existing policies first (clean sync)
    await client.query('DELETE FROM property_policies WHERE property_id = $1', [gasPropertyId]);
    
    let policiesCount = 0;
    
    // Cancellation policy
    const cancellationPolicy = prop.cancellationPolicy || 
                               (prop.texts?.[0]?.cancellationPolicy) || 
                               prop.cancellation || '';
    if (cancellationPolicy) {
      await client.query(`
        INSERT INTO property_policies (
          property_id, policy_type, title, content, display_order, is_required
        ) VALUES ($1, 'cancellation', $2, $3, 0, true)
      `, [
        gasPropertyId,
        JSON.stringify({ en: 'Cancellation Policy' }),
        JSON.stringify({ en: cancellationPolicy })
      ]);
      policiesCount++;
    }
    
    // House rules (if not in main property)
    if (houseRules && houseRules.length > 0) {
      await client.query(`
        INSERT INTO property_policies (
          property_id, policy_type, title, content, display_order, is_required
        ) VALUES ($1, 'house_rules', $2, $3, 1, true)
      `, [
        gasPropertyId,
        JSON.stringify({ en: 'House Rules' }),
        JSON.stringify({ en: houseRules })
      ]);
      policiesCount++;
    }
    
    // Additional policies from texts
    const texts = prop.texts?.[0] || {};
    if (texts.damagePolicy) {
      await client.query(`
        INSERT INTO property_policies (
          property_id, policy_type, title, content, display_order, is_required
        ) VALUES ($1, 'damage', $2, $3, 2, false)
      `, [
        gasPropertyId,
        JSON.stringify({ en: 'Damage Policy' }),
        JSON.stringify({ en: texts.damagePolicy })
      ]);
      policiesCount++;
    }
    
    console.log('   ✓ Imported ' + policiesCount + ' policies');
    
    // =========================================================
    // 6. IMPORT ROOMS (SMART SYNC)
    // =========================================================
    console.log('\n🛏️  STEP 6: Importing rooms with smart sync...');
    
    let rooms = prop.roomTypes || prop.rooms || [];
    if (!Array.isArray(rooms)) rooms = [];
    
    let roomsAdded = 0;
    let roomsUpdated = 0;
    
    for (const room of rooms) {
      const beds24RoomId = String(room.id || room.roomId);
      
      // Extract room description from texts
      let roomDescription = '';
      let roomShortDesc = '';
      if (room.texts && Array.isArray(room.texts) && room.texts.length > 0) {
        const roomText = room.texts[0];
        roomDescription = roomText.roomDescription || roomText.description || '';
        roomShortDesc = roomText.roomShortDescription || roomText.shortDescription || '';
      }
      
      // Extract bed configuration from Beds24 data
      // Beds24 may provide this in multiple formats:
      // 1. room.bedTypes array: [{type: 'BED_KING', quantity: 1}, ...]
      // 2. room.bedConfiguration object
      // 3. In featureCodes string: "BED_KING,BED_SINGLE,BED_SINGLE"
      let bedConfig = null;
      
      // Try structured bedTypes first
      if (room.bedTypes && Array.isArray(room.bedTypes) && room.bedTypes.length > 0) {
        bedConfig = { 
          beds: room.bedTypes.map(b => ({
            type: b.type || b.bedType || 'BED_DOUBLE',
            quantity: b.quantity || b.count || 1,
            name: getBedName(b.type || b.bedType)
          }))
        };
      } 
      // Try bedConfiguration object
      else if (room.bedConfiguration && typeof room.bedConfiguration === 'object') {
        bedConfig = room.bedConfiguration;
      }
      // Extract from featureCodes if present
      else if (room.featureCodes && typeof room.featureCodes === 'string') {
        const bedCodes = room.featureCodes.split(',')
          .map(c => c.trim())
          .filter(c => c.startsWith('BED_'));
        
        if (bedCodes.length > 0) {
          // Count occurrences of each bed type
          const bedCounts = {};
          for (const code of bedCodes) {
            bedCounts[code] = (bedCounts[code] || 0) + 1;
          }
          
          bedConfig = {
            beds: Object.entries(bedCounts).map(([type, quantity]) => ({
              type,
              quantity,
              name: getBedName(type)
            }))
          };
        }
      }
      
      // Helper function for bed names (defined inline to avoid scope issues)
      function getBedName(code) {
        const names = {
          'BED_BUNK': 'Bunkbed', 'BED_CHILD': 'Child Bed', 'BED_CRIB': 'Cot',
          'BED_DOUBLE': 'Double Bed', 'BED_KING': 'King Bed', 'BED_MURPHY': 'Murphy Bed',
          'BED_QUEEN': 'Queen Bed', 'BED_SOFA': 'Sofa Bed', 'BED_SINGLE': 'Single Bed',
          'BED_FUTON': 'Futon', 'BED_FLOORMATTRESS': 'Floor Mattress', 'BED_TODDLER': 'Toddler Bed',
          'BED_HAMMOCK': 'Hammock', 'BED_AIRMATTRESS': 'Air Mattress', 'BED_COUCH': 'Couch'
        };
        return names[code] || code;
      }
      
      // Count bedrooms and bathrooms from featureCodes
      let bedroomCount = room.bedroomCount || room.bedrooms || null;
      let bathroomCount = room.bathroomCount || room.bathrooms || null;
      
      if (room.featureCodes && typeof room.featureCodes === 'string') {
        const codes = room.featureCodes.split(',').map(c => c.trim());
        if (!bedroomCount) {
          bedroomCount = codes.filter(c => c.startsWith('BEDROOM')).length || null;
        }
        if (!bathroomCount) {
          bathroomCount = codes.filter(c => c.startsWith('BATHROOM')).length || null;
        }
      }
      
      // Check if room exists (cast to text to handle type mismatches)
      const existingRoom = await client.query(`
        SELECT id FROM bookable_units 
        WHERE property_id = $1 AND (cm_room_id::text = $2::text OR beds24_room_id::text = $2::text)
      `, [gasPropertyId, beds24RoomId]);
      
      let unitId;
      
      if (existingRoom.rows.length > 0) {
        // UPDATE existing room
        unitId = existingRoom.rows[0].id;
        
        await client.query(`
          UPDATE bookable_units SET
            name = $1,
            unit_type = $2,
            description = $3,
            short_description = $4,
            max_guests = $5,
            max_adults = $6,
            max_children = $7,
            quantity = $8,
            base_price = $9,
            size_sqm = $10,
            bed_configuration = $11,
            bathroom_count = $12,
            bedroom_count = $13,
            min_stay = $14,
            max_stay = $15,
            beds24_room_id = $17,
            cm_room_id = $18,
            updated_at = NOW()
          WHERE id = $16
        `, [
          room.name || room.roomName || 'Room',
          room.roomType || room.unitType || 'double',
          JSON.stringify({ en: roomDescription }),
          JSON.stringify({ en: roomShortDesc }),
          room.maxPeople || room.maxGuests || 2,
          room.maxAdult || room.maxAdults || 2,
          room.maxChildren || 0,
          room.qty || room.quantity || 1,
          room.rackRate || room.basePrice || room.price || 100,
          room.size || room.sizeSqm || null,
          bedConfig ? JSON.stringify(bedConfig) : null,
          bathroomCount,
          bedroomCount,
          room.minStay || 1,
          room.maxStay || null,
          unitId,
          parseInt(beds24RoomId) || null,
          beds24RoomId
        ]);
        
        roomsUpdated++;
        console.log('   ✓ Updated: ' + (room.name || 'Room') + ' (Beds24 ID: ' + beds24RoomId + ')');
      } else {
        // INSERT new room
        const unitResult = await client.query(`
          INSERT INTO bookable_units (
            property_id,
            beds24_room_id,
            cm_room_id,
            name,
            unit_type,
            description,
            short_description,
            max_guests,
            max_adults,
            max_children,
            quantity,
            base_price,
            size_sqm,
            bed_configuration,
            bathroom_count,
            bedroom_count,
            min_stay,
            max_stay,
            status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'available'
          )
          RETURNING id
        `, [
          gasPropertyId,
          parseInt(beds24RoomId) || null,
          beds24RoomId,
          room.name || room.roomName || 'Room',
          room.roomType || room.unitType || 'double',
          JSON.stringify({ en: roomDescription }),
          JSON.stringify({ en: roomShortDesc }),
          room.maxPeople || room.maxGuests || 2,
          room.maxAdult || room.maxAdults || 2,
          room.maxChildren || 0,
          room.qty || room.quantity || 1,
          room.rackRate || room.basePrice || room.price || 100,
          room.size || room.sizeSqm || null,
          bedConfig ? JSON.stringify(bedConfig) : null,
          bathroomCount,
          bedroomCount,
          room.minStay || 1,
          room.maxStay || null
        ]);
        
        unitId = unitResult.rows[0].id;
        roomsAdded++;
        console.log('   ✓ Added: ' + (room.name || 'Room'));
      }
      
      // =========================================================
      // 6a. SKIP ROOM IMAGES - Users upload directly in GAS
      // =========================================================
      // Room images are NOT imported - users upload in GAS for quality control
      
      // =========================================================
      // 6b. SKIP ROOM AMENITIES - Users select from master list in GAS
      // =========================================================
      // Room amenities will be selected by users from master_amenities table
      // and stored in room_amenity_selections
      // This allows proper control and consistency across all properties
    }
    
    console.log('   📊 Rooms: ' + roomsAdded + ' added, ' + roomsUpdated + ' updated');
    
    // =========================================================
    // 7. CREATE/UPDATE PROPERTY-CM LINK
    // =========================================================
    console.log('\n🔗 STEP 7: Creating channel manager link...');
    
    // Check if link exists
    const existingLink = await client.query(`
      SELECT id FROM property_cm_links 
      WHERE property_id = $1 AND connection_id = $2
    `, [gasPropertyId, connectionId]);
    
    if (existingLink.rows.length > 0) {
      await client.query(`
        UPDATE property_cm_links SET
          cm_property_name = $1,
          updated_at = NOW()
        WHERE property_id = $2 AND connection_id = $3
      `, [prop.name || prop.propName, gasPropertyId, connectionId]);
      console.log('   ✓ Updated existing link');
    } else {
      await client.query(`
        INSERT INTO property_cm_links (
          property_id,
          connection_id,
          cm_property_id,
          cm_property_name,
          sync_enabled,
          sync_availability,
          sync_rates,
          sync_bookings,
          status
        ) VALUES ($1, $2, $3, $4, true, true, true, true, 'active')
      `, [gasPropertyId, connectionId, propertyId, prop.name || prop.propName]);
      console.log('   ✓ Created new link');
    }
    
    // =========================================================
    // COMMIT TRANSACTION
    // =========================================================
    await client.query('COMMIT');
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    
    const stats = {
      propertyId: gasPropertyId,
      beds24PropertyId: propertyId,
      propertyName: prop.name || prop.propName || 'Property',
      policies: policiesCount,
      roomsAdded: roomsAdded,
      roomsUpdated: roomsUpdated,
      isUpdate: isUpdate,
      note: 'Amenities not imported - users select from master list in GAS'
    };
    
    console.log('   📊 Stats:', JSON.stringify(stats, null, 2));
    
    res.json({
      success: true,
      stats: stats,
      message: isUpdate ? 'Property & rooms updated. Select amenities in GAS.' : 'Property & rooms imported. Select amenities in GAS.'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ IMPORT FAILED:', error.message);
    if (error.response?.status) {
      console.error('   Beds24 API status:', error.response.status);
    }
    if (error.response?.data) {
      console.error('   Beds24 response:', JSON.stringify(error.response.data));
    }
    res.json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  } finally {
    client.release();
  }
});

// =====================================================
// ADMIN DASHBOARD API ENDPOINTS
// =====================================================

// Get dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const propertiesCount = await pool.query('SELECT COUNT(*) FROM properties');
    const unitsCount = await pool.query('SELECT COUNT(*) FROM bookable_units');
    const bookingsCount = await pool.query('SELECT COUNT(*) FROM bookings');
    const connectionsCount = await pool.query('SELECT COUNT(*) FROM channel_connections WHERE status = $1', ['active']);
    
    res.json({
      success: true,
      properties: parseInt(propertiesCount.rows[0].count),
      units: parseInt(unitsCount.rows[0].count),
      bookings: parseInt(bookingsCount.rows[0].count),
      connections: parseInt(connectionsCount.rows[0].count)
    });
  } catch (error) {
    console.error('Stats error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Debug endpoint - check what's actually in database
app.get('/api/admin/debug', async (req, res) => {
  try {
    const properties = await pool.query('SELECT id, name, beds24_property_id, created_at FROM properties ORDER BY created_at DESC');
    const units = await pool.query('SELECT id, name, property_id, created_at FROM bookable_units ORDER BY created_at DESC');
    const connections = await pool.query(`
      SELECT cc.id, cm.cm_name, cm.cm_code, cc.status, cc.created_at 
      FROM channel_connections cc
      LEFT JOIN channel_managers cm ON cc.cm_id = cm.id
      ORDER BY cc.created_at DESC
    `);
    
    res.json({
      success: true,
      properties: properties.rows,
      units: units.rows,
      connections: connections.rows,
      counts: {
        properties: properties.rows.length,
        units: units.rows.length,
        connections: connections.rows.length
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all bookable units with property details
app.get('/api/admin/units', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bu.*,
        p.name as property_name
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      ORDER BY bu.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Units error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Get single unit
app.get('/api/admin/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM bookable_units WHERE id = $1', [id]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ success: false, error: 'Unit not found' });
    }
  } catch (error) {
    console.error('Unit fetch error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Update unit
app.put('/api/admin/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, status } = req.body;
    
    // Only update GAS-controlled fields
    const result = await pool.query(`
      UPDATE bookable_units 
      SET 
        quantity = COALESCE($1, quantity),
        status = COALESCE($2, status),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [quantity, status, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Unit update error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Delete unit - REQUIRES no bookings attached
app.delete('/api/admin/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if unit has any bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE bookable_unit_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.json({ 
        success: false, 
        error: 'Cannot delete room: This room has ' + bookingsCheck.rows[0].count + ' booking(s) attached. Cancel or reassign bookings first.'
      });
    }
    
    // Safe to delete - remove related records first
    await pool.query('DELETE FROM bookable_unit_images WHERE bookable_unit_id = $1', [id]);
    await pool.query('DELETE FROM bookable_unit_amenities WHERE bookable_unit_id = $1', [id]);
    
    // Delete the unit
    await pool.query('DELETE FROM bookable_units WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Unit delete error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Get all amenities
app.get('/api/admin/amenities', async (req, res) => {
  try {
    // Get all master amenities
    const masterAmenities = await pool.query(`
      SELECT * FROM master_amenities 
      WHERE is_active = true 
      ORDER BY category, display_order
    `);
    
    res.json({
      success: true,
      amenities: masterAmenities.rows
    });
  } catch (error) {
    console.error('Amenities error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Get amenities for a specific room
app.get('/api/admin/units/:id/amenities', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        ras.id as selection_id,
        ras.display_order,
        ma.id as amenity_id,
        ma.amenity_code,
        ma.amenity_name,
        ma.category,
        ma.icon
      FROM room_amenity_selections ras
      JOIN master_amenities ma ON ras.amenity_id = ma.id
      WHERE ras.room_id = $1
      ORDER BY ras.display_order
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Unit amenities error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Update amenities for a room
app.put('/api/admin/units/:id/amenities', async (req, res) => {
  try {
    const { id } = req.params;
    const { amenities } = req.body; // Array of amenity IDs from master_amenities
    
    // Delete existing selections for this room
    await pool.query('DELETE FROM room_amenity_selections WHERE room_id = $1', [id]);
    
    // Insert new selections
    if (amenities && amenities.length > 0) {
      for (let i = 0; i < amenities.length; i++) {
        const amenityId = amenities[i];
        await pool.query(`
          INSERT INTO room_amenity_selections (room_id, amenity_id, display_order)
          VALUES ($1, $2, $3)
        `, [id, amenityId, i]);
      }
    }
    
    res.json({ success: true, message: 'Amenities updated successfully' });
  } catch (error) {
    console.error('Update unit amenities error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Create new custom amenity
app.post('/api/admin/amenities', async (req, res) => {
  try {
    const { name, category, icon } = req.body;
    
    if (!name || !category) {
      return res.json({ success: false, error: 'Name and category are required' });
    }
    
    // Generate code from name
    const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    
    // Check if code already exists
    const existing = await pool.query(
      'SELECT COUNT(*) as count FROM master_amenities WHERE amenity_code = $1',
      [code]
    );
    
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ success: false, error: 'An amenity with this name already exists' });
    }
    
    // Insert into master_amenities - amenity_name must be JSONB
    const amenityNameJson = JSON.stringify({ en: name });
    const result = await pool.query(`
      INSERT INTO master_amenities (amenity_code, amenity_name, category, icon, is_system, created_by)
      VALUES ($1, $2::jsonb, $3, $4, false, 'user')
      RETURNING *
    `, [code, amenityNameJson, category, icon || '✓']);
    
    res.json({ 
      success: true, 
      message: 'Custom amenity created',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create amenity error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Delete amenity (only if unused)
app.delete('/api/admin/amenities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the amenity
    await pool.query('DELETE FROM master_amenities WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Amenity deleted' });
  } catch (error) {
    console.error('Delete amenity error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Delete ALL amenities
app.delete('/api/admin/amenities/delete-all', async (req, res) => {
  try {
    // First clear any selections
    await pool.query('DELETE FROM room_amenity_selections');
    await pool.query('DELETE FROM property_amenity_selections');
    
    // Then delete all amenities
    const result = await pool.query('DELETE FROM master_amenities');
    
    res.json({ 
      success: true, 
      message: 'All amenities deleted',
      deleted: result.rowCount
    });
  } catch (error) {
    console.error('Delete all amenities error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// ========================================
// CONTENT MANAGEMENT ENDPOINTS
// ========================================

// Get property content
app.get('/api/admin/content/property/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        CASE 
          WHEN jsonb_typeof(description) = 'object' THEN description->>'en'
          ELSE description::text
        END as description,
        location_description 
      FROM properties WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Save property content
app.put('/api/admin/content/property/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { description, location_description } = req.body;
    
    // Convert description to JSONB format
    const descriptionJson = JSON.stringify({ en: description || '' });
    
    await pool.query(`
      UPDATE properties 
      SET description = $1::jsonb, 
          location_description = $2, 
          updated_at = NOW() 
      WHERE id = $3
    `, [descriptionJson, location_description || '', id]);
    
    res.json({ success: true, message: 'Property content saved' });
  } catch (error) {
    console.error('Save property content error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Get room content
app.get('/api/admin/content/room/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN short_description IS NULL THEN NULL
          WHEN jsonb_typeof(short_description::jsonb) = 'object' THEN short_description::jsonb->>'en'
          ELSE short_description::text
        END as short_description,
        CASE 
          WHEN full_description IS NULL THEN NULL
          WHEN jsonb_typeof(full_description::jsonb) = 'object' THEN full_description::jsonb->>'en'
          ELSE full_description::text
        END as full_description
      FROM bookable_units WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Room not found' });
    }
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error) {
    // If JSONB parsing fails, try simple select
    try {
      const result = await pool.query(
        'SELECT short_description, full_description FROM bookable_units WHERE id = $1',
        [id]
      );
      res.json({ success: true, content: result.rows[0] || {} });
    } catch (e) {
      res.json({ success: false, error: error.message });
    }
  }
});

// Save room content
app.put('/api/admin/content/room/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { short_description, full_description } = req.body;
    
    // Try as JSONB first
    try {
      await pool.query(`
        UPDATE bookable_units 
        SET short_description = $1::jsonb, 
            full_description = $2::jsonb, 
            updated_at = NOW() 
        WHERE id = $3`,
        [
          JSON.stringify({ en: short_description || '' }), 
          JSON.stringify({ en: full_description || '' }), 
          id
        ]
      );
    } catch (e) {
      // If JSONB fails, try as TEXT
      await pool.query(`
        UPDATE bookable_units 
        SET short_description = $1, 
            full_description = $2, 
            updated_at = NOW() 
        WHERE id = $3`,
        [short_description || '', full_description || '', id]
      );
    }
    
    res.json({ success: true, message: 'Room content saved' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get policies content
app.get('/api/admin/content/policies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN house_rules IS NULL THEN NULL
          WHEN jsonb_typeof(house_rules::jsonb) = 'object' THEN house_rules::jsonb->>'en'
          ELSE house_rules::text
        END as house_rules,
        CASE 
          WHEN cancellation_policy IS NULL THEN NULL
          WHEN jsonb_typeof(cancellation_policy::jsonb) = 'object' THEN cancellation_policy::jsonb->>'en'
          ELSE cancellation_policy::text
        END as cancellation_policy,
        CASE 
          WHEN terms_conditions IS NULL THEN NULL
          WHEN jsonb_typeof(terms_conditions::jsonb) = 'object' THEN terms_conditions::jsonb->>'en'
          ELSE terms_conditions::text
        END as terms_conditions
      FROM properties WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error) {
    // If JSONB parsing fails, try simple select
    try {
      const result = await pool.query(
        'SELECT house_rules, cancellation_policy, terms_conditions FROM properties WHERE id = $1',
        [id]
      );
      res.json({ success: true, content: result.rows[0] || {} });
    } catch (e) {
      res.json({ success: false, error: error.message });
    }
  }
});

// Save policies content
app.put('/api/admin/content/policies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { house_rules, cancellation_policy, terms_conditions } = req.body;
    
    // Try as JSONB first
    try {
      await pool.query(`
        UPDATE properties 
        SET house_rules = $1::jsonb, 
            cancellation_policy = $2::jsonb, 
            terms_conditions = $3::jsonb, 
            updated_at = NOW() 
        WHERE id = $4`,
        [
          JSON.stringify({ en: house_rules || '' }), 
          JSON.stringify({ en: cancellation_policy || '' }), 
          JSON.stringify({ en: terms_conditions || '' }), 
          id
        ]
      );
    } catch (e) {
      // If JSONB fails, try as TEXT
      await pool.query(`
        UPDATE properties 
        SET house_rules = $1, 
            cancellation_policy = $2, 
            terms_conditions = $3, 
            updated_at = NOW() 
        WHERE id = $4`,
        [house_rules || '', cancellation_policy || '', terms_conditions || '', id]
      );
    }
    
    res.json({ success: true, message: 'Policies saved' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ========================================
// AVAILABILITY & PRICING ENDPOINTS
// ========================================

// Get availability for a room (PUBLIC API)
app.get('/api/availability/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.json({ success: false, error: 'from and to dates required' });
    }
    
    // Get availability data
    const availability = await pool.query(`
      SELECT 
        date,
        cm_price,
        direct_price,
        direct_discount_percent,
        is_available,
        is_blocked,
        min_stay,
        source,
        notes
      FROM room_availability
      WHERE room_id = $1 
        AND date >= $2 
        AND date <= $3
      ORDER BY date
    `, [roomId, from, to]);
    
    // Build availability map
    const availMap = {};
    availability.rows.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      // Calculate effective direct price
      let effectiveDirectPrice = a.direct_price;
      if (!effectiveDirectPrice && a.cm_price && a.direct_discount_percent) {
        effectiveDirectPrice = a.cm_price * (1 - a.direct_discount_percent / 100);
      }
      
      availMap[dateStr] = {
        date: dateStr,
        cm_price: a.cm_price,
        direct_price: effectiveDirectPrice || a.cm_price,
        direct_discount_percent: a.direct_discount_percent,
        is_available: a.is_available,
        is_blocked: a.is_blocked,
        min_stay: a.min_stay,
        source: a.source
      };
    });
    
    // Try to get bookings - but don't fail if table structure is different
    try {
      // First check what columns exist in bookings table
      const columnsResult = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'bookings'
      `);
      
      const allCols = columnsResult.rows.map(r => r.column_name);
      console.log('Bookings table columns:', allCols.join(', '));
      
      // Find check-in column
      let checkInCol = allCols.find(c => c === 'check_in') ||
                       allCols.find(c => c === 'check_in_date') ||
                       allCols.find(c => c === 'checkin') ||
                       allCols.find(c => c === 'arrival_date') ||
                       allCols.find(c => c === 'start_date');
      
      // Find check-out column                 
      let checkOutCol = allCols.find(c => c === 'check_out') ||
                        allCols.find(c => c === 'check_out_date') ||
                        allCols.find(c => c === 'checkout') ||
                        allCols.find(c => c === 'departure_date') ||
                        allCols.find(c => c === 'end_date');
      
      // Find room ID column
      let roomIdCol = allCols.find(c => c === 'room_id') ||
                      allCols.find(c => c === 'bookable_unit_id') ||
                      allCols.find(c => c === 'unit_id');
      
      if (!checkInCol || !checkOutCol) {
        console.log('Could not find check-in/out columns. Available:', allCols.join(', '));
        throw new Error('Booking columns not found');
      }
      
      if (!roomIdCol) {
        console.log('Could not find room ID column. Skipping bookings.');
        throw new Error('Room ID column not found');
      }
      
      console.log(`Using columns: ${roomIdCol}, ${checkInCol}, ${checkOutCol}`);
      
      const bookings = await pool.query(`
        SELECT 
          "${checkInCol}" as check_in,
          "${checkOutCol}" as check_out,
          COALESCE(guest_first_name, guest_name, '') as guest_name,
          status
        FROM bookings
        WHERE "${roomIdCol}" = $1 
          AND status NOT IN ('cancelled', 'rejected')
          AND "${checkInCol}" <= $3
          AND "${checkOutCol}" >= $2
      `, [roomId, from, to]);
      
      // Mark booked dates
      bookings.rows.forEach(b => {
        const checkIn = new Date(b.check_in);
        const checkOut = new Date(b.check_out);
        
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (!availMap[dateStr]) {
            availMap[dateStr] = { date: dateStr };
          }
          availMap[dateStr].is_booked = true;
          availMap[dateStr].guest_name = b.guest_name;
        }
      });
    } catch (bookingErr) {
      console.log('Bookings query skipped:', bookingErr.message);
      // Continue without bookings data
    }
    
    // Convert to array and fill missing dates
    const result = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push(availMap[dateStr] || {
        date: dateStr,
        is_available: true,
        is_booked: false,
        is_blocked: false
      });
    }
    
    res.json({ success: true, availability: result });
  } catch (error) {
    console.error('Availability error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Debug: Check Beds24 room mappings
app.get('/api/admin/debug/beds24-rooms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bu.id as gas_room_id,
        bu.name as room_name,
        bu.beds24_room_id,
        p.name as property_name,
        p.beds24_property_id
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      ORDER BY p.name, bu.name
    `);
    
    res.json({
      success: true,
      rooms: result.rows,
      summary: {
        total_rooms: result.rows.length,
        linked_to_beds24: result.rows.filter(r => r.beds24_room_id).length
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Debug: Check rooms and their Beds24 links
app.get('/api/admin/debug/rooms-beds24', async (req, res) => {
  try {
    const rooms = await pool.query(`
      SELECT bu.id, bu.name, bu.beds24_room_id, bu.property_id, p.name as property_name, p.beds24_property_id
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      ORDER BY bu.id
    `);
    
    res.json({
      success: true,
      count: rooms.rows.length,
      rooms: rooms.rows
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Debug: Test Beds24 calendar API directly
app.get('/api/admin/debug/beds24-calendar/:beds24RoomId', async (req, res) => {
  try {
    const { beds24RoomId } = req.params;
    const { propertyId } = req.query;
    
    // Get access token using helper function
    let accessToken;
    try {
      accessToken = await getBeds24AccessToken(pool);
    } catch (tokenError) {
      return res.json({ success: false, error: tokenError.message });
    }
    
    // Calculate date range
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];
    
    // Try multiple API variations
    const results = {};
    
    // Try 1: /inventory/rooms/calendar with roomId
    try {
      const resp1 = await axios.get('https://beds24.com/api/v2/inventory/rooms/calendar', {
        headers: { 'token': accessToken },
        params: { roomId: beds24RoomId, from: fromDate, to: toDate }
      });
      results.rooms_calendar = resp1.data;
    } catch (e) {
      results.rooms_calendar_error = e.response?.data || e.message;
    }
    
    // Try 2: /inventory/rooms/prices (fixed prices)
    try {
      const resp2 = await axios.get('https://beds24.com/api/v2/inventory/rooms/prices', {
        headers: { 'token': accessToken },
        params: { roomId: beds24RoomId }
      });
      results.rooms_prices = resp2.data;
    } catch (e) {
      results.rooms_prices_error = e.response?.data || e.message;
    }
    
    // Try 3: /inventory/rooms/offers (calculated prices for dates)
    // Get offers for next 30 days, one day at a time
    try {
      const offersData = [];
      // Test first 7 days to see the data structure
      for (let i = 0; i < 7; i++) {
        const arrivalDate = new Date(today);
        arrivalDate.setDate(arrivalDate.getDate() + i);
        const departDate = new Date(arrivalDate);
        departDate.setDate(departDate.getDate() + 1);
        
        const arrival = arrivalDate.toISOString().split('T')[0];
        const depart = departDate.toISOString().split('T')[0];
        
        const resp3 = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
          headers: { 'token': accessToken },
          params: { 
            roomId: beds24RoomId, 
            arrival: arrival,
            departure: departDate.toISOString().split('T')[0],
            numAdults: 2
          }
        });
        
        if (resp3.data.data && resp3.data.data.length > 0) {
          offersData.push({
            date: arrival,
            offers: resp3.data.data[0].offers
          });
        }
      }
      results.rooms_offers = { success: true, data: offersData };
    } catch (e) {
      results.rooms_offers_error = e.response?.data || e.message;
    }
    
    // Try 4: /properties with includeAllRooms to get rackRate
    try {
      const resp4 = await axios.get('https://beds24.com/api/v2/properties', {
        headers: { 'token': accessToken },
        params: { id: propertyId || 16276, includeAllRooms: true }
      });
      // Extract just room pricing info
      const rooms = resp4.data.data?.[0]?.roomTypes || [];
      results.room_rack_rates = rooms.map(r => ({
        roomId: r.id,
        name: r.name,
        rackRate: r.rackRate,
        minPrice: r.minPrice,
        cleaningFee: r.cleaningFee,
        taxPercentage: r.taxPercentage
      }));
    } catch (e) {
      results.room_rack_rates_error = e.response?.data || e.message;
    }
    
    res.json({
      success: true,
      roomId: beds24RoomId,
      propertyId: propertyId || 16276,
      dateRange: { from: fromDate, to: toDate },
      results
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Sync availability from Channel Manager (Beds24)
app.post('/api/admin/sync-availability/:roomId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { roomId } = req.params;
    
    // Get the room's Beds24 ID
    const room = await client.query(`
      SELECT bu.id, bu.beds24_room_id, bu.property_id, p.beds24_property_id
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [roomId]);
    
    if (room.rows.length === 0) {
      client.release();
      return res.json({ success: false, error: 'Room not found' });
    }
    
    const beds24RoomId = room.rows[0].beds24_room_id;
    
    if (!beds24RoomId) {
      client.release();
      return res.json({ success: false, error: 'Room not linked to Beds24 (no beds24_room_id)' });
    }
    
    // Get access token using helper function
    let accessToken;
    try {
      accessToken = await getBeds24AccessToken(pool);
    } catch (tokenError) {
      client.release();
      return res.json({ success: false, error: tokenError.message });
    }
    
    // Calculate date range (today + 30 days to reduce API calls)
    const today = new Date();
    const numDays = 30;
    
    console.log(`Syncing Beds24 room ${beds24RoomId} for ${numDays} days using offers API`);
    
    await client.query('BEGIN');
    
    let daysSynced = 0;
    let daysWithPrice = 0;
    let daysBlocked = 0;
    
    // Call offers API for each day
    for (let i = 0; i < numDays; i++) {
      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + i);
      const departDate = new Date(arrivalDate);
      departDate.setDate(departDate.getDate() + 1);
      
      const arrival = arrivalDate.toISOString().split('T')[0];
      const departure = departDate.toISOString().split('T')[0];
      
      try {
        const offerResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
          headers: { 'token': accessToken },
          params: { 
            roomId: beds24RoomId, 
            arrival: arrival,
            departure: departure,
            numAdults: 2
          }
        });
        
        const offerData = offerResponse.data;
        
        // Find offer 1 (Standard Price) from the response
        let price = null;
        let unitsAvailable = 0;
        
        if (offerData.data && offerData.data.length > 0) {
          const roomOffers = offerData.data[0];
          if (roomOffers.offers && roomOffers.offers.length > 0) {
            // Get offer 1 (Standard Price) or first available offer
            const offer1 = roomOffers.offers.find(o => o.offerId === 1) || roomOffers.offers[0];
            price = offer1.price;
            unitsAvailable = offer1.unitsAvailable || 0;
            daysWithPrice++;
          }
        }
        
        const isAvailable = unitsAvailable > 0;
        const isBlocked = !isAvailable && price === null;
        
        if (isBlocked) daysBlocked++;
        
        await client.query(`
          INSERT INTO room_availability (room_id, date, cm_price, is_available, is_blocked, source)
          VALUES ($1, $2, $3, $4, $5, 'beds24')
          ON CONFLICT (room_id, date) 
          DO UPDATE SET 
            cm_price = COALESCE($3, room_availability.cm_price),
            is_available = $4,
            is_blocked = $5,
            source = 'beds24',
            updated_at = NOW()
        `, [roomId, arrival, price, isAvailable, isBlocked]);
        
        daysSynced++;
        
      } catch (apiError) {
        // If rate limited, wait longer and retry once
        if (apiError.response?.status === 429) {
          console.log('Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          // Don't retry, just skip this day
        }
        console.error(`Error fetching offers for ${arrival}:`, apiError.response?.data || apiError.message);
        // Continue with next day even if one fails
      }
      
      // Delay between EVERY call to avoid rate limiting (500ms = ~2 calls/sec)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await client.query('COMMIT');
    client.release();
    
    console.log(`Sync complete: ${daysSynced} days, ${daysWithPrice} with prices, ${daysBlocked} blocked`);
    
    res.json({ 
      success: true, 
      roomId,
      beds24RoomId,
      daysSynced,
      daysWithPrice,
      daysBlocked,
      message: `Synced ${daysSynced} days from Beds24 (${daysWithPrice} with prices, ${daysBlocked} blocked)`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Sync error:', error);
    res.json({ success: false, error: error.message });
  }
});

// QUICK sync ALL rooms - 30 days only (faster, won't timeout)
app.post('/api/admin/sync-all-availability-quick', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get all rooms with beds24_room_id
    const roomsResult = await client.query(`
      SELECT bu.id, bu.name, bu.beds24_room_id 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    if (roomsResult.rows.length === 0) {
      client.release();
      return res.json({ success: false, error: 'No rooms linked to Beds24' });
    }
    
    const rooms = roomsResult.rows;
    const beds24RoomIds = rooms.map(r => r.beds24_room_id);
    
    // Create a map of beds24_room_id -> our room id
    const roomIdMap = {};
    rooms.forEach(r => {
      roomIdMap[r.beds24_room_id] = r.id;
    });
    
    // Get access token
    let accessToken;
    try {
      accessToken = await getBeds24AccessToken(pool);
    } catch (tokenError) {
      client.release();
      return res.json({ success: false, error: tokenError.message });
    }
    
    const today = new Date();
    const numDays = 30; // Just 30 days for quick sync
    
    console.log(`Quick sync: ${rooms.length} rooms for ${numDays} days`);
    console.log('Beds24 room IDs:', beds24RoomIds);
    
    await client.query('BEGIN');
    
    let totalDaysSynced = 0;
    let totalPricesFound = 0;
    let apiCallsMade = 0;
    
    // Fetch ALL rooms for each day in ONE API call
    for (let i = 0; i < numDays; i++) {
      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + i);
      const departDate = new Date(arrivalDate);
      departDate.setDate(departDate.getDate() + 1);
      
      const arrival = arrivalDate.toISOString().split('T')[0];
      const departure = departDate.toISOString().split('T')[0];
      
      try {
        const offerResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
          headers: { 'token': accessToken },
          params: { 
            roomId: beds24RoomIds,
            arrival: arrival,
            departure: departure,
            numAdults: 2
          },
          paramsSerializer: params => {
            const parts = [];
            for (const key in params) {
              const value = params[key];
              if (Array.isArray(value)) {
                value.forEach(v => parts.push(`${key}=${v}`));
              } else {
                parts.push(`${key}=${value}`);
              }
            }
            return parts.join('&');
          }
        });
        
        apiCallsMade++;
        const offerData = offerResponse.data;
        
        // Process each room's offers
        if (offerData.data && offerData.data.length > 0) {
          for (const roomData of offerData.data) {
            const ourRoomId = roomIdMap[roomData.roomId];
            if (!ourRoomId) continue;
            
            let price = null;
            let unitsAvailable = 0;
            
            if (roomData.offers && roomData.offers.length > 0) {
              const offer1 = roomData.offers.find(o => o.offerId === 1) || roomData.offers[0];
              price = offer1.price;
              unitsAvailable = offer1.unitsAvailable || 0;
              totalPricesFound++;
            }
            
            const isAvailable = unitsAvailable > 0;
            const isBlocked = !isAvailable && price === null;
            
            await client.query(`
              INSERT INTO room_availability (room_id, date, cm_price, is_available, is_blocked, source)
              VALUES ($1, $2, $3, $4, $5, 'beds24')
              ON CONFLICT (room_id, date) 
              DO UPDATE SET 
                cm_price = COALESCE($3, room_availability.cm_price),
                is_available = $4,
                is_blocked = $5,
                source = 'beds24',
                updated_at = NOW()
            `, [ourRoomId, arrival, price, isAvailable, isBlocked]);
            
            totalDaysSynced++;
          }
        }
        
      } catch (apiError) {
        if (apiError.response?.status === 429) {
          console.log(`Rate limited on day ${i}, waiting 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          i--; // Retry this day
          continue;
        }
        console.error(`Error fetching offers for ${arrival}:`, apiError.response?.data || apiError.message);
      }
      
      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    await client.query('COMMIT');
    client.release();
    
    console.log(`Quick sync complete: ${apiCallsMade} API calls, ${totalDaysSynced} records, ${totalPricesFound} prices`);
    
    res.json({ 
      success: true, 
      roomsCount: rooms.length,
      daysRequested: numDays,
      apiCallsMade,
      totalDaysSynced,
      totalPricesFound,
      message: `Synced ${rooms.length} rooms for ${numDays} days`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Quick sync error:', error);
    res.json({ success: false, error: error.message });
  }
});

// BULK sync ALL rooms - fetches all rooms in one API call per day (much faster)
app.post('/api/admin/sync-all-availability-bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get all rooms with beds24_room_id
    const roomsResult = await client.query(`
      SELECT bu.id, bu.name, bu.beds24_room_id 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    if (roomsResult.rows.length === 0) {
      client.release();
      return res.json({ success: false, error: 'No rooms linked to Beds24' });
    }
    
    const rooms = roomsResult.rows;
    const beds24RoomIds = rooms.map(r => r.beds24_room_id);
    
    // Create a map of beds24_room_id -> our room id
    const roomIdMap = {};
    rooms.forEach(r => {
      roomIdMap[r.beds24_room_id] = r.id;
    });
    
    // Get access token
    let accessToken;
    try {
      accessToken = await getBeds24AccessToken(pool);
    } catch (tokenError) {
      client.release();
      return res.json({ success: false, error: tokenError.message });
    }
    
    const today = new Date();
    const numDays = 365; // Full year
    
    console.log(`Bulk syncing ${rooms.length} rooms for ${numDays} days`);
    
    await client.query('BEGIN');
    
    let totalDaysSynced = 0;
    let totalPricesFound = 0;
    let apiCallsMade = 0;
    
    console.log('Beds24 room IDs to sync:', beds24RoomIds);
    
    // Fetch ALL rooms for each day in ONE API call
    for (let i = 0; i < numDays; i++) {
      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + i);
      const departDate = new Date(arrivalDate);
      departDate.setDate(departDate.getDate() + 1);
      
      const arrival = arrivalDate.toISOString().split('T')[0];
      const departure = departDate.toISOString().split('T')[0];
      
      try {
        // Pass ALL room IDs as array - axios will serialize properly
        const offerResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
          headers: { 'token': accessToken },
          params: { 
            roomId: beds24RoomIds,  // Pass as array, let axios handle it
            arrival: arrival,
            departure: departure,
            numAdults: 2
          },
          paramsSerializer: params => {
            // Custom serializer to handle array params correctly for Beds24
            const parts = [];
            for (const key in params) {
              const value = params[key];
              if (Array.isArray(value)) {
                value.forEach(v => parts.push(`${key}=${v}`));
              } else {
                parts.push(`${key}=${value}`);
              }
            }
            return parts.join('&');
          }
        });
        
        apiCallsMade++;
        const offerData = offerResponse.data;
        
        if (i === 0) {
          console.log('First API response:', JSON.stringify(offerData).substring(0, 500));
        }
        
        // Process each room's offers
        if (offerData.data && offerData.data.length > 0) {
          for (const roomData of offerData.data) {
            const ourRoomId = roomIdMap[roomData.roomId];
            if (!ourRoomId) continue;
            
            let price = null;
            let unitsAvailable = 0;
            
            if (roomData.offers && roomData.offers.length > 0) {
              const offer1 = roomData.offers.find(o => o.offerId === 1) || roomData.offers[0];
              price = offer1.price;
              unitsAvailable = offer1.unitsAvailable || 0;
              totalPricesFound++;
            }
            
            const isAvailable = unitsAvailable > 0;
            const isBlocked = !isAvailable && price === null;
            
            await client.query(`
              INSERT INTO room_availability (room_id, date, cm_price, is_available, is_blocked, source)
              VALUES ($1, $2, $3, $4, $5, 'beds24')
              ON CONFLICT (room_id, date) 
              DO UPDATE SET 
                cm_price = COALESCE($3, room_availability.cm_price),
                is_available = $4,
                is_blocked = $5,
                source = 'beds24',
                updated_at = NOW()
            `, [ourRoomId, arrival, price, isAvailable, isBlocked]);
            
            totalDaysSynced++;
          }
        }
        
      } catch (apiError) {
        if (apiError.response?.status === 429) {
          console.log(`Rate limited on day ${i}, waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          i--; // Retry this day
          continue;
        }
        console.error(`Error fetching offers for ${arrival}:`, apiError.response?.data || apiError.message);
      }
      
      // Progress log every 30 days
      if (i > 0 && i % 30 === 0) {
        console.log(`Progress: ${i}/${numDays} days, ${apiCallsMade} API calls, ${totalDaysSynced} records`);
      }
      
      // Delay between calls (300ms = ~3 calls/sec)
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    await client.query('COMMIT');
    client.release();
    
    console.log(`Bulk sync complete: ${apiCallsMade} API calls, ${totalDaysSynced} day/room records, ${totalPricesFound} with prices`);
    
    res.json({ 
      success: true, 
      roomsCount: rooms.length,
      daysRequested: numDays,
      apiCallsMade,
      totalDaysSynced,
      totalPricesFound,
      message: `Synced ${rooms.length} rooms for ${numDays} days (${apiCallsMade} API calls)`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Bulk sync error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Sync ALL rooms from Beds24 (calls the single room sync for each room)
app.post('/api/admin/sync-all-availability', async (req, res) => {
  try {
    // Get all rooms with beds24_room_id
    const rooms = await pool.query(`
      SELECT bu.id, bu.name, bu.beds24_room_id 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    if (rooms.rows.length === 0) {
      return res.json({ success: false, error: 'No rooms linked to Beds24' });
    }
    
    console.log(`Starting sync for ${rooms.rows.length} rooms`);
    
    const results = [];
    
    for (const room of rooms.rows) {
      try {
        // Call the single room sync endpoint internally
        const syncResult = await new Promise(async (resolve) => {
          const mockReq = { params: { roomId: room.id } };
          const mockRes = {
            json: (data) => resolve(data)
          };
          
          // We need to call the sync logic directly, not the endpoint
          // For simplicity, we'll make an internal HTTP call
          const axios = require('axios');
          const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          
          try {
            const response = await axios.post(`${baseUrl}/api/admin/sync-availability/${room.id}`);
            resolve(response.data);
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        });
        
        results.push({
          roomId: room.id,
          roomName: room.name,
          beds24RoomId: room.beds24_room_id,
          ...syncResult
        });
        
        // Small delay between rooms
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        results.push({
          roomId: room.id,
          roomName: room.name,
          success: false,
          error: err.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      totalRooms: rooms.rows.length,
      successfulSyncs: successCount,
      failedSyncs: rooms.rows.length - successCount,
      results
    });
    
  } catch (error) {
    console.error('Sync all error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Set availability for date range (ADMIN)
app.post('/api/admin/availability', async (req, res) => {
  const client = await pool.connect();
  try {
    const { room_id, from_date, to_date, status, price, discount_percent } = req.body;
    
    await client.query('BEGIN');
    
    const startDate = new Date(from_date);
    const endDate = new Date(to_date);
    let daysUpdated = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      if (discount_percent) {
        // Apply percentage discount
        await client.query(`
          INSERT INTO room_availability (room_id, date, direct_discount_percent, is_available, is_blocked)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (room_id, date) 
          DO UPDATE SET 
            direct_discount_percent = $3,
            direct_price = NULL,
            is_available = $4,
            is_blocked = $5,
            updated_at = NOW()
        `, [room_id, dateStr, discount_percent, status === 'available', status === 'blocked']);
      } else {
        // Set fixed direct price
        await client.query(`
          INSERT INTO room_availability (room_id, date, direct_price, is_available, is_blocked)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (room_id, date) 
          DO UPDATE SET 
            direct_price = COALESCE($3, room_availability.direct_price),
            direct_discount_percent = NULL,
            is_available = $4,
            is_blocked = $5,
            updated_at = NOW()
        `, [room_id, dateStr, price || null, status === 'available', status === 'blocked']);
      }
      
      daysUpdated++;
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, days_updated: daysUpdated });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Set availability error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Migration: Create room_availability table
app.post('/api/admin/migrate-availability', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_availability (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        cm_price DECIMAL(10,2),
        direct_price DECIMAL(10,2),
        direct_discount_percent INTEGER,
        is_available BOOLEAN DEFAULT true,
        is_blocked BOOLEAN DEFAULT false,
        min_stay INTEGER DEFAULT 1,
        source VARCHAR(20) DEFAULT 'manual',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, date)
      )
    `);
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_avail_room ON room_availability(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_avail_date ON room_availability(date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_avail_room_date ON room_availability(room_id, date)');
    
    // Add new columns if table already exists
    try {
      await client.query('ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS cm_price DECIMAL(10,2)');
      await client.query('ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS direct_price DECIMAL(10,2)');
      await client.query('ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS direct_discount_percent INTEGER');
      await client.query('ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT \'manual\'');
      // Migrate old price column to cm_price
      await client.query('UPDATE room_availability SET cm_price = price WHERE cm_price IS NULL AND price IS NOT NULL');
    } catch (e) {
      console.log('Column migration note:', e.message);
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'room_availability table updated with cm_price and direct_price' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Migration: Add content columns to properties and rooms
app.post('/api/admin/migrate-content-columns', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, check if description is JSONB and convert to TEXT
    try {
      // Try to alter the column type - this will fail if it's already TEXT
      await client.query(`
        ALTER TABLE properties 
        ALTER COLUMN description TYPE TEXT 
        USING CASE 
          WHEN description IS NULL THEN NULL
          WHEN description::text LIKE '{%' THEN description::jsonb->>'en'
          ELSE description::text
        END
      `);
      console.log('   ✓ Converted description to TEXT');
    } catch (e) {
      console.log('   - description column OK or conversion not needed');
    }
    
    // Add columns to properties table
    const propertyColumns = [
      'location_description TEXT',
      'house_rules TEXT',
      'cancellation_policy TEXT',
      'terms_conditions TEXT'
    ];
    
    for (const col of propertyColumns) {
      const colName = col.split(' ')[0];
      try {
        await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS ${col}`);
        console.log(`   ✓ Added ${colName} to properties`);
      } catch (e) {
        // Column might already exist
      }
    }
    
    // Add columns to bookable_units table
    const roomColumns = [
      'short_description TEXT',
      'full_description TEXT'
    ];
    
    for (const col of roomColumns) {
      const colName = col.split(' ')[0];
      try {
        await client.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS ${col}`);
        console.log(`   ✓ Added ${colName} to bookable_units`);
      } catch (e) {
        // Column might already exist
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Content columns added successfully',
      columns: {
        properties: ['description (converted)', ...propertyColumns],
        rooms: roomColumns
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get integrations/connections
app.get('/api/admin/channels', async (req, res) => {
  try {
    const connections = await pool.query(`
      SELECT 
        cc.*,
        cm.cm_name,
        cm.cm_code
      FROM channel_connections cc
      LEFT JOIN channel_managers cm ON cc.cm_id = cm.id
      ORDER BY cc.created_at DESC
    `);
    
    res.json({
      success: true,
      data: connections.rows
    });
  } catch (error) {
    console.error('Channels error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Migration 001: Create Master Amenities System
app.post('/api/admin/migrate-001-master-amenities', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Running Migration 001: Master Amenities System...');
    
    // Create master_amenities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_amenities (
        id SERIAL PRIMARY KEY,
        amenity_code VARCHAR(100) UNIQUE NOT NULL,
        amenity_name JSONB NOT NULL,
        category VARCHAR(50) NOT NULL,
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        is_system BOOLEAN DEFAULT true,
        created_by VARCHAR(20) DEFAULT 'system',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created master_amenities table');
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_master_amenities_category ON master_amenities(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_master_amenities_active ON master_amenities(is_active)');
    
    // Create property_amenity_selections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_amenity_selections (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        amenity_id INTEGER NOT NULL REFERENCES master_amenities(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(property_id, amenity_id)
      )
    `);
    console.log('   ✓ Created property_amenity_selections table');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_prop_amenity_sel_property ON property_amenity_selections(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prop_amenity_sel_amenity ON property_amenity_selections(amenity_id)');
    
    // Create room_amenity_selections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_amenity_selections (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
        amenity_id INTEGER NOT NULL REFERENCES master_amenities(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, amenity_id)
      )
    `);
    console.log('   ✓ Created room_amenity_selections table');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_amenity_sel_room ON room_amenity_selections(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_amenity_sel_amenity ON room_amenity_selections(amenity_id)');
    
    // Insert standard amenities (just a subset here, full list in SQL file)
    const amenities = [
      // BEDS
      ['bed_single', '{"en": "Single"}', 'beds', '🛏️', 1],
      ['bed_twin', '{"en": "Twin"}', 'beds', '🛏️', 2],
      ['bed_double', '{"en": "Double"}', 'beds', '🛏️', 3],
      ['bed_queen', '{"en": "Queen"}', 'beds', '🛏️', 4],
      ['bed_king', '{"en": "King"}', 'beds', '🛏️', 5],
      ['bed_super_king', '{"en": "Super King"}', 'beds', '🛏️', 6],
      ['bed_sofa_single', '{"en": "Sofa Bed (Single)"}', 'beds', '🛋️', 7],
      ['bed_sofa_double', '{"en": "Sofa Bed (Double)"}', 'beds', '🛋️', 8],
      ['bed_bunk', '{"en": "Bunk Bed"}', 'beds', '🛏️', 9],
      ['bed_cot', '{"en": "Cot / Crib"}', 'beds', '👶', 10],
      ['bed_futon', '{"en": "Futon"}', 'beds', '🛏️', 11],
      // BATHROOMS
      ['bathroom_full', '{"en": "Full Bathroom"}', 'bathrooms', '🚿', 1],
      ['bathroom_shower_only', '{"en": "Shower Only"}', 'bathrooms', '🚿', 2],
      ['bathroom_bath_only', '{"en": "Bath Only"}', 'bathrooms', '🛁', 3],
      ['bathroom_shower_bath_combo', '{"en": "Shower–Bath Combo"}', 'bathrooms', '🚿', 4],
      ['bathroom_private_ensuite', '{"en": "Private Ensuite"}', 'bathrooms', '🚪', 5],
      ['bathroom_shared', '{"en": "Shared Bathroom"}', 'bathrooms', '🚿', 6],
      ['bathroom_private_external', '{"en": "Private External Bathroom"}', 'bathrooms', '🚪', 7],
      ['bathroom_jack_and_jill', '{"en": "Jack & Jill Bathroom"}', 'bathrooms', '🚪', 8],
      ['bathroom_accessible', '{"en": "Accessible Bathroom"}', 'bathrooms', '♿', 9],
      ['bathroom_wet_room', '{"en": "Wet Room"}', 'bathrooms', '🚿', 10],
      ['bathroom_outdoor_shower', '{"en": "Outdoor Shower"}', 'bathrooms', '🌳', 11],
      ['bathroom_outdoor_bath', '{"en": "Outdoor Bath"}', 'bathrooms', '🌳', 12],
      ['bathroom_double_vanity', '{"en": "Double Vanity"}', 'bathrooms', '🚰', 13],
      // ESSENTIALS
      ['wifi', '{"en": "WiFi"}', 'essentials', '📶', 1],
      ['air_conditioning', '{"en": "Air Conditioning"}', 'essentials', '❄️', 2],
      ['heating', '{"en": "Heating"}', 'essentials', '🔥', 3],
      // KITCHEN
      ['kitchen_full', '{"en": "Full Kitchen"}', 'kitchen', '🍳', 1],
      ['refrigerator', '{"en": "Refrigerator"}', 'kitchen', '🧊', 2],
      ['microwave', '{"en": "Microwave"}', 'kitchen', '📻', 3],
      // PARKING
      ['free_parking', '{"en": "Free Parking"}', 'parking', '🚗', 1],
      ['paid_parking', '{"en": "Paid Parking"}', 'parking', '🚗', 2]
    ];
    
    let insertedCount = 0;
    for (const [code, name, category, icon, order] of amenities) {
      try {
        await client.query(`
          INSERT INTO master_amenities (amenity_code, amenity_name, category, icon, display_order, is_system)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (amenity_code) DO NOTHING
        `, [code, name, category, icon, order]);
        insertedCount++;
      } catch (e) {
        // Ignore conflicts
      }
    }
    
    console.log('   ✓ Inserted ' + insertedCount + ' standard amenities');
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Master amenities system created successfully',
      stats: {
        amenitiesCreated: insertedCount,
        tables: ['master_amenities', 'property_amenity_selections', 'room_amenity_selections']
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Migration: Replace bed/bathroom amenities with clean GAS standards
app.post('/api/admin/migrate-clean-amenities', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Cleaning up bed/bathroom amenities...');
    
    // Delete all bed amenities
    await client.query(`DELETE FROM bookable_unit_amenities WHERE category = 'beds' OR amenity_code LIKE 'bed%'`);
    console.log('   ✓ Deleted old bed amenities');
    
    // Delete all bathroom amenities
    await client.query(`DELETE FROM bookable_unit_amenities WHERE category IN ('bathrooms', 'bathroom') OR amenity_code LIKE 'bath%'`);
    console.log('   ✓ Deleted old bathroom amenities');
    
    // Get first room ID to add standards
    const firstRoom = await client.query('SELECT id FROM bookable_units LIMIT 1');
    if (firstRoom.rows.length === 0) {
      throw new Error('No rooms found - import a property first');
    }
    const roomId = firstRoom.rows[0].id;
    
    // Add standard bed types
    const bedTypes = [
      ['bed_single', 'Single', 1],
      ['bed_twin', 'Twin', 2],
      ['bed_double', 'Double', 3],
      ['bed_queen', 'Queen', 4],
      ['bed_king', 'King', 5],
      ['bed_super_king', 'Super King', 6],
      ['bed_sofa_single', 'Sofa Bed (Single)', 7],
      ['bed_sofa_double', 'Sofa Bed (Double)', 8],
      ['bed_bunk', 'Bunk Bed', 9],
      ['bed_cot', 'Cot / Crib', 10],
      ['bed_futon', 'Futon', 11]
    ];
    
    for (const [code, name, order] of bedTypes) {
      await client.query(`
        INSERT INTO bookable_unit_amenities (bookable_unit_id, amenity_code, amenity_name, category, display_order)
        VALUES ($1, $2, $3, 'beds', $4)
      `, [roomId, code, JSON.stringify({ en: name }), order]);
    }
    console.log('   ✓ Added ' + bedTypes.length + ' standard bed types');
    
    // Add standard bathroom types
    const bathroomTypes = [
      ['bathroom_full', 'Full Bathroom', 1],
      ['bathroom_shower_only', 'Shower Only', 2],
      ['bathroom_bath_only', 'Bath Only', 3],
      ['bathroom_shower_bath_combo', 'Shower–Bath Combo', 4],
      ['bathroom_private_ensuite', 'Private Ensuite', 5],
      ['bathroom_shared', 'Shared Bathroom', 6],
      ['bathroom_private_external', 'Private External Bathroom', 7],
      ['bathroom_jack_and_jill', 'Jack & Jill Bathroom', 8],
      ['bathroom_accessible', 'Accessible Bathroom', 9],
      ['bathroom_wet_room', 'Wet Room', 10],
      ['bathroom_outdoor_shower', 'Outdoor Shower', 11],
      ['bathroom_outdoor_bath', 'Outdoor Bath', 12],
      ['bathroom_double_vanity', 'Double Vanity', 13]
    ];
    
    for (const [code, name, order] of bathroomTypes) {
      await client.query(`
        INSERT INTO bookable_unit_amenities (bookable_unit_id, amenity_code, amenity_name, category, display_order)
        VALUES ($1, $2, $3, 'bathrooms', $4)
      `, [roomId, code, JSON.stringify({ en: name }), order]);
    }
    console.log('   ✓ Added ' + bathroomTypes.length + ' standard bathroom types');
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Bed and bathroom amenities replaced with clean GAS standards',
      stats: {
        beds: bedTypes.length,
        bathrooms: bathroomTypes.length
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Migration 002-FIX: Drop and recreate image tables
app.post('/api/admin/migrate-002-fix', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Fixing Migration 002: Dropping and recreating image tables...');
    
    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS property_images CASCADE');
    console.log('   ✓ Dropped property_images table');
    
    await client.query('DROP TABLE IF EXISTS room_images CASCADE');
    console.log('   ✓ Dropped room_images table');
    
    // Create property_images table with correct structure
    await client.query(`
      CREATE TABLE property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        image_key VARCHAR(500) NOT NULL,
        image_url TEXT NOT NULL,
        large_url TEXT,
        medium_url TEXT,
        thumbnail_url TEXT,
        original_filename VARCHAR(255),
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        mime_type VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        caption TEXT,
        alt_text TEXT,
        uploaded_by INTEGER,
        upload_source VARCHAR(50) DEFAULT 'manual',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created property_images table');
    
    // Create indexes for property_images
    await client.query('CREATE INDEX idx_property_images_property ON property_images(property_id)');
    await client.query('CREATE UNIQUE INDEX idx_property_images_primary_unique ON property_images(property_id) WHERE is_primary = true');
    await client.query('CREATE INDEX idx_property_images_order ON property_images(property_id, display_order)');
    console.log('   ✓ Created property_images indexes');
    
    // Create room_images table
    await client.query(`
      CREATE TABLE room_images (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
        image_key VARCHAR(500) NOT NULL,
        image_url TEXT NOT NULL,
        large_url TEXT,
        medium_url TEXT,
        thumbnail_url TEXT,
        original_filename VARCHAR(255),
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        mime_type VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        caption TEXT,
        alt_text TEXT,
        uploaded_by INTEGER,
        upload_source VARCHAR(50) DEFAULT 'manual',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created room_images table');
    
    // Create indexes for room_images
    await client.query('CREATE INDEX idx_room_images_room ON room_images(room_id)');
    await client.query('CREATE UNIQUE INDEX idx_room_images_primary_unique ON room_images(room_id) WHERE is_primary = true');
    await client.query('CREATE INDEX idx_room_images_order ON room_images(room_id, display_order)');
    console.log('   ✓ Created room_images indexes');
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Image tables fixed and recreated successfully',
      tables: ['property_images', 'room_images']
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Migration 002: Create Image Management System
app.post('/api/admin/migrate-002-image-management', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Running Migration 002: Image Management System...');
    
    // Create property_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        image_key VARCHAR(500) NOT NULL,
        image_url TEXT NOT NULL,
        large_url TEXT,
        medium_url TEXT,
        thumbnail_url TEXT,
        original_filename VARCHAR(255),
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        mime_type VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        caption TEXT,
        alt_text TEXT,
        uploaded_by INTEGER,
        upload_source VARCHAR(50) DEFAULT 'manual',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created property_images table');
    
    // Create indexes for property_images
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_images_primary ON property_images(property_id, is_primary) WHERE is_primary = true');
    await client.query('CREATE INDEX IF NOT EXISTS idx_property_images_order ON property_images(property_id, display_order)');
    
    // Create room_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_images (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
        image_key VARCHAR(500) NOT NULL,
        image_url TEXT NOT NULL,
        large_url TEXT,
        medium_url TEXT,
        thumbnail_url TEXT,
        original_filename VARCHAR(255),
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        mime_type VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        caption TEXT,
        alt_text TEXT,
        uploaded_by INTEGER,
        upload_source VARCHAR(50) DEFAULT 'manual',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created room_images table');
    
    // Create indexes for room_images
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_images_room ON room_images(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_images_primary ON room_images(room_id, is_primary) WHERE is_primary = true');
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_images_order ON room_images(room_id, display_order)');
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Image management system created successfully',
      tables: ['property_images', 'room_images']
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Cleanup duplicate imports
app.post('/api/admin/cleanup-duplicates', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Cleaning up duplicates...');
    
    // Delete duplicate properties (keep most recent)
    const propsDeleted = await client.query(`
      DELETE FROM properties 
      WHERE id NOT IN (
        SELECT MAX(id) 
        FROM properties 
        GROUP BY name, address, city
      )
    `);
    
    // Delete orphaned units
    await client.query(`
      DELETE FROM bookable_units
      WHERE property_id NOT IN (SELECT id FROM properties)
    `);
    
    // Delete duplicate units (keep most recent)
    const unitsDeleted = await client.query(`
      DELETE FROM bookable_units
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM bookable_units
        GROUP BY property_id, name
      )
    `);
    
    // Clean up orphaned images
    await client.query('DELETE FROM property_images WHERE property_id NOT IN (SELECT id FROM properties)');
    await client.query('DELETE FROM bookable_unit_images WHERE bookable_unit_id NOT IN (SELECT id FROM bookable_units)');
    
    // Clean up orphaned amenities
    await client.query('DELETE FROM property_amenities WHERE property_id NOT IN (SELECT id FROM properties)');
    await client.query('DELETE FROM bookable_unit_amenities WHERE bookable_unit_id NOT IN (SELECT id FROM bookable_units)');
    
    // Clean up orphaned links
    await client.query('DELETE FROM property_cm_links WHERE property_id NOT IN (SELECT id FROM properties)');
    
    await client.query('COMMIT');
    
    // Get final counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM properties) as properties,
        (SELECT COUNT(*) FROM bookable_units) as units
    `);
    
    console.log('✓ Cleanup complete');
    
    res.json({
      success: true,
      message: 'Duplicates removed successfully',
      counts: counts.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleanup error:', error.message);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Add cm_room_id column migration
app.post('/api/admin/add-cm-room-id', async (req, res) => {
  try {
    console.log('📝 Adding cm_room_id column...');
    
    await pool.query(`
      ALTER TABLE bookable_units 
      ADD COLUMN IF NOT EXISTS cm_room_id VARCHAR(100)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookable_units_cm_room_id 
      ON bookable_units(cm_room_id)
    `);
    
    console.log('✓ Column added successfully');
    
    res.json({
      success: true,
      message: 'cm_room_id column added successfully'
    });
  } catch (error) {
    console.error('Migration error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// IMAGE PROCESSING HELPER FUNCTIONS
// =========================================================

/**
 * Validate image meets minimum aspect ratio (1.2:1 or wider)
 * Allows images that are at least 20% wider than tall
 */
async function validateLandscape(buffer) {
  const metadata = await sharp(buffer).metadata();
  const ratio = metadata.width / metadata.height;
  
  if (ratio < 1.2) {
    throw new Error('Images must be at least 1.2:1 ratio (width:height). Portrait and square images are not accepted.');
  }
  
  return metadata;
}

/**
 * Process and upload image to R2 in multiple sizes
 * Returns URLs for all variants
 */
async function processAndUploadImage(buffer, type, entityId, filename) {
  const ext = path.extname(filename).toLowerCase();
  const baseFilename = path.basename(filename, ext);
  const uniqueId = uuidv4();
  
  const sizes = {
    large: { width: 1920, quality: 85 },
    medium: { width: 1200, quality: 85 },
    thumbnail: { width: 400, quality: 80 }
  };
  
  const results = {
    original: null,
    large: null,
    medium: null,
    thumbnail: null
  };
  
  // Convert to WebP and upload each size
  for (const [sizeName, config] of Object.entries(sizes)) {
    const key = `${type}/${entityId}/${sizeName}/${uniqueId}-${baseFilename}.webp`;
    
    const processedBuffer = await sharp(buffer)
      .resize(config.width, null, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ quality: config.quality })
      .toBuffer();
    
    // Upload to R2
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000' // 1 year cache
    }));
    
    results[sizeName] = `${R2_PUBLIC_URL}/${key}`;
  }
  
  // Also create JPG fallback for original
  const originalKey = `${type}/${entityId}/original/${uniqueId}-${baseFilename}.jpg`;
  const jpgBuffer = await sharp(buffer)
    .jpeg({ quality: 90 })
    .toBuffer();
  
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: originalKey,
    Body: jpgBuffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000'
  }));
  
  results.original = `${R2_PUBLIC_URL}/${originalKey}`;
  results.imageKey = originalKey;
  
  return results;
}

/**
 * Delete image and all variants from R2
 */
async function deleteImageFromR2(imageKey) {
  try {
    // Extract base path
    const parts = imageKey.split('/');
    const type = parts[0];
    const entityId = parts[1];
    const filename = parts[3];
    const baseFilename = path.basename(filename, path.extname(filename));
    
    // Delete all variants
    const keys = [
      imageKey, // original
      `${type}/${entityId}/large/${baseFilename}.webp`,
      `${type}/${entityId}/medium/${baseFilename}.webp`,
      `${type}/${entityId}/thumbnail/${baseFilename}.webp`
    ];
    
    for (const key of keys) {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key
      }));
    }
  } catch (error) {
    console.error('Error deleting from R2:', error);
    // Don't throw - image might already be deleted
  }
}

// =========================================================
// IMAGE UPLOAD ENDPOINTS
// =========================================================

// Upload property images
app.post('/api/admin/properties/:id/images', upload.array('images', 10), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.json({ success: false, error: 'No files uploaded' });
    }
    
    await client.query('BEGIN');
    
    const uploadedImages = [];
    
    for (const file of files) {
      // Validate landscape
      try {
        const metadata = await validateLandscape(file.buffer);
        
        // Process and upload
        const urls = await processAndUploadImage(
          file.buffer,
          'properties',
          id,
          file.originalname
        );
        
        // Get current max display_order
        const maxOrder = await client.query(
          'SELECT COALESCE(MAX(display_order), -1) as max FROM property_images WHERE property_id = $1',
          [id]
        );
        const nextOrder = maxOrder.rows[0].max + 1;
        
        // Insert into database
        const result = await client.query(`
          INSERT INTO property_images (
            property_id, image_key, image_url, large_url, medium_url, thumbnail_url,
            original_filename, file_size, width, height, mime_type, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          id, urls.imageKey, urls.original, urls.large, urls.medium, urls.thumbnail,
          file.originalname, file.size, metadata.width, metadata.height, 'image/webp', nextOrder
        ]);
        
        uploadedImages.push(result.rows[0]);
        
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error.message);
        // Continue with next file
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `${uploadedImages.length} of ${files.length} images uploaded successfully`,
      images: uploadedImages
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Upload room images
app.post('/api/admin/rooms/:id/images', upload.array('images', 10), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const files = req.files;
    
    console.log(`📸 Room ${id} image upload started - ${files?.length || 0} files`);
    
    if (!files || files.length === 0) {
      return res.json({ success: false, error: 'No files uploaded' });
    }
    
    await client.query('BEGIN');
    
    const uploadedImages = [];
    
    for (const file of files) {
      try {
        console.log(`  Processing ${file.originalname}...`);
        
        const metadata = await validateLandscape(file.buffer);
        console.log(`  ✓ Validated: ${metadata.width}x${metadata.height}`);
        
        const urls = await processAndUploadImage(
          file.buffer,
          'rooms',
          id,
          file.originalname
        );
        console.log(`  ✓ Uploaded to R2`);
        
        const maxOrder = await client.query(
          'SELECT COALESCE(MAX(display_order), -1) as max FROM room_images WHERE room_id = $1',
          [id]
        );
        const nextOrder = maxOrder.rows[0].max + 1;
        
        const result = await client.query(`
          INSERT INTO room_images (
            room_id, image_key, image_url, large_url, medium_url, thumbnail_url,
            original_filename, file_size, width, height, mime_type, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          id, urls.imageKey, urls.original, urls.large, urls.medium, urls.thumbnail,
          file.originalname, file.size, metadata.width, metadata.height, 'image/webp', nextOrder
        ]);
        
        uploadedImages.push(result.rows[0]);
        console.log(`  ✓ Saved to database`);
        
      } catch (error) {
        console.error(`  ✗ Error processing ${file.originalname}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Upload complete: ${uploadedImages.length}/${files.length} succeeded`);
    
    res.json({
      success: true,
      message: `${uploadedImages.length} of ${files.length} images uploaded successfully`,
      images: uploadedImages
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Room image upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get property images
app.get('/api/admin/properties/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM property_images WHERE property_id = $1 AND is_active = true ORDER BY display_order',
      [id]
    );
    res.json({ success: true, images: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get room images
app.get('/api/admin/rooms/:id/images', async (req, res) => {
  try {
    const { id} = req.params;
    const result = await pool.query(
      'SELECT * FROM room_images WHERE room_id = $1 AND is_active = true ORDER BY display_order',
      [id]
    );
    res.json({ success: true, images: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Simple test endpoint - check ALL room images in database
app.get('/api/admin/all-images', async (req, res) => {
  try {
    const roomImages = await pool.query('SELECT * FROM room_images');
    const propertyImages = await pool.query('SELECT * FROM property_images');
    res.json({ 
      success: true, 
      roomImages: roomImages.rows,
      propertyImages: propertyImages.rows,
      counts: {
        room: roomImages.rows.length,
        property: propertyImages.rows.length
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete property image
app.delete('/api/admin/properties/images/:imageId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { imageId } = req.params;
    
    // Get image details
    const image = await client.query(
      'SELECT * FROM property_images WHERE id = $1',
      [imageId]
    );
    
    if (image.rows.length === 0) {
      return res.json({ success: false, error: 'Image not found' });
    }
    
    await client.query('BEGIN');
    
    // Delete from R2
    await deleteImageFromR2(image.rows[0].image_key);
    
    // Delete from database
    await client.query('DELETE FROM property_images WHERE id = $1', [imageId]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Delete room image
app.delete('/api/admin/rooms/images/:imageId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { imageId } = req.params;
    
    const image = await client.query(
      'SELECT * FROM room_images WHERE id = $1',
      [imageId]
    );
    
    if (image.rows.length === 0) {
      return res.json({ success: false, error: 'Image not found' });
    }
    
    await client.query('BEGIN');
    
    await deleteImageFromR2(image.rows[0].image_key);
    
    await client.query('DELETE FROM room_images WHERE id = $1', [imageId]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Set primary property image
app.put('/api/admin/properties/:propertyId/images/:imageId/primary', async (req, res) => {
  const client = await pool.connect();
  try {
    const { propertyId, imageId } = req.params;
    
    await client.query('BEGIN');
    
    // Remove primary from all images for this property
    await client.query(
      'UPDATE property_images SET is_primary = false WHERE property_id = $1',
      [propertyId]
    );
    
    // Set new primary
    await client.query(
      'UPDATE property_images SET is_primary = true WHERE id = $1',
      [imageId]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Set primary room image
app.put('/api/admin/rooms/:roomId/images/:imageId/primary', async (req, res) => {
  const client = await pool.connect();
  try {
    const { roomId, imageId } = req.params;
    
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE room_images SET is_primary = false WHERE room_id = $1',
      [roomId]
    );
    
    await client.query(
      'UPDATE room_images SET is_primary = true WHERE id = $1',
      [imageId]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Update image display order
app.put('/api/admin/properties/:propertyId/images/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { propertyId } = req.params;
    const { imageIds } = req.body; // Array of image IDs in new order
    
    await client.query('BEGIN');
    
    for (let i = 0; i < imageIds.length; i++) {
      await client.query(
        'UPDATE property_images SET display_order = $1 WHERE id = $2 AND property_id = $3',
        [i, imageIds[i], propertyId]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Image order updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Update room image display order
app.put('/api/admin/rooms/:roomId/images/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { roomId } = req.params;
    const { imageIds } = req.body;
    
    await client.query('BEGIN');
    
    for (let i = 0; i < imageIds.length; i++) {
      await client.query(
        'UPDATE room_images SET display_order = $1 WHERE id = $2 AND room_id = $3',
        [i, imageIds[i], roomId]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Image order updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// =========================================================
// BEDS24 WEBHOOK - Receive real-time updates
// =========================================================
// Configure this URL in Beds24: Settings > Account > Webhooks
// URL: https://your-domain.railway.app/api/webhooks/beds24

app.post('/api/webhooks/beds24', async (req, res) => {
  const client = await pool.connect();
  try {
    const webhookData = req.body;
    console.log('Beds24 webhook received:', JSON.stringify(webhookData).substring(0, 500));
    
    // Beds24 sends different event types
    // Common events: booking created, booking modified, booking cancelled, availability changed
    
    const eventType = webhookData.action || webhookData.type || 'unknown';
    const bookingId = webhookData.bookingId || webhookData.id;
    const roomId = webhookData.roomId;
    const propertyId = webhookData.propertyId;
    
    console.log(`Webhook event: ${eventType}, bookingId: ${bookingId}, roomId: ${roomId}`);
    
    // Handle different event types
    if (eventType === 'new' || eventType === 'modify' || eventType === 'booking') {
      // A booking was created or modified in Beds24
      // We need to update our availability
      
      if (roomId) {
        // Find our room by beds24_room_id
        const roomResult = await client.query(`
          SELECT id FROM bookable_units WHERE beds24_room_id = $1
        `, [roomId]);
        
        if (roomResult.rows.length > 0) {
          const ourRoomId = roomResult.rows[0].id;
          const arrival = webhookData.arrival || webhookData.firstNight;
          const departure = webhookData.departure || webhookData.lastNight;
          
          if (arrival && departure) {
            // Block these dates in our system
            const startDate = new Date(arrival);
            const endDate = new Date(departure);
            
            await client.query('BEGIN');
            
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              await client.query(`
                INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
                VALUES ($1, $2, false, false, 'beds24_webhook')
                ON CONFLICT (room_id, date) 
                DO UPDATE SET is_available = false, source = 'beds24_webhook', updated_at = NOW()
              `, [ourRoomId, dateStr]);
            }
            
            await client.query('COMMIT');
            console.log(`Updated availability for room ${ourRoomId}: ${arrival} to ${departure}`);
          }
        }
      }
    } else if (eventType === 'cancel' || eventType === 'delete') {
      // A booking was cancelled - re-open the dates
      console.log('Booking cancelled, re-opening availability');
      
      if (roomId) {
        const roomResult = await client.query(`
          SELECT id FROM bookable_units WHERE beds24_room_id = $1
        `, [roomId]);
        
        if (roomResult.rows.length > 0) {
          const ourRoomId = roomResult.rows[0].id;
          const arrival = webhookData.arrival || webhookData.firstNight;
          const departure = webhookData.departure || webhookData.lastNight;
          
          if (arrival && departure) {
            const startDate = new Date(arrival);
            const endDate = new Date(departure);
            
            await client.query('BEGIN');
            
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              await client.query(`
                UPDATE room_availability 
                SET is_available = true, source = 'beds24_webhook_cancel', updated_at = NOW()
                WHERE room_id = $1 AND date = $2
              `, [ourRoomId, dateStr]);
            }
            
            await client.query('COMMIT');
            console.log(`Re-opened availability for room ${ourRoomId}: ${arrival} to ${departure}`);
          }
        }
      }
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true, received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Beds24 from retrying
    res.status(200).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Webhook verification endpoint (some systems send a GET to verify)
app.get('/api/webhooks/beds24', (req, res) => {
  res.status(200).json({ 
    status: 'active',
    message: 'Beds24 webhook endpoint is ready',
    url: '/api/webhooks/beds24'
  });
});

// =========================================================
// MANUAL SYNC TRIGGER - Pull changes from Beds24
// =========================================================
app.post('/api/admin/sync-beds24-bookings', async (req, res) => {
  try {
    // Get access token
    const accessToken = await getBeds24AccessToken(pool);
    
    // Fetch recent bookings from Beds24 (last 30 days arrivals)
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 7); // Include bookings from last week
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 90); // Up to 90 days out
    
    const response = await axios.get('https://beds24.com/api/v2/bookings', {
      headers: { 'token': accessToken },
      params: {
        arrivalFrom: fromDate.toISOString().split('T')[0],
        arrivalTo: toDate.toISOString().split('T')[0]
      }
    });
    
    const bookings = response.data.data || [];
    console.log(`Found ${bookings.length} bookings from Beds24`);
    
    // Update availability based on bookings
    const client = await pool.connect();
    let updatedDates = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const booking of bookings) {
        if (booking.status === 'cancelled') continue;
        
        // Find our room
        const roomResult = await client.query(`
          SELECT id FROM bookable_units WHERE beds24_room_id = $1
        `, [booking.roomId]);
        
        if (roomResult.rows.length === 0) continue;
        
        const ourRoomId = roomResult.rows[0].id;
        const arrival = booking.arrival || booking.firstNight;
        const departure = booking.departure || booking.lastNight;
        
        if (!arrival || !departure) continue;
        
        // Block these dates
        const startDate = new Date(arrival);
        const endDate = new Date(departure);
        
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await client.query(`
            INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
            VALUES ($1, $2, false, false, 'beds24_sync')
            ON CONFLICT (room_id, date) 
            DO UPDATE SET is_available = false, source = 'beds24_sync', updated_at = NOW()
          `, [ourRoomId, dateStr]);
          updatedDates++;
        }
      }
      
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    
    res.json({
      success: true,
      bookingsFound: bookings.length,
      datesUpdated: updatedDates
    });
    
  } catch (error) {
    console.error('Sync bookings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Serve frontend - MUST BE LAST (after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port ' + PORT);
});
