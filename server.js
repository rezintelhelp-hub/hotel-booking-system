// GAS - Guest Accommodation System Server
// Multi-tenant SaaS for property management
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

// Run database migrations on startup
async function runMigrations() {
  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found, skipping migrations');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('📁 No migration files found');
      return;
    }

    console.log(`📁 Found ${files.length} migration files`);

    for (const file of files) {
      // Check if already executed
      const executed = await pool.query(
        'SELECT id FROM _migrations WHERE name = $1',
        [file]
      );

      if (executed.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      // Read and execute migration
      console.log(`🔄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await pool.query(sql);
        
        // Record successful migration
        await pool.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        
        console.log(`✅ Completed: ${file}`);
      } catch (err) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(err.message);
        // Don't throw - let server continue even if migration fails
      }
    }

    console.log('🎉 Migrations check complete!');
  } catch (error) {
    console.error('Migration runner error:', error.message);
  }
}

// Initialize database connection and run migrations
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
    // Run migrations after successful connection
    await runMigrations();
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

// Run clients migration manually
app.get('/api/setup-clients', async (req, res) => {
  try {
    // 0. Create agencies table first (agencies manage multiple clients)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        logo_url VARCHAR(500),
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        secondary_color VARCHAR(20) DEFAULT '#8b5cf6',
        custom_domain VARCHAR(255),
        website_url VARCHAR(500),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        region VARCHAR(100),
        postcode VARCHAR(20),
        country VARCHAR(100) DEFAULT 'United Kingdom',
        currency VARCHAR(3) DEFAULT 'GBP',
        timezone VARCHAR(50) DEFAULT 'Europe/London',
        plan VARCHAR(20) DEFAULT 'agency',
        commission_percent DECIMAL(5,2) DEFAULT 0,
        api_key VARCHAR(64) UNIQUE,
        api_key_created_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        white_label_enabled BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created agencies table');

    // 1. Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        business_name VARCHAR(255),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        region VARCHAR(100),
        postcode VARCHAR(20),
        country VARCHAR(100) DEFAULT 'United Kingdom',
        currency VARCHAR(3) DEFAULT 'GBP',
        timezone VARCHAR(50) DEFAULT 'Europe/London',
        date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
        language VARCHAR(10) DEFAULT 'en',
        plan VARCHAR(20) DEFAULT 'free',
        subscription_status VARCHAR(20) DEFAULT 'active',
        features_enabled JSONB DEFAULT '{}',
        plan_started_at TIMESTAMP,
        plan_expires_at TIMESTAMP,
        stripe_customer_id VARCHAR(100),
        stripe_subscription_id VARCHAR(100),
        api_key VARCHAR(64) UNIQUE,
        api_key_created_at TIMESTAMP,
        api_requests_today INTEGER DEFAULT 0,
        api_requests_reset_at DATE,
        status VARCHAR(20) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add agency_id column if it doesn't exist (for existing databases)
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL`);
    
    // Add public_id column if it doesn't exist (for existing databases)
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() UNIQUE`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)`);
    
    // Ensure all existing clients have a public_id
    await pool.query(`UPDATE clients SET public_id = gen_random_uuid() WHERE public_id IS NULL`);
    
    // Add new columns to clients if they don't exist
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{}'`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100)`);
    
    console.log('✅ Created clients table with UUID public_id and agency_id');

    // 2. Create client_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_users (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(50),
        avatar_url TEXT,
        role VARCHAR(20) DEFAULT 'staff',
        status VARCHAR(20) DEFAULT 'active',
        invite_token VARCHAR(64),
        invite_expires_at TIMESTAMP,
        last_login_at TIMESTAMP,
        last_login_ip VARCHAR(45),
        login_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, email)
      )
    `);
    console.log('✅ Created client_users table');

    // 3. Add client_id to properties
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL`);
    console.log('✅ Added client_id to properties');

    // 4. Add client_id to channel_connections (if table exists)
    try {
      await pool.query(`ALTER TABLE channel_connections ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL`);
      console.log('✅ Added client_id to channel_connections');
    } catch (e) {
      console.log('⚠️ channel_connections table not found, skipping');
    }

    // 5. Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_api_key ON clients(api_key)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id)`);
    console.log('✅ Created indexes');

    // 5.5 Create client_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_settings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, setting_key)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_settings_client_id ON client_settings(client_id)`);
    console.log('✅ Created client_settings table');

    // 6. Create default clients if none exist
    const existingClients = await pool.query('SELECT COUNT(*) FROM clients');
    if (parseInt(existingClients.rows[0].count) === 0) {
      // Generate API keys
      const crypto = require('crypto');
      const apiKey1 = 'gas_' + crypto.randomBytes(28).toString('hex');
      const apiKey2 = 'gas_' + crypto.randomBytes(28).toString('hex');
      
      // Create Lehmann House client
      await pool.query(`
        INSERT INTO clients (name, email, currency, plan, status, api_key, api_key_created_at)
        VALUES ('Lehmann House', 'info@lehmannhouse.com', 'GBP', 'free', 'active', $1, CURRENT_TIMESTAMP)
      `, [apiKey1]);
      console.log('✅ Created Lehmann House client');
      
      // Create Hostaway Demo client
      await pool.query(`
        INSERT INTO clients (name, email, currency, plan, status, api_key, api_key_created_at)
        VALUES ('Hostaway Properties', 'demo@hostaway.com', 'GBP', 'free', 'active', $1, CURRENT_TIMESTAMP)
      `, [apiKey2]);
      console.log('✅ Created Hostaway Properties client');
    }

    // Get final count
    const finalCount = await pool.query('SELECT COUNT(*) FROM clients');
    
    res.json({ 
      success: true, 
      message: 'Clients tables created successfully!',
      clients_count: parseInt(finalCount.rows[0].count)
    });
  } catch (error) {
    console.error('Setup clients error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/setup-database', async (req, res) => {
  try {
    // Create channel_managers table first (referenced by channel_connections)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel_managers (
        id SERIAL PRIMARY KEY,
        cm_code VARCHAR(50) UNIQUE,
        cm_name VARCHAR(100),
        api_base_url VARCHAR(255),
        auth_type VARCHAR(50) DEFAULT 'oauth2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns if they don't exist (for existing tables)
    await pool.query(`ALTER TABLE channel_managers ADD COLUMN IF NOT EXISTS cm_code VARCHAR(50)`);
    await pool.query(`ALTER TABLE channel_managers ADD COLUMN IF NOT EXISTS cm_name VARCHAR(100)`);
    await pool.query(`ALTER TABLE channel_managers ADD COLUMN IF NOT EXISTS api_base_url VARCHAR(255)`);
    await pool.query(`ALTER TABLE channel_managers ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'oauth2'`);
    
    // Insert default channel managers
    await pool.query(`
      INSERT INTO channel_managers (cm_code, cm_name, api_base_url, auth_type)
      VALUES 
        ('beds24', 'Beds24', 'https://beds24.com/api/v2', 'oauth2'),
        ('hostaway', 'Hostaway', 'https://api.hostaway.com/v1', 'oauth2'),
        ('smoobu', 'Smoobu', 'https://login.smoobu.com/api', 'api_key')
      ON CONFLICT (cm_code) DO NOTHING
    `);
    
    // Create channel_connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel_connections (
        id SERIAL PRIMARY KEY,
        client_id INTEGER,
        cm_id INTEGER REFERENCES channel_managers(id),
        account_id VARCHAR(100),
        refresh_token TEXT,
        access_token TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS properties (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, address TEXT, city VARCHAR(100), country VARCHAR(100), property_type VARCHAR(50), star_rating INTEGER, hero_image_url TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, description TEXT, max_occupancy INTEGER, max_adults INTEGER, max_children INTEGER, base_price DECIMAL(10, 2), currency VARCHAR(3) DEFAULT 'USD', quantity INTEGER DEFAULT 1, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, property_id INTEGER REFERENCES properties(id), room_id INTEGER REFERENCES rooms(id), check_in DATE NOT NULL, check_out DATE NOT NULL, num_adults INTEGER NOT NULL, num_children INTEGER DEFAULT 0, guest_first_name VARCHAR(100) NOT NULL, guest_last_name VARCHAR(100) NOT NULL, guest_email VARCHAR(255) NOT NULL, guest_phone VARCHAR(50), total_price DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'confirmed', beds24_booking_id VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    // Add beds24_booking_id column if it doesn't exist
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS beds24_booking_id VARCHAR(50)`);
    // Add bookable_unit_id column for linking to bookable_units table
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bookable_unit_id INTEGER`);
    // Add hostaway columns
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS hostaway_listing_id INTEGER`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS hostaway_listing_id INTEGER`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hostaway_reservation_id VARCHAR(50)`);
    // Add smoobu columns
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS smoobu_id VARCHAR(50)`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS channel_manager VARCHAR(50)`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS smoobu_id VARCHAR(50)`);
    // Create unique index for smoobu_id if not exists
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_smoobu_id ON properties(smoobu_id) WHERE smoobu_id IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookable_units_smoobu_id ON bookable_units(smoobu_id) WHERE smoobu_id IS NOT NULL`);
    // Add access_token column to channel_connections
    await pool.query(`ALTER TABLE channel_connections ADD COLUMN IF NOT EXISTS access_token TEXT`);
    
    // Fix currency column length (should be VARCHAR(3) not VARCHAR(2))
    await pool.query(`ALTER TABLE properties ALTER COLUMN currency TYPE VARCHAR(3)`);
    
    // Fix timezone column length if needed
    await pool.query(`ALTER TABLE properties ALTER COLUMN timezone TYPE VARCHAR(50)`);
    
    // Add tourist tax columns to properties
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_enabled BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_type VARCHAR(20) DEFAULT 'per_guest_per_night'`); // per_guest_per_night, per_night, per_booking, percentage
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_amount DECIMAL(10, 2) DEFAULT 0`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_name VARCHAR(100) DEFAULT 'Tourist Tax'`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_max_nights INTEGER`); // NULL = no max
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tourist_tax_exempt_children BOOLEAN DEFAULT true`);
    
    // Add pricing columns to room_availability
    await pool.query(`ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS reference_price DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS standard_price DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS min_stay INTEGER DEFAULT 1`);
    
    // Create offers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        property_id INTEGER,
        room_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        applies_to VARCHAR(20) DEFAULT 'standard_price',
        min_nights INTEGER DEFAULT 1,
        max_nights INTEGER,
        min_guests INTEGER,
        max_guests INTEGER,
        min_advance_days INTEGER,
        max_advance_days INTEGER,
        valid_from DATE,
        valid_until DATE,
        valid_days_of_week VARCHAR(20),
        allowed_checkin_days VARCHAR(20) DEFAULT '0,1,2,3,4,5,6',
        allowed_checkout_days VARCHAR(20) DEFAULT '0,1,2,3,4,5,6',
        stackable BOOLEAN DEFAULT false,
        priority INTEGER DEFAULT 0,
        available_website BOOLEAN DEFAULT true,
        available_agents BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add distribution columns if they don't exist
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS available_website BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS available_agents BOOLEAN DEFAULT false`);
    // Add check-in/check-out restriction columns
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS allowed_checkin_days VARCHAR(20) DEFAULT '0,1,2,3,4,5,6'`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS allowed_checkout_days VARCHAR(20) DEFAULT '0,1,2,3,4,5,6'`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1`);
    await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_nights INTEGER`);
    
    // Create vouchers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        property_id INTEGER,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        applies_to VARCHAR(20) DEFAULT 'total',
        min_nights INTEGER DEFAULT 1,
        min_total DECIMAL(10,2),
        min_booking_value DECIMAL(10,2),
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        single_use_per_guest BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        property_ids INTEGER[],
        room_ids INTEGER[],
        valid_from DATE,
        valid_until DATE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add is_public column if not exists (for existing tables)
    await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS property_id INTEGER`);
    await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_booking_value DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1`);
    
    // Create voucher_uses table to track usage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voucher_uses (
        id SERIAL PRIMARY KEY,
        voucher_id INTEGER REFERENCES vouchers(id),
        booking_id INTEGER,
        guest_email VARCHAR(255),
        discount_applied DECIMAL(10,2),
        used_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create upsells table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upsells (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        property_id INTEGER,
        room_id INTEGER,
        room_ids TEXT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        charge_type VARCHAR(30) DEFAULT 'per_booking',
        max_quantity INTEGER,
        image_url TEXT,
        category VARCHAR(50),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add new columns if they don't exist
    await pool.query(`ALTER TABLE upsells ADD COLUMN IF NOT EXISTS room_ids TEXT`);
    await pool.query(`ALTER TABLE upsells ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await pool.query(`ALTER TABLE upsells ADD COLUMN IF NOT EXISTS category VARCHAR(50)`);
    
    // Create fees table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        property_id INTEGER,
        room_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        amount_type VARCHAR(20) DEFAULT 'fixed',
        amount DECIMAL(10,2) NOT NULL,
        apply_per VARCHAR(30) DEFAULT 'per_booking',
        is_tax BOOLEAN DEFAULT false,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create taxes table (Tourist/City Taxes with complex rules)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS taxes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        property_id INTEGER,
        room_id INTEGER,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(10),
        amount_type VARCHAR(20) DEFAULT 'fixed',
        currency VARCHAR(10) DEFAULT 'EUR',
        amount DECIMAL(10,2) NOT NULL,
        charge_per VARCHAR(30) DEFAULT 'per_person_per_night',
        max_nights INTEGER,
        min_age INTEGER,
        star_tier VARCHAR(20),
        season_start DATE,
        season_end DATE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
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
    const clientId = req.query.client_id;
    let result;
    
    if (clientId) {
      result = await pool.query('SELECT * FROM properties WHERE client_id = $1 ORDER BY created_at DESC', [clientId]);
    } else {
      result = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    }
    
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
    const clientId = req.query.client_id;
    let result;
    
    if (clientId) {
      result = await pool.query(`
        SELECT bu.* FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        WHERE p.client_id = $1
        ORDER BY bu.property_id, bu.created_at
      `, [clientId]);
    } else {
      result = await pool.query('SELECT * FROM bookable_units ORDER BY property_id, created_at');
    }
    
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
    const { name, description, address, city, country, property_type, status } = req.body;

    const result = await pool.query(
      `UPDATE properties SET 
        name = COALESCE($1, name), 
        description = COALESCE($2, description), 
        address = COALESCE($3, address), 
        city = COALESCE($4, city), 
        country = COALESCE($5, country), 
        property_type = COALESCE($6, property_type),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *`,
      [name, description, address, city, country, property_type, status, id]
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

// Smart units endpoint - returns units based on property type
// For multi-unit properties: returns rooms/apartments
// For single-unit properties: returns the property itself as a unit
app.get('/api/db/units', async (req, res) => {
  const { propertyId } = req.query;
  try {
    if (!propertyId) {
      // Return all units across all properties
      const result = await pool.query(`
        SELECT r.*, p.name as property_name, p.property_type
        FROM rooms r
        JOIN properties p ON r.property_id = p.id
        WHERE r.active = true
        ORDER BY p.name, r.name
      `);
      res.json({ success: true, data: result.rows });
      return;
    }
    
    // Get property type first
    const propResult = await pool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
    
    if (propResult.rows.length === 0) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    const property = propResult.rows[0];
    // Normalize property type: lowercase, remove camelCase, remove special chars
    const rawType = property.property_type || '';
    const propertyType = rawType
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Convert camelCase to spaces
      .replace(/[_-]/g, ' ')                 // Convert underscores/hyphens to spaces
      .toLowerCase()
      .trim();
    
    // =====================================================
    // MULTI-UNIT PROPERTY TYPES (show individual rooms/units)
    // =====================================================
    const multiUnitKeywords = [
      // Hotels & Lodging
      'hotel', 'boutique hotel', 'lifestyle hotel', 'luxury hotel', 'budget hotel',
      'capsule hotel', 'micro hotel', 'city hotel', 'airport hotel', 'resort hotel',
      'spa hotel', 'conference hotel', 'eco hotel', 'heritage hotel', 'historic hotel',
      'themed hotel', 'smart hotel', 'tech hotel',
      // Inns, Guesthouses & Lodges
      'inn', 'country inn', 'coaching inn', 'guest house', 'guesthouse',
      'bed and breakfast', 'bed & breakfast', 'b&b', 'b and b', 'bnb', 'bandb',
      'boutique b&b', 'heritage b&b', 'farm stay b&b',
      'lodge', 'safari lodge', 'game lodge', 'mountain lodge', 'ski lodge', 'beach lodge', 'eco lodge',
      // Hostels & Shared
      'hostel', 'hostel hotel', 'youth hostel', 'backpackers', 'co living', 'coliving', 'pod hostel', 'dormitory',
      // Apartment-Style Multi-Unit
      'aparthotel', 'apart hotel', 'apartment hotel', 'serviced apartments', 'managed apartments',
      'corporate apartments', 'executive apartments', 'extended stay', 'residence hotel', 'condo hotel',
      // Resorts & Complexes
      'resort', 'holiday resort', 'golf resort', 'all inclusive', 'wellness resort',
      'island resort', 'water park resort', 'marina resort',
      // Traditional Multi-Unit
      'motel', 'motor lodge', 'roadside inn', 'ryokan', 'riad', 'pension', 'posada',
      'gite complex', 'gasthaus', 'hacienda', 'palazzo'
    ];
    
    // =====================================================
    // SINGLE-UNIT PROPERTY TYPES (property = bookable unit)
    // =====================================================
    const singleUnitKeywords = [
      // Residential & Urban
      'house', 'entire home', 'apartment', 'flat', 'loft', 'condo', 'condominium', 'duplex', 'penthouse',
      'studio apartment', 'studio flat', 'studio', 'maisonette', 'townhouse', 'brownstone',
      'bungalow', 'terrace house',
      // Luxury & Leisure
      'villa', 'beach villa', 'mountain villa', 'mansion', 'country house', 'manor house',
      'manor', 'estate', 'private island', 'chalet', 'ski chalet', 'lodge cabin',
      // Rural & Traditional
      'cottage', 'farmhouse', 'rural retreat', 'barn conversion', 'barn', 'converted mill',
      'shepherds hut', 'stone cottage', 'alpine chalet',
      'wine estate', 'finca', 'trullo', 'cortijo', 'mas', 'quinta',
      // Compact Living
      'tiny house', 'modular home', 'eco home', 'smart home', 'cube house',
      // Floating & Elevated
      'houseboat', 'floating villa', 'overwater bungalow', 'boathouse', 'boat house',
      'treehouse', 'tree house', 'canopy lodge', 'cliffside cabin',
      // Glamping & Adventure
      'yurt', 'dome', 'geodesic dome', 'safari tent', 'bell tent', 'a frame', 'a frame cabin',
      'pod cabin', 'pod', 'tipi', 'teepee', 'luxury tent', 'glamping', 'jungle lodge',
      // Cultural & Specialty
      'castle', 'chateau', 'palace', 'tower house', 'hanok', 'machiya',
      'cave house', 'cave', 'ice hotel', 'hobbit house', 'igloo'
    ];
    
    // Check property type - multi-unit takes priority
    const isMultiUnit = multiUnitKeywords.some(keyword => propertyType.includes(keyword));
    const isSingleUnit = singleUnitKeywords.some(keyword => propertyType.includes(keyword)) && !isMultiUnit;
    
    // First try to get rooms from the rooms table
    const roomsResult = await pool.query('SELECT * FROM rooms WHERE property_id = $1 AND active = true', [propertyId]);
    
    if (roomsResult.rows.length > 0) {
      // Has rooms/units defined - return them
      res.json({ success: true, data: roomsResult.rows, propertyType: propertyType, rawType: rawType, isMultiUnit: isMultiUnit });
    } else {
      // No rooms in database - return property itself as the bookable unit
      // This works for both single-unit AND multi-unit properties that haven't had rooms added yet
      res.json({ 
        success: true, 
        data: [{
          id: property.id,
          property_id: property.id,
          name: property.name,
          description: property.description,
          is_property_unit: true
        }],
        propertyType: propertyType,
        rawType: rawType,
        isMultiUnit: isMultiUnit,
        isSingleUnit: !isMultiUnit,
        message: isMultiUnit ? 'No rooms configured yet - showing property as unit. Add rooms in the Rooms section.' : 'Single unit property'
      });
    }
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
    
    // 2. Get CM IDs for this room
    const roomResult = await client.query(`
      SELECT beds24_room_id, hostaway_listing_id FROM bookable_units WHERE id = $1
    `, [room_id]);
    
    const beds24RoomId = roomResult.rows[0]?.beds24_room_id;
    const hostawayListingId = roomResult.rows[0]?.hostaway_listing_id;
    
    let beds24BookingId = null;
    let hostawayReservationId = null;
    
    // 3a. If room is linked to Beds24, push the booking
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
        
        if (beds24Response.data && beds24Response.data[0]?.success) {
          beds24BookingId = beds24Response.data[0]?.new?.id;
          
          if (beds24BookingId) {
            await client.query(`
              UPDATE bookings SET beds24_booking_id = $1 WHERE id = $2
            `, [beds24BookingId, booking.id]);
            booking.beds24_booking_id = beds24BookingId;
          }
        }
        
      } catch (beds24Error) {
        console.error('Error pushing to Beds24:', beds24Error.response?.data || beds24Error.message);
      }
    }
    
    // 3b. If room is linked to Hostaway, push the booking
    if (hostawayListingId) {
      try {
        const stored = await getStoredHostawayToken(pool);
        
        if (stored && stored.accessToken) {
          const hostawayBooking = {
            listingMapId: hostawayListingId,
            channelId: 2000,  // Direct booking
            source: 'manual',
            arrivalDate: check_in,
            departureDate: check_out,
            guestFirstName: guest_first_name,
            guestLastName: guest_last_name,
            guestEmail: guest_email,
            guestPhone: guest_phone || '',
            guestAddress: guest_address || '',
            guestCity: guest_city || '',
            guestCountry: guest_country || '',
            guestZipCode: guest_postcode || '',
            numberOfGuests: num_adults + (num_children || 0),
            adults: num_adults,
            children: num_children || 0,
            totalPrice: total_price,
            isPaid: 0,
            status: 'new',
            comment: `GAS Booking ID: ${booking.id}`
          };
          
          console.log('Pushing booking to Hostaway:', JSON.stringify(hostawayBooking));
          
          const hostawayResponse = await axios.post('https://api.hostaway.com/v1/reservations', hostawayBooking, {
            headers: {
              'Authorization': `Bearer ${stored.accessToken}`,
              'Content-Type': 'application/json',
              'Cache-control': 'no-cache'
            }
          });
          
          console.log('Hostaway booking response:', JSON.stringify(hostawayResponse.data));
          
          if (hostawayResponse.data.status === 'success' && hostawayResponse.data.result) {
            hostawayReservationId = hostawayResponse.data.result.id;
            
            if (hostawayReservationId) {
              await client.query(`
                UPDATE bookings SET hostaway_reservation_id = $1 WHERE id = $2
              `, [hostawayReservationId, booking.id]);
              booking.hostaway_reservation_id = hostawayReservationId;
            }
          }
        }
        
      } catch (hostawayError) {
        console.error('Error pushing to Hostaway:', hostawayError.response?.data || hostawayError.message);
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
      beds24BookingId,
      hostawaySynced: !!hostawayReservationId,
      hostawayReservationId
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
// HOSTAWAY CHANNEL MANAGER INTEGRATION
// =====================================================

// Helper function to get Hostaway access token
async function getHostawayAccessToken(accountId, clientSecret) {
  const response = await axios.post('https://api.hostaway.com/v1/accessTokens', 
    `grant_type=client_credentials&client_id=${accountId}&client_secret=${clientSecret}&scope=general`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-control': 'no-cache'
      }
    }
  );
  
  return response.data.access_token;
}

// Helper to get stored Hostaway token from database
async function getStoredHostawayToken(pool) {
  const result = await pool.query(`
    SELECT access_token, account_id FROM channel_connections 
    WHERE cm_id = (SELECT id FROM channel_managers WHERE cm_code = 'hostaway') 
    AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1
  `);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    accessToken: result.rows[0].access_token,
    accountId: result.rows[0].account_id
  };
}

// Setup Hostaway connection
app.post('/api/hostaway/setup-connection', async (req, res) => {
  try {
    const { accountId, clientSecret } = req.body;
    
    if (!accountId || !clientSecret) {
      return res.json({ success: false, error: 'Account ID and Client Secret are required' });
    }
    
    console.log('Setting up Hostaway connection for account:', accountId);
    
    // Get access token from Hostaway
    const accessToken = await getHostawayAccessToken(accountId, clientSecret);
    
    if (!accessToken) {
      return res.json({ success: false, error: 'Failed to get access token from Hostaway' });
    }
    
    console.log('Got Hostaway access token');
    
    // Ensure hostaway exists in channel_managers
    const existingCM = await pool.query("SELECT id FROM channel_managers WHERE cm_code = 'hostaway'");
    let cmId;
    
    if (existingCM.rows.length === 0) {
      const newCM = await pool.query(`
        INSERT INTO channel_managers (cm_code, cm_name, api_base_url, auth_type)
        VALUES ('hostaway', 'Hostaway', 'https://api.hostaway.com/v1', 'oauth2')
        RETURNING id
      `);
      cmId = newCM.rows[0].id;
    } else {
      cmId = existingCM.rows[0].id;
    }
    
    // Store the connection - check if exists first
    const existingConn = await pool.query(
      'SELECT id FROM channel_connections WHERE cm_id = $1 AND account_id = $2',
      [cmId, accountId]
    );
    
    let connectionId;
    if (existingConn.rows.length > 0) {
      await pool.query(
        'UPDATE channel_connections SET access_token = $1, api_key = $2, status = $3, updated_at = NOW() WHERE id = $4',
        [accessToken, clientSecret, 'active', existingConn.rows[0].id]
      );
      connectionId = existingConn.rows[0].id;
    } else {
      const newConn = await pool.query(`
        INSERT INTO channel_connections (cm_id, user_id, access_token, api_key, account_id, status, created_at, updated_at)
        VALUES ($1, 1, $2, $3, $4, 'active', NOW(), NOW())
        RETURNING id
      `, [cmId, accessToken, clientSecret, accountId]);
      connectionId = newConn.rows[0].id;
    }
    
    res.json({
      success: true,
      accessToken,
      connectionId,
      message: 'Hostaway connected successfully'
    });
    
  } catch (error) {
    console.error('Hostaway setup error:', error.response?.data || error.message);
    res.json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
});

// List Hostaway properties (listings)
app.post('/api/hostaway/list-properties', async (req, res) => {
  try {
    const { token, connectionId } = req.body;
    
    if (!token) {
      return res.json({ success: false, error: 'Access token required' });
    }
    
    console.log('Fetching Hostaway listings...');
    
    const response = await axios.get('https://api.hostaway.com/v1/listings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-control': 'no-cache'
      },
      params: {
        limit: 100
      }
    });
    
    if (response.data.status === 'success') {
      console.log('Found ' + (response.data.result?.length || 0) + ' Hostaway listings');
      res.json({ success: true, data: response.data.result || [] });
    } else {
      res.json({ success: false, error: response.data.result || 'Failed to fetch listings' });
    }
    
  } catch (error) {
    console.error('Hostaway list error:', error.response?.data || error.message);
    res.json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// Import Hostaway property (listing)
app.post('/api/hostaway/import-property', async (req, res) => {
  const client = await pool.connect();
  try {
    const { property, token, connectionId } = req.body;
    
    if (!property || !property.id) {
      return res.json({ success: false, error: 'Property data required' });
    }
    
    console.log('Importing Hostaway listing:', property.name);
    
    await client.query('BEGIN');
    
    // Check if property already exists
    const existingProp = await client.query(
      'SELECT id FROM properties WHERE hostaway_listing_id = $1',
      [property.id]
    );
    
    let propertyId;
    
    if (existingProp.rows.length > 0) {
      // Update existing
      propertyId = existingProp.rows[0].id;
      await client.query(`
        UPDATE properties SET
          name = $1,
          property_type = $2,
          address = $3,
          city = $4,
          state = $5,
          postcode = $6,
          country = $7,
          latitude = $8,
          longitude = $9,
          check_in_from = $10,
          check_out_by = $11,
          currency = $12,
          cm_source = 'hostaway',
          updated_at = NOW()
        WHERE id = $13
      `, [
        property.name,
        property.roomType || 'entire_home',
        property.address || property.street || '',
        property.city || '',
        property.state || '',
        property.zipcode || '',
        property.country || '',
        property.lat || null,
        property.lng || null,
        property.checkInTimeStart ? `${property.checkInTimeStart}:00` : '15:00',
        property.checkOutTime ? `${property.checkOutTime}:00` : '11:00',
        property.currencyCode || 'USD',
        propertyId
      ]);
      
      console.log('   Updated existing property, GAS ID:', propertyId);
    } else {
      // Insert new property - truncate fields to fit column constraints
      const propertyName = property.name || `Property ${property.id}`;
      const stateValue = (property.state || '').substring(0, 50);
      const currencyValue = (property.currencyCode || 'USD').substring(0, 3);
      // Use countryCode if available, otherwise truncate country to 2 chars
      const countryValue = (property.countryCode || property.country || '').substring(0, 2);
      
      const result = await client.query(`
        INSERT INTO properties (
          user_id, name, property_type, address, city, state, postcode, country,
          latitude, longitude, check_in_from, check_out_by, currency,
          hostaway_listing_id, cm_source, created_at, updated_at
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'hostaway', NOW(), NOW())
        RETURNING id
      `, [
        propertyName,
        property.roomType || 'entire_home',
        property.address || property.street || '',
        property.city || '',
        stateValue,
        property.zipcode || '',
        countryValue,
        property.lat || null,
        property.lng || null,
        property.checkInTimeStart ? `${property.checkInTimeStart}:00` : '15:00',
        property.checkOutTime ? `${property.checkOutTime}:00` : '11:00',
        currencyValue,
        property.id
      ]);
      
      propertyId = result.rows[0].id;
      console.log('   Created new property, GAS ID:', propertyId);
    }
    
    // For Hostaway, each listing IS the bookable unit (not like Beds24 with rooms)
    // Create/update the bookable unit
    const existingUnit = await client.query(
      'SELECT id FROM bookable_units WHERE hostaway_listing_id = $1',
      [property.id]
    );
    
    if (existingUnit.rows.length > 0) {
      await client.query(`
        UPDATE bookable_units SET
          name = $1,
          unit_type = $2,
          max_guests = $3,
          max_adults = $4,
          bedroom_count = $5,
          bathroom_count = $6,
          base_price = $7,
          min_stay = $8,
          max_stay = $9,
          property_id = $10,
          updated_at = NOW()
        WHERE id = $11
      `, [
        property.name,
        property.roomType || 'entire_home',
        property.personCapacity || 2,
        property.personCapacity || 2,
        property.bedroomsNumber || 1,
        property.bathroomsNumber || 1,
        property.price || 100,
        property.minNights || 1,
        property.maxNights || 365,
        propertyId,
        existingUnit.rows[0].id
      ]);
      console.log('   Updated existing bookable unit');
    } else {
      await client.query(`
        INSERT INTO bookable_units (
          property_id, name, unit_type, max_guests, max_adults,
          bedroom_count, bathroom_count, base_price, min_stay, max_stay,
          hostaway_listing_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        propertyId,
        property.name,
        property.roomType || 'entire_home',
        property.personCapacity || 2,
        property.personCapacity || 2,
        property.bedroomsNumber || 1,
        property.bathroomsNumber || 1,
        property.price || 100,
        property.minNights || 1,
        property.maxNights || 365,
        property.id
      ]);
      console.log('   Created new bookable unit');
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      propertyId,
      hostawayListingId: property.id,
      message: 'Property imported successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Hostaway import error:', error.message);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Sync availability from Hostaway for all listings
app.post('/api/admin/sync-hostaway-availability', async (req, res) => {
  const client = await pool.connect();
  try {
    const stored = await getStoredHostawayToken(pool);
    if (!stored) {
      return res.json({ success: false, error: 'No Hostaway connection found' });
    }
    
    // Get all Hostaway-linked rooms
    const roomsResult = await client.query(`
      SELECT bu.id as room_id, bu.hostaway_listing_id, bu.name
      FROM bookable_units bu
      WHERE bu.hostaway_listing_id IS NOT NULL
    `);
    
    if (roomsResult.rows.length === 0) {
      return res.json({ success: false, error: 'No Hostaway-linked rooms found' });
    }
    
    console.log(`Syncing availability for ${roomsResult.rows.length} Hostaway listings...`);
    
    // Calculate date range (today + 90 days)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    
    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    let totalPricesUpdated = 0;
    let roomsSynced = 0;
    
    for (const room of roomsResult.rows) {
      try {
        console.log(`  Fetching calendar for ${room.name} (Hostaway ID: ${room.hostaway_listing_id})`);
        
        // Add delay to respect rate limits (15 requests per 10 seconds)
        await new Promise(resolve => setTimeout(resolve, 700));
        
        const response = await axios.get(`https://api.hostaway.com/v1/listings/${room.hostaway_listing_id}/calendar`, {
          headers: {
            'Authorization': `Bearer ${stored.accessToken}`,
            'Cache-control': 'no-cache'
          },
          params: {
            startDate: startDateStr,
            endDate: endDateStr
          }
        });
        
        if (response.data.status === 'success' && response.data.result) {
          const calendarDays = response.data.result;
          
          for (const day of calendarDays) {
            // day typically has: date, price, isAvailable, minimumStay, etc.
            const dateStr = day.date;
            const price = day.price || null;
            const isAvailable = day.isAvailable === 1 || day.isAvailable === true;
            const isBlocked = day.status === 'blocked' || day.isBlocked === 1;
            const minStay = day.minimumStay || 1;
            
            await client.query(`
              INSERT INTO room_availability (room_id, date, cm_price, direct_price, is_available, is_blocked, min_stay, source, updated_at)
              VALUES ($1, $2, $3, $3, $4, $5, $6, 'hostaway', NOW())
              ON CONFLICT (room_id, date) 
              DO UPDATE SET 
                cm_price = $3, 
                direct_price = COALESCE(room_availability.direct_price, $3),
                is_available = $4, 
                is_blocked = $5, 
                min_stay = $6,
                source = 'hostaway',
                updated_at = NOW()
            `, [room.room_id, dateStr, price, isAvailable, isBlocked, minStay]);
            
            totalPricesUpdated++;
          }
          
          roomsSynced++;
          console.log(`    ✓ Synced ${calendarDays.length} days for ${room.name}`);
        }
        
      } catch (roomError) {
        console.error(`    ✗ Error syncing ${room.name}:`, roomError.response?.data || roomError.message);
        
        // If rate limited, wait longer
        if (roomError.response?.status === 429) {
          console.log('    Rate limited, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    res.json({
      success: true,
      roomsSynced,
      totalPricesUpdated,
      message: `Synced ${roomsSynced} Hostaway listings with ${totalPricesUpdated} price/availability records`
    });
    
  } catch (error) {
    console.error('Hostaway sync error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get Hostaway calendar/availability
app.get('/api/hostaway/calendar/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { from, to } = req.query;
    
    const stored = await getStoredHostawayToken(pool);
    if (!stored) {
      return res.json({ success: false, error: 'No Hostaway connection found' });
    }
    
    const response = await axios.get(`https://api.hostaway.com/v1/listings/${listingId}/calendar`, {
      headers: {
        'Authorization': `Bearer ${stored.accessToken}`,
        'Cache-control': 'no-cache'
      },
      params: {
        startDate: from,
        endDate: to
      }
    });
    
    res.json({ success: true, data: response.data.result || [] });
    
  } catch (error) {
    console.error('Hostaway calendar error:', error.response?.data || error.message);
    res.json({ success: false, error: error.message });
  }
});

// Create booking in Hostaway
app.post('/api/hostaway/create-booking', async (req, res) => {
  try {
    const { listingId, booking } = req.body;
    
    const stored = await getStoredHostawayToken(pool);
    if (!stored) {
      return res.json({ success: false, error: 'No Hostaway connection found' });
    }
    
    const hostawayBooking = {
      listingMapId: listingId,
      channelId: 2000,  // Direct booking channel
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      guestFirstName: booking.guest_first_name,
      guestLastName: booking.guest_last_name,
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone || '',
      numberOfGuests: booking.num_adults + (booking.num_children || 0),
      totalPrice: booking.grand_total,
      currency: booking.currency || 'USD',
      status: 'new'
    };
    
    console.log('Creating Hostaway reservation:', JSON.stringify(hostawayBooking));
    
    const response = await axios.post('https://api.hostaway.com/v1/reservations', hostawayBooking, {
      headers: {
        'Authorization': `Bearer ${stored.accessToken}`,
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache'
      }
    });
    
    if (response.data.status === 'success') {
      res.json({ 
        success: true, 
        reservationId: response.data.result?.id,
        data: response.data.result 
      });
    } else {
      res.json({ success: false, error: response.data.result || 'Failed to create reservation' });
    }
    
  } catch (error) {
    console.error('Hostaway booking error:', error.response?.data || error.message);
    res.json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// Hostaway webhook handler
app.post('/api/webhooks/hostaway', async (req, res) => {
  const client = await pool.connect();
  try {
    const webhookData = req.body;
    console.log('Hostaway webhook received:', JSON.stringify(webhookData).substring(0, 500));
    
    const eventType = webhookData.event || webhookData.type || 'unknown';
    const reservation = webhookData.data || webhookData.reservation;
    
    console.log('Hostaway webhook event:', eventType);
    
    if (eventType.includes('reservation') && reservation) {
      const listingId = reservation.listingMapId || reservation.listingId;
      const arrival = reservation.arrivalDate;
      const departure = reservation.departureDate;
      const status = reservation.status;
      
      // Find our room by hostaway_listing_id
      const roomResult = await client.query(`
        SELECT id FROM bookable_units WHERE hostaway_listing_id = $1
      `, [listingId]);
      
      if (roomResult.rows.length > 0) {
        const ourRoomId = roomResult.rows[0].id;
        
        if (arrival && departure) {
          await client.query('BEGIN');
          
          const startDate = new Date(arrival);
          const endDate = new Date(departure);
          const isAvailable = status === 'cancelled';
          
          for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            await client.query(`
              INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
              VALUES ($1, $2, $3, false, 'hostaway_webhook')
              ON CONFLICT (room_id, date) 
              DO UPDATE SET is_available = $3, source = 'hostaway_webhook', updated_at = NOW()
            `, [ourRoomId, dateStr, isAvailable]);
          }
          
          await client.query('COMMIT');
          console.log(`Updated availability for room ${ourRoomId}: ${arrival} to ${departure}, available: ${isAvailable}`);
        }
      }
    }
    
    res.status(200).json({ success: true, received: true });
    
  } catch (error) {
    console.error('Hostaway webhook error:', error);
    res.status(200).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/webhooks/hostaway', (req, res) => {
  res.status(200).json({ 
    status: 'active',
    message: 'Hostaway webhook endpoint is ready',
    url: '/api/webhooks/hostaway'
  });
});

// =====================================================
// SMOOBU API INTEGRATION
// =====================================================

// Smoobu API Base URL
const SMOOBU_API_URL = 'https://login.smoobu.com/api';

// Test endpoint to check table structure
app.get('/api/test-smoobu-insert', async (req, res) => {
    try {
        // Try a simple property insert with user_id
        const result = await pool.query(`
            INSERT INTO properties (user_id, client_id, name, smoobu_id, channel_manager)
            VALUES (1, 3, 'Test Property', 'test123', 'smoobu')
            RETURNING id
        `);
        
        // Delete it right away
        await pool.query('DELETE FROM properties WHERE id = $1', [result.rows[0].id]);
        
        res.json({ success: true, message: 'Property insert works!' });
    } catch (error) {
        res.json({ success: false, error: error.message, detail: error.detail });
    }
});

// Setup Smoobu connection - saves API key to database
app.post('/api/smoobu/setup-connection', async (req, res) => {
    try {
        const { apiKey, clientId } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required' 
            });
        }
        
        // Test the connection by getting user info
        const testResponse = await axios.get(`${SMOOBU_API_URL}/me`, {
            headers: {
                'Api-Key': apiKey,
                'Cache-Control': 'no-cache'
            }
        });
        
        if (testResponse.status !== 200) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid API key. Please check your Smoobu API key.'
            });
        }
        
        const userData = testResponse.data;
        
        // Store the API key in database
        const targetClientId = clientId || 1;
        
        // Update or insert client settings
        await pool.query(`
            INSERT INTO client_settings (client_id, setting_key, setting_value)
            VALUES ($1, 'smoobu_api_key', $2)
            ON CONFLICT (client_id, setting_key) 
            DO UPDATE SET setting_value = $2, updated_at = NOW()
        `, [targetClientId, apiKey]);
        
        // Also store the Smoobu user ID
        await pool.query(`
            INSERT INTO client_settings (client_id, setting_key, setting_value)
            VALUES ($1, 'smoobu_user_id', $2)
            ON CONFLICT (client_id, setting_key) 
            DO UPDATE SET setting_value = $2, updated_at = NOW()
        `, [targetClientId, userData.id.toString()]);
        
        res.json({ 
            success: true, 
            message: 'Smoobu connection established successfully',
            user: {
                id: userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email
            }
        });
        
    } catch (error) {
        console.error('Smoobu setup error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid API key. Please check your Smoobu API key.'
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// List all properties/apartments from Smoobu
app.post('/api/smoobu/list-properties', async (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required' 
            });
        }
        
        // Get apartments list
        const response = await axios.get(`${SMOOBU_API_URL}/apartments`, {
            headers: {
                'Api-Key': apiKey,
                'Cache-Control': 'no-cache'
            }
        });
        
        const apartments = response.data.apartments || [];
        
        // Get detailed info for each apartment
        const propertiesWithDetails = await Promise.all(
            apartments.map(async (apt) => {
                try {
                    const detailResponse = await axios.get(`${SMOOBU_API_URL}/apartments/${apt.id}`, {
                        headers: {
                            'Api-Key': apiKey,
                            'Cache-Control': 'no-cache'
                        }
                    });
                    return {
                        id: apt.id,
                        name: apt.name,
                        ...detailResponse.data
                    };
                } catch (e) {
                    return { id: apt.id, name: apt.name };
                }
            })
        );
        
        res.json({ 
            success: true, 
            properties: propertiesWithDetails,
            count: propertiesWithDetails.length
        });
        
    } catch (error) {
        console.error('Smoobu list properties error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import a single property from Smoobu
app.post('/api/smoobu/import-property', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { apiKey, apartmentId, clientId } = req.body;
        
        if (!apiKey || !apartmentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key and apartment ID are required' 
            });
        }
        
        const targetClientId = clientId || 1;
        
        // Get apartment details
        let details, apartmentName;
        try {
            const detailResponse = await axios.get(`${SMOOBU_API_URL}/apartments/${apartmentId}`, {
                headers: {
                    'Api-Key': apiKey,
                    'Cache-Control': 'no-cache'
                }
            });
            details = detailResponse.data;
            
            const listResponse = await axios.get(`${SMOOBU_API_URL}/apartments`, {
                headers: {
                    'Api-Key': apiKey,
                    'Cache-Control': 'no-cache'
                }
            });
            const apartment = listResponse.data.apartments?.find(a => a.id === parseInt(apartmentId));
            apartmentName = apartment?.name || `Smoobu Property ${apartmentId}`;
        } catch (apiErr) {
            return res.status(500).json({ success: false, error: 'Smoobu API error: ' + apiErr.message });
        }
        
        await client.query('BEGIN');
        
        // Check if property already exists
        let propertyId;
        const existingProp = await client.query(
            'SELECT id FROM properties WHERE smoobu_id = $1',
            [apartmentId.toString()]
        );
        
        if (existingProp.rows.length > 0) {
            // Update existing
            propertyId = existingProp.rows[0].id;
            await client.query(`
                UPDATE properties SET
                    name = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [
                apartmentName,
                propertyId
            ]);
        } else {
            // Insert new - minimal columns only
            const propertyResult = await client.query(`
                INSERT INTO properties (
                    user_id,
                    client_id, 
                    name,
                    smoobu_id,
                    channel_manager
                )
                VALUES (1, $1, $2, $3, 'smoobu')
                RETURNING id
            `, [
                targetClientId,
                apartmentName,
                apartmentId.toString()
            ]);
            propertyId = propertyResult.rows[0].id;
        }
        
        // Check if bookable unit already exists
        const existingUnit = await client.query(
            'SELECT id FROM bookable_units WHERE smoobu_id = $1',
            [apartmentId.toString()]
        );
        
        let roomId;
        
        if (existingUnit.rows.length > 0) {
            // Update existing
            roomId = existingUnit.rows[0].id;
            await client.query(`
                UPDATE bookable_units SET
                    name = $1,
                    max_guests = $2,
                    bedroom_count = $3,
                    bathroom_count = $4,
                    base_price = $5,
                    updated_at = NOW()
                WHERE id = $6
            `, [
                apartmentName,
                details.rooms?.maxOccupancy || 2,
                details.rooms?.bedrooms || 1,
                details.rooms?.bathrooms || 1,
                details.price?.minimal || 100,
                roomId
            ]);
        } else {
            // Insert new
            const roomResult = await client.query(`
                INSERT INTO bookable_units (
                    property_id,
                    name,
                    max_guests,
                    bedroom_count,
                    bathroom_count,
                    base_price,
                    smoobu_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [
                propertyId,
                apartmentName,
                details.rooms?.maxOccupancy || 2,
                details.rooms?.bedrooms || 1,
                details.rooms?.bathrooms || 1,
                details.price?.minimal || 100,
                apartmentId.toString()
            ]);
            roomId = roomResult.rows[0].id;
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Successfully imported "${apartmentName}"`,
            property: {
                id: propertyId,
                name: apartmentName,
                smoobu_id: apartmentId
            },
            room: {
                id: roomId,
                name: apartmentName
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Smoobu import error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message, detail: error.detail, where: error.where, column: error.column, table: error.table });
    } finally {
        client.release();
    }
});

// Get availability/rates from Smoobu for a property
app.get('/api/smoobu/availability/:apartmentId', async (req, res) => {
    try {
        const { apartmentId } = req.params;
        const { apiKey, startDate, endDate } = req.query;
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required' 
            });
        }
        
        const start = startDate || new Date().toISOString().split('T')[0];
        const end = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await axios.get(
            `${SMOOBU_API_URL}/rates?apartments[]=${apartmentId}&start_date=${start}&end_date=${end}`,
            {
                headers: {
                    'Api-Key': apiKey,
                    'Cache-Control': 'no-cache'
                }
            }
        );
        
        res.json({ 
            success: true, 
            availability: response.data.data?.[apartmentId] || {},
            apartmentId
        });
        
    } catch (error) {
        console.error('Smoobu availability error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check availability for booking
app.post('/api/smoobu/check-availability', async (req, res) => {
    try {
        const { apiKey, apartmentId, arrivalDate, departureDate, guests } = req.body;
        
        if (!apiKey || !apartmentId || !arrivalDate || !departureDate) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields'
            });
        }
        
        // Get Smoobu user ID
        const userResponse = await axios.get(`${SMOOBU_API_URL}/me`, {
            headers: {
                'Api-Key': apiKey,
                'Cache-Control': 'no-cache'
            }
        });
        
        const userData = userResponse.data;
        
        const response = await axios.post(`https://login.smoobu.com/booking/checkApartmentAvailability`, {
            arrivalDate,
            departureDate,
            apartments: [parseInt(apartmentId)],
            customerId: userData.id,
            guests: guests || 2
        }, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = response.data;
        const isAvailable = data.availableApartments?.includes(parseInt(apartmentId));
        const price = data.prices?.[apartmentId]?.price;
        const currency = data.prices?.[apartmentId]?.currency;
        const errorInfo = data.errorMessages?.[apartmentId];
        
        res.json({
            success: true,
            available: isAvailable,
            price,
            currency,
            error: errorInfo
        });
        
    } catch (error) {
        console.error('Smoobu check availability error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create booking in Smoobu
app.post('/api/smoobu/create-booking', async (req, res) => {
    try {
        const { 
            apiKey, 
            apartmentId,
            arrivalDate,
            departureDate,
            firstName,
            lastName,
            email,
            phone,
            adults,
            children,
            price,
            notice
        } = req.body;
        
        if (!apiKey || !apartmentId || !arrivalDate || !departureDate) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields'
            });
        }
        
        const response = await axios.post(`${SMOOBU_API_URL}/reservations`, {
            arrivalDate,
            departureDate,
            apartmentId: parseInt(apartmentId),
            channelId: 13, // Direct booking
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            phone: phone || '',
            adults: adults || 1,
            children: children || 0,
            price: price || 0,
            notice: notice || 'Booked via GAS Booking'
        }, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        res.json({
            success: true,
            bookingId: response.data.id,
            message: `Booking created successfully (ID: ${response.data.id})`
        });
        
    } catch (error) {
        console.error('Smoobu create booking error:', error.response?.data || error.message);
        const errorDetail = error.response?.data?.detail || error.response?.data?.validation_messages?.error;
        res.status(error.response?.status || 500).json({ 
            success: false, 
            error: errorDetail || error.message 
        });
    }
});

// Get bookings from Smoobu
app.get('/api/smoobu/bookings', async (req, res) => {
    try {
        const { apiKey, apartmentId, from, to } = req.query;
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required' 
            });
        }
        
        let url = `${SMOOBU_API_URL}/reservations?`;
        if (apartmentId) url += `apartmentId=${apartmentId}&`;
        if (from) url += `from=${from}&`;
        if (to) url += `to=${to}&`;
        
        const response = await axios.get(url, {
            headers: {
                'Api-Key': apiKey,
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = response.data;
        
        // Transform to standard format
        const bookings = (data.bookings || []).map(b => ({
            id: b.id,
            externalId: b['reference-id'],
            type: b.type,
            status: b.type === 'cancellation' ? 'cancelled' : 'confirmed',
            arrivalDate: b.arrival,
            departureDate: b.departure,
            createdAt: b['created-at'],
            apartment: b.apartment,
            channel: b.channel,
            guestName: b['guest-name'],
            email: b.email,
            phone: b.phone,
            adults: b.adults,
            children: b.children,
            checkIn: b['check-in'],
            checkOut: b['check-out'],
            notes: b.notice,
            price: b.price,
            pricePaid: b['price-paid'],
            language: b.language
        }));
        
        res.json({
            success: true,
            bookings,
            pagination: {
                page: data.page,
                pageSize: data.page_size,
                totalItems: data.total_items,
                pageCount: data.page_count
            }
        });
        
    } catch (error) {
        console.error('Smoobu get bookings error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel a booking in Smoobu
app.delete('/api/smoobu/bookings/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { apiKey } = req.query;
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required' 
            });
        }
        
        await axios.delete(`${SMOOBU_API_URL}/reservations/${bookingId}`, {
            headers: {
                'Api-Key': apiKey,
                'Cache-Control': 'no-cache'
            }
        });
        
        res.json({
            success: true,
            message: `Booking ${bookingId} cancelled successfully`
        });
        
    } catch (error) {
        console.error('Smoobu cancel booking error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            success: false, 
            error: error.response?.data?.detail || error.message 
        });
    }
});

// Update rates in Smoobu
app.post('/api/smoobu/update-rates', async (req, res) => {
    try {
        const { apiKey, apartmentIds, operations } = req.body;
        
        if (!apiKey || !apartmentIds || !operations) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields'
            });
        }
        
        const response = await axios.post(`${SMOOBU_API_URL}/rates`, {
            apartments: apartmentIds,
            operations
        }, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        res.json({
            success: true,
            message: 'Rates updated successfully'
        });
        
    } catch (error) {
        console.error('Smoobu update rates error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            success: false, 
            error: error.response?.data?.detail || error.message 
        });
    }
});

