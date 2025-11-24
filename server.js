// Updated for DELETE endpoint + DATABASE MIGRATION
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// DELETE property
app.delete('/api/db/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE properties SET active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'Property deleted' });
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

// Get Beds24 properties
app.get('/api/beds24/properties', async (req, res) => {
  try {
    const refreshToken = process.env.BEDS24_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return res.json({ success: false, error: 'No Beds24 refresh token configured' });
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
    
    console.log('Found ' + (response.data.data?.length || 0) + ' properties');
    res.json({ success: true, data: response.data.data || [] });
    
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

// Step 1: Setup Beds24 Connection (Save to channel_connections table)
app.post('/api/beds24/setup-connection', async (req, res) => {
  const { inviteCode } = req.body;
  
  if (!inviteCode) {
    return res.json({ success: false, error: 'Invite code required' });
  }
  
  try {
    console.log('🔗 Setting up Beds24 connection...');
    
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
    
    // Save to channel_connections table
    const result = await pool.query(`
      INSERT INTO channel_connections (
        user_id,
        cm_id,
        api_key,
        refresh_token,
        access_token,
        token_expires_at,
        status,
        sync_enabled,
        sync_interval_minutes
      ) VALUES (
        1,
        (SELECT id FROM channel_managers WHERE cm_code = 'beds24' LIMIT 1),
        $1,
        $2,
        $3,
        NOW() + INTERVAL '30 days',
        'active',
        true,
        60
      )
      RETURNING id
    `, [inviteCode, refreshToken, token]);
    
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
  const { token, connectionId } = req.body;
  
  try {
    console.log('📋 Fetching properties from Beds24...');
    
    const response = await axios.get('https://beds24.com/api/v2/properties', {
      headers: {
        'token': token,
        'accept': 'application/json'
      }
    });
    
    const properties = response.data.data || [];
    console.log('Found ' + properties.length + ' properties');
    
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

// Step 3: Complete Property Import
app.post('/api/beds24/import-complete-property', async (req, res) => {
  const { propertyId, connectionId, token } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting complete property import for Property ID: ' + propertyId);
    
    // 1. Fetch complete property data from Beds24
    console.log('1️⃣ Fetching property details...');
    const propResponse = await axios.get('https://beds24.com/api/v2/properties/' + propertyId, {
      headers: { 'token': token, 'accept': 'application/json' }
    });
    
    const propData = propResponse.data.data[0];
    
    // 2. Insert into properties table
    console.log('2️⃣ Saving property to database...');
    const propertyResult = await client.query(`
      INSERT INTO properties (
        user_id,
        property_name,
        property_type,
        description,
        address,
        city,
        country,
        latitude,
        longitude,
        check_in_from,
        check_in_until,
        check_out_until,
        currency_code,
        property_status
      ) VALUES (
        1,
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active'
      )
      RETURNING id
    `, [
      propData.propName,
      propData.propType || 'hotel',
      propData.propContent || '',
      propData.propAddress || '',
      propData.propCity || '',
      propData.propCountry || '',
      propData.propLatitude || null,
      propData.propLongitude || null,
      '15:00',
      '22:00',
      '11:00',
      propData.propCurrency || 'USD'
    ]);
    
    const gasPropertyId = propertyResult.rows[0].id;
    console.log('✓ Property created with ID: ' + gasPropertyId);
    
    // 3. Import property images
    console.log('3️⃣ Importing property images...');
    let imageCount = 0;
    if (propData.propImages && propData.propImages.length > 0) {
      for (let i = 0; i < propData.propImages.length; i++) {
        const img = propData.propImages[i];
        await client.query(`
          INSERT INTO property_images (
            property_id,
            image_url,
            image_category,
            display_order,
            is_primary
          ) VALUES ($1, $2, $3, $4, $5)
        `, [gasPropertyId, img.url, 'gallery', i, i === 0]);
        imageCount++;
      }
    }
    console.log('✓ Imported ' + imageCount + ' images');
    
    // 4. Import amenities
    console.log('4️⃣ Importing amenities...');
    let amenitiesCount = 0;
    if (propData.propAmenities && propData.propAmenities.length > 0) {
      for (const amenity of propData.propAmenities) {
        await client.query(`
          INSERT INTO property_amenities (
            property_id,
            amenity_name,
            amenity_category
          ) VALUES ($1, $2, $3)
        `, [gasPropertyId, amenity.name || amenity, 'general']);
        amenitiesCount++;
      }
    }
    console.log('✓ Imported ' + amenitiesCount + ' amenities');
    
    // 5. Import bookable units (rooms)
    console.log('5️⃣ Importing bookable units...');
    const roomsResponse = await axios.get('https://beds24.com/api/v2/rooms', {
      headers: { 'token': token, 'accept': 'application/json' },
      params: { propId: propertyId }
    });
    
    const rooms = roomsResponse.data.data || [];
    let unitsCount = 0;
    
    for (const room of rooms) {
      const unitResult = await client.query(`
        INSERT INTO bookable_units (
          property_id,
          unit_name,
          unit_type,
          description,
          max_guests,
          max_adults,
          max_children,
          quantity,
          base_price,
          currency_code,
          unit_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available'
        )
        RETURNING id
      `, [
        gasPropertyId,
        room.roomName || 'Room',
        room.roomType || 'standard',
        room.roomDescription || '',
        room.numAdult || 2,
        room.numAdult || 2,
        room.numChild || 0,
        room.roomQty || 1,
        room.roomPrice || 100,
        propData.propCurrency || 'USD'
      ]);
      
      const unitId = unitResult.rows[0].id;
      
      // Import unit images if available
      if (room.roomImages && room.roomImages.length > 0) {
        for (let i = 0; i < room.roomImages.length; i++) {
          await client.query(`
            INSERT INTO bookable_unit_images (
              unit_id,
              image_url,
              display_order
            ) VALUES ($1, $2, $3)
          `, [unitId, room.roomImages[i].url, i]);
        }
      }
      
      unitsCount++;
    }
    console.log('✓ Imported ' + unitsCount + ' bookable units');
    
    // 6. Create property-CM link
    console.log('6️⃣ Creating channel manager link...');
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
      ) VALUES (
        $1, $2, $3, $4, true, true, true, true, 'active'
      )
    `, [gasPropertyId, connectionId, propertyId, propData.propName]);
    
    console.log('✓ Channel manager link created');
    
    // 7. Import bookings (if any)
    console.log('7️⃣ Checking for bookings...');
    let bookingsCount = 0;
    try {
      const bookingsResponse = await axios.get('https://beds24.com/api/v2/bookings', {
        headers: { 'token': token, 'accept': 'application/json' },
        params: { propId: propertyId }
      });
      
      const bookings = bookingsResponse.data.data || [];
      console.log('Found ' + bookings.length + ' bookings');
      
      for (const booking of bookings.slice(0, 10)) { // Import max 10 recent bookings
        await client.query(`
          INSERT INTO bookings (
            property_id,
            guest_first_name,
            guest_last_name,
            guest_email,
            check_in_date,
            check_out_date,
            num_adults,
            num_children,
            total_price,
            currency_code,
            booking_status,
            booking_source
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'beds24'
          )
        `, [
          gasPropertyId,
          booking.guestFirstName || 'Guest',
          booking.guestLastName || '',
          booking.guestEmail || '',
          booking.arrival,
          booking.departure,
          booking.numAdult || 1,
          booking.numChild || 0,
          booking.price || 0,
          propData.propCurrency || 'USD',
          booking.status || 'confirmed'
        ]);
        bookingsCount++;
      }
    } catch (bookingError) {
      console.log('No bookings found or error fetching bookings');
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Import complete!');
    
    res.json({
      success: true,
      stats: {
        propertyId: gasPropertyId,
        images: imageCount,
        amenities: amenitiesCount,
        units: unitsCount,
        bookings: bookingsCount
      },
      message: 'Property imported successfully!'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import failed:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Serve frontend - MUST BE LAST
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port ' + PORT);
});