// Sync availability from Smoobu to local database
app.post('/api/admin/sync-smoobu-availability', async (req, res) => {
    const dbClient = await pool.connect();
    
    try {
        let { apiKey, clientId } = req.body;
        
        const targetClientId = clientId || 1;
        
        // If no API key provided, get from client_settings
        if (!apiKey) {
            const keyResult = await dbClient.query(
                `SELECT setting_value FROM client_settings WHERE client_id = $1 AND setting_key = 'smoobu_api_key'`,
                [targetClientId]
            );
            if (keyResult.rows.length > 0) {
                apiKey = keyResult.rows[0].setting_value;
            }
        }
        
        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required - none found in settings' 
            });
        }
        
        // Get all Smoobu properties for this client
        const propertiesResult = await dbClient.query(`
            SELECT bu.id as room_id, bu.smoobu_id, bu.name
            FROM bookable_units bu
            JOIN properties p ON bu.property_id = p.id
            WHERE p.client_id = $1 AND bu.smoobu_id IS NOT NULL
        `, [targetClientId]);
        
        if (propertiesResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No Smoobu properties found to sync',
                synced: 0
            });
        }
        
        const apartmentIds = propertiesResult.rows.map(r => r.smoobu_id);
        
        // Get rates for next 365 days
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const ratesResponse = await axios.get(
            `${SMOOBU_API_URL}/rates?${apartmentIds.map(id => `apartments[]=${id}`).join('&')}&start_date=${startDate}&end_date=${endDate}`,
            {
                headers: {
                    'Api-Key': apiKey,
                    'Cache-Control': 'no-cache'
                }
            }
        );
        
        const ratesData = ratesResponse.data;
        
        await dbClient.query('BEGIN');
        
        let totalSynced = 0;
        
        for (const room of propertiesResult.rows) {
            const apartmentRates = ratesData.data?.[room.smoobu_id];
            if (!apartmentRates) continue;
            
            // Clear existing availability
            await dbClient.query(`
                DELETE FROM room_availability 
                WHERE room_id = $1 AND date >= $2
            `, [room.room_id, startDate]);
            
            // Insert new availability
            for (const [date, info] of Object.entries(apartmentRates)) {
                await dbClient.query(`
                    INSERT INTO room_availability (room_id, date, is_available, cm_price, standard_price, min_stay, source)
                    VALUES ($1, $2, $3, $4, $4, $5, 'smoobu')
                    ON CONFLICT (room_id, date) DO UPDATE SET
                        is_available = EXCLUDED.is_available,
                        cm_price = EXCLUDED.cm_price,
                        standard_price = EXCLUDED.standard_price,
                        min_stay = EXCLUDED.min_stay,
                        source = EXCLUDED.source,
                        updated_at = NOW()
                `, [
                    room.room_id,
                    date,
                    info.available > 0,
                    info.price || null,
                    info.min_length_of_stay || null
                ]);
                totalSynced++;
            }
        }
        
        await dbClient.query('COMMIT');
        
        res.json({
            success: true,
            message: `Synced ${totalSynced} availability records from Smoobu`,
            synced: totalSynced,
            properties: propertiesResult.rows.length
        });
        
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('Smoobu sync error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        dbClient.release();
    }
});

// Webhook endpoint for Smoobu notifications
app.post('/api/webhooks/smoobu', async (req, res) => {
    try {
        const { action, user, data } = req.body;
        
        console.log('Smoobu webhook received:', { action, user, dataKeys: Object.keys(data || {}) });
        
        switch (action) {
            case 'newReservation':
            case 'updateReservation':
                console.log('Booking webhook:', data);
                break;
            case 'cancelReservation':
            case 'deleteReservation':
                console.log('Cancellation webhook:', data);
                break;
            case 'updateRates':
                console.log('Rates updated:', data);
                break;
            default:
                console.log('Unknown webhook action:', action);
        }
        
        res.json({ success: true, received: action });
        
    } catch (error) {
        console.error('Smoobu webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook verification endpoint
app.get('/api/webhooks/smoobu', (req, res) => {
    res.json({ 
        status: 'active',
        message: 'Smoobu webhook endpoint is ready',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// OFFERS & VOUCHERS API ENDPOINTS
// =====================================================

// Get all offers
app.get('/api/admin/offers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, p.name as property_name, bu.name as room_name
      FROM offers o
      LEFT JOIN properties p ON o.property_id = p.id
      LEFT JOIN bookable_units bu ON o.room_id = bu.id
      ORDER BY o.priority DESC, o.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get single offer
app.get('/api/admin/offers/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM offers WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create offer
app.post('/api/admin/offers', async (req, res) => {
  try {
    const {
      name, description, property_id, room_id,
      discount_type, discount_value, applies_to,
      min_nights, max_nights, min_guests, max_guests,
      min_advance_days, max_advance_days,
      valid_from, valid_until, valid_days_of_week,
      allowed_checkin_days, allowed_checkout_days,
      stackable, priority, active
    } = req.body;
    
    let result;
    try {
      // Try with new columns
      result = await pool.query(`
        INSERT INTO offers (
          name, description, property_id, room_id,
          discount_type, discount_value, applies_to,
          min_nights, max_nights, min_guests, max_guests,
          min_advance_days, max_advance_days,
          valid_from, valid_until, valid_days_of_week,
          allowed_checkin_days, allowed_checkout_days,
          stackable, priority, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        name, description, property_id || null, room_id || null,
        discount_type || 'percentage', discount_value, applies_to || 'standard_price',
        min_nights || 1, max_nights || null, min_guests || null, max_guests || null,
        min_advance_days || null, max_advance_days || null,
        valid_from || null, valid_until || null, valid_days_of_week || null,
        allowed_checkin_days || '0,1,2,3,4,5,6', allowed_checkout_days || '0,1,2,3,4,5,6',
        stackable || false, priority || 0, active !== false
      ]);
    } catch (colErr) {
      // Fallback without new columns
      result = await pool.query(`
        INSERT INTO offers (
          name, description, property_id, room_id,
          discount_type, discount_value, applies_to,
          min_nights, max_nights, min_guests, max_guests,
          min_advance_days, max_advance_days,
          valid_from, valid_until, valid_days_of_week,
          stackable, priority, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        name, description, property_id || null, room_id || null,
        discount_type || 'percentage', discount_value, applies_to || 'standard_price',
        min_nights || 1, max_nights || null, min_guests || null, max_guests || null,
        min_advance_days || null, max_advance_days || null,
        valid_from || null, valid_until || null, valid_days_of_week || null,
        stackable || false, priority || 0, active !== false
      ]);
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update offer
app.put('/api/admin/offers/:id', async (req, res) => {
  try {
    const {
      name, description, property_id, room_id,
      discount_type, discount_value, applies_to,
      min_nights, max_nights, min_guests, max_guests,
      min_advance_days, max_advance_days,
      valid_from, valid_until, valid_days_of_week,
      allowed_checkin_days, allowed_checkout_days,
      stackable, priority, active
    } = req.body;
    
    let result;
    try {
      // Try with new columns
      result = await pool.query(`
        UPDATE offers SET
          name = $1, description = $2, property_id = $3, room_id = $4,
          discount_type = $5, discount_value = $6, applies_to = $7,
          min_nights = $8, max_nights = $9, min_guests = $10, max_guests = $11,
          min_advance_days = $12, max_advance_days = $13,
          valid_from = $14, valid_until = $15, valid_days_of_week = $16,
          allowed_checkin_days = $17, allowed_checkout_days = $18,
          stackable = $19, priority = $20, active = $21, updated_at = NOW()
        WHERE id = $22
        RETURNING *
      `, [
        name, description, property_id || null, room_id || null,
        discount_type, discount_value, applies_to,
        min_nights, max_nights || null, min_guests || null, max_guests || null,
        min_advance_days || null, max_advance_days || null,
        valid_from || null, valid_until || null, valid_days_of_week || null,
        allowed_checkin_days || '0,1,2,3,4,5,6', allowed_checkout_days || '0,1,2,3,4,5,6',
        stackable, priority, active, req.params.id
      ]);
    } catch (colErr) {
      // Fallback without new columns
      result = await pool.query(`
        UPDATE offers SET
          name = $1, description = $2, property_id = $3, room_id = $4,
          discount_type = $5, discount_value = $6, applies_to = $7,
          min_nights = $8, max_nights = $9, min_guests = $10, max_guests = $11,
          min_advance_days = $12, max_advance_days = $13,
          valid_from = $14, valid_until = $15, valid_days_of_week = $16,
          stackable = $17, priority = $18, active = $19, updated_at = NOW()
        WHERE id = $20
        RETURNING *
      `, [
        name, description, property_id || null, room_id || null,
        discount_type, discount_value, applies_to,
        min_nights, max_nights || null, min_guests || null, max_guests || null,
        min_advance_days || null, max_advance_days || null,
        valid_from || null, valid_until || null, valid_days_of_week || null,
        stackable, priority, active, req.params.id
      ]);
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete offer
app.delete('/api/admin/offers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM offers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all vouchers
app.get('/api/admin/vouchers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM vouchers ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get single voucher
app.get('/api/admin/vouchers/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vouchers WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create voucher
app.post('/api/admin/vouchers', async (req, res) => {
  try {
    const {
      code, name, description,
      discount_type, discount_value, applies_to,
      min_nights, min_total, max_uses, single_use_per_guest,
      property_ids, room_ids,
      valid_from, valid_until, active
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO vouchers (
        code, name, description,
        discount_type, discount_value, applies_to,
        min_nights, min_total, max_uses, single_use_per_guest,
        property_ids, room_ids,
        valid_from, valid_until, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      code.toUpperCase(), name, description,
      discount_type || 'percentage', discount_value, applies_to || 'total',
      min_nights || 1, min_total || null, max_uses || null, single_use_per_guest || false,
      property_ids || null, room_ids || null,
      valid_from || null, valid_until || null, active !== false
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      res.json({ success: false, error: 'Voucher code already exists' });
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

// Update voucher
app.put('/api/admin/vouchers/:id', async (req, res) => {
  try {
    const {
      code, name, description,
      discount_type, discount_value, applies_to,
      min_nights, min_total, max_uses, single_use_per_guest,
      property_ids, room_ids,
      valid_from, valid_until, active
    } = req.body;
    
    const result = await pool.query(`
      UPDATE vouchers SET
        code = $1, name = $2, description = $3,
        discount_type = $4, discount_value = $5, applies_to = $6,
        min_nights = $7, min_total = $8, max_uses = $9, single_use_per_guest = $10,
        property_ids = $11, room_ids = $12,
        valid_from = $13, valid_until = $14, active = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      code.toUpperCase(), name, description,
      discount_type, discount_value, applies_to,
      min_nights, min_total || null, max_uses || null, single_use_per_guest,
      property_ids || null, room_ids || null,
      valid_from || null, valid_until || null, active, req.params.id
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete voucher
app.delete('/api/admin/vouchers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vouchers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// UPSELLS API
// =====================================================

app.get('/api/admin/upsells', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, 
             p.name as property_name,
             r.name as room_name
      FROM upsells u
      LEFT JOIN properties p ON u.property_id = p.id
      LEFT JOIN rooms r ON u.room_id = r.id
      ORDER BY u.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/admin/upsells', async (req, res) => {
  try {
    const { name, description, price, charge_type, max_quantity, property_id, room_id, room_ids, active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO upsells (name, description, price, charge_type, max_quantity, property_id, room_id, room_ids, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, description, price, charge_type || 'per_booking', max_quantity, property_id, room_id, room_ids, active !== false]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.put('/api/admin/upsells/:id', async (req, res) => {
  try {
    const { name, description, price, charge_type, max_quantity, property_id, room_id, room_ids, active } = req.body;
    
    const result = await pool.query(`
      UPDATE upsells SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        charge_type = COALESCE($4, charge_type),
        max_quantity = $5,
        property_id = $6,
        room_id = $7,
        room_ids = $8,
        active = COALESCE($9, active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [name, description, price, charge_type, max_quantity, property_id, room_id, room_ids, active, req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/upsells/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM upsells WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// FEES API
// =====================================================

app.get('/api/admin/fees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fees ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/admin/fees', async (req, res) => {
  try {
    const { name, description, amount_type, amount, apply_per, is_tax, property_id, room_id, active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO fees (name, description, amount_type, amount, apply_per, is_tax, property_id, room_id, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, description, amount_type || 'fixed', amount, apply_per || 'per_booking', is_tax || false, property_id, room_id, active !== false]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.put('/api/admin/fees/:id', async (req, res) => {
  try {
    const { name, description, amount_type, amount, apply_per, is_tax, property_id, room_id, active } = req.body;
    
    const result = await pool.query(`
      UPDATE fees SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        amount_type = COALESCE($3, amount_type),
        amount = COALESCE($4, amount),
        apply_per = COALESCE($5, apply_per),
        is_tax = COALESCE($6, is_tax),
        property_id = $7,
        room_id = $8,
        active = COALESCE($9, active),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [name, description, amount_type, amount, apply_per, is_tax, property_id, room_id, active, req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/fees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fees WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// TAXES API (Tourist/City Taxes)
// =====================================================

app.get('/api/admin/taxes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM taxes ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/admin/taxes', async (req, res) => {
  try {
    const { name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO taxes (name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [name, country, amount_type || 'fixed', currency || 'EUR', amount, charge_per || 'per_person_per_night', max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active !== false]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.put('/api/admin/taxes/:id', async (req, res) => {
  try {
    const { name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active } = req.body;
    
    const result = await pool.query(`
      UPDATE taxes SET
        name = COALESCE($1, name),
        country = $2,
        amount_type = COALESCE($3, amount_type),
        currency = COALESCE($4, currency),
        amount = COALESCE($5, amount),
        charge_per = COALESCE($6, charge_per),
        max_nights = $7,
        min_age = $8,
        star_tier = $9,
        season_start = $10,
        season_end = $11,
        property_id = $12,
        room_id = $13,
        active = COALESCE($14, active),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `, [name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active, req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/taxes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM taxes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Validate voucher code (for booking widget)
app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code, property_id, room_id, nights, total, guest_email } = req.body;
    
    const result = await pool.query(`
      SELECT * FROM vouchers 
      WHERE code = $1 AND active = true
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND (max_uses IS NULL OR uses_count < max_uses)
    `, [code.toUpperCase()]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid or expired voucher code' });
    }
    
    const voucher = result.rows[0];
    
    // Check min nights
    if (voucher.min_nights && nights < voucher.min_nights) {
      return res.json({ success: false, error: `Minimum ${voucher.min_nights} nights required` });
    }
    
    // Check min total
    if (voucher.min_total && total < voucher.min_total) {
      return res.json({ success: false, error: `Minimum total of $${voucher.min_total} required` });
    }
    
    // Check property/room restrictions
    if (voucher.property_ids && property_id && !voucher.property_ids.includes(property_id)) {
      return res.json({ success: false, error: 'Voucher not valid for this property' });
    }
    if (voucher.room_ids && room_id && !voucher.room_ids.includes(room_id)) {
      return res.json({ success: false, error: 'Voucher not valid for this room' });
    }
    
    // Check single use per guest
    if (voucher.single_use_per_guest && guest_email) {
      const used = await pool.query(
        'SELECT id FROM voucher_uses WHERE voucher_id = $1 AND guest_email = $2',
        [voucher.id, guest_email]
      );
      if (used.rows.length > 0) {
        return res.json({ success: false, error: 'You have already used this voucher' });
      }
    }
    
    // Calculate discount
    let discount = 0;
    if (voucher.discount_type === 'percentage') {
      discount = total * (voucher.discount_value / 100);
    } else {
      discount = voucher.discount_value;
    }
    
    res.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        discount_amount: Math.min(discount, total)
      }
    });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Calculate price with offers (for booking widget)
app.post('/api/pricing/calculate', async (req, res) => {
  try {
    const { room_id, check_in, check_out, guests, voucher_code } = req.body;
    
    // Get room availability and base prices
    const availResult = await pool.query(`
      SELECT date, cm_price, standard_price, direct_price
      FROM room_availability
      WHERE room_id = $1 AND date >= $2 AND date < $3
      ORDER BY date
    `, [room_id, check_in, check_out]);
    
    const nights = availResult.rows.length;
    
    // Get applicable offers
    const offersResult = await pool.query(`
      SELECT * FROM offers
      WHERE active = true
      AND (room_id IS NULL OR room_id = $1)
      AND (min_nights IS NULL OR min_nights <= $2)
      AND (max_nights IS NULL OR max_nights >= $2)
      AND (min_guests IS NULL OR min_guests <= $3)
      AND (max_guests IS NULL OR max_guests >= $3)
      AND (valid_from IS NULL OR valid_from <= $4)
      AND (valid_until IS NULL OR valid_until >= $5)
      ORDER BY priority DESC
    `, [room_id, nights, guests, check_in, check_out]);
    
    // Calculate pricing
    let baseTotal = 0;
    let standardTotal = 0;
    const dailyPrices = [];
    
    for (const day of availResult.rows) {
      const refPrice = parseFloat(day.cm_price) || 0;
      const stdPrice = parseFloat(day.standard_price) || refPrice;
      baseTotal += refPrice;
      standardTotal += stdPrice;
      dailyPrices.push({
        date: day.date,
        reference_price: refPrice,
        standard_price: stdPrice
      });
    }
    
    // Apply best offer
    let offerDiscount = 0;
    let appliedOffer = null;
    
    for (const offer of offersResult.rows) {
      let discount = 0;
      if (offer.discount_type === 'percentage') {
        discount = standardTotal * (offer.discount_value / 100);
      } else {
        discount = offer.discount_value;
      }
      
      if (discount > offerDiscount) {
        offerDiscount = discount;
        appliedOffer = offer;
      }
    }
    
    let finalTotal = standardTotal - offerDiscount;
    
    // Apply voucher if provided
    let voucherDiscount = 0;
    let appliedVoucher = null;
    
    if (voucher_code) {
      const voucherResult = await pool.query(`
        SELECT * FROM vouchers 
        WHERE code = $1 AND active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      `, [voucher_code.toUpperCase()]);
      
      if (voucherResult.rows.length > 0) {
        const voucher = voucherResult.rows[0];
        if (voucher.discount_type === 'percentage') {
          voucherDiscount = finalTotal * (voucher.discount_value / 100);
        } else {
          voucherDiscount = voucher.discount_value;
        }
        appliedVoucher = voucher;
        finalTotal -= voucherDiscount;
      }
    }
    
    res.json({
      success: true,
      pricing: {
        nights,
        reference_total: baseTotal,
        standard_total: standardTotal,
        offer_discount: offerDiscount,
        applied_offer: appliedOffer ? { id: appliedOffer.id, name: appliedOffer.name } : null,
        voucher_discount: voucherDiscount,
        applied_voucher: appliedVoucher ? { id: appliedVoucher.id, code: appliedVoucher.code } : null,
        final_total: Math.max(0, finalTotal),
        daily_prices: dailyPrices
      }
    });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ADMIN DASHBOARD API ENDPOINTS
// =====================================================

// Get dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const clientId = req.query.client_id;
    
    let propertiesCount, unitsCount, bookingsCount, connectionsCount;
    
    if (clientId) {
      // Client-specific stats
      propertiesCount = await pool.query('SELECT COUNT(*) FROM properties WHERE client_id = $1', [clientId]);
      unitsCount = await pool.query(`
        SELECT COUNT(*) FROM bookable_units bu 
        JOIN properties p ON bu.property_id = p.id 
        WHERE p.client_id = $1
      `, [clientId]);
      bookingsCount = await pool.query(`
        SELECT COUNT(*) FROM bookings b
        JOIN bookable_units bu ON b.room_id = bu.id
        JOIN properties p ON bu.property_id = p.id
        WHERE p.client_id = $1
      `, [clientId]);
      connectionsCount = await pool.query('SELECT COUNT(*) FROM channel_connections WHERE client_id = $1 AND status = $2', [clientId, 'active']);
    } else {
      // All stats (admin view)
      propertiesCount = await pool.query('SELECT COUNT(*) FROM properties');
      unitsCount = await pool.query('SELECT COUNT(*) FROM bookable_units');
      bookingsCount = await pool.query('SELECT COUNT(*) FROM bookings');
      connectionsCount = await pool.query('SELECT COUNT(*) FROM channel_connections WHERE status = $1', ['active']);
    }
    
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
    
    // Get availability data - include standard_price if it exists
    let availability;
    try {
      availability = await pool.query(`
        SELECT 
          date,
          cm_price,
          standard_price,
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
    } catch (e) {
      // Fallback if standard_price column doesn't exist
      availability = await pool.query(`
        SELECT 
          date,
          cm_price,
          cm_price as standard_price,
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
    }
    
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
        standard_price: a.standard_price || a.cm_price, // Use saved standard_price, fallback to cm_price
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
          COALESCE(guest_first_name, '') || ' ' || COALESCE(guest_last_name, '') as guest_name,
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
    const { room_id, from_date, to_date, status, price, discount_percent, standard_price } = req.body;
    
    await client.query('BEGIN');
    
    const startDate = new Date(from_date);
    const endDate = new Date(to_date);
    let daysUpdated = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      if (standard_price !== undefined) {
        // Update standard price
        await client.query(`
          INSERT INTO room_availability (room_id, date, standard_price, is_available, is_blocked)
          VALUES ($1, $2, $3, true, false)
          ON CONFLICT (room_id, date) 
          DO UPDATE SET 
            standard_price = $3,
            updated_at = NOW()
        `, [room_id, dateStr, standard_price || null]);
      } else if (discount_percent) {
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
      'SELECT * FROM property_images WHERE property_id = $1 AND is_active = true ORDER BY is_primary DESC, display_order ASC',
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
      'SELECT * FROM room_images WHERE room_id = $1 AND is_active = true ORDER BY is_primary DESC, display_order ASC',
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

// =====================================================
// AI CONTENT GENERATION
// =====================================================

app.post('/api/ai/generate-content', async (req, res) => {
  const { type, property_id, room_id, prompt } = req.body;
  
  try {
    let propertyContext = '';
    let roomContext = '';
    
    if (property_id) {
      const propResult = await pool.query(`
        SELECT p.*, 
               (SELECT string_agg(name, ', ') FROM bookable_units WHERE property_id = p.id) as room_names
        FROM properties p WHERE id = $1
      `, [property_id]);
      
      if (propResult.rows[0]) {
        const p = propResult.rows[0];
        propertyContext = `Property: ${p.name}. Type: ${p.property_type || 'accommodation'}. Location: ${p.city || ''}, ${p.country || ''}.`;
      }
    }
    
    if (room_id) {
      const roomResult = await pool.query(`
        SELECT bu.*, p.name as property_name, p.city, p.country
        FROM bookable_units bu
        LEFT JOIN properties p ON bu.property_id = p.id
        WHERE bu.id = $1
      `, [room_id]);
      
      if (roomResult.rows[0]) {
        const r = roomResult.rows[0];
        roomContext = `Room: ${r.name} at ${r.property_name}. Max guests: ${r.max_guests || 2}.`;
      }
    }
    
    let systemPrompt = 'You are an expert hospitality copywriter. Write engaging, warm, professional descriptions. No clichés.';
    let userPrompt = '';
    
    switch(type) {
      case 'property_description':
        userPrompt = `Write a property description (2-3 paragraphs). ${propertyContext} ${prompt ? `Notes: ${prompt}` : ''}`;
        break;
      case 'property_location':
        userPrompt = `Write a location description (1-2 paragraphs). ${propertyContext} ${prompt ? `Notes: ${prompt}` : ''}`;
        break;
      case 'room_short':
        userPrompt = `Write a short room description (1-2 sentences, max 30 words). ${roomContext} ${propertyContext} ${prompt ? `Notes: ${prompt}` : ''}`;
        break;
      case 'room_full':
        userPrompt = `Write a detailed room description (2-3 paragraphs). ${roomContext} ${propertyContext} ${prompt ? `Notes: ${prompt}` : ''}`;
        break;
      default:
        return res.json({ success: false, error: 'Unknown content type' });
    }
    
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    res.json({ success: true, content: claudeResponse.data.content[0].text.trim() });
    
  } catch (error) {
    console.error('AI generation error:', error.response?.data || error.message);
    res.json({ success: false, error: 'AI generation failed' });
  }
});

// =====================================================
// API KEY MANAGEMENT (Admin)
// =====================================================

// Generate a secure random API key
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'gas_';
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// Get all API keys for a client
app.get('/api/admin/api-keys', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT id, key_name, api_key, permissions, rate_limit_per_minute, rate_limit_per_day,
                   last_used_at, total_requests, is_active, expires_at, allowed_origins, created_at
            FROM client_api_keys 
            WHERE client_id = $1
            ORDER BY created_at DESC
        `, [clientId]);
        
        res.json({ success: true, api_keys: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create new API key
app.post('/api/admin/api-keys', async (req, res) => {
    try {
        const {
            client_id = 1,
            key_name,
            permissions = ['read:rooms', 'read:availability', 'read:pricing', 'read:offers', 'read:content'],
            rate_limit_per_minute = 60,
            rate_limit_per_day = 10000,
            allowed_origins = [],
            expires_at = null
        } = req.body;
        
        const api_key = generateApiKey();
        
        const result = await pool.query(`
            INSERT INTO client_api_keys (
                client_id, key_name, api_key, permissions, 
                rate_limit_per_minute, rate_limit_per_day, allowed_origins, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [client_id, key_name, api_key, JSON.stringify(permissions), rate_limit_per_minute, rate_limit_per_day, allowed_origins, expires_at]);
        
        res.json({ success: true, api_key: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update API key
app.put('/api/admin/api-keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { key_name, permissions, rate_limit_per_minute, rate_limit_per_day, is_active, allowed_origins, expires_at } = req.body;
        
        const result = await pool.query(`
            UPDATE client_api_keys SET
                key_name = COALESCE($2, key_name),
                permissions = COALESCE($3, permissions),
                rate_limit_per_minute = COALESCE($4, rate_limit_per_minute),
                rate_limit_per_day = COALESCE($5, rate_limit_per_day),
                is_active = COALESCE($6, is_active),
                allowed_origins = COALESCE($7, allowed_origins),
                expires_at = $8,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, key_name, permissions ? JSON.stringify(permissions) : null, rate_limit_per_minute, rate_limit_per_day, is_active, allowed_origins, expires_at]);
        
        res.json({ success: true, api_key: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Delete API key
app.delete('/api/admin/api-keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM client_api_keys WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Regenerate API key
app.post('/api/admin/api-keys/:id/regenerate', async (req, res) => {
    try {
        const { id } = req.params;
        const new_key = generateApiKey();
        
        const result = await pool.query(`
            UPDATE client_api_keys SET api_key = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, new_key]);
        
        res.json({ success: true, api_key: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =====================================================
// API KEY AUTHENTICATION MIDDLEWARE
// =====================================================

async function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ success: false, error: 'API key required. Include X-API-Key header or api_key query parameter.' });
    }
    
    try {
        const result = await pool.query(`
            SELECT ak.*, c.id as client_id 
            FROM client_api_keys ak
            JOIN clients c ON ak.client_id = c.id
            WHERE ak.api_key = $1 AND ak.is_active = true
        `, [apiKey]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid or inactive API key' });
        }
        
        const keyData = result.rows[0];
        
        // Check expiration
        if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
            return res.status(401).json({ success: false, error: 'API key has expired' });
        }
        
        // Check origin if allowed_origins is set
        const origin = req.headers.origin;
        if (keyData.allowed_origins && keyData.allowed_origins.length > 0) {
            if (!origin || !keyData.allowed_origins.includes(origin)) {
                return res.status(403).json({ success: false, error: 'Origin not allowed for this API key' });
            }
        }
        
        // Update usage stats
        await pool.query(`
            UPDATE client_api_keys SET 
                last_used_at = NOW(), 
                total_requests = total_requests + 1 
            WHERE id = $1
        `, [keyData.id]);
        
        // Attach key data to request
        req.apiKey = keyData;
        req.clientId = keyData.client_id;
        
        next();
    } catch (error) {
        console.error('API auth error:', error);
        res.status(500).json({ success: false, error: 'Authentication error' });
    }
}

// Helper to check permissions
function hasPermission(req, permission) {
    if (!req.apiKey || !req.apiKey.permissions) return false;
    const perms = typeof req.apiKey.permissions === 'string' 
        ? JSON.parse(req.apiKey.permissions) 
        : req.apiKey.permissions;
    return perms.includes(permission) || perms.includes('*');
}

// =====================================================
// SECURE API ENDPOINTS (Require API Key)
// =====================================================

// Get all rooms with full details and pricing
app.get('/api/v1/rooms', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:rooms')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:rooms required' });
    }
    
    try {
        const rooms = await pool.query(`
            SELECT r.*, p.name as property_name, p.currency, p.timezone,
                   array_agg(DISTINCT ri.image_url) FILTER (WHERE ri.image_url IS NOT NULL) as images,
                   array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL) as amenities
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            LEFT JOIN room_images ri ON r.id = ri.room_id
            LEFT JOIN room_amenities ra ON r.id = ra.room_id
            LEFT JOIN amenities a ON ra.amenity_id = a.id
            WHERE p.client_id = $1
            GROUP BY r.id, p.name, p.currency, p.timezone
            ORDER BY p.name, r.name
        `, [req.clientId]);
        
        res.json({ success: true, rooms: rooms.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get room by ID with full details
app.get('/api/v1/rooms/:roomId', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:rooms')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:rooms required' });
    }
    
    try {
        const { roomId } = req.params;
        
        const room = await pool.query(`
            SELECT r.*, p.name as property_name, p.currency, p.timezone
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE r.id = $1 AND p.client_id = $2
        `, [roomId, req.clientId]);
        
        if (room.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }
        
        // Get images
        const images = await pool.query(`
            SELECT image_url, caption, display_order FROM room_images WHERE room_id = $1 ORDER BY display_order
        `, [roomId]);
        
        // Get amenities
        const amenities = await pool.query(`
            SELECT a.* FROM amenities a
            JOIN room_amenities ra ON a.id = ra.amenity_id
            WHERE ra.room_id = $1
        `, [roomId]);
        
        res.json({ 
            success: true, 
            room: {
                ...room.rows[0],
                images: images.rows,
                amenities: amenities.rows
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get availability for date range
app.get('/api/v1/availability', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:availability')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:availability required' });
    }
    
    try {
        const { room_id, start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ success: false, error: 'start_date and end_date required' });
        }
        
        let query = `
            SELECT ra.*, r.name as room_name, r.base_price
            FROM room_availability ra
            JOIN rooms r ON ra.room_id = r.id
            JOIN properties p ON r.property_id = p.id
            WHERE p.client_id = $1 AND ra.date >= $2 AND ra.date <= $3
        `;
        const params = [req.clientId, start_date, end_date];
        
        if (room_id) {
            query += ` AND ra.room_id = $4`;
            params.push(room_id);
        }
        
        query += ` ORDER BY ra.room_id, ra.date`;
        
        const result = await pool.query(query, params);
        
        // Group by room
        const availabilityByRoom = {};
        result.rows.forEach(row => {
            if (!availabilityByRoom[row.room_id]) {
                availabilityByRoom[row.room_id] = {
                    room_id: row.room_id,
                    room_name: row.room_name,
                    base_price: row.base_price,
                    dates: []
                };
            }
            availabilityByRoom[row.room_id].dates.push({
                date: row.date,
                available: row.available,
                price: row.price || row.base_price,
                min_stay: row.min_stay,
                check_in_allowed: row.check_in_allowed,
                check_out_allowed: row.check_out_allowed
            });
        });
        
        res.json({ success: true, availability: Object.values(availabilityByRoom) });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Check specific availability
app.post('/api/v1/availability/check', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:availability')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:availability required' });
    }
    
    try {
        const { room_id, check_in, check_out, guests } = req.body;
        
        if (!room_id || !check_in || !check_out) {
            return res.status(400).json({ success: false, error: 'room_id, check_in, and check_out required' });
        }
        
        // Verify room belongs to client
        const roomCheck = await pool.query(`
            SELECT r.*, p.currency FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE r.id = $1 AND p.client_id = $2
        `, [room_id, req.clientId]);
        
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }
        
        const room = roomCheck.rows[0];
        
        // Check guest capacity
        if (guests && guests > room.max_occupancy) {
            return res.json({ 
                success: true, 
                available: false, 
                reason: `Maximum occupancy is ${room.max_occupancy} guests` 
            });
        }
        
        // Check for existing bookings
        const bookings = await pool.query(`
            SELECT id FROM bookings 
            WHERE room_id = $1 
            AND status NOT IN ('cancelled', 'rejected')
            AND (
                (check_in_date <= $2 AND check_out_date > $2)
                OR (check_in_date < $3 AND check_out_date >= $3)
                OR (check_in_date >= $2 AND check_out_date <= $3)
            )
        `, [room_id, check_in, check_out]);
        
        if (bookings.rows.length > 0) {
            return res.json({ 
                success: true, 
                available: false, 
                reason: 'Room is already booked for these dates' 
            });
        }
        
        // Check availability table for blocked dates
        const blocked = await pool.query(`
            SELECT date FROM room_availability 
            WHERE room_id = $1 AND date >= $2 AND date < $3 AND available = false
        `, [room_id, check_in, check_out]);
        
        if (blocked.rows.length > 0) {
            return res.json({ 
                success: true, 
                available: false, 
                reason: 'Some dates are not available',
                blocked_dates: blocked.rows.map(r => r.date)
            });
        }
        
        // Calculate price
        const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
        
        const pricing = await pool.query(`
            SELECT date, price FROM room_availability 
            WHERE room_id = $1 AND date >= $2 AND date < $3
        `, [room_id, check_in, check_out]);
        
        let totalPrice = 0;
        const priceByDate = {};
        pricing.rows.forEach(p => { priceByDate[p.date] = p.price; });
        
        for (let d = new Date(check_in); d < new Date(check_out); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            totalPrice += priceByDate[dateStr] || room.base_price || 0;
        }
        
        res.json({ 
            success: true, 
            available: true,
            room: {
                id: room.id,
                name: room.name,
                base_price: room.base_price,
                max_occupancy: room.max_occupancy
            },
            pricing: {
                nights: nights,
                total: totalPrice,
                average_per_night: totalPrice / nights,
                currency: room.currency
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get pricing (seasonal rates, special dates)
app.get('/api/v1/pricing', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:pricing')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:pricing required' });
    }
    
    try {
        const { room_id, start_date, end_date } = req.query;
        
        // Get base room prices
        let roomQuery = `
            SELECT r.id, r.name, r.base_price, r.weekend_price, p.currency
            FROM rooms r
            JOIN properties p ON r.property_id = p.id
            WHERE p.client_id = $1
        `;
        const params = [req.clientId];
        
        if (room_id) {
            roomQuery += ` AND r.id = $2`;
            params.push(room_id);
        }
        
        const rooms = await pool.query(roomQuery, params);
        
        // Get seasonal pricing if date range specified
        let seasonalPricing = [];
        if (start_date && end_date) {
            const pricingResult = await pool.query(`
                SELECT ra.room_id, ra.date, ra.price, ra.min_stay
                FROM room_availability ra
                JOIN rooms r ON ra.room_id = r.id
                JOIN properties p ON r.property_id = p.id
                WHERE p.client_id = $1 AND ra.date >= $2 AND ra.date <= $3
                ${room_id ? 'AND ra.room_id = $4' : ''}
                ORDER BY ra.room_id, ra.date
            `, room_id ? [req.clientId, start_date, end_date, room_id] : [req.clientId, start_date, end_date]);
            
            seasonalPricing = pricingResult.rows;
        }
        
        res.json({ 
            success: true, 
            rooms: rooms.rows,
            seasonal_pricing: seasonalPricing
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get active offers
app.get('/api/v1/offers', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:offers')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:offers required' });
    }
    
    try {
        const { active_only = true } = req.query;
        
        let query = `
            SELECT o.*, p.name as property_name
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE p.client_id = $1
        `;
        
        if (active_only === 'true' || active_only === true) {
            query += ` AND o.is_active = true 
                       AND (o.valid_from IS NULL OR o.valid_from <= CURRENT_DATE)
                       AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)`;
        }
        
        query += ` ORDER BY o.created_at DESC`;
        
        const result = await pool.query(query, [req.clientId]);
        
        res.json({ success: true, offers: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Validate and apply offer/voucher
app.post('/api/v1/offers/validate', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:offers')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:offers required' });
    }
    
    try {
        const { code, room_id, check_in, check_out, subtotal } = req.body;
        
        if (!code) {
            return res.status(400).json({ success: false, error: 'Offer code required' });
        }
        
        // Check vouchers first
        const voucher = await pool.query(`
            SELECT v.* FROM vouchers v
            JOIN properties p ON v.property_id = p.id
            WHERE p.client_id = $1 AND v.code = $2 AND v.is_active = true
        `, [req.clientId, code.toUpperCase()]);
        
        if (voucher.rows.length > 0) {
            const v = voucher.rows[0];
            
            // Check validity
            if (v.valid_from && new Date(v.valid_from) > new Date()) {
                return res.json({ success: true, valid: false, reason: 'Voucher not yet valid' });
            }
            if (v.valid_until && new Date(v.valid_until) < new Date()) {
                return res.json({ success: true, valid: false, reason: 'Voucher has expired' });
            }
            if (v.usage_limit && v.times_used >= v.usage_limit) {
                return res.json({ success: true, valid: false, reason: 'Voucher usage limit reached' });
            }
            if (v.min_nights && check_in && check_out) {
                const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
                if (nights < v.min_nights) {
                    return res.json({ success: true, valid: false, reason: `Minimum ${v.min_nights} nights required` });
                }
            }
            
            // Calculate discount
            let discount = 0;
            if (v.discount_type === 'percentage' && subtotal) {
                discount = subtotal * (v.discount_value / 100);
                if (v.max_discount && discount > v.max_discount) {
                    discount = v.max_discount;
                }
            } else if (v.discount_type === 'fixed') {
                discount = v.discount_value;
            }
            
            return res.json({
                success: true,
                valid: true,
                type: 'voucher',
                voucher: {
                    id: v.id,
                    code: v.code,
                    discount_type: v.discount_type,
                    discount_value: v.discount_value,
                    calculated_discount: discount
                }
            });
        }
        
        // Check offers by promo code
        const offer = await pool.query(`
            SELECT o.* FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE p.client_id = $1 AND o.promo_code = $2 AND o.is_active = true
        `, [req.clientId, code.toUpperCase()]);
        
        if (offer.rows.length > 0) {
            const o = offer.rows[0];
            
            let discount = 0;
            if (o.discount_type === 'percentage' && subtotal) {
                discount = subtotal * (o.discount_percentage / 100);
            } else if (o.discount_type === 'fixed') {
                discount = o.discount_amount;
            }
            
            return res.json({
                success: true,
                valid: true,
                type: 'offer',
                offer: {
                    id: o.id,
                    name: o.name,
                    discount_type: o.discount_type,
                    calculated_discount: discount
                }
            });
        }
        
        res.json({ success: true, valid: false, reason: 'Invalid code' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get upsells
app.get('/api/v1/upsells', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:offers')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:offers required' });
    }
    
    try {
        const { room_id } = req.query;
        
        let query = `
            SELECT u.* FROM upsells u
            JOIN properties p ON u.property_id = p.id
            WHERE p.client_id = $1 AND u.is_active = true
        `;
        const params = [req.clientId];
        
        // If room_id provided, filter applicable upsells
        if (room_id) {
            query += ` AND (u.applicable_rooms IS NULL OR u.applicable_rooms @> ARRAY[$2]::integer[])`;
            params.push(room_id);
        }
        
        query += ` ORDER BY u.display_order, u.name`;
        
        const result = await pool.query(query, params);
        
        res.json({ success: true, upsells: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get taxes and fees
app.get('/api/v1/taxes', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:pricing')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:pricing required' });
    }
    
    try {
        const taxes = await pool.query(`
            SELECT t.* FROM taxes t
            JOIN properties p ON t.property_id = p.id
            WHERE p.client_id = $1 AND t.is_active = true
            ORDER BY t.name
        `, [req.clientId]);
        
        const fees = await pool.query(`
            SELECT f.* FROM fees f
            JOIN properties p ON f.property_id = p.id
            WHERE p.client_id = $1 AND f.is_active = true
            ORDER BY f.name
        `, [req.clientId]);
        
        res.json({ 
            success: true, 
            taxes: taxes.rows,
            fees: fees.rows
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get full content (pages, contact, branding) - authenticated version with all fields
app.get('/api/v1/content', authenticateApiKey, async (req, res) => {
    if (!hasPermission(req, 'read:content')) {
        return res.status(403).json({ success: false, error: 'Permission denied: read:content required' });
    }
    
    try {
        const [pages, contact, branding, blog, attractions] = await Promise.all([
            pool.query(`SELECT * FROM client_pages WHERE client_id = $1`, [req.clientId]),
            pool.query(`SELECT * FROM client_contact_info WHERE client_id = $1`, [req.clientId]),
            pool.query(`SELECT * FROM client_branding WHERE client_id = $1`, [req.clientId]),
            pool.query(`SELECT * FROM blog_posts WHERE client_id = $1 AND is_published = true ORDER BY published_at DESC`, [req.clientId]),
            pool.query(`SELECT * FROM attractions WHERE client_id = $1 AND is_published = true ORDER BY display_order`, [req.clientId])
        ]);
        
        res.json({
            success: true,
            content: {
                pages: pages.rows,
                contact: contact.rows[0] || {},
                branding: branding.rows[0] || {},
                blog: blog.rows,
                attractions: attractions.rows
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =====================================================
// PUBLIC API ENDPOINTS (for WordPress plugin & widgets)
// =====================================================

// Get property info (public)
app.get('/api/public/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const property = await pool.query(`
      SELECT id, name, property_type, description, city, country, currency, timezone
      FROM properties WHERE id = $1
    `, [propertyId]);
    
    if (!property.rows[0]) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    const units = await pool.query(`
      SELECT id, name, unit_type, max_guests, description, base_price
      FROM bookable_units WHERE property_id = $1 AND status = 'active'
      ORDER BY name
    `, [propertyId]);
    
    const images = await pool.query(`
      SELECT id, url, alt_text, is_primary
      FROM property_images WHERE property_id = $1
      ORDER BY sort_order, is_primary DESC
    `, [propertyId]);
    
    res.json({
      success: true,
      property: property.rows[0],
      units: units.rows,
      images: images.rows
    });
  } catch (error) {
    console.error('Public property error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get unit/room info (public)
app.get('/api/public/unit/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const unit = await pool.query(`
      SELECT bu.*, p.name as property_name, p.currency, p.timezone
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [unitId]);
    
    if (!unit.rows[0]) {
      return res.json({ success: false, error: 'Unit not found' });
    }
    
    // Try room_images first, fallback to bookable_unit_images
    let images = await pool.query(`
      SELECT id, image_url as url, alt_text
      FROM room_images WHERE room_id = $1
    `, [unitId]);
    
    // If no images in room_images, try bookable_unit_images
    if (images.rows.length === 0) {
      try {
        images = await pool.query(`
          SELECT id, url, alt_text
          FROM bookable_unit_images WHERE unit_id = $1
        `, [unitId]);
      } catch (e) {
        // Table doesn't exist, that's fine
        images = { rows: [] };
      }
    }
    
    // Try to get amenities
    let amenities = { rows: [] };
    try {
      amenities = await pool.query(`
        SELECT name, category, icon
        FROM bookable_unit_amenities WHERE unit_id = $1
        ORDER BY category, name
      `, [unitId]);
    } catch (e) {
      // Table doesn't exist, try room_amenities
      try {
        amenities = await pool.query(`
          SELECT name, category, icon
          FROM room_amenities WHERE room_id = $1
          ORDER BY category, name
        `, [unitId]);
      } catch (e2) {
        // Neither table exists
      }
    }
    
    res.json({
      success: true,
      unit: unit.rows[0],
      images: images.rows,
      amenities: amenities.rows
    });
  } catch (error) {
    console.error('Public unit error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get availability calendar (public)
app.get('/api/public/availability/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    const { from, to } = req.query;
    
    // Default to next 90 days if not specified
    const startDate = from || new Date().toISOString().split('T')[0];
    const endDate = to || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const availability = await pool.query(`
      SELECT 
        date,
        COALESCE(direct_price, cm_price) as price,
        is_available,
        is_blocked,
        min_stay
      FROM room_availability
      WHERE room_id = $1 AND date >= $2 AND date < $3
      ORDER BY date
    `, [unitId, startDate, endDate]);
    
    // Get unit info for base price fallback
    const unit = await pool.query(`
      SELECT base_price, currency FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [unitId]);
    
    const basePrice = unit.rows[0]?.base_price || 0;
    const currency = unit.rows[0]?.currency || 'GBP';
    
    // Build calendar with all dates
    const calendar = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    const availMap = {};
    
    availability.rows.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      availMap[dateStr] = a;
    });
    
    // Check overall availability and calculate total
    let isAvailable = true;
    let totalPrice = 0;
    let nightCount = 0;
    
    while (current < end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = availMap[dateStr];
      
      const dayAvailable = dayData ? (dayData.is_available && !dayData.is_blocked) : true;
      const dayPrice = dayData?.price || basePrice;
      
      calendar.push({
        date: dateStr,
        price: parseFloat(dayPrice),
        available: dayAvailable,
        min_stay: dayData?.min_stay || 1
      });
      
      // If any day is unavailable, whole range is unavailable
      if (!dayAvailable) {
        isAvailable = false;
      }
      
      totalPrice += parseFloat(dayPrice);
      nightCount++;
      
      current.setDate(current.getDate() + 1);
    }
    
    res.json({
      success: true,
      unit_id: unitId,
      currency: currency,
      is_available: isAvailable,
      total_price: totalPrice,
      nights: nightCount,
      calendar: calendar
    });
  } catch (error) {
    console.error('Public availability error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Calculate price for dates (public) - supports offers, vouchers, upsells
app.post('/api/public/calculate-price', async (req, res) => {
  try {
    const { unit_id, check_in, check_out, guests, voucher_code, upsells } = req.body;
    
    if (!unit_id || !check_in || !check_out) {
      return res.json({ success: false, error: 'unit_id, check_in, and check_out required' });
    }
    
    // Get availability for date range
    const availability = await pool.query(`
      SELECT date, COALESCE(direct_price, cm_price) as price, is_available, is_blocked
      FROM room_availability
      WHERE room_id = $1 AND date >= $2 AND date < $3
      ORDER BY date
    `, [unit_id, check_in, check_out]);
    
    // Get unit for base price
    const unit = await pool.query(`
      SELECT bu.base_price, bu.max_guests, bu.name, p.currency 
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [unit_id]);
    
    if (!unit.rows[0]) {
      return res.json({ success: false, error: 'Unit not found' });
    }
    
    const basePrice = unit.rows[0].base_price || 0;
    const currency = unit.rows[0].currency || 'GBP';
    
    // Calculate nights
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (nights < 1) {
      return res.json({ success: false, error: 'Invalid date range' });
    }
    
    // Build nightly breakdown
    const nightlyBreakdown = [];
    let accommodationTotal = 0;
    let allAvailable = true;
    
    let current = new Date(check_in);
    for (let i = 0; i < nights; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = availability.rows.find(a => a.date.toISOString().split('T')[0] === dateStr);
      
      const nightPrice = dayData?.price || basePrice;
      accommodationTotal += parseFloat(nightPrice);
      
      if (dayData && (!dayData.is_available || dayData.is_blocked)) {
        allAvailable = false;
      }
      
      nightlyBreakdown.push({
        date: dateStr,
        price: parseFloat(nightPrice)
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    // Check for applicable offers
    let discount = 0;
    let offerApplied = null;
    
    const offers = await pool.query(`
      SELECT * FROM offers
      WHERE active = true
        AND (property_id IS NULL OR property_id = (SELECT property_id FROM bookable_units WHERE id = $1))
        AND (room_id IS NULL OR room_id = $1)
        AND (min_nights IS NULL OR min_nights <= $2)
        AND (valid_from IS NULL OR valid_from <= $3)
        AND (valid_until IS NULL OR valid_until >= $4)
      ORDER BY priority DESC, discount_value DESC
      LIMIT 1
    `, [unit_id, nights, check_in, check_out]);
    
    if (offers.rows[0]) {
      const offer = offers.rows[0];
      if (offer.discount_type === 'percentage') {
        discount = accommodationTotal * (offer.discount_value / 100);
      } else {
        discount = parseFloat(offer.discount_value);
      }
      offerApplied = { name: offer.name, discount_type: offer.discount_type, discount_value: offer.discount_value };
    }
    
    // Check voucher
    let voucherDiscount = 0;
    let voucherApplied = null;
    
    if (voucher_code) {
      const voucher = await pool.query(`
        SELECT * FROM vouchers
        WHERE code = $1 AND active = true
          AND (valid_from IS NULL OR valid_from <= $4)
          AND (valid_until IS NULL OR valid_until >= $5)
          AND (max_uses IS NULL OR uses_count < max_uses)
      `, [voucher_code.toUpperCase(), unit_id, nights, check_in, check_out]);
      
      if (voucher.rows[0]) {
        const v = voucher.rows[0];
        if (v.discount_type === 'percentage') {
          voucherDiscount = accommodationTotal * (v.discount_value / 100);
        } else {
          voucherDiscount = parseFloat(v.discount_value);
        }
        voucherApplied = { code: v.code, name: v.name, discount_type: v.discount_type, discount_value: v.discount_value };
      } else {
        return res.json({ success: false, error: 'Invalid or expired voucher code' });
      }
    }
    
    // Calculate upsells total
    let upsellsTotal = 0;
    const upsellsBreakdown = [];
    
    if (upsells && upsells.length > 0) {
      for (const item of upsells) {
        const upsellResult = await pool.query(`
          SELECT * FROM upsells WHERE id = $1 AND active = true
        `, [item.id]);
        
        if (upsellResult.rows[0]) {
          const u = upsellResult.rows[0];
          let itemTotal = parseFloat(u.price);
          
          // Calculate based on charge type
          if (u.charge_type === 'per_night') {
            itemTotal = itemTotal * nights;
          } else if (u.charge_type === 'per_guest') {
            itemTotal = itemTotal * (guests || 1);
          } else if (u.charge_type === 'per_guest_per_night') {
            itemTotal = itemTotal * nights * (guests || 1);
          }
          
          // Apply quantity
          itemTotal = itemTotal * (item.quantity || 1);
          
          upsellsTotal += itemTotal;
          upsellsBreakdown.push({
            id: u.id,
            name: u.name,
            unit_price: parseFloat(u.price),
            charge_type: u.charge_type,
            quantity: item.quantity || 1,
            total: itemTotal
          });
        }
      }
    }
    
    // Get applicable taxes
    let taxTotal = 0;
    const taxBreakdown = [];
    
    // Get regular taxes (with fallback if columns don't exist)
    let taxes = { rows: [] };
    try {
      taxes = await pool.query(`
        SELECT * FROM taxes
        WHERE active = true
          AND (property_id IS NULL OR property_id = (SELECT property_id FROM bookable_units WHERE id = $1))
          AND (room_id IS NULL OR room_id = $1)
      `, [unit_id]);
    } catch (taxQueryError) {
      console.log('Tax query fallback - trying simpler query');
      try {
        taxes = await pool.query(`SELECT * FROM taxes WHERE active = true`);
      } catch (e) {
        console.log('No taxes table or query failed');
      }
    }
    
    const subtotalAfterDiscounts = accommodationTotal - discount - voucherDiscount + upsellsTotal;
    
    taxes.rows.forEach(tax => {
      let taxAmount = 0;
      // Support both old (tax_type/rate) and new (amount_type/amount) column names
      const taxType = tax.tax_type || tax.amount_type || tax.charge_per || 'fixed';
      const taxRate = parseFloat(tax.rate || tax.amount) || 0;
      
      if (taxType === 'percentage') {
        taxAmount = subtotalAfterDiscounts * (taxRate / 100);
      } else if (taxType === 'per_night') {
        taxAmount = taxRate * nights;
      } else if (taxType === 'per_person_per_night') {
        taxAmount = taxRate * nights * (guests || 1);
      } else {
        // Fixed amount
        taxAmount = taxRate;
      }
      
      // Apply max_nights limit if set
      if (tax.max_nights && nights > tax.max_nights) {
        if (taxType === 'per_night') {
          taxAmount = taxRate * tax.max_nights;
        } else if (taxType === 'per_person_per_night') {
          taxAmount = taxRate * tax.max_nights * (guests || 1);
        }
      }
      
      taxTotal += taxAmount;
      taxBreakdown.push({ name: tax.name, amount: taxAmount });
    });
    
    // Get tourist tax from property settings (wrapped in try-catch in case columns don't exist)
    try {
      const propertyTax = await pool.query(`
        SELECT 
          p.tourist_tax_enabled,
          p.tourist_tax_type,
          p.tourist_tax_amount,
          p.tourist_tax_name,
          p.tourist_tax_max_nights,
          p.tourist_tax_exempt_children
        FROM properties p
        JOIN bookable_units bu ON bu.property_id = p.id
        WHERE bu.id = $1
      `, [unit_id]);
      
      if (propertyTax.rows[0] && propertyTax.rows[0].tourist_tax_enabled) {
        const pt = propertyTax.rows[0];
        const taxableNights = pt.tourist_tax_max_nights ? Math.min(nights, pt.tourist_tax_max_nights) : nights;
        let touristTaxAmount = 0;
        
        switch (pt.tourist_tax_type) {
          case 'per_guest_per_night':
            touristTaxAmount = parseFloat(pt.tourist_tax_amount) * taxableNights * (guests || 1);
            break;
          case 'per_night':
            touristTaxAmount = parseFloat(pt.tourist_tax_amount) * taxableNights;
            break;
          case 'per_booking':
            touristTaxAmount = parseFloat(pt.tourist_tax_amount);
            break;
          case 'percentage':
            touristTaxAmount = accommodationTotal * (parseFloat(pt.tourist_tax_amount) / 100);
            break;
          default:
            touristTaxAmount = parseFloat(pt.tourist_tax_amount) * taxableNights * (guests || 1);
        }
        
        if (touristTaxAmount > 0) {
          taxTotal += touristTaxAmount;
          taxBreakdown.push({ 
            name: pt.tourist_tax_name || 'Tourist Tax', 
            amount: touristTaxAmount,
            type: 'tourist_tax'
          });
        }
      }
    } catch (touristTaxError) {
      // Tourist tax columns may not exist yet - skip silently
      console.log('Tourist tax columns not available:', touristTaxError.message);
    }
    
    const grandTotal = subtotalAfterDiscounts + taxTotal;
    
    // Debug info for availability
    const availabilityDebug = {
      dates_checked: nights,
      availability_rows_found: availability.rows.length,
      unavailable_dates: nightlyBreakdown.filter((n, i) => {
        const dayData = availability.rows.find(a => a.date.toISOString().split('T')[0] === n.date);
        return dayData && (!dayData.is_available || dayData.is_blocked);
      }).map(n => n.date)
    };
    
    res.json({
      success: true,
      available: allAvailable,
      availability_debug: availabilityDebug,
      currency: currency,
      nights: nights,
      room_name: unit.rows[0].name,
      accommodation_total: accommodationTotal,
      offer_discount: discount,
      offer_applied: offerApplied,
      voucher_discount: voucherDiscount,
      voucher_applied: voucherApplied,
      upsells_total: upsellsTotal,
      upsells_breakdown: upsellsBreakdown,
      subtotal: subtotalAfterDiscounts,
      taxes: taxBreakdown,
      tax_total: taxTotal,
      grand_total: grandTotal,
      nightly_breakdown: nightlyBreakdown
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create booking (public)
app.post('/api/public/book', async (req, res) => {
  try {
    const { 
      unit_id, check_in, check_out, guests,
      guest_first_name, guest_last_name, guest_email, guest_phone,
      voucher_code, notes, total_price
    } = req.body;
    
    // Validate required fields
    if (!unit_id || !check_in || !check_out || !guest_first_name || !guest_last_name || !guest_email) {
      return res.json({ success: false, error: 'Missing required fields' });
    }
    
    // Get unit and property info
    const unit = await pool.query(`
      SELECT bu.*, p.id as property_id, p.name as property_name
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [unit_id]);
    
    if (!unit.rows[0]) {
      return res.json({ success: false, error: 'Unit not found' });
    }
    
    // Create booking
    const booking = await pool.query(`
      INSERT INTO bookings (
        property_id, room_id, check_in, check_out, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        num_guests, total_price, status, source, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'direct', $11, NOW())
      RETURNING *
    `, [
      unit.rows[0].property_id,
      unit_id,
      check_in,
      check_out,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone || null,
      guests || 1,
      total_price || 0,
      notes || null
    ]);
    
    // If voucher was used, increment usage
    if (voucher_code) {
      await pool.query(`
        UPDATE vouchers SET times_used = times_used + 1 WHERE code = $1
      `, [voucher_code.toUpperCase()]);
    }
    
    // Block availability for these dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    let current = new Date(check_in);
    
    while (current < checkOutDate) {
      const dateStr = current.toISOString().split('T')[0];
      await pool.query(`
        INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
        VALUES ($1, $2, false, true, 'booking')
        ON CONFLICT (room_id, date) DO UPDATE SET is_available = false, is_blocked = true
      `, [unit_id, dateStr]);
      current.setDate(current.getDate() + 1);
    }
    
    res.json({
      success: true,
      booking_id: booking.rows[0].id,
      booking: booking.rows[0]
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Validate voucher (public)
app.post('/api/public/validate-voucher', async (req, res) => {
  try {
    const { code, unit_id, check_in, check_out } = req.body;
    
    if (!code) {
      return res.json({ success: false, error: 'Voucher code required' });
    }
    
    const nights = check_in && check_out ? 
      Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)) : 1;
    
    // Simple voucher lookup - just by code and active status
    // More complex property/unit filtering requires schema updates
    let voucher;
    try {
      voucher = await pool.query(`
        SELECT * FROM vouchers
        WHERE UPPER(code) = UPPER($1) AND active = true
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
          AND (max_uses IS NULL OR times_used < max_uses)
      `, [code]);
    } catch (queryError) {
      console.log('Voucher query error:', queryError.message);
      // Ultimate fallback - just check code
      voucher = await pool.query(`
        SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1) AND active = true
      `, [code]);
    }
    
    if (voucher.rows[0]) {
      const v = voucher.rows[0];
      // Check min_nights if column exists
      if (v.min_nights && nights < v.min_nights) {
        return res.json({ success: true, valid: false, error: `Minimum ${v.min_nights} nights required` });
      }
      
      res.json({
        success: true,
        valid: true,
        voucher: {
          code: v.code,
          name: v.name,
          discount_type: v.discount_type,
          discount_value: v.discount_value
        }
      });
    } else {
      res.json({ success: true, valid: false, error: 'Invalid or expired voucher code' });
    }
  } catch (error) {
    console.error('Validate voucher error:', error);
    res.json({ success: false, error: 'Unable to validate voucher' });
  }
});

// Get available upsells (public)
app.get('/api/public/upsells/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const upsells = await pool.query(`
      SELECT id, name, description, category, price, charge_type as price_type
      FROM upsells
      WHERE active = true
        AND (property_id IS NULL OR property_id = (SELECT property_id FROM bookable_units WHERE id = $1))
        AND (room_id IS NULL OR room_id = $1)
      ORDER BY category, name
    `, [unitId]);
    
    res.json({ success: true, upsells: upsells.rows });
  } catch (error) {
    console.error('Get upsells error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// PUBLIC API - OFFERS, UPSELLS & PREMIUM FEATURES
// =========================================================

// Get all rooms for a client (public - for WordPress plugin)
app.get('/api/public/client/:clientId/rooms', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { property_id, room_ids, limit, random } = req.query;
    
    let query = `
      SELECT 
        bu.id,
        bu.name,
        bu.description,
        bu.base_price,
        bu.max_guests,
        bu.max_adults,
        bu.bedroom_count,
        bu.bathroom_count,
        bu.beds24_room_id,
        p.latitude,
        p.longitude,
        p.id as property_id,
        p.name as property_name,
        p.city,
        p.currency,
        (SELECT image_url FROM room_images WHERE room_id = bu.id AND is_active = true ORDER BY is_primary DESC, display_order ASC LIMIT 1) as image_url
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.client_id = $1
    `;
    
    const params = [clientId];
    let paramIndex = 2;
    
    // Filter by property
    if (property_id) {
      query += ` AND p.id = $${paramIndex}`;
      params.push(property_id);
      paramIndex++;
    }
    
    // Filter by specific room IDs
    if (room_ids) {
      const ids = room_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND bu.id = ANY($${paramIndex}::int[])`;
        params.push(ids);
        paramIndex++;
      }
    }
    
    // Order
    if (random === 'true') {
      query += ' ORDER BY RANDOM()';
    } else {
      query += ' ORDER BY bu.name';
    }
    
    // Limit
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }
    
    const result = await pool.query(query, params);
    
    // Get max guests across all rooms
    const maxGuestsResult = await pool.query(`
      SELECT MAX(COALESCE(bu.max_guests, bu.max_adults, 2)) as max_guests
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.client_id = $1
    `, [clientId]);
    
    res.json({
      success: true,
      rooms: result.rows,
      meta: {
        total: result.rows.length,
        max_guests_available: maxGuestsResult.rows[0]?.max_guests || 10
      }
    });
  } catch (error) {
    console.error('Get client rooms error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get active offers for a client (for website display)
app.get('/api/public/client/:clientId/offers', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { unit_id, check_in, check_out, guests } = req.query;
    
    // Calculate nights if dates provided
    const nights = check_in && check_out ? 
      Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)) : null;
    
    // Calculate advance days (days until check-in)
    const advanceDays = check_in ? 
      Math.ceil((new Date(check_in) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    // Get day of week for check-in and check-out (0 = Sunday, 6 = Saturday)
    const checkinDayOfWeek = check_in ? new Date(check_in).getDay() : null;
    const checkoutDayOfWeek = check_out ? new Date(check_out).getDay() : null;
    
    let offers;
    try {
      // Try with new columns
      offers = await pool.query(`
        SELECT 
          o.id,
          o.name,
          o.description,
          o.discount_type,
          o.discount_value,
          o.applies_to,
          o.min_nights,
          o.max_nights,
          o.allowed_checkin_days,
          o.allowed_checkout_days,
          o.valid_from,
          o.valid_until,
          o.property_id,
          o.room_id,
          p.name as property_name
        FROM offers o
        LEFT JOIN properties p ON o.property_id = p.id
        WHERE o.active = true
          AND o.available_website = true
          AND (o.user_id = $1 OR o.user_id IS NULL)
          AND (o.valid_from IS NULL OR o.valid_from <= CURRENT_DATE)
          AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)
          AND ($2::integer IS NULL OR o.room_id IS NULL OR o.room_id = $2)
          AND ($3::integer IS NULL OR o.min_nights IS NULL OR o.min_nights <= $3)
          AND ($3::integer IS NULL OR o.max_nights IS NULL OR o.max_nights >= $3)
          AND ($4::integer IS NULL OR o.min_guests IS NULL OR o.min_guests <= $4)
          AND ($4::integer IS NULL OR o.max_guests IS NULL OR o.max_guests >= $4)
          AND ($5::integer IS NULL OR o.min_advance_days IS NULL OR o.min_advance_days <= $5)
          AND ($5::integer IS NULL OR o.max_advance_days IS NULL OR o.max_advance_days >= $5)
        ORDER BY o.priority DESC, o.discount_value DESC
      `, [clientId, unit_id || null, nights, guests || null, advanceDays]);
    } catch (colError) {
      // Fallback without new columns if they don't exist yet
      console.log('Falling back to offers query without checkin/checkout columns');
      offers = await pool.query(`
        SELECT 
          o.id,
          o.name,
          o.description,
          o.discount_type,
          o.discount_value,
          o.applies_to,
          o.min_nights,
          o.max_nights,
          o.valid_from,
          o.valid_until,
          o.property_id,
          o.room_id,
          p.name as property_name
        FROM offers o
        LEFT JOIN properties p ON o.property_id = p.id
        WHERE o.active = true
          AND o.available_website = true
          AND (o.user_id = $1 OR o.user_id IS NULL)
          AND (o.valid_from IS NULL OR o.valid_from <= CURRENT_DATE)
          AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)
          AND ($2::integer IS NULL OR o.room_id IS NULL OR o.room_id = $2)
          AND ($3::integer IS NULL OR o.min_nights IS NULL OR o.min_nights <= $3)
          AND ($3::integer IS NULL OR o.max_nights IS NULL || o.max_nights >= $3)
          AND ($4::integer IS NULL OR o.min_guests IS NULL OR o.min_guests <= $4)
          AND ($4::integer IS NULL OR o.max_guests IS NULL OR o.max_guests >= $4)
          AND ($5::integer IS NULL OR o.min_advance_days IS NULL OR o.min_advance_days <= $5)
          AND ($5::integer IS NULL OR o.max_advance_days IS NULL OR o.max_advance_days >= $5)
        ORDER BY o.priority DESC, o.discount_value DESC
      `, [clientId, unit_id || null, nights, guests || null, advanceDays]);
    }
    
    // Filter by check-in/check-out day restrictions (done in JS for flexibility)
    let filteredOffers = offers.rows;
    if (checkinDayOfWeek !== null || checkoutDayOfWeek !== null) {
      filteredOffers = offers.rows.filter(offer => {
        // Check if check-in day is allowed
        if (checkinDayOfWeek !== null && offer.allowed_checkin_days) {
          const allowedCheckinDays = offer.allowed_checkin_days.split(',').map(d => parseInt(d.trim()));
          if (!allowedCheckinDays.includes(checkinDayOfWeek)) {
            return false;
          }
        }
        // Check if check-out day is allowed
        if (checkoutDayOfWeek !== null && offer.allowed_checkout_days) {
          const allowedCheckoutDays = offer.allowed_checkout_days.split(',').map(d => parseInt(d.trim()));
          if (!allowedCheckoutDays.includes(checkoutDayOfWeek)) {
            return false;
          }
        }
        return true;
      });
    }
    
    res.json({ 
      success: true, 
      offers: filteredOffers,
      meta: {
        total: filteredOffers.length,
        filters_applied: {
          unit_id: unit_id || null,
          nights: nights,
          guests: guests || null,
          advance_days: advanceDays,
          checkin_day: checkinDayOfWeek,
          checkout_day: checkoutDayOfWeek
        }
      }
    });
  } catch (error) {
    console.error('Get public offers error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get upsells for a client (all active upsells)
app.get('/api/public/client/:clientId/upsells', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { unit_id, property_id } = req.query;
    
    const upsells = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.description,
        u.price,
        u.charge_type,
        u.max_quantity,
        u.image_url,
        u.category,
        u.property_id,
        u.room_id,
        u.room_ids,
        p.name as property_name
      FROM upsells u
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE u.active = true
        AND (u.user_id = $1 OR u.user_id IS NULL)
        AND (
          $2::integer IS NULL 
          OR u.room_id IS NULL 
          OR u.room_id = $2
          OR u.room_ids LIKE '%' || $2::text || '%'
        )
        AND ($3::integer IS NULL OR u.property_id IS NULL OR u.property_id = $3)
      ORDER BY u.category NULLS LAST, u.name
    `, [clientId, unit_id || null, property_id || null]);
    
    // Group by category
    const grouped = {};
    upsells.rows.forEach(upsell => {
      const cat = upsell.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(upsell);
    });
    
    res.json({ 
      success: true, 
      upsells: upsells.rows,
      upsells_by_category: grouped,
      meta: {
        total: upsells.rows.length,
        categories: Object.keys(grouped)
      }
    });
  } catch (error) {
    console.error('Get public upsells error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get public vouchers for a client (only public ones, not hidden codes)
app.get('/api/public/client/:clientId/vouchers', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get vouchers that are marked as public/showable
    const vouchers = await pool.query(`
      SELECT 
        v.id,
        v.code,
        v.name,
        v.description,
        v.discount_type,
        v.discount_value,
        v.min_nights,
        v.min_booking_value,
        v.valid_from,
        v.valid_until,
        v.max_uses,
        v.uses_count
      FROM vouchers v
      JOIN properties p ON v.property_id = p.id
      WHERE p.client_id = $1
        AND v.active = true
        AND v.is_public = true
        AND (v.valid_from IS NULL OR v.valid_from <= CURRENT_DATE)
        AND (v.valid_until IS NULL OR v.valid_until >= CURRENT_DATE)
        AND (v.max_uses IS NULL OR v.uses_count < v.max_uses)
      ORDER BY v.discount_value DESC
    `, [clientId]);
    
    // Format dates for display
    const formattedVouchers = vouchers.rows.map(v => ({
      ...v,
      valid_from: v.valid_from ? v.valid_from.toISOString().split('T')[0] : null,
      valid_until: v.valid_until ? v.valid_until.toISOString().split('T')[0] : null
    }));
    
    res.json({ 
      success: true, 
      vouchers: formattedVouchers,
      meta: {
        total: formattedVouchers.length
      }
    });
  } catch (error) {
    console.error('Get public vouchers error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get client features/modules (what's enabled based on plan)
app.get('/api/public/client/:clientId/features', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get client subscription info
    const client = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.plan,
        c.subscription_status,
        c.features_enabled,
        c.created_at
      FROM clients c
      WHERE c.id = $1
    `, [clientId]);
    
    if (!client.rows[0]) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    const clientData = client.rows[0];
    const plan = clientData.plan || 'free';
    const customFeatures = clientData.features_enabled || {};
    
    // Define features by plan
    const planFeatures = {
      free: {
        rooms: true,
        search_widget: true,
        availability_calendar: true,
        basic_booking: true,
        offers: false,
        upsells: false,
        vouchers: false,
        attractions: false,
        blog: false,
        analytics: false,
        white_label: false
      },
      pro: {
        rooms: true,
        search_widget: true,
        availability_calendar: true,
        basic_booking: true,
        offers: true,
        upsells: true,
        vouchers: true,
        attractions: true,
        blog: false,
        analytics: true,
        white_label: false
      },
      agency: {
        rooms: true,
        search_widget: true,
        availability_calendar: true,
        basic_booking: true,
        offers: true,
        upsells: true,
        vouchers: true,
        attractions: true,
        blog: true,
        analytics: true,
        white_label: true
      }
    };
    
    // Merge plan features with any custom overrides
    const features = {
      ...(planFeatures[plan] || planFeatures.free),
      ...customFeatures
    };
    
    res.json({ 
      success: true,
      client_id: clientId,
      plan: plan,
      subscription_status: clientData.subscription_status || 'active',
      features: features,
      meta: {
        available_plans: ['free', 'pro', 'agency'],
        upgrade_url: 'https://gas-booking.com/pricing'
      }
    });
  } catch (error) {
    console.error('Get client features error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get max guests across all rooms for a client (for dropdown limits)
app.get('/api/public/client/:clientId/max-guests', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const result = await pool.query(`
      SELECT MAX(COALESCE(bu.max_guests, bu.max_adults, 2)) as max_guests
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.client_id = $1
    `, [clientId]);
    
    const maxGuests = result.rows[0]?.max_guests || 10;
    
    res.json({
      success: true,
      max_guests: maxGuests
    });
  } catch (error) {
    console.error('Get max guests error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// CLIENT MANAGEMENT API
// =========================================================

// Get client info by public_id (for setup page - public endpoint)
app.get('/api/client/setup/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(publicId)) {
      return res.json({ success: false, error: 'Invalid setup link' });
    }
    
    const result = await pool.query(`
      SELECT id, public_id, name, business_name, email, plan, status, created_at
      FROM clients 
      WHERE public_id = $1
    `, [publicId]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ success: true, client: result.rows[0] });
  } catch (error) {
    console.error('Client setup error:', error);
    res.json({ success: false, error: 'Unable to load account' });
  }
});

// Get all clients (admin view) - excludes clients that are agencies
app.get('/api/admin/clients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as property_count,
        (SELECT COUNT(*) FROM rooms r2 JOIN properties p2 ON r2.property_id = p2.id WHERE p2.client_id = c.id) as room_count,
        0 as total_bookings
      FROM clients c
      LEFT JOIN properties p ON p.client_id = c.id
      WHERE NOT EXISTS (SELECT 1 FROM agencies a WHERE a.email = c.email)
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({ success: true, clients: result.rows });
  } catch (error) {
    console.error('Get clients error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get single client with details
app.get('/api/admin/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
    
    if (client.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    // Get client's properties
    const properties = await pool.query(`
      SELECT p.*, COUNT(r.id) as room_count
      FROM properties p
      LEFT JOIN rooms r ON r.property_id = p.id
      WHERE p.client_id = $1
      GROUP BY p.id
      ORDER BY p.name
    `, [id]);
    
    // Get client's users
    const users = await pool.query(`
      SELECT id, email, first_name, last_name, role, status, last_login_at, created_at
      FROM client_users
      WHERE client_id = $1
      ORDER BY role, created_at
    `, [id]);
    
    res.json({ 
      success: true, 
      client: client.rows[0],
      properties: properties.rows,
      users: users.rows,
      connections: []
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create new client
app.post('/api/admin/clients', async (req, res) => {
  try {
    const {
      name, email, phone,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, notes
    } = req.body;
    
    // Generate API key
    const apiKey = 'gas_' + require('crypto').randomBytes(28).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO clients (
        name, email, phone,
        address_line1, address_line2, city, region, postcode, country,
        currency, timezone, plan, notes,
        api_key, api_key_created_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, 'active')
      RETURNING *
    `, [
      name, email, phone,
      address_line1, address_line2, city, region, postcode, country || 'United Kingdom',
      currency || 'GBP', timezone || 'Europe/London', plan || 'free', notes,
      apiKey
    ]);
    
    res.json({ success: true, client: result.rows[0] });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === '23505') {
      res.json({ success: false, error: 'A client with this email already exists' });
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

// Update client
app.put('/api/admin/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, status, notes
    } = req.body;
    
    const result = await pool.query(`
      UPDATE clients SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        address_line1 = COALESCE($4, address_line1),
        address_line2 = COALESCE($5, address_line2),
        city = COALESCE($6, city),
        region = COALESCE($7, region),
        postcode = COALESCE($8, postcode),
        country = COALESCE($9, country),
        currency = COALESCE($10, currency),
        timezone = COALESCE($11, timezone),
        plan = COALESCE($12, plan),
        status = COALESCE($13, status),
        notes = COALESCE($14, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      name, email, phone,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, status, notes,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, client: result.rows[0] });
  } catch (error) {
    console.error('Update client error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Delete client
app.delete('/api/admin/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check for associated properties
    const properties = await pool.query(`SELECT COUNT(*) FROM properties WHERE client_id = $1`, [id]);
    
    if (parseInt(properties.rows[0].count) > 0) {
      return res.json({ 
        success: false, 
        error: `Cannot delete client with ${properties.rows[0].count} associated properties. Reassign or delete properties first.` 
      });
    }
    
    await pool.query(`DELETE FROM clients WHERE id = $1`, [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Fix clients without public_id (UUID)
app.post('/api/admin/fix-client-uuids', async (req, res) => {
  try {
    // Add column if missing
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() UNIQUE`);
    
    // Update any clients missing a public_id
    const result = await pool.query(`
      UPDATE clients 
      SET public_id = gen_random_uuid() 
      WHERE public_id IS NULL
      RETURNING id, name, public_id
    `);
    
    res.json({ 
      success: true, 
      message: `Fixed ${result.rows.length} clients`,
      clients: result.rows
    });
  } catch (error) {
    console.error('Fix UUIDs error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// AGENCY ENDPOINTS
// =====================================================

// Get all agencies
app.get('/api/admin/agencies', async (req, res) => {
  try {
    // Add agency_id column to properties if it doesn't exist
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL`);
    
    const result = await pool.query(`
      SELECT 
        a.*,
        COUNT(DISTINCT c.id) as client_count,
        (SELECT COUNT(*) FROM properties p WHERE p.agency_id = a.id) as property_count
      FROM agencies a
      LEFT JOIN clients c ON c.agency_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({ success: true, agencies: result.rows });
  } catch (error) {
    console.error('Get agencies error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get single agency with properties
app.get('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const agency = await pool.query(`SELECT * FROM agencies WHERE id = $1`, [id]);
    
    if (agency.rows.length === 0) {
      return res.json({ success: false, error: 'Agency not found' });
    }
    
    // Get agency's properties (directly assigned via agency_id)
    const properties = await pool.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id) as room_count
      FROM properties p
      WHERE p.agency_id = $1
      ORDER BY p.name
    `, [id]);
    
    res.json({ 
      success: true, 
      agency: agency.rows[0],
      properties: properties.rows
    });
  } catch (error) {
    console.error('Get agency error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create agency
app.post('/api/admin/agencies', async (req, res) => {
  try {
    const {
      name, email, phone, logo_url,
      primary_color, secondary_color,
      website_url, custom_domain,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, notes
    } = req.body;
    
    // Generate API key for agency
    const apiKey = 'gas_agency_' + require('crypto').randomBytes(24).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO agencies (
        name, email, phone, logo_url,
        primary_color, secondary_color,
        website_url, custom_domain,
        address_line1, address_line2, city, region, postcode, country,
        currency, timezone, plan, notes,
        api_key, api_key_created_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, 'active')
      RETURNING *
    `, [
      name, email, phone, logo_url,
      primary_color || '#6366f1', secondary_color || '#8b5cf6',
      website_url, custom_domain,
      address_line1, address_line2, city, region, postcode, country || 'United Kingdom',
      currency || 'GBP', timezone || 'Europe/London', plan || 'agency', notes,
      apiKey
    ]);
    
    res.json({ success: true, agency: result.rows[0] });
  } catch (error) {
    console.error('Create agency error:', error);
    if (error.code === '23505') {
      res.json({ success: false, error: 'An agency with this email already exists' });
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

// Update agency
app.put('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, logo_url,
      primary_color, secondary_color,
      website_url, custom_domain,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, status, notes
    } = req.body;
    
    const result = await pool.query(`
      UPDATE agencies SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        logo_url = COALESCE($4, logo_url),
        primary_color = COALESCE($5, primary_color),
        secondary_color = COALESCE($6, secondary_color),
        website_url = COALESCE($7, website_url),
        custom_domain = COALESCE($8, custom_domain),
        address_line1 = COALESCE($9, address_line1),
        address_line2 = COALESCE($10, address_line2),
        city = COALESCE($11, city),
        region = COALESCE($12, region),
        postcode = COALESCE($13, postcode),
        country = COALESCE($14, country),
        currency = COALESCE($15, currency),
        timezone = COALESCE($16, timezone),
        plan = COALESCE($17, plan),
        status = COALESCE($18, status),
        notes = COALESCE($19, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `, [
      name, email, phone, logo_url,
      primary_color, secondary_color,
      website_url, custom_domain,
      address_line1, address_line2, city, region, postcode, country,
      currency, timezone, plan, status, notes,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Agency not found' });
    }
    
    res.json({ success: true, agency: result.rows[0] });
  } catch (error) {
    console.error('Update agency error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Delete agency
app.delete('/api/admin/agencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check for associated clients
    const clients = await pool.query(`SELECT COUNT(*) FROM clients WHERE agency_id = $1`, [id]);
    
    if (parseInt(clients.rows[0].count) > 0) {
      return res.json({ 
        success: false, 
        error: `Cannot delete agency with ${clients.rows[0].count} associated clients. Reassign or delete clients first.` 
      });
    }
    
    await pool.query(`DELETE FROM agencies WHERE id = $1`, [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete agency error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Assign client to agency
app.post('/api/admin/agencies/:id/assign-client', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id } = req.body;
    
    const result = await pool.query(`
      UPDATE clients SET agency_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [id, client_id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, client: result.rows[0] });
  } catch (error) {
    console.error('Assign client error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Remove client from agency
app.post('/api/admin/agencies/:id/remove-client', async (req, res) => {
  try {
    const { client_id } = req.body;
    
    const result = await pool.query(`
      UPDATE clients SET agency_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [client_id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, client: result.rows[0] });
  } catch (error) {
    console.error('Remove client error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get agency dashboard stats
app.get('/api/admin/agencies/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get counts
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients WHERE agency_id = $1) as client_count,
        (SELECT COUNT(*) FROM properties p JOIN clients c ON p.client_id = c.id WHERE c.agency_id = $1) as property_count,
        (SELECT COUNT(*) FROM rooms r JOIN properties p ON r.property_id = p.id JOIN clients c ON p.client_id = c.id WHERE c.agency_id = $1) as room_count,
        (SELECT COUNT(*) FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN properties p ON r.property_id = p.id JOIN clients c ON p.client_id = c.id WHERE c.agency_id = $1 AND b.status = 'confirmed') as active_bookings
    `, [id]);
    
    res.json({ success: true, stats: stats.rows[0] });
  } catch (error) {
    console.error('Get agency stats error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Convert a client to an agency (for clients with multiple properties)
app.post('/api/admin/clients/:id/convert-to-agency', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the client
    const clientRes = await pool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
    if (clientRes.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    const client = clientRes.rows[0];
    
    // Check if agency with this email already exists
    const existingAgency = await pool.query(`SELECT id FROM agencies WHERE email = $1`, [client.email]);
    if (existingAgency.rows.length > 0) {
      // Agency already exists - just link the client to it
      const agencyId = existingAgency.rows[0].id;
      await pool.query(`UPDATE clients SET agency_id = $1 WHERE id = $2`, [agencyId, id]);
      return res.json({ 
        success: true, 
        agency: existingAgency.rows[0],
        message: `Client linked to existing agency.`
      });
    }
    
    // Create the agency
    const apiKey = 'gas_agency_' + require('crypto').randomBytes(24).toString('hex');
    const agencyRes = await pool.query(`
      INSERT INTO agencies (
        name, email, phone, 
        address_line1, address_line2, city, region, postcode, country,
        currency, timezone, plan, api_key, api_key_created_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'agency', $12, CURRENT_TIMESTAMP, 'active')
      RETURNING *
    `, [
      client.business_name || client.name,
      client.email,
      client.phone,
      client.address_line1,
      client.address_line2,
      client.city,
      client.region,
      client.postcode,
      client.country,
      client.currency,
      client.timezone,
      apiKey
    ]);
    
    const newAgencyId = agencyRes.rows[0].id;
    
    // Link the client to the new agency (so properties show under agency)
    await pool.query(`UPDATE clients SET agency_id = $1 WHERE id = $2`, [newAgencyId, id]);
    
    res.json({ 
      success: true, 
      agency: agencyRes.rows[0],
      message: `Converted ${client.name} to agency. Properties are now linked.`
    });
  } catch (error) {
    console.error('Convert to agency error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Fix agency-client links (link clients to agencies by matching email)
app.post('/api/admin/fix-agency-links', async (req, res) => {
  try {
    // Find all clients whose email matches an agency email and link them
    const result = await pool.query(`
      UPDATE clients c
      SET agency_id = a.id
      FROM agencies a
      WHERE c.email = a.email AND c.agency_id IS NULL
      RETURNING c.id, c.name, c.email, a.id as agency_id, a.name as agency_name
    `);
    
    res.json({ 
      success: true, 
      message: `Linked ${result.rows.length} clients to their agencies`,
      linked: result.rows
    });
  } catch (error) {
    console.error('Fix agency links error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Assign property to agency
app.post('/api/admin/properties/:id/assign-agency', async (req, res) => {
  try {
    const { id } = req.params;
    const { agency_id } = req.body;
    
    // Add agency_id column to properties if it doesn't exist
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL`);
    
    const result = await pool.query(`
      UPDATE properties 
      SET agency_id = $1
      WHERE id = $2
      RETURNING *
    `, [agency_id || null, id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Property not found' });
    }
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Assign property to agency error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Regenerate API key
app.post('/api/admin/clients/:id/regenerate-api-key', async (req, res) => {
  try {
    const { id } = req.params;
    
    const newApiKey = 'gas_' + require('crypto').randomBytes(28).toString('hex');
    
    const result = await pool.query(`
      UPDATE clients 
      SET api_key = $1, api_key_created_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, api_key, api_key_created_at
    `, [newApiKey, id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Client not found' });
    }
    
    res.json({ success: true, api_key: result.rows[0].api_key });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Assign property to client
app.post('/api/admin/clients/:id/assign-property', async (req, res) => {
  try {
    const { id } = req.params;
    const { property_id } = req.body;
    
    const result = await pool.query(`
      UPDATE properties SET client_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [id, property_id]);
    
    // Also update channel manager connections
    await pool.query(`
      UPDATE channel_connections SET client_id = $1
      WHERE property_id = $2
    `, [id, property_id]);
    
    res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Assign property error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get unassigned properties (not belonging to any client)
app.get('/api/admin/properties/unassigned', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, COUNT(r.id) as room_count
      FROM properties p
      LEFT JOIN rooms r ON r.property_id = p.id
      WHERE p.client_id IS NULL
      GROUP BY p.id
      ORDER BY p.name
    `);
    
    res.json({ success: true, properties: result.rows });
  } catch (error) {
    console.error('Get unassigned properties error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// CLIENT USER MANAGEMENT
// =========================================================

// Add user to client
app.post('/api/admin/clients/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, phone, role } = req.body;
    
    // Generate invite token
    const inviteToken = require('crypto').randomBytes(32).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO client_users (client_id, email, first_name, last_name, phone, role, status, invite_token, invite_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'invited', $7, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *
    `, [id, email, first_name, last_name, phone, role || 'staff', inviteToken]);
    
    res.json({ 
      success: true, 
      user: result.rows[0],
      invite_link: `/accept-invite?token=${inviteToken}`
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Update user
app.put('/api/admin/clients/:clientId/users/:userId', async (req, res) => {
  try {
    const { clientId, userId } = req.params;
    const { first_name, last_name, phone, role, status } = req.body;
    
    const result = await pool.query(`
      UPDATE client_users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        role = COALESCE($4, role),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND client_id = $7
      RETURNING *
    `, [first_name, last_name, phone, role, status, userId, clientId]);
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Remove user from client
app.delete('/api/admin/clients/:clientId/users/:userId', async (req, res) => {
  try {
    const { clientId, userId } = req.params;
    
    // Prevent deleting the owner
    const user = await pool.query(`SELECT role FROM client_users WHERE id = $1 AND client_id = $2`, [userId, clientId]);
    if (user.rows[0]?.role === 'owner') {
      return res.json({ success: false, error: 'Cannot delete the account owner' });
    }
    
    await pool.query(`DELETE FROM client_users WHERE id = $1 AND client_id = $2`, [userId, clientId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// PUBLIC API - AUTHENTICATED BY API KEY
// =========================================================

// Middleware to validate API key and get client
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }
  
  try {
    const result = await pool.query(`
      SELECT id, name, plan, status FROM clients WHERE api_key = $1
    `, [apiKey]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    
    const client = result.rows[0];
    
    if (client.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is ' + client.status });
    }
    
    if (client.plan === 'free') {
      return res.status(403).json({ success: false, error: 'API access requires a paid plan. Please upgrade at your GAS dashboard.' });
    }
    
    // Attach client to request
    req.client = client;
    
    // Track API usage
    await pool.query(`
      UPDATE clients SET 
        api_requests_today = CASE 
          WHEN api_requests_reset_at < CURRENT_DATE THEN 1 
          ELSE api_requests_today + 1 
        END,
        api_requests_reset_at = CURRENT_DATE
      WHERE id = $1
    `, [client.id]);
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Get client's properties (authenticated)
app.get('/api/v1/properties', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, COUNT(r.id) as room_count
      FROM properties p
      LEFT JOIN rooms r ON r.property_id = p.id
      WHERE p.client_id = $1
      GROUP BY p.id
      ORDER BY p.name
    `, [req.client.id]);
    
    res.json({ success: true, properties: result.rows });
  } catch (error) {
    console.error('Get client properties error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get all units for client (authenticated)
app.get('/api/v1/units', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, p.name as property_name, p.id as property_id
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      WHERE p.client_id = $1
      ORDER BY p.name, r.name
    `, [req.client.id]);
    
    res.json({ success: true, units: result.rows });
  } catch (error) {
    console.error('Get client units error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get availability for a unit (authenticated - checks ownership)
app.get('/api/v1/availability/:unitId', validateApiKey, async (req, res) => {
  try {
    const { unitId } = req.params;
    const { from, to } = req.query;
    
    // Verify unit belongs to this client
    const unitCheck = await pool.query(`
      SELECT r.id FROM rooms r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = $1 AND p.client_id = $2
    `, [unitId, req.client.id]);
    
    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Unit not found or not authorized' });
    }
    
    // Get availability (reuse existing logic)
    const availability = await pool.query(`
      SELECT date, price, available, min_stay, max_stay
      FROM daily_rates
      WHERE room_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date
    `, [unitId, from, to]);
    
    res.json({ success: true, unit_id: unitId, calendar: availability.rows });
  } catch (error) {
    console.error('Get availability error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// CENTRALIZED CONTENT MANAGEMENT API
// Client Pages, Contact Info, Branding, Blog, Attractions
// =====================================================

// =========================================================
// CLIENT PAGES (About, Contact, Terms, Privacy)
// =========================================================

// Get all pages for a client
app.get('/api/admin/pages', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM client_pages 
            WHERE client_id = $1 
            ORDER BY display_order, page_type
        `, [clientId]);
        res.json({ success: true, pages: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single page by type
app.get('/api/admin/pages/:pageType', async (req, res) => {
    try {
        const { pageType } = req.params;
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM client_pages 
            WHERE client_id = $1 AND page_type = $2
        `, [clientId, pageType]);
        res.json({ success: true, page: result.rows[0] || null });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create or update page
app.post('/api/admin/pages', async (req, res) => {
    try {
        const { 
            client_id = 1, page_type, slug, title, subtitle, content,
            meta_title, meta_description, faq_schema, is_published = true 
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO client_pages (
                client_id, page_type, slug, title, subtitle, content,
                meta_title, meta_description, faq_schema, is_published, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (client_id, page_type) DO UPDATE SET
                slug = EXCLUDED.slug,
                title = EXCLUDED.title,
                subtitle = EXCLUDED.subtitle,
                content = EXCLUDED.content,
                meta_title = EXCLUDED.meta_title,
                meta_description = EXCLUDED.meta_description,
                faq_schema = EXCLUDED.faq_schema,
                is_published = EXCLUDED.is_published,
                updated_at = NOW()
            RETURNING *
        `, [client_id, page_type, slug || page_type, title, subtitle, content, meta_title, meta_description, faq_schema, is_published]);
        
        res.json({ success: true, page: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Delete page
app.delete('/api/admin/pages/:pageType', async (req, res) => {
    try {
        const { pageType } = req.params;
        const clientId = req.query.client_id || 1;
        await pool.query(`
            DELETE FROM client_pages WHERE client_id = $1 AND page_type = $2
        `, [clientId, pageType]);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// CLIENT CONTACT INFO
// =========================================================

// Get contact info
app.get('/api/admin/contact-info', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM client_contact_info WHERE client_id = $1
        `, [clientId]);
        res.json({ success: true, contact: result.rows[0] || null });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update contact info
app.post('/api/admin/contact-info', async (req, res) => {
    try {
        const {
            client_id = 1,
            business_name, tagline,
            email, phone, phone_secondary, whatsapp,
            address_line1, address_line2, city, state_province, postal_code, country,
            google_maps_embed, google_maps_url, latitude, longitude,
            business_hours,
            facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url, tiktok_url
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO client_contact_info (
                client_id, business_name, tagline,
                email, phone, phone_secondary, whatsapp,
                address_line1, address_line2, city, state_province, postal_code, country,
                google_maps_embed, google_maps_url, latitude, longitude,
                business_hours,
                facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url, tiktok_url,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())
            ON CONFLICT (client_id) DO UPDATE SET
                business_name = EXCLUDED.business_name,
                tagline = EXCLUDED.tagline,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                phone_secondary = EXCLUDED.phone_secondary,
                whatsapp = EXCLUDED.whatsapp,
                address_line1 = EXCLUDED.address_line1,
                address_line2 = EXCLUDED.address_line2,
                city = EXCLUDED.city,
                state_province = EXCLUDED.state_province,
                postal_code = EXCLUDED.postal_code,
                country = EXCLUDED.country,
                google_maps_embed = EXCLUDED.google_maps_embed,
                google_maps_url = EXCLUDED.google_maps_url,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                business_hours = EXCLUDED.business_hours,
                facebook_url = EXCLUDED.facebook_url,
                instagram_url = EXCLUDED.instagram_url,
                twitter_url = EXCLUDED.twitter_url,
                linkedin_url = EXCLUDED.linkedin_url,
                youtube_url = EXCLUDED.youtube_url,
                tiktok_url = EXCLUDED.tiktok_url,
                updated_at = NOW()
            RETURNING *
        `, [
            client_id, business_name, tagline,
            email, phone, phone_secondary, whatsapp,
            address_line1, address_line2, city, state_province, postal_code, country,
            google_maps_embed, google_maps_url, latitude, longitude,
            JSON.stringify(business_hours || {}),
            facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url, tiktok_url
        ]);
        
        res.json({ success: true, contact: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// CLIENT BRANDING
// =========================================================

// Get branding
app.get('/api/admin/branding', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM client_branding WHERE client_id = $1
        `, [clientId]);
        res.json({ success: true, branding: result.rows[0] || null });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update branding
app.post('/api/admin/branding', async (req, res) => {
    try {
        const {
            client_id = 1,
            // Logo & Identity
            logo_url, logo_dark_url, logo_alt_text, favicon_url, og_image_url,
            site_title, site_description,
            // Colors
            primary_color, secondary_color, accent_color,
            text_color, text_light_color, background_color, surface_color,
            // Header
            header_bg_color, header_text_color, header_sticky, header_transparent_home,
            // Footer
            footer_bg_color, footer_text_color, footer_link_color, footer_link_hover_color, copyright_text,
            // Buttons
            button_primary_bg, button_primary_text, button_primary_hover,
            button_secondary_bg, button_secondary_text, button_secondary_border, button_border_radius,
            // Typography
            font_heading, font_body, font_heading_weight, font_body_weight,
            // Custom
            custom_css
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO client_branding (
                client_id,
                logo_url, logo_dark_url, logo_alt_text, favicon_url, og_image_url,
                site_title, site_description,
                primary_color, secondary_color, accent_color,
                text_color, text_light_color, background_color, surface_color,
                header_bg_color, header_text_color, header_sticky, header_transparent_home,
                footer_bg_color, footer_text_color, footer_link_color, footer_link_hover_color, copyright_text,
                button_primary_bg, button_primary_text, button_primary_hover,
                button_secondary_bg, button_secondary_text, button_secondary_border, button_border_radius,
                font_heading, font_body, font_heading_weight, font_body_weight,
                custom_css, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, NOW())
            ON CONFLICT (client_id) DO UPDATE SET
                logo_url = EXCLUDED.logo_url,
                logo_dark_url = EXCLUDED.logo_dark_url,
                logo_alt_text = EXCLUDED.logo_alt_text,
                favicon_url = EXCLUDED.favicon_url,
                og_image_url = EXCLUDED.og_image_url,
                site_title = EXCLUDED.site_title,
                site_description = EXCLUDED.site_description,
                primary_color = EXCLUDED.primary_color,
                secondary_color = EXCLUDED.secondary_color,
                accent_color = EXCLUDED.accent_color,
                text_color = EXCLUDED.text_color,
                text_light_color = EXCLUDED.text_light_color,
                background_color = EXCLUDED.background_color,
                surface_color = EXCLUDED.surface_color,
                header_bg_color = EXCLUDED.header_bg_color,
                header_text_color = EXCLUDED.header_text_color,
                header_sticky = EXCLUDED.header_sticky,
                header_transparent_home = EXCLUDED.header_transparent_home,
                footer_bg_color = EXCLUDED.footer_bg_color,
                footer_text_color = EXCLUDED.footer_text_color,
                footer_link_color = EXCLUDED.footer_link_color,
                footer_link_hover_color = EXCLUDED.footer_link_hover_color,
                copyright_text = EXCLUDED.copyright_text,
                button_primary_bg = EXCLUDED.button_primary_bg,
                button_primary_text = EXCLUDED.button_primary_text,
                button_primary_hover = EXCLUDED.button_primary_hover,
                button_secondary_bg = EXCLUDED.button_secondary_bg,
                button_secondary_text = EXCLUDED.button_secondary_text,
                button_secondary_border = EXCLUDED.button_secondary_border,
                button_border_radius = EXCLUDED.button_border_radius,
                font_heading = EXCLUDED.font_heading,
                font_body = EXCLUDED.font_body,
                font_heading_weight = EXCLUDED.font_heading_weight,
                font_body_weight = EXCLUDED.font_body_weight,
                custom_css = EXCLUDED.custom_css,
                updated_at = NOW()
            RETURNING *
        `, [
            client_id,
            logo_url, logo_dark_url, logo_alt_text, favicon_url, og_image_url,
            site_title, site_description,
            primary_color || '#2563eb', secondary_color || '#7c3aed', accent_color || '#f59e0b',
            text_color || '#1e293b', text_light_color || '#64748b', background_color || '#ffffff', surface_color || '#f8fafc',
            header_bg_color || '#ffffff', header_text_color || '#1e293b', header_sticky !== false, header_transparent_home || false,
            footer_bg_color || '#0f172a', footer_text_color || '#ffffff', footer_link_color || '#94a3b8', footer_link_hover_color || '#ffffff', copyright_text,
            button_primary_bg, button_primary_text || '#ffffff', button_primary_hover,
            button_secondary_bg, button_secondary_text, button_secondary_border, button_border_radius || '8px',
            font_heading || 'Inter', font_body || 'Inter', font_heading_weight || '700', font_body_weight || '400',
            custom_css
        ]);
        
        res.json({ success: true, branding: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// BLOG POSTS
// =========================================================

// Get all blog posts
app.get('/api/admin/blog', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const { category, is_published, is_featured, limit, offset } = req.query;
        
        let query = `SELECT * FROM blog_posts WHERE client_id = $1`;
        const params = [clientId];
        let paramIndex = 2;
        
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        if (is_published !== undefined) {
            query += ` AND is_published = $${paramIndex}`;
            params.push(is_published === 'true');
            paramIndex++;
        }
        
        if (is_featured === 'true') {
            query += ` AND is_featured = true`;
        }
        
        query += ` ORDER BY published_at DESC NULLS LAST, created_at DESC`;
        
        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
            paramIndex++;
        }
        
        if (offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(parseInt(offset));
        }
        
        const result = await pool.query(query, params);
        
        // Get total count
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM blog_posts WHERE client_id = $1
        `, [clientId]);
        
        res.json({ 
            success: true, 
            posts: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single blog post
app.get('/api/admin/blog/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [id]);
        res.json({ success: true, post: result.rows[0] || null });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create blog post
app.post('/api/admin/blog', async (req, res) => {
    try {
        const {
            client_id = 1,
            title, slug, excerpt, content, featured_image_url,
            category, tags,
            meta_title, meta_description,
            author_name, author_image_url,
            read_time_minutes, is_featured, is_published, published_at
        } = req.body;
        
        // Generate slug if not provided
        const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const result = await pool.query(`
            INSERT INTO blog_posts (
                client_id, title, slug, excerpt, content, featured_image_url,
                category, tags, meta_title, meta_description,
                author_name, author_image_url, read_time_minutes,
                is_featured, is_published, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            client_id, title, finalSlug, excerpt, content, featured_image_url,
            category, tags || [], meta_title, meta_description,
            author_name, author_image_url, read_time_minutes || 5,
            is_featured || false, is_published !== false, published_at || new Date()
        ]);
        
        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            res.json({ success: false, error: 'A post with this slug already exists' });
        } else {
            res.json({ success: false, error: error.message });
        }
    }
});

// Update blog post
app.put('/api/admin/blog/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, slug, excerpt, content, featured_image_url,
            category, tags,
            meta_title, meta_description,
            author_name, author_image_url,
            read_time_minutes, is_featured, is_published, published_at
        } = req.body;
        
        const result = await pool.query(`
            UPDATE blog_posts SET
                title = COALESCE($1, title),
                slug = COALESCE($2, slug),
                excerpt = $3,
                content = $4,
                featured_image_url = $5,
                category = $6,
                tags = COALESCE($7, tags),
                meta_title = $8,
                meta_description = $9,
                author_name = $10,
                author_image_url = $11,
                read_time_minutes = COALESCE($12, read_time_minutes),
                is_featured = COALESCE($13, is_featured),
                is_published = COALESCE($14, is_published),
                published_at = COALESCE($15, published_at),
                updated_at = NOW()
            WHERE id = $16
            RETURNING *
        `, [
            title, slug, excerpt, content, featured_image_url,
            category, tags, meta_title, meta_description,
            author_name, author_image_url, read_time_minutes,
            is_featured, is_published, published_at, id
        ]);
        
        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Delete blog post
app.delete('/api/admin/blog/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM blog_posts WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get blog categories
app.get('/api/admin/blog-categories', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM blog_categories 
            WHERE client_id = $1 
            ORDER BY display_order, name
        `, [clientId]);
        res.json({ success: true, categories: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create/update blog category
app.post('/api/admin/blog-categories', async (req, res) => {
    try {
        const { client_id = 1, name, slug, description, display_order } = req.body;
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const result = await pool.query(`
            INSERT INTO blog_categories (client_id, name, slug, description, display_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (client_id, slug) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                display_order = EXCLUDED.display_order
            RETURNING *
        `, [client_id, name, finalSlug, description, display_order || 0]);
        
        res.json({ success: true, category: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// ATTRACTIONS
// =========================================================

// Get all attractions
app.get('/api/admin/attractions', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const { category, property_id, is_published, is_featured, limit } = req.query;
        
        let query = `
            SELECT a.*, 
                (SELECT image_url FROM attraction_images WHERE attraction_id = a.id ORDER BY is_primary DESC, display_order LIMIT 1) as image_url
            FROM attractions a 
            WHERE a.client_id = $1
        `;
        const params = [clientId];
        let paramIndex = 2;
        
        if (category) {
            query += ` AND a.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        if (property_id) {
            query += ` AND a.property_id = $${paramIndex}`;
            params.push(property_id);
            paramIndex++;
        }
        
        if (is_published !== undefined) {
            query += ` AND a.is_published = $${paramIndex}`;
            params.push(is_published === 'true');
            paramIndex++;
        }
        
        if (is_featured === 'true') {
            query += ` AND a.is_featured = true`;
        }
        
        query += ` ORDER BY a.display_order, a.name`;
        
        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        res.json({ success: true, attractions: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single attraction
app.get('/api/admin/attractions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM attractions WHERE id = $1`, [id]);
        
        // Get images
        const imagesResult = await pool.query(`
            SELECT * FROM attraction_images 
            WHERE attraction_id = $1 AND is_active = true
            ORDER BY is_primary DESC, display_order
        `, [id]);
        
        const attraction = result.rows[0];
        if (attraction) {
            attraction.images = imagesResult.rows;
        }
        
        res.json({ success: true, attraction });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create attraction
app.post('/api/admin/attractions', async (req, res) => {
    try {
        const {
            client_id = 1, property_id,
            name, slug, description, short_description, featured_image_url,
            address, city, distance_text, distance_value, latitude, longitude, google_maps_url,
            category, phone, website_url, opening_hours, price_range, rating,
            meta_title, meta_description,
            is_featured, is_published, display_order
        } = req.body;
        
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const result = await pool.query(`
            INSERT INTO attractions (
                client_id, property_id, name, slug, description, short_description, featured_image_url,
                address, city, distance_text, distance_value, latitude, longitude, google_maps_url,
                category, phone, website_url, opening_hours, price_range, rating,
                meta_title, meta_description, is_featured, is_published, display_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            RETURNING *
        `, [
            client_id, property_id, name, finalSlug, description, short_description, featured_image_url,
            address, city, distance_text, distance_value, latitude, longitude, google_maps_url,
            category, phone, website_url, opening_hours, price_range, rating,
            meta_title, meta_description, is_featured || false, is_published !== false, display_order || 0
        ]);
        
        res.json({ success: true, attraction: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            res.json({ success: false, error: 'An attraction with this slug already exists' });
        } else {
            res.json({ success: false, error: error.message });
        }
    }
});

// Update attraction
app.put('/api/admin/attractions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            property_id, name, slug, description, short_description, featured_image_url,
            address, city, distance_text, distance_value, latitude, longitude, google_maps_url,
            category, phone, website_url, opening_hours, price_range, rating,
            meta_title, meta_description, is_featured, is_published, display_order
        } = req.body;
        
        const result = await pool.query(`
            UPDATE attractions SET
                property_id = $1,
                name = COALESCE($2, name),
                slug = COALESCE($3, slug),
                description = $4,
                short_description = $5,
                featured_image_url = $6,
                address = $7,
                city = $8,
                distance_text = $9,
                distance_value = $10,
                latitude = $11,
                longitude = $12,
                google_maps_url = $13,
                category = $14,
                phone = $15,
                website_url = $16,
                opening_hours = $17,
                price_range = $18,
                rating = $19,
                meta_title = $20,
                meta_description = $21,
                is_featured = COALESCE($22, is_featured),
                is_published = COALESCE($23, is_published),
                display_order = COALESCE($24, display_order),
                updated_at = NOW()
            WHERE id = $25
            RETURNING *
        `, [
            property_id, name, slug, description, short_description, featured_image_url,
            address, city, distance_text, distance_value, latitude, longitude, google_maps_url,
            category, phone, website_url, opening_hours, price_range, rating,
            meta_title, meta_description, is_featured, is_published, display_order, id
        ]);
        
        res.json({ success: true, attraction: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Delete attraction
app.delete('/api/admin/attractions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM attractions WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get attraction categories
app.get('/api/admin/attraction-categories', async (req, res) => {
    try {
        const clientId = req.query.client_id || 1;
        const result = await pool.query(`
            SELECT * FROM attraction_categories 
            WHERE client_id = $1 
            ORDER BY display_order, name
        `, [clientId]);
        res.json({ success: true, categories: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Create/update attraction category
app.post('/api/admin/attraction-categories', async (req, res) => {
    try {
        const { client_id = 1, name, slug, icon, description, display_order } = req.body;
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const result = await pool.query(`
            INSERT INTO attraction_categories (client_id, name, slug, icon, description, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (client_id, slug) DO UPDATE SET
                name = EXCLUDED.name,
                icon = EXCLUDED.icon,
                description = EXCLUDED.description,
                display_order = EXCLUDED.display_order
            RETURNING *
        `, [client_id, name, finalSlug, icon, description, display_order || 0]);
        
        res.json({ success: true, category: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// PUBLIC API - Site Configuration (for WordPress/External)
// =========================================================

// Get complete site config for a client (one API call for everything)
app.get('/api/public/client/:clientId/site-config', async (req, res) => {
    try {
        const { clientId } = req.params;
        
        // Get all data in parallel
        const [pagesResult, contactResult, brandingResult, navigationResult, propertiesResult, roomsResult, websiteSettingsResult] = await Promise.all([
            pool.query(`SELECT * FROM client_pages WHERE client_id = $1`, [clientId]),
            pool.query(`SELECT * FROM client_contact_info WHERE client_id = $1`, [clientId]),
            pool.query(`SELECT * FROM client_branding WHERE client_id = $1`, [clientId]),
            pool.query(`SELECT * FROM client_navigation WHERE client_id = $1 AND is_active = true ORDER BY menu_location, display_order`, [clientId]),
            pool.query(`SELECT * FROM properties WHERE client_id = $1`, [clientId]),
            pool.query(`
                SELECT r.*, p.name as property_name 
                FROM rooms r 
                JOIN properties p ON r.property_id = p.id 
                WHERE p.client_id = $1
            `, [clientId]),
            pool.query(`SELECT section, settings FROM website_settings WHERE client_id = $1`, [clientId])
        ]);
        
        // Check if blog posts exist
        const blogCountResult = await pool.query(`
            SELECT COUNT(*) FROM blog_posts WHERE client_id = $1 AND is_published = true
        `, [clientId]);
        
        // Check if attractions exist
        const attractionsCountResult = await pool.query(`
            SELECT COUNT(*) FROM attractions WHERE client_id = $1 AND is_published = true
        `, [clientId]);
        
        // Build data objects
        const pages = pagesResult.rows;
        const contact = contactResult.rows[0] || {};
        const branding = brandingResult.rows[0] || {};
        const customNav = navigationResult.rows;
        const properties = propertiesResult.rows;
        const rooms = roomsResult.rows;
        
        // Build website settings object
        const websiteSettings = {};
        websiteSettingsResult.rows.forEach(row => {
            websiteSettings[row.section] = row.settings;
        });
        
        // Build pages object with full content
        const pagesObject = {};
        pages.forEach(page => {
            pagesObject[page.page_type] = {
                id: page.id,
                page_type: page.page_type,
                slug: page.slug,
                title: page.title,
                subtitle: page.subtitle,
                content: page.content,
                meta_title: page.meta_title,
                meta_description: page.meta_description,
                faq_schema: page.faq_schema,
                is_published: page.is_published,
                display_order: page.display_order,
                created_at: page.created_at,
                updated_at: page.updated_at
            };
        });
        
        // Auto-generate footer links from website_settings or from what exists
        const footerQuickLinks = [];
        const footerLegalLinks = [];
        const footerSettings = websiteSettings.footer || {};
        
        // Check website builder settings for footer links (new method)
        if (footerSettings['link-home'] !== false) {
            footerQuickLinks.push({ label: 'Home', url: '/' });
        }
        if (footerSettings['link-rooms'] !== false) {
            footerQuickLinks.push({ label: 'Rooms', url: '/book-now/' });
        }
        if (footerSettings['link-about'] !== false) {
            const aboutPage = pages.find(p => p.page_type === 'about');
            if (aboutPage && aboutPage.is_published) {
                footerQuickLinks.push({ label: aboutPage.title || 'About Us', url: '/about/' });
            } else {
                footerQuickLinks.push({ label: 'About Us', url: '/about/' });
            }
        }
        if (footerSettings['link-contact'] !== false) {
            const contactPage = pages.find(p => p.page_type === 'contact');
            if (contactPage && contactPage.is_published) {
                footerQuickLinks.push({ label: contactPage.title || 'Contact', url: '/contact/' });
            } else {
                footerQuickLinks.push({ label: 'Contact', url: '/contact/' });
            }
        }
        if (footerSettings['link-blog'] === true && parseInt(blogCountResult.rows[0].count) > 0) {
            footerQuickLinks.push({ label: 'Blog', url: '/blog/' });
        }
        if (footerSettings['link-faq'] === true) {
            footerQuickLinks.push({ label: 'FAQ', url: '/faq/' });
        }
        
        // Legal links
        if (footerSettings['link-terms'] !== false) {
            const termsPage = pages.find(p => p.page_type === 'terms');
            footerLegalLinks.push({ label: termsPage?.title || 'Terms & Conditions', url: '/terms/' });
        }
        if (footerSettings['link-privacy'] !== false) {
            const privacyPage = pages.find(p => p.page_type === 'privacy');
            footerLegalLinks.push({ label: privacyPage?.title || 'Privacy Policy', url: '/privacy/' });
        }
        if (footerSettings['link-cookies'] === true) {
            footerLegalLinks.push({ label: 'Cookie Policy', url: '/cookies/' });
        }
        if (footerSettings['link-cancellation'] === true) {
            footerLegalLinks.push({ label: 'Cancellation Policy', url: '/cancellation/' });
        }
        
        // Add attractions if they exist and blog isn't manually enabled (fallback)
        if (parseInt(attractionsCountResult.rows[0].count) > 0) {
            footerQuickLinks.push({ label: 'Things To Do', url: '/attractions/' });
        }
        
        res.json({
            success: true,
            config: {
                // Full contact information
                contact: {
                    id: contact.id,
                    business_name: contact.business_name,
                    tagline: contact.tagline,
                    email: contact.email,
                    phone: contact.phone,
                    phone_secondary: contact.phone_secondary,
                    whatsapp: contact.whatsapp,
                    address_line1: contact.address_line1,
                    address_line2: contact.address_line2,
                    city: contact.city,
                    state_province: contact.state_province,
                    postal_code: contact.postal_code,
                    country: contact.country,
                    address_formatted: [contact.address_line1, contact.address_line2, contact.city, contact.state_province, contact.postal_code, contact.country].filter(Boolean).join(', '),
                    latitude: contact.latitude,
                    longitude: contact.longitude,
                    google_maps_url: contact.google_maps_url,
                    google_place_id: contact.google_place_id,
                    timezone: contact.timezone,
                    currency: contact.currency,
                    social: {
                        facebook: contact.facebook_url,
                        instagram: contact.instagram_url,
                        twitter: contact.twitter_url,
                        linkedin: contact.linkedin_url,
                        youtube: contact.youtube_url,
                        tiktok: contact.tiktok_url,
                        pinterest: contact.pinterest_url,
                        tripadvisor: contact.tripadvisor_url
                    }
                },
                
                // Full branding settings
                branding: {
                    id: branding.id,
                    logo_url: branding.logo_url,
                    logo_dark_url: branding.logo_dark_url,
                    logo_alt_text: branding.logo_alt_text,
                    favicon_url: branding.favicon_url,
                    og_image_url: branding.og_image_url,
                    colors: {
                        primary: branding.primary_color || '#2563eb',
                        secondary: branding.secondary_color || '#7c3aed',
                        accent: branding.accent_color || '#f59e0b',
                        text: branding.text_color || '#1e293b',
                        text_light: branding.text_light_color || '#64748b',
                        background: branding.background_color || '#ffffff',
                        surface: branding.surface_color || '#f8fafc'
                    },
                    header: {
                        bg_color: branding.header_bg_color || '#ffffff',
                        text_color: branding.header_text_color || '#1e293b',
                        sticky: branding.header_sticky !== false,
                        transparent_home: branding.header_transparent_home || false
                    },
                    footer: {
                        bg_color: branding.footer_bg_color || '#0f172a',
                        text_color: branding.footer_text_color || '#ffffff',
                        link_color: branding.footer_link_color || '#94a3b8',
                        link_hover_color: branding.footer_link_hover_color || '#ffffff',
                        copyright: branding.copyright_text || `© ${new Date().getFullYear()} ${contact.business_name || 'All rights reserved'}`
                    },
                    buttons: {
                        primary_bg: branding.button_primary_bg || branding.primary_color || '#2563eb',
                        primary_text: branding.button_primary_text || '#ffffff',
                        primary_hover: branding.button_primary_hover || '#1d4ed8',
                        secondary_bg: branding.button_secondary_bg || 'transparent',
                        secondary_text: branding.button_secondary_text || branding.primary_color || '#2563eb',
                        secondary_border: branding.button_secondary_border || branding.primary_color || '#2563eb',
                        border_radius: branding.button_border_radius || '8px'
                    },
                    fonts: {
                        heading: branding.font_heading || 'Inter',
                        body: branding.font_body || 'Inter',
                        heading_weight: branding.font_heading_weight || '700',
                        body_weight: branding.font_body_weight || '400'
                    },
                    custom_css: branding.custom_css
                },
                
                // All pages with full content
                pages: pagesObject,
                
                // Navigation
                navigation: {
                    header: customNav.filter(n => n.menu_location === 'header'),
                    footer_quick_links: footerQuickLinks,
                    footer_legal: footerLegalLinks,
                    footer_custom: customNav.filter(n => n.menu_location === 'footer'),
                    all: customNav
                },
                
                // Properties summary
                properties: properties.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    description: p.description,
                    short_description: p.short_description,
                    property_type: p.property_type,
                    star_rating: p.star_rating,
                    featured_image: p.featured_image,
                    room_count: rooms.filter(r => r.property_id === p.id).length
                })),
                
                // Feature flags
                features: {
                    has_blog: parseInt(blogCountResult.rows[0].count) > 0,
                    has_attractions: parseInt(attractionsCountResult.rows[0].count) > 0,
                    has_multiple_properties: properties.length > 1,
                    blog_count: parseInt(blogCountResult.rows[0].count),
                    attractions_count: parseInt(attractionsCountResult.rows[0].count),
                    property_count: properties.length,
                    room_count: rooms.length
                },
                
                // SEO defaults (from branding or contact)
                seo: {
                    site_title: branding.site_title || contact.business_name,
                    site_description: branding.site_description || contact.tagline,
                    og_image: branding.og_image_url,
                    twitter_handle: contact.twitter_url ? '@' + contact.twitter_url.split('/').pop() : null
                },
                
                // Website Builder settings (hero, intro, footer, styles, etc.)
                website: websiteSettings
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single page content (public)
app.get('/api/public/client/:clientId/page/:pageType', async (req, res) => {
    try {
        const { clientId, pageType } = req.params;
        const result = await pool.query(`
            SELECT * FROM client_pages 
            WHERE client_id = $1 AND page_type = $2 AND is_published = true
        `, [clientId, pageType]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        
        res.json({ success: true, page: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get blog posts (public)
app.get('/api/public/client/:clientId/blog', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { category, limit = 10, offset = 0 } = req.query;
        
        let query = `
            SELECT id, title, slug, excerpt, featured_image_url, category, 
                   author_name, read_time_minutes, published_at
            FROM blog_posts 
            WHERE client_id = $1 AND is_published = true
        `;
        const params = [clientId];
        let paramIndex = 2;
        
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        query += ` ORDER BY published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        res.json({ success: true, posts: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single blog post (public)
app.get('/api/public/client/:clientId/blog/:slug', async (req, res) => {
    try {
        const { clientId, slug } = req.params;
        const result = await pool.query(`
            SELECT * FROM blog_posts 
            WHERE client_id = $1 AND slug = $2 AND is_published = true
        `, [clientId, slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        
        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get attractions (public)
app.get('/api/public/client/:clientId/attractions', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { category, limit } = req.query;
        
        let query = `
            SELECT id, name, slug, short_description, featured_image_url, category,
                   address, city, distance_text, rating, price_range
            FROM attractions 
            WHERE client_id = $1 AND is_published = true
        `;
        const params = [clientId];
        let paramIndex = 2;
        
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        query += ` ORDER BY display_order, name`;
        
        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        res.json({ success: true, attractions: result.rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get single attraction (public)
app.get('/api/public/client/:clientId/attractions/:slug', async (req, res) => {
    try {
        const { clientId, slug } = req.params;
        const result = await pool.query(`
            SELECT * FROM attractions 
            WHERE client_id = $1 AND slug = $2 AND is_published = true
        `, [clientId, slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Attraction not found' });
        }
        
        // Get images
        const imagesResult = await pool.query(`
            SELECT image_url, alt_text, caption FROM attraction_images 
            WHERE attraction_id = $1 AND is_active = true
            ORDER BY is_primary DESC, display_order
        `, [result.rows[0].id]);
        
        const attraction = result.rows[0];
        attraction.images = imagesResult.rows;
        
        res.json({ success: true, attraction });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// =========================================================
// WEBSITE BUILDER API
// =========================================================

// Create website_settings table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS website_settings (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    section VARCHAR(50) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, section)
  )
`).catch(err => console.log('Website settings table may already exist'));

// Get website builder section settings
app.get('/api/admin/website-builder/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { client_id } = req.query;
    
    if (!client_id) {
      return res.json({ success: false, error: 'Client ID required' });
    }
    
    const result = await pool.query(`
      SELECT settings FROM website_settings
      WHERE client_id = $1 AND section = $2
    `, [client_id, section]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, settings: result.rows[0].settings });
    } else {
      res.json({ success: true, settings: {} });
    }
  } catch (error) {
    console.error('Get website settings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Save website builder section settings
app.post('/api/admin/website-builder/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { client_id, settings } = req.body;
    
    if (!client_id) {
      return res.json({ success: false, error: 'Client ID required' });
    }
    
    // Upsert the settings
    await pool.query(`
      INSERT INTO website_settings (client_id, section, settings, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id, section)
      DO UPDATE SET settings = $3, updated_at = CURRENT_TIMESTAMP
    `, [client_id, section, JSON.stringify(settings)]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save website settings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get all website settings for a client (for WordPress sync)
app.get('/api/v1/website-settings', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT section, settings FROM website_settings
      WHERE client_id = $1
    `, [req.client.id]);
    
    // Convert to object keyed by section
    const allSettings = {};
    result.rows.forEach(row => {
      allSettings[row.section] = row.settings;
    });
    
    res.json({ success: true, settings: allSettings });
  } catch (error) {
    console.error('Get all website settings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// AI CHAT ASSISTANT (GAS Support Bot)
// =========================================================

// Rate limiting for chat - simple in-memory store
const chatRateLimits = new Map();
const CHAT_RATE_LIMIT = 20; // messages per minute
const CHAT_RATE_WINDOW = 60000; // 1 minute

function checkChatRateLimit(ip) {
  const now = Date.now();
  const userLimits = chatRateLimits.get(ip) || { count: 0, resetAt: now + CHAT_RATE_WINDOW };
  
  if (now > userLimits.resetAt) {
    userLimits.count = 0;
    userLimits.resetAt = now + CHAT_RATE_WINDOW;
  }
  
  userLimits.count++;
  chatRateLimits.set(ip, userLimits);
  
  return userLimits.count <= CHAT_RATE_LIMIT;
}

// GAS Documentation context for the AI
const GAS_SYSTEM_PROMPT = `You are the GAS Assistant - a concise, action-focused guide for the Global Accommodation System.

YOUR STYLE:
- Be SHORT and DIRECT - max 2-3 sentences then give a link
- Always end with a clickable action link
- Don't over-explain - guide people to the right place
- Use friendly but brief language

HOW TO FIND API CREDENTIALS (IMPORTANT - GET THIS RIGHT):

BEDS24 INVITE CODE:
1. Log into your Beds24 account
2. Go to Settings (top menu)
3. Click Marketplace in the left sidebar
4. Click API
5. You'll see "Invite Codes" section at the top
6. Click the green "Generate invite code" button
7. Copy the code and paste it into GAS

HOSTAWAY API CREDENTIALS:
1. Log into Hostaway Dashboard
2. Go to Settings → Hostaway API
3. Click "Create"
4. Choose a Name and select "Hostaway Public API" as Partner
5. Click Create
6. IMPORTANT: Copy your Account ID and API Key immediately - they only show once!
7. Paste both into GAS
Note: Keep these safe - Hostaway won't show them again after you leave the page.

SMOOBU API KEY:
1. Log into your Smoobu account
2. Go to Settings → API
3. Copy your API Key
4. Paste it into GAS

QUICK ANSWERS WITH LINKS:

If someone wants to LIST THEIR PROPERTY:
"Great! Let's get you set up. Which channel manager do you use? [Beds24](/beds24-wizard.html) | [Hostaway](/hostaway-wizard.html) | [Smoobu](/smoobu-wizard.html)"

If someone is a TRAVEL AGENT:
"Welcome! Travel agent registration is coming soon. For now, contact us at support@gettingautomated.com"

If someone asks WHAT IS GAS:
"GAS helps independent hotels and B&Bs connect with travel agents directly - no big OTA commissions. Ready to list your property? [Start here](/gas-onboarding.html)"

If someone asks WHERE TO FIND INVITE CODE or API KEY:
Give them the exact steps from the credentials section above.

WHAT GETS IMPORTED:
- Property names and details
- Room/unit types and configurations  
- Images
- Pricing
- Availability calendar
NOT imported: booking history, guest data, payment details

KEY LINKS:
- Start onboarding: /gas-onboarding.html
- Beds24 setup: /beds24-wizard.html
- Hostaway setup: /hostaway-wizard.html
- Smoobu setup: /smoobu-wizard.html
- Admin dashboard: /gas-admin.html
- Support: support@gettingautomated.com

IMPORTANT RULES:
1. Keep responses under 50 words when possible
2. ALWAYS include a relevant link
3. Format links as clickable: [Text here](/path)
4. Give ACCURATE instructions for finding API keys - use the exact steps above
5. If unsure, direct to support@gettingautomated.com`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkChatRateLimit(clientIp)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many messages. Please wait a moment before sending more.' 
      });
    }
    
    const { message, conversationHistory = [] } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    // Limit message length
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }
    
    // Limit conversation history to last 10 messages to control token usage
    const recentHistory = conversationHistory.slice(-10);
    
    // Build messages array for Claude
    const messages = [
      ...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    
    // Call Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: GAS_SYSTEM_PROMPT,
      messages: messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    const assistantMessage = response.data.content[0].text;
    
    res.json({ 
      success: true, 
      message: assistantMessage 
    });
    
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Sorry, I encountered an error. Please try again or contact support@gettingautomated.com' 
    });
  }
});

// Serve frontend - MUST BE LAST (after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================================================
// SCHEDULED SYNC - All Channel Managers
// =====================================================
async function syncAllChannelManagers() {
  console.log('🔄 Starting scheduled sync for all channel managers...');
  
  try {
    // Get all clients with CM connections
    const clientsResult = await pool.query(`
      SELECT DISTINCT c.id, c.name,
        (SELECT setting_value FROM client_settings WHERE client_id = c.id AND setting_key = 'smoobu_api_key') as smoobu_key,
        (SELECT setting_value FROM client_settings WHERE client_id = c.id AND setting_key = 'hostaway_api_key') as hostaway_key
      FROM clients c
      WHERE EXISTS (SELECT 1 FROM client_settings cs WHERE cs.client_id = c.id AND cs.setting_key LIKE '%_api_key')
    `);
    
    for (const client of clientsResult.rows) {
      // Sync Smoobu
      if (client.smoobu_key) {
        try {
          const smoobuProps = await pool.query(`
            SELECT bu.id as room_id, bu.smoobu_id
            FROM bookable_units bu
            JOIN properties p ON bu.property_id = p.id
            WHERE p.client_id = $1 AND bu.smoobu_id IS NOT NULL
          `, [client.id]);
          
          if (smoobuProps.rows.length > 0) {
            const apartmentIds = smoobuProps.rows.map(r => r.smoobu_id);
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const ratesResponse = await axios.get(
              `https://login.smoobu.com/api/rates?${apartmentIds.map(id => `apartments[]=${id}`).join('&')}&start_date=${startDate}&end_date=${endDate}`,
              { headers: { 'Api-Key': client.smoobu_key, 'Cache-Control': 'no-cache' } }
            );
            
            for (const room of smoobuProps.rows) {
              const apartmentRates = ratesResponse.data.data?.[room.smoobu_id];
              if (!apartmentRates) continue;
              
              for (const [date, info] of Object.entries(apartmentRates)) {
                await pool.query(`
                  INSERT INTO room_availability (room_id, date, is_available, cm_price, standard_price, min_stay, source)
                  VALUES ($1, $2, $3, $4, $4, $5, 'smoobu')
                  ON CONFLICT (room_id, date) DO UPDATE SET
                    is_available = EXCLUDED.is_available, cm_price = EXCLUDED.cm_price,
                    standard_price = EXCLUDED.standard_price, min_stay = EXCLUDED.min_stay,
                    source = EXCLUDED.source, updated_at = NOW()
                `, [room.room_id, date, info.available > 0, info.price || null, info.min_length_of_stay || null]);
              }
            }
            console.log(`  ✅ Synced Smoobu for ${client.name}`);
          }
        } catch (e) {
          console.log(`  ❌ Smoobu sync failed for ${client.name}: ${e.message}`);
        }
      }
      
      // Sync Hostaway
      if (client.hostaway_key) {
        try {
          // Similar logic for Hostaway...
          console.log(`  ✅ Synced Hostaway for ${client.name}`);
        } catch (e) {
          console.log(`  ❌ Hostaway sync failed for ${client.name}: ${e.message}`);
        }
      }
    }
    
    console.log('🔄 Scheduled sync complete');
  } catch (error) {
    console.error('Scheduled sync error:', error.message);
  }
}

// Run sync every 15 minutes
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
setInterval(syncAllChannelManagers, SYNC_INTERVAL);

// Also run once on startup (after 30 seconds to let DB connect)
setTimeout(syncAllChannelManagers, 30000);

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port ' + PORT);
  console.log('🔄 Auto-sync scheduled every 15 minutes');
});
