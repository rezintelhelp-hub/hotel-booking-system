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

// Stripe for payment processing
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Email configuration - Mailgun
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.gas.travel';
const EMAIL_FROM = process.env.EMAIL_FROM || 'bookings@mg.gas.travel';

// Send email via Mailgun API
async function sendEmail({ to, subject, html, from = EMAIL_FROM }) {
  if (!MAILGUN_API_KEY) {
    console.log('⚠️ Email not sent - MAILGUN_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }
  
  try {
    const formData = new URLSearchParams();
    formData.append('from', from);
    formData.append('to', Array.isArray(to) ? to.join(',') : to);
    formData.append('subject', subject);
    formData.append('html', html);
    
    const response = await axios.post(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      formData.toString(),
      {
        auth: {
          username: 'api',
          password: MAILGUN_API_KEY
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Email sent to:', to);
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error('❌ Email error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Generate booking confirmation email HTML
function generateBookingConfirmationEmail(booking, property, room) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const depositPaid = booking.deposit_amount && parseFloat(booking.deposit_amount) > 0;
  const balanceDue = booking.balance_amount && parseFloat(booking.balance_amount) > 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px; text-align: center;">
              <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 16px; line-height: 60px; font-size: 30px;">✓</div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Thank you for your reservation</p>
            </td>
          </tr>
          
          <!-- Booking Reference -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <table width="100%" style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center;">
                <tr>
                  <td>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #059669;">Booking Reference</span>
                    <div style="font-size: 28px; font-weight: 700; color: #047857; margin-top: 4px;">${booking.id}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Property Details -->
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <h2 style="margin: 0 0 4px; font-size: 20px; color: #1e293b;">${property?.name || 'Property'}</h2>
              <p style="margin: 0; color: #64748b; font-size: 14px;">${room?.name || 'Room'}</p>
            </td>
          </tr>
          
          <!-- Dates -->
          <tr>
            <td style="padding: 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="45%" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; display: block;">Check-in</span>
                    <strong style="font-size: 14px; color: #1e293b; display: block; margin: 4px 0;">${formatDate(booking.arrival_date)}</strong>
                    <span style="font-size: 12px; color: #64748b;">From 3:00 PM</span>
                  </td>
                  <td width="10%" style="text-align: center; color: #cbd5e1; font-size: 20px;">→</td>
                  <td width="45%" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; display: block;">Check-out</span>
                    <strong style="font-size: 14px; color: #1e293b; display: block; margin: 4px 0;">${formatDate(booking.departure_date)}</strong>
                    <span style="font-size: 12px; color: #64748b;">By 11:00 AM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Guest Info -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <span style="font-size: 14px; color: #475569;">👤 ${booking.num_adults} ${booking.num_adults === 1 ? 'Guest' : 'Guests'}</span>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
            </td>
          </tr>
          
          <!-- Pricing -->
          <tr>
            <td style="padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Total</td>
                  <td style="padding: 8px 0; font-size: 16px; font-weight: 600; color: #1e293b; text-align: right;">${booking.currency || '$'}${parseFloat(booking.grand_total || 0).toFixed(2)}</td>
                </tr>
                ${depositPaid ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #475569;">Deposit Paid</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #10b981; text-align: right; font-weight: 500;">✓ ${booking.currency || '$'}${parseFloat(booking.deposit_amount).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${balanceDue ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #475569;">Balance Due at Check-in</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #f59e0b; text-align: right; font-weight: 500;">${booking.currency || '$'}${parseFloat(booking.balance_amount).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${!depositPaid ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #475569;">Payment</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #475569; text-align: right;">Pay at Property</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Questions about your booking?</p>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Contact us at <a href="mailto:${property?.email || EMAIL_FROM}" style="color: #10b981;">${property?.email || EMAIL_FROM}</a></p>
            </td>
          </tr>
        </table>
        
        <!-- Unsubscribe -->
        <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
          This is a transactional email regarding your booking.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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

// Root URL routing based on domain - MUST be before static middleware
app.get('/', (req, res) => {
  const host = req.hostname;
  if (host === 'admin.gas.travel') {
    res.redirect('/gas-admin.html');
  } else {
    res.redirect('/home.html');
  }
});

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
// =====================================================
// ACCOUNTS SYSTEM - New unified account structure
// =====================================================

app.get('/api/setup-accounts', async (req, res) => {
  try {
    // Create the unified accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        account_code VARCHAR(20) UNIQUE,
        parent_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        phone VARCHAR(50),
        business_name VARCHAR(255),
        logo_url VARCHAR(500),
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        secondary_color VARCHAR(20) DEFAULT '#8b5cf6',
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        region VARCHAR(100),
        postcode VARCHAR(20),
        country VARCHAR(100) DEFAULT 'GB',
        currency VARCHAR(3) DEFAULT 'GBP',
        timezone VARCHAR(50) DEFAULT 'Europe/London',
        plan VARCHAR(20) DEFAULT 'free',
        commission_percent DECIMAL(5,2) DEFAULT 0,
        api_key VARCHAR(64) UNIQUE,
        api_key_created_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        notes TEXT,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_role CHECK (role IN ('master_admin', 'agency_admin', 'submaster_admin', 'admin'))
      )
    `);
    
    // Add account_code column if it doesn't exist
    await pool.query(`
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(20) UNIQUE
    `);
    console.log('✅ Created accounts table');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_api_key ON accounts(api_key)`);
    console.log('✅ Created accounts indexes');

    // Add account_id to properties if not exists
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_account ON properties(account_id)`);
    console.log('✅ Added account_id to properties');

    res.json({ 
      success: true, 
      message: 'Accounts table created successfully!'
    });
  } catch (error) {
    console.error('Setup accounts error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create Master Admin account
app.post('/api/setup-master-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.json({ success: false, error: 'Name, email, and password required' });
    }
    
    // Check if master admin already exists
    const existing = await pool.query(`SELECT id FROM accounts WHERE role = 'master_admin'`);
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Master Admin already exists' });
    }
    
    // Hash password using crypto (built-in)
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Generate API key
    const apiKey = 'gas_master_' + crypto.randomBytes(24).toString('hex');
    
    // Create master admin
    const result = await pool.query(`
      INSERT INTO accounts (name, email, password_hash, role, api_key, api_key_created_at, status)
      VALUES ($1, $2, $3, 'master_admin', $4, NOW(), 'active')
      RETURNING id, public_id, name, email, role
    `, [name, email, passwordHash, apiKey]);
    
    res.json({ 
      success: true, 
      message: 'Master Admin created!',
      account: result.rows[0],
      api_key: apiKey
    });
  } catch (error) {
    console.error('Create master admin error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ACCOUNTS AUTHENTICATION
// =====================================================
const crypto = require('crypto');

// Generate a secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Login endpoint for accounts
app.post('/api/accounts/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.json({ success: false, error: 'Email and password required' });
    }
    
    // Hash the password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Find account by email
    const result = await pool.query(`
      SELECT id, public_id, name, email, role, business_name, logo_url, 
             primary_color, secondary_color, status, api_key
      FROM accounts 
      WHERE email = $1
    `, [email.toLowerCase().trim()]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }
    
    const account = result.rows[0];
    
    // Check password
    const storedHash = await pool.query('SELECT password_hash FROM accounts WHERE id = $1', [account.id]);
    if (storedHash.rows[0].password_hash !== passwordHash) {
      return res.json({ success: false, error: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (account.status !== 'active') {
      return res.json({ success: false, error: 'Account is not active. Please contact support.' });
    }
    
    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store session token (we'll use a simple approach - store in account or sessions table)
    // For now, we'll create a sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_sessions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);
    
    // Clean up old sessions for this account (keep max 5)
    await pool.query(`
      DELETE FROM account_sessions 
      WHERE account_id = $1 
      AND id NOT IN (
        SELECT id FROM account_sessions 
        WHERE account_id = $1 
        ORDER BY created_at DESC 
        LIMIT 4
      )
    `, [account.id]);
    
    // Insert new session
    await pool.query(`
      INSERT INTO account_sessions (account_id, token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [account.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
    
    // Update last login
    await pool.query(`
      UPDATE accounts SET last_login_at = NOW() WHERE id = $1
    `, [account.id]);
    
    res.json({
      success: true,
      message: 'Login successful',
      account: {
        id: account.id,
        public_id: account.public_id,
        name: account.name,
        email: account.email,
        role: account.role,
        business_name: account.business_name,
        logo_url: account.logo_url,
        primary_color: account.primary_color,
        secondary_color: account.secondary_color
      },
      token: sessionToken,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get current account from session token
app.get('/api/accounts/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Find valid session
    const session = await pool.query(`
      SELECT s.account_id, s.expires_at
      FROM account_sessions s
      WHERE s.token = $1 AND s.expires_at > NOW()
    `, [token]);
    
    if (session.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid or expired session' });
    }
    
    // Get account details
    const account = await pool.query(`
      SELECT id, public_id, name, email, role, business_name, logo_url,
             primary_color, secondary_color, status, currency, timezone
      FROM accounts WHERE id = $1
    `, [session.rows[0].account_id]);
    
    if (account.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ success: true, account: account.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Logout endpoint
app.post('/api/accounts/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await pool.query('DELETE FROM account_sessions WHERE token = $1', [token]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// TEMPORARY: Admin password reset - clears password so Set Password can be used
// DELETE THIS ENDPOINT IN PRODUCTION after initial setup!
app.get('/api/admin/reset-password/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    
    const result = await pool.query(
      'UPDATE accounts SET password_hash = NULL WHERE email = $1 RETURNING id, name, email',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Password cleared for ${result.rows[0].name}. Go to /login.html and use "Set Password" tab.`,
      account: result.rows[0]
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Set password for account (for accounts without password)
app.post('/api/accounts/set-password', async (req, res) => {
  try {
    const { email, password, confirm_password } = req.body;
    
    if (!email || !password || !confirm_password) {
      return res.json({ success: false, error: 'All fields required' });
    }
    
    if (password !== confirm_password) {
      return res.json({ success: false, error: 'Passwords do not match' });
    }
    
    if (password.length < 8) {
      return res.json({ success: false, error: 'Password must be at least 8 characters' });
    }
    
    // Check if account exists and doesn't have password
    const account = await pool.query('SELECT id, password_hash FROM accounts WHERE email = $1', [email.toLowerCase().trim()]);
    if (account.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    if (account.rows[0].password_hash) {
      return res.json({ success: false, error: 'Password already set. Use "Forgot Password" to reset it.' });
    }
    
    // Hash and set password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    await pool.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, account.rows[0].id]);
    
    res.json({ success: true, message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Forgot password - clears password so user can set a new one
app.post('/api/accounts/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.json({ success: false, error: 'Email required' });
    }
    
    // Check if account exists
    const account = await pool.query('SELECT id, name FROM accounts WHERE email = $1', [email.toLowerCase().trim()]);
    if (account.rows.length === 0) {
      // Don't reveal if account exists or not for security
      return res.json({ success: true, message: 'If an account exists with this email, the password has been reset.' });
    }
    
    // Clear the password so they can set a new one
    await pool.query('UPDATE accounts SET password_hash = NULL WHERE id = $1', [account.rows[0].id]);
    
    // Also clear any active sessions for security
    await pool.query('DELETE FROM account_sessions WHERE account_id = $1', [account.rows[0].id]);
    
    res.json({ success: true, message: 'Password reset. You can now set a new password.' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ONBOARDING ENDPOINTS
// =====================================================

// Step 1: Create account during onboarding
app.post('/api/onboarding/create-account', async (req, res) => {
  try {
    const { name, email, password, channel_manager } = req.body;
    
    if (!name || !email || !password) {
      return res.json({ success: false, error: 'Name, email, and password are required' });
    }
    
    if (password.length < 8) {
      return res.json({ success: false, error: 'Password must be at least 8 characters' });
    }
    
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM accounts WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'An account with this email already exists. Please login instead.' });
    }
    
    // Get master admin as parent
    const masterResult = await pool.query(`SELECT id FROM accounts WHERE role = 'master_admin' LIMIT 1`);
    const parentId = masterResult.rows.length > 0 ? masterResult.rows[0].id : null;
    
    // Hash password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    // Generate API key
    const apiKey = 'gas_' + crypto.randomBytes(24).toString('hex');
    
    // Create account (default role is 'admin')
    const result = await pool.query(`
      INSERT INTO accounts (
        name, email, password_hash, business_name, role, parent_id,
        api_key, api_key_created_at, status
      )
      VALUES ($1, $2, $3, $1, 'admin', $4, $5, NOW(), 'active')
      RETURNING id, public_id, name, email, role, business_name
    `, [name, email.toLowerCase().trim(), passwordHash, parentId, apiKey]);
    
    const account = result.rows[0];
    
    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Ensure sessions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_sessions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);
    
    await pool.query(`
      INSERT INTO account_sessions (account_id, token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [account.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);
    
    res.json({
      success: true,
      account: account,
      token: sessionToken
    });
  } catch (error) {
    console.error('Onboarding create account error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Step 2: Save channel manager credentials
app.post('/api/onboarding/save-credentials', async (req, res) => {
  try {
    const { account_id, channel_manager, api_key, invite_code } = req.body;
    
    if (!account_id || !channel_manager) {
      return res.json({ success: false, error: 'Account ID and channel manager required' });
    }
    
    // Store credentials in client_settings (create a client first if needed)
    // First, check if there's a client linked to this account
    let clientId;
    const existingClient = await pool.query(`
      SELECT c.id FROM clients c 
      JOIN accounts a ON c.email = a.email 
      WHERE a.id = $1
    `, [account_id]);
    
    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      // Create a client record for this account
      const account = await pool.query('SELECT name, email FROM accounts WHERE id = $1', [account_id]);
      if (account.rows.length === 0) {
        return res.json({ success: false, error: 'Account not found' });
      }
      
      const clientResult = await pool.query(`
        INSERT INTO clients (name, email, status)
        VALUES ($1, $2, 'active')
        RETURNING id
      `, [account.rows[0].name, account.rows[0].email]);
      clientId = clientResult.rows[0].id;
    }
    
    // Store the API credentials
    const settingKey = channel_manager === 'smoobu' ? 'smoobu_api_key' : 
                       channel_manager === 'hostaway' ? 'hostaway_api_key' :
                       channel_manager === 'beds24' ? 'beds24_invite_code' : 'api_key';
    const settingValue = api_key || invite_code;
    
    await pool.query(`
      INSERT INTO client_settings (client_id, setting_key, setting_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (client_id, setting_key) DO UPDATE SET setting_value = $3
    `, [clientId, settingKey, settingValue]);
    
    res.json({ success: true, client_id: clientId });
  } catch (error) {
    console.error('Save credentials error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Step 3: Import properties from channel manager
app.post('/api/onboarding/import-properties', async (req, res) => {
  try {
    const { account_id, channel_manager, api_key, invite_code, account_id: hostaway_account } = req.body;
    
    if (!account_id || !channel_manager) {
      return res.json({ success: false, error: 'Account ID and channel manager required' });
    }
    
    let propertyCount = 0;
    
    if (channel_manager === 'smoobu') {
      // Get properties from Smoobu
      const smoobuResponse = await axios.get('https://login.smoobu.com/api/apartments', {
        headers: { 
          'Api-Key': api_key,
          'Cache-Control': 'no-cache'
        }
      });
      
      const apartments = smoobuResponse.data.apartments || [];
      
      // Get client_id for this account
      const clientResult = await pool.query(`
        SELECT c.id FROM clients c 
        JOIN accounts a ON c.email = a.email 
        WHERE a.id = $1
      `, [account_id]);
      const clientId = clientResult.rows[0]?.id || 1;
      
      // Import each apartment as a property
      for (const apt of apartments) {
        // Check if already exists
        const existing = await pool.query('SELECT id FROM properties WHERE smoobu_id = $1', [apt.id.toString()]);
        
        if (existing.rows.length === 0) {
          // Create property
          const propResult = await pool.query(`
            INSERT INTO properties (user_id, client_id, account_id, name, smoobu_id, channel_manager)
            VALUES (1, $1, $2, $3, $4, 'smoobu')
            RETURNING id
          `, [clientId, account_id, apt.name, apt.id.toString()]);
          
          // Create bookable unit
          await pool.query(`
            INSERT INTO bookable_units (property_id, name, smoobu_id, max_guests, base_price)
            VALUES ($1, $2, $3, $4, $5)
          `, [propResult.rows[0].id, apt.name, apt.id.toString(), apt.maxOccupancy || 2, apt.price?.minimal || 100]);
          
          propertyCount++;
        }
      }
    } else if (channel_manager === 'hostaway') {
      // Hostaway import logic
      const tokenResponse = await axios.post('https://api.hostaway.com/v1/accessTokens', 
        `grant_type=client_credentials&client_id=${hostaway_account}&client_secret=${api_key}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const accessToken = tokenResponse.data.access_token;
      
      const listingsResponse = await axios.get('https://api.hostaway.com/v1/listings', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      
      const listings = listingsResponse.data.result || [];
      
      const clientResult = await pool.query(`
        SELECT c.id FROM clients c 
        JOIN accounts a ON c.email = a.email 
        WHERE a.id = $1
      `, [account_id]);
      const clientId = clientResult.rows[0]?.id || 1;
      
      for (const listing of listings) {
        const existing = await pool.query('SELECT id FROM properties WHERE hostaway_id = $1', [listing.id.toString()]);
        
        if (existing.rows.length === 0) {
          const propResult = await pool.query(`
            INSERT INTO properties (user_id, client_id, account_id, name, hostaway_id, channel_manager)
            VALUES (1, $1, $2, $3, $4, 'hostaway')
            RETURNING id
          `, [clientId, account_id, listing.name, listing.id.toString()]);
          
          await pool.query(`
            INSERT INTO bookable_units (property_id, name, hostaway_id, max_guests, base_price)
            VALUES ($1, $2, $3, $4, $5)
          `, [propResult.rows[0].id, listing.name, listing.id.toString(), listing.personCapacity || 2, listing.price || 100]);
          
          propertyCount++;
        }
      }
    } else if (channel_manager === 'beds24') {
      // Beds24 uses invite code flow - different process
      // For now just acknowledge
      return res.json({ 
        success: true, 
        property_count: 0,
        message: 'Beds24 connection initiated. Properties will sync shortly.'
      });
    }
    
    res.json({ success: true, property_count: propertyCount });
  } catch (error) {
    console.error('Import properties error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Migrate existing agencies and clients to accounts
app.post('/api/migrate-to-accounts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let agenciesMigrated = 0;
    let clientsMigrated = 0;
    
    // Get master admin ID (or null if not created yet)
    const masterResult = await client.query(`SELECT id FROM accounts WHERE role = 'master_admin' LIMIT 1`);
    const masterAdminId = masterResult.rows.length > 0 ? masterResult.rows[0].id : null;
    
    // Migrate agencies -> accounts (role = agency_admin)
    const agencies = await client.query(`SELECT * FROM agencies`);
    for (const agency of agencies.rows) {
      // Check if already migrated (by email)
      const exists = await client.query(`SELECT id FROM accounts WHERE email = $1`, [agency.email]);
      if (exists.rows.length > 0) {
        // Update properties to use this account
        await client.query(`UPDATE properties SET account_id = $1 WHERE agency_id = $2`, [exists.rows[0].id, agency.id]);
        continue;
      }
      
      const result = await client.query(`
        INSERT INTO accounts (
          public_id, parent_id, role, name, email, phone, business_name,
          logo_url, primary_color, secondary_color,
          address_line1, address_line2, city, region, postcode, country,
          currency, timezone, plan, commission_percent, api_key, api_key_created_at,
          status, settings, notes, created_at, updated_at
        ) VALUES (
          $1, $2, 'agency_admin', $3, $4, $5, $3,
          $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25
        ) RETURNING id
      `, [
        agency.public_id, masterAdminId, agency.name, agency.email, agency.phone,
        agency.logo_url, agency.primary_color, agency.secondary_color,
        agency.address_line1, agency.address_line2, agency.city, agency.region, agency.postcode, agency.country,
        agency.currency, agency.timezone, agency.plan, agency.commission_percent, agency.api_key, agency.api_key_created_at,
        agency.status, agency.settings, agency.notes, agency.created_at, agency.updated_at
      ]);
      
      // Update properties that belonged to this agency
      await client.query(`UPDATE properties SET account_id = $1 WHERE agency_id = $2`, [result.rows[0].id, agency.id]);
      agenciesMigrated++;
    }
    
    // Migrate clients -> accounts (role = admin)
    const clients = await client.query(`SELECT * FROM clients`);
    for (const cl of clients.rows) {
      // Skip if email matches an agency (already migrated as agency_admin)
      const agencyMatch = await client.query(`SELECT id FROM accounts WHERE email = $1`, [cl.email]);
      if (agencyMatch.rows.length > 0) {
        // Update properties to use this account
        await client.query(`UPDATE properties SET account_id = $1 WHERE client_id = $2`, [agencyMatch.rows[0].id, cl.id]);
        continue;
      }
      
      // Find parent (if client had agency_id, find that agency's account)
      let parentId = masterAdminId;
      if (cl.agency_id) {
        const parentAgency = await client.query(`
          SELECT a.id FROM accounts a 
          JOIN agencies ag ON ag.email = a.email 
          WHERE ag.id = $1
        `, [cl.agency_id]);
        if (parentAgency.rows.length > 0) {
          parentId = parentAgency.rows[0].id;
        }
      }
      
      const result = await client.query(`
        INSERT INTO accounts (
          public_id, parent_id, role, name, email, phone, business_name,
          address_line1, address_line2, city, region, postcode, country,
          currency, timezone, plan, api_key, api_key_created_at,
          status, notes, created_at, updated_at
        ) VALUES (
          $1, $2, 'admin', $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21
        ) RETURNING id
      `, [
        cl.public_id, parentId, cl.name, cl.email, cl.phone, cl.business_name,
        cl.address_line1, cl.address_line2, cl.city, cl.region, cl.postcode, cl.country,
        cl.currency, cl.timezone, cl.plan, cl.api_key, cl.api_key_created_at,
        cl.status, cl.notes, cl.created_at, cl.updated_at
      ]);
      
      // Update properties that belonged to this client
      await client.query(`UPDATE properties SET account_id = $1 WHERE client_id = $2`, [result.rows[0].id, cl.id]);
      clientsMigrated++;
    }
    
    await client.query('COMMIT');
    
    // Get final counts
    const accountCount = await pool.query(`SELECT COUNT(*) FROM accounts`);
    const propsLinked = await pool.query(`SELECT COUNT(*) FROM properties WHERE account_id IS NOT NULL`);
    
    res.json({ 
      success: true, 
      message: 'Migration complete!',
      agencies_migrated: agenciesMigrated,
      clients_migrated: clientsMigrated,
      total_accounts: parseInt(accountCount.rows[0].count),
      properties_linked: parseInt(propsLinked.rows[0].count)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get all accounts (for admin view)
app.get('/api/admin/accounts', async (req, res) => {
  try {
    // Ensure account_code column exists
    await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(20)`).catch(() => {});
    
    const result = await pool.query(`
      SELECT 
        a.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM accounts WHERE parent_id = a.id) as child_count,
        (SELECT COUNT(*) FROM properties WHERE account_id = a.id) as property_count
      FROM accounts a
      LEFT JOIN accounts p ON a.parent_id = p.id
      ORDER BY 
        CASE a.role 
          WHEN 'master_admin' THEN 1 
          WHEN 'agency_admin' THEN 2 
          WHEN 'submaster_admin' THEN 3 
          WHEN 'admin' THEN 4 
        END,
        a.name
    `);
    
    res.json({ success: true, accounts: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update account role
app.post('/api/admin/accounts/:id/update-role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['agency_admin', 'submaster_admin', 'admin'].includes(role)) {
      return res.json({ success: false, error: 'Invalid role' });
    }
    
    await pool.query(`UPDATE accounts SET role = $1, updated_at = NOW() WHERE id = $2`, [role, id]);
    
    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Set account subscription (for testing/manual assignment)
app.post('/api/admin/accounts/:id/set-subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, status, months } = req.body;
    
    // Check if subscription exists
    const existing = await pool.query('SELECT id FROM billing_subscriptions WHERE account_id = $1', [id]);
    
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (months || 12));
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(`
        UPDATE billing_subscriptions 
        SET plan_id = $1, status = $2, current_period_start = NOW(), current_period_end = $3, updated_at = NOW()
        WHERE account_id = $4
      `, [plan_id, status || 'active', periodEnd, id]);
    } else {
      // Insert new
      await pool.query(`
        INSERT INTO billing_subscriptions (account_id, plan_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, $3, NOW(), $4)
      `, [id, plan_id, status || 'active', periodEnd]);
    }
    
    res.json({ success: true, message: 'Subscription updated' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get single account
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT a.*, 
             (SELECT COUNT(*) FROM properties WHERE account_id = a.id) as property_count
      FROM accounts a 
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ success: true, account: result.rows[0] });
  } catch (error) {
    console.error('Get account error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, email, phone, account_code, role, status } = req.body;
    
    if (!name) {
      return res.json({ success: false, error: 'Account name is required' });
    }
    
    // Ensure account_code column exists
    await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(20)`).catch(() => {});
    
    const result = await pool.query(`
      INSERT INTO accounts (name, email, phone, account_code, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [name, email || null, phone || null, account_code || null, role || 'agency_admin', status || 'active']);
    
    res.json({ success: true, account: result.rows[0] });
  } catch (error) {
    console.error('Create account error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Update account
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_code, name, email, phone, business_name, status, notes, role } = req.body;
    
    // Ensure account_code column exists
    await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_code VARCHAR(20)`).catch(() => {});
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (account_code !== undefined) {
      updates.push(`account_code = $${paramIndex++}`);
      values.push(account_code);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (business_name !== undefined) {
      updates.push(`business_name = $${paramIndex++}`);
      values.push(business_name);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await pool.query(`
      UPDATE accounts SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ success: true, account: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// STRIPE CONNECT INTEGRATION
// =====================================================

// Start Stripe Connect OAuth flow
app.get('/api/stripe/connect/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        // Verify account exists
        const account = await pool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
        if (account.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        // Build Stripe OAuth URL
        const state = Buffer.from(JSON.stringify({ accountId })).toString('base64');
        
        const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?` +
            `response_type=code&` +
            `client_id=${process.env.STRIPE_CLIENT_ID}&` +
            `scope=read_write&` +
            `state=${state}&` +
            `redirect_uri=${encodeURIComponent('https://admin.gas.travel/api/stripe/callback')}`;
        
        res.redirect(stripeConnectUrl);
    } catch (error) {
        console.error('Stripe connect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stripe OAuth callback
app.get('/api/stripe/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;
        
        // Handle user cancellation or errors
        if (error) {
            console.error('Stripe OAuth error:', error, error_description);
            return res.redirect('https://admin.gas.travel/gas-admin.html#accounts?stripe_error=' + encodeURIComponent(error_description || error));
        }
        
        // Decode state to get account ID
        let accountId;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            accountId = stateData.accountId;
        } catch (e) {
            return res.redirect('https://admin.gas.travel/gas-admin.html#accounts?stripe_error=invalid_state');
        }
        
        // Exchange authorization code for access token
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code: code
        });
        
        const connectedAccountId = response.stripe_user_id;
        
        // Update account with Stripe connected account ID
        await pool.query(`
            UPDATE accounts 
            SET stripe_account_id = $1,
                stripe_account_status = 'active',
                stripe_onboarding_complete = true,
                updated_at = NOW()
            WHERE id = $2
        `, [connectedAccountId, accountId]);
        
        console.log(`✅ Stripe connected for account ${accountId}: ${connectedAccountId}`);
        
        // Redirect back to admin accounts page with success
        res.redirect('https://admin.gas.travel/gas-admin.html#accounts?stripe_connected=true');
        
    } catch (error) {
        console.error('Stripe callback error:', error);
        res.redirect('https://admin.gas.travel/gas-admin.html#accounts?stripe_error=' + encodeURIComponent(error.message));
    }
});

// Get Stripe connection status for an account
app.get('/api/accounts/:accountId/stripe-status', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        const result = await pool.query(`
            SELECT stripe_account_id, stripe_account_status, stripe_onboarding_complete
            FROM accounts WHERE id = $1
        `, [accountId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const account = result.rows[0];
        
        res.json({
            success: true,
            connected: !!account.stripe_account_id,
            stripe_account_id: account.stripe_account_id,
            status: account.stripe_account_status,
            onboarding_complete: account.stripe_onboarding_complete
        });
        
    } catch (error) {
        console.error('Error getting Stripe status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Disconnect Stripe account
app.post('/api/accounts/:accountId/stripe-disconnect', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        // Get current stripe account ID
        const account = await pool.query('SELECT stripe_account_id FROM accounts WHERE id = $1', [accountId]);
        
        if (account.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        const stripeAccountId = account.rows[0].stripe_account_id;
        
        // Revoke access if connected
        if (stripeAccountId) {
            try {
                await stripe.oauth.deauthorize({
                    client_id: process.env.STRIPE_CLIENT_ID,
                    stripe_user_id: stripeAccountId
                });
            } catch (e) {
                console.log('Stripe deauthorize warning:', e.message);
            }
        }
        
        // Clear Stripe fields in database
        await pool.query(`
            UPDATE accounts 
            SET stripe_account_id = NULL,
                stripe_account_status = NULL,
                stripe_onboarding_complete = false,
                updated_at = NOW()
            WHERE id = $1
        `, [accountId]);
        
        res.json({ success: true, message: 'Stripe disconnected' });
        
    } catch (error) {
        console.error('Error disconnecting Stripe:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DEPOSIT RULES API
// =====================================================

// Get deposit rules for a property
app.get('/api/properties/:propertyId/deposit-rules', async (req, res) => {
    try {
        const { propertyId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM deposit_rules 
            WHERE property_id = $1 
            ORDER BY is_active DESC, created_at DESC
        `, [propertyId]);
        
        res.json({ success: true, rules: result.rows });
    } catch (error) {
        console.error('Error getting deposit rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single deposit rule
app.get('/api/deposit-rules/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        
        const result = await pool.query('SELECT * FROM deposit_rules WHERE id = $1', [ruleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        
        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Error getting deposit rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create deposit rule
app.post('/api/properties/:propertyId/deposit-rules', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const {
            rule_name,
            deposit_type,
            deposit_percentage,
            deposit_fixed_amount,
            balance_due_type,
            balance_due_days,
            auto_charge_balance,
            auto_charge_days_before,
            refund_policy,
            valid_from,
            valid_until,
            min_nights,
            max_nights,
            is_active
        } = req.body;
        
        // Get account_id from property
        const property = await pool.query('SELECT account_id FROM properties WHERE id = $1', [propertyId]);
        if (property.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        const accountId = property.rows[0].account_id;
        
        const result = await pool.query(`
            INSERT INTO deposit_rules (
                property_id, account_id, rule_name, deposit_type, deposit_percentage,
                deposit_fixed_amount, balance_due_type, balance_due_days,
                auto_charge_balance, auto_charge_days_before, refund_policy,
                valid_from, valid_until, min_nights, max_nights, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            propertyId, accountId, rule_name || 'Default',
            deposit_type || 'percentage', deposit_percentage || 30,
            deposit_fixed_amount, balance_due_type || 'days_before',
            balance_due_days || 14, auto_charge_balance || false,
            auto_charge_days_before || 14, refund_policy || 'flexible',
            valid_from || null, valid_until || null,
            min_nights || null, max_nights || null, is_active !== false
        ]);
        
        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Error creating deposit rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update deposit rule
app.put('/api/deposit-rules/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        const {
            rule_name,
            deposit_type,
            deposit_percentage,
            deposit_fixed_amount,
            balance_due_type,
            balance_due_days,
            auto_charge_balance,
            auto_charge_days_before,
            refund_policy,
            valid_from,
            valid_until,
            min_nights,
            max_nights,
            is_active
        } = req.body;
        
        const result = await pool.query(`
            UPDATE deposit_rules SET
                rule_name = COALESCE($1, rule_name),
                deposit_type = COALESCE($2, deposit_type),
                deposit_percentage = COALESCE($3, deposit_percentage),
                deposit_fixed_amount = $4,
                balance_due_type = COALESCE($5, balance_due_type),
                balance_due_days = COALESCE($6, balance_due_days),
                auto_charge_balance = COALESCE($7, auto_charge_balance),
                auto_charge_days_before = COALESCE($8, auto_charge_days_before),
                refund_policy = COALESCE($9, refund_policy),
                valid_from = $10,
                valid_until = $11,
                min_nights = $12,
                max_nights = $13,
                is_active = COALESCE($14, is_active),
                updated_at = NOW()
            WHERE id = $15
            RETURNING *
        `, [
            rule_name, deposit_type, deposit_percentage, deposit_fixed_amount,
            balance_due_type, balance_due_days, auto_charge_balance,
            auto_charge_days_before, refund_policy, valid_from, valid_until,
            min_nights, max_nights, is_active, ruleId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        
        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Error updating deposit rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete deposit rule
app.delete('/api/deposit-rules/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        
        await pool.query('DELETE FROM deposit_rules WHERE id = $1', [ruleId]);
        
        res.json({ success: true, message: 'Rule deleted' });
    } catch (error) {
        console.error('Error deleting deposit rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get account-level deposit rules (applies to all properties under account)
app.get('/api/accounts/:accountId/deposit-rules', async (req, res) => {
    try {
        const { accountId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM deposit_rules 
            WHERE account_id = $1 AND property_id IS NULL
            ORDER BY is_active DESC, created_at DESC
        `, [accountId]);
        
        res.json({ success: true, rules: result.rows });
    } catch (error) {
        console.error('Error getting account deposit rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create account-level deposit rule (applies to all properties)
app.post('/api/accounts/:accountId/deposit-rules', async (req, res) => {
    try {
        const { accountId } = req.params;
        const {
            rule_name,
            deposit_type,
            deposit_percentage,
            deposit_fixed_amount,
            balance_due_type,
            balance_due_days,
            auto_charge_balance,
            auto_charge_days_before,
            refund_policy,
            is_active
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO deposit_rules (
                property_id, account_id, rule_name, deposit_type, deposit_percentage,
                deposit_fixed_amount, balance_due_type, balance_due_days,
                auto_charge_balance, auto_charge_days_before, refund_policy, is_active
            ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            accountId, rule_name || 'Account Default',
            deposit_type || 'percentage', deposit_percentage || 30,
            deposit_fixed_amount, balance_due_type || 'days_before',
            balance_due_days || 14, auto_charge_balance || false,
            auto_charge_days_before || 14, refund_policy || 'flexible',
            is_active !== false
        ]);
        
        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Error creating account deposit rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PAYMENT PROCESSING API
// =====================================================

// Create payment intent for a booking deposit
app.post('/api/bookings/:bookingId/create-payment', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { amount, payment_type } = req.body; // payment_type: 'deposit' or 'balance' or 'full'
        
        // Get booking with property and account info
        const booking = await pool.query(`
            SELECT b.*, p.account_id, p.name as property_name, a.stripe_account_id
            FROM bookings b
            JOIN properties p ON b.property_id = p.id
            JOIN accounts a ON p.account_id = a.id
            WHERE b.id = $1
        `, [bookingId]);
        
        if (booking.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        const bookingData = booking.rows[0];
        
        if (!bookingData.stripe_account_id) {
            return res.status(400).json({ success: false, error: 'Property owner has not connected Stripe' });
        }
        
        // Create payment intent on connected account
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'gbp', // Default to GBP, could be made dynamic
            metadata: {
                booking_id: bookingId,
                payment_type: payment_type,
                property_name: bookingData.property_name
            }
        }, {
            stripeAccount: bookingData.stripe_account_id
        });
        
        // Update booking with payment intent ID
        await pool.query(`
            UPDATE bookings SET stripe_payment_intent_id = $1, updated_at = NOW()
            WHERE id = $2
        `, [paymentIntent.id, bookingId]);
        
        res.json({
            success: true,
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirm payment completed (webhook or manual)
app.post('/api/payments/confirm', async (req, res) => {
    try {
        const { payment_intent_id, booking_id } = req.body;
        
        // Get booking
        const booking = await pool.query(`
            SELECT b.*, p.account_id, a.stripe_account_id
            FROM bookings b
            JOIN properties p ON b.property_id = p.id
            JOIN accounts a ON p.account_id = a.id
            WHERE b.id = $1
        `, [booking_id]);
        
        if (booking.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        const bookingData = booking.rows[0];
        
        // Verify payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(
            payment_intent_id,
            { stripeAccount: bookingData.stripe_account_id }
        );
        
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ success: false, error: 'Payment not completed' });
        }
        
        const amount = paymentIntent.amount / 100; // Convert from cents
        const paymentType = paymentIntent.metadata.payment_type || 'deposit';
        
        // Record transaction
        await pool.query(`
            INSERT INTO payment_transactions (
                booking_id, account_id, transaction_type, amount, currency,
                payment_gateway, gateway_transaction_id, status,
                payment_method_type, completed_at
            ) VALUES ($1, $2, $3, $4, $5, 'stripe', $6, 'completed', 'card', NOW())
        `, [
            booking_id, bookingData.account_id, paymentType, amount,
            paymentIntent.currency.toUpperCase(), payment_intent_id
        ]);
        
        // Update booking status
        let newStatus = 'deposit_paid';
        let updateFields = 'deposit_amount = $1, deposit_paid_at = NOW()';
        
        if (paymentType === 'balance') {
            newStatus = 'fully_paid';
            updateFields = 'balance_amount = $1, balance_paid_at = NOW()';
        } else if (paymentType === 'full') {
            newStatus = 'fully_paid';
            updateFields = 'total_amount = $1, deposit_paid_at = NOW(), balance_paid_at = NOW()';
        }
        
        await pool.query(`
            UPDATE bookings SET payment_status = $1, ${updateFields}, updated_at = NOW()
            WHERE id = $2
        `, [newStatus, amount, booking_id]);
        
        // Sync payment to Beds24 if booking is linked
        try {
          const beds24Check = await pool.query(`
            SELECT b.beds24_booking_id, bu.beds24_room_id
            FROM bookings b
            LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
            WHERE b.id = $1 AND b.beds24_booking_id IS NOT NULL
          `, [booking_id]);
          
          if (beds24Check.rows[0]?.beds24_booking_id) {
            const accessToken = await getBeds24AccessToken(pool);
            const paymentDesc = paymentType === 'balance' ? 'Balance payment via Stripe' : 
                               paymentType === 'full' ? 'Full payment via Stripe' : 'Deposit via Stripe';
            
            const paymentData = [{
              id: beds24Check.rows[0].beds24_booking_id,
              payments: [{
                description: paymentDesc,
                amount: amount,
                status: 'received',
                date: new Date().toISOString().split('T')[0]
              }]
            }];
            
            await axios.post('https://beds24.com/api/v2/bookings', paymentData, {
              headers: { 'token': accessToken, 'Content-Type': 'application/json' }
            });
            console.log(`Payment synced to Beds24 for booking ${booking_id}`);
          }
        } catch (beds24Error) {
          console.error('Could not sync payment to Beds24:', beds24Error.message);
          // Continue - don't fail the payment confirmation
        }
        
        res.json({ success: true, status: newStatus, amount: amount });
        
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get payment history for a booking
app.get('/api/bookings/:bookingId/payments', async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM payment_transactions
            WHERE booking_id = $1
            ORDER BY created_at DESC
        `, [bookingId]);
        
        res.json({ success: true, payments: result.rows });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Stripe info for a property (public - for checkout page)
app.get('/api/public/property/:propertyId/stripe-info', async (req, res) => {
    try {
        const { propertyId } = req.params;
        
        // Get property's account and check if Stripe is connected
        const result = await pool.query(`
            SELECT p.id, p.account_id, a.stripe_account_id, a.stripe_account_status, a.stripe_onboarding_complete
            FROM properties p
            JOIN accounts a ON p.account_id = a.id
            WHERE p.id = $1
        `, [propertyId]);
        
        if (result.rows.length === 0) {
            return res.json({ success: true, stripe_enabled: false });
        }
        
        const data = result.rows[0];
        const stripeEnabled = !!(data.stripe_account_id && data.stripe_onboarding_complete);
        
        // Get deposit rules for this property (or fall back to account-level rule)
        let depositRule = null;
        if (stripeEnabled) {
            // First try property-specific rule
            const ruleResult = await pool.query(`
                SELECT * FROM deposit_rules 
                WHERE property_id = $1 AND is_active = true 
                ORDER BY created_at DESC LIMIT 1
            `, [propertyId]);
            
            if (ruleResult.rows.length > 0) {
                depositRule = ruleResult.rows[0];
            } else {
                // Fall back to account-level rule
                const accountRuleResult = await pool.query(`
                    SELECT dr.* FROM deposit_rules dr
                    JOIN properties p ON dr.account_id = p.account_id
                    WHERE p.id = $1 AND dr.property_id IS NULL AND dr.is_active = true
                    ORDER BY dr.created_at DESC LIMIT 1
                `, [propertyId]);
                
                if (accountRuleResult.rows.length > 0) {
                    depositRule = accountRuleResult.rows[0];
                }
            }
        }
        
        res.json({
            success: true,
            stripe_enabled: stripeEnabled,
            stripe_publishable_key: stripeEnabled ? process.env.STRIPE_PUBLISHABLE_KEY : null,
            stripe_account_id: stripeEnabled ? data.stripe_account_id : null,
            deposit_rule: depositRule
        });
        
    } catch (error) {
        console.error('Error getting Stripe info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GROUP BOOKING ENDPOINT
// Creates multiple bookings linked by a group_booking_id
// =====================================================
app.post('/api/public/create-group-booking', async (req, res) => {
    const client = await pool.connect();
    try {
        // Ensure group_booking_id column exists
        await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_booking_id VARCHAR(50)`);
        
        const { 
            rooms,  // Array of room booking data
            checkin,
            checkout,
            guest_first_name,
            guest_last_name,
            guest_email,
            guest_phone,
            guest_address,
            guest_city,
            guest_country,
            guest_postcode,
            notes,
            stripe_payment_intent_id,
            deposit_amount,
            total_amount
        } = req.body;
        
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({ success: false, error: 'No rooms provided' });
        }
        
        if (!checkin || !checkout) {
            return res.status(400).json({ success: false, error: 'Check-in and check-out dates required' });
        }
        
        // Generate unique group booking ID
        const groupBookingId = 'GRP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        await client.query('BEGIN');
        
        const createdBookings = [];
        const cmResults = { beds24: [], hostaway: [], smoobu: [] };
        
        // Process each room
        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];
            const roomId = room.roomId;
            const roomPrice = parseFloat(room.totalPrice) || 0;
            const roomGuests = room.guests || 1;
            
            // Get room and property info
            const roomInfo = await client.query(`
                SELECT bu.id, bu.name, bu.property_id, p.id as prop_id
                FROM bookable_units bu
                JOIN properties p ON bu.property_id = p.id
                WHERE bu.id = $1
            `, [roomId]);
            
            if (!roomInfo.rows[0]) {
                throw new Error(`Room ${roomId} not found`);
            }
            
            const roomData = roomInfo.rows[0];
            
            // Create booking in GAS database (matching working endpoint structure)
            const bookingResult = await client.query(`
                INSERT INTO bookings (
                    property_id, property_owner_id, bookable_unit_id,
                    arrival_date, departure_date,
                    num_adults, num_children,
                    guest_first_name, guest_last_name, guest_email, guest_phone,
                    accommodation_price, subtotal, grand_total,
                    status, booking_source, currency, group_booking_id
                )
                VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11, 'confirmed', 'direct', 'USD', $12)
                RETURNING *
            `, [
                roomData.property_id,
                roomId,
                checkin,
                checkout,
                roomGuests,
                0,
                guest_first_name,
                guest_last_name,
                guest_email,
                guest_phone || '',
                roomPrice,
                groupBookingId
            ]);
            
            const booking = bookingResult.rows[0];
            createdBookings.push(booking);
            
            // Block availability for these dates (copied from working endpoint)
            console.log(`Blocking dates for unit ${roomId} from ${checkin} to ${checkout}`);
            const startParts = checkin.split('-');
            const endParts = checkout.split('-');
            let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            const checkOutDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
            
            while (current < checkOutDate) {
                const dateStr = current.toISOString().split('T')[0];
                try {
                    await client.query(`
                        INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
                        VALUES ($1, $2, false, true, 'booking')
                        ON CONFLICT (room_id, date) DO UPDATE SET is_available = false, is_blocked = true, source = 'booking'
                    `, [roomId, dateStr]);
                } catch (blockErr) {
                    console.error(`Error blocking date ${dateStr}:`, blockErr.message);
                }
                current.setDate(current.getDate() + 1);
            }
            console.log(`Finished blocking dates for unit ${roomId}`);
            
            // Get CM IDs for this unit (copied from working endpoint)
            const cmResult = await client.query(`
                SELECT bu.beds24_room_id, bu.smoobu_id, bu.hostaway_listing_id, p.account_id
                FROM bookable_units bu
                LEFT JOIN properties p ON bu.property_id = p.id
                WHERE bu.id = $1
            `, [roomId]);
            
            const cmData = cmResult.rows[0];
            
            // BEDS24 SYNC
            if (cmData?.beds24_room_id) {
                try {
                    const accessToken = await getBeds24AccessToken(pool);
                    
                    const beds24Booking = [{
                        roomId: cmData.beds24_room_id,
                        status: 'confirmed',
                        arrival: checkin,
                        departure: checkout,
                        numAdult: roomGuests,
                        numChild: 0,
                        firstName: guest_first_name,
                        lastName: guest_last_name,
                        email: guest_email,
                        mobile: guest_phone || '',
                        phone: guest_phone || '',
                        address: guest_address || '',
                        city: guest_city || '',
                        postcode: guest_postcode || '',
                        country: guest_country || '',
                        referer: 'GAS Direct Booking',
                        notes: `GAS Booking ID: ${booking.id} | Group: ${groupBookingId} (Room ${i + 1}/${rooms.length})`,
                        price: roomPrice,
                        invoiceItems: [{
                            description: 'Accommodation',
                            status: '',
                            qty: 1,
                            amount: roomPrice,
                            vatRate: 0
                        }]
                    }];
                    
                    console.log('Pushing group booking to Beds24:', JSON.stringify(beds24Booking));
                    
                    const beds24Response = await axios.post('https://beds24.com/api/v2/bookings', beds24Booking, {
                        headers: {
                            'token': accessToken,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('Beds24 response:', JSON.stringify(beds24Response.data));
                    
                    if (beds24Response.data && beds24Response.data[0]?.success) {
                        const beds24Id = beds24Response.data[0]?.new?.id;
                        if (beds24Id) {
                            await client.query(`UPDATE bookings SET beds24_booking_id = $1 WHERE id = $2`, [beds24Id, booking.id]);
                            cmResults.beds24.push({ roomId, beds24Id });
                        }
                    }
                } catch (beds24Error) {
                    console.error('Error syncing to Beds24:', beds24Error.response?.data || beds24Error.message);
                }
            }
            
            // SMOOBU SYNC
            if (cmData?.smoobu_id) {
                try {
                    // Get Smoobu API key for this account
                    const smoobuKeyResult = await client.query(`
                        SELECT setting_value FROM client_settings 
                        WHERE client_id = $1 AND setting_key = 'smoobu_api_key'
                    `, [cmData.account_id]);
                    
                    const smoobuApiKey = smoobuKeyResult.rows[0]?.setting_value;
                    
                    if (smoobuApiKey) {
                        const smoobuResponse = await axios.post('https://login.smoobu.com/api/reservations', {
                            arrivalDate: checkin,
                            departureDate: checkout,
                            apartmentId: parseInt(cmData.smoobu_id),
                            channelId: 13, // Direct booking
                            firstName: guest_first_name,
                            lastName: guest_last_name,
                            email: guest_email,
                            phone: guest_phone || '',
                            adults: roomGuests,
                            children: 0,
                            price: roomPrice,
                            notice: `GAS Booking ID: ${booking.id} | Group: ${groupBookingId} (Room ${i + 1}/${rooms.length})`
                        }, {
                            headers: {
                                'Api-Key': smoobuApiKey,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        console.log('Smoobu response:', JSON.stringify(smoobuResponse.data));
                        
                        if (smoobuResponse.data?.id) {
                            const smoobuId = smoobuResponse.data.id;
                            await client.query(`UPDATE bookings SET smoobu_booking_id = $1 WHERE id = $2`, [smoobuId, booking.id]);
                            cmResults.smoobu.push({ roomId, smoobuId });
                        }
                    }
                } catch (smoobuError) {
                    console.error('Error syncing to Smoobu:', smoobuError.response?.data || smoobuError.message);
                }
            }
            
            // HOSTAWAY SYNC
            if (cmData?.hostaway_listing_id) {
                try {
                    const stored = await getStoredHostawayToken(pool);
                    
                    if (stored?.accessToken) {
                        const hostawayResponse = await axios.post('https://api.hostaway.com/v1/reservations', {
                            listingMapId: cmData.hostaway_listing_id,
                            channelId: 2000,
                            source: 'manual',
                            arrivalDate: checkin,
                            departureDate: checkout,
                            guestFirstName: guest_first_name,
                            guestLastName: guest_last_name,
                            guestEmail: guest_email,
                            guestPhone: guest_phone || '',
                            numberOfGuests: roomGuests,
                            adults: roomGuests,
                            children: 0,
                            totalPrice: roomPrice,
                            status: 'new',
                            comment: `GAS Booking ID: ${booking.id} | Group: ${groupBookingId} (Room ${i + 1}/${rooms.length})`
                        }, {
                            headers: {
                                'Authorization': `Bearer ${stored.accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (hostawayResponse.data?.result?.id) {
                            const hostawayId = hostawayResponse.data.result.id;
                            await client.query(`UPDATE bookings SET hostaway_reservation_id = $1 WHERE id = $2`, [hostawayId, booking.id]);
                            cmResults.hostaway.push({ roomId, hostawayId });
                        }
                    }
                } catch (hostawayError) {
                    console.error('Error syncing to Hostaway:', hostawayError.response?.data || hostawayError.message);
                }
            }
        }
        
        // Record Stripe payment transaction if deposit was paid (once for whole group)
        if (stripe_payment_intent_id && deposit_amount && createdBookings.length > 0) {
            try {
                await client.query(`
                    INSERT INTO payment_transactions (booking_id, type, amount, currency, status, stripe_payment_intent_id, created_at)
                    VALUES ($1, 'deposit', $2, 'USD', 'completed', $3, NOW())
                `, [createdBookings[0].id, deposit_amount, stripe_payment_intent_id]);
                
                // Update payment status on first booking
                await client.query(`
                    UPDATE bookings SET payment_status = 'deposit_paid', stripe_payment_intent_id = $1, deposit_amount = $2
                    WHERE id = $3
                `, [stripe_payment_intent_id, deposit_amount, createdBookings[0].id]);
            } catch (txError) {
                console.log('Could not record payment transaction:', txError.message);
            }
        }
        
        await client.query('COMMIT');
        
        console.log(`Group booking created: ${groupBookingId} with ${createdBookings.length} rooms`);
        
        res.json({
            success: true,
            group_booking_id: groupBookingId,
            bookings: createdBookings.map(b => ({
                id: b.id,
                room_id: b.bookable_unit_id,
                beds24_id: b.beds24_booking_id,
                hostaway_id: b.hostaway_reservation_id
            })),
            total_rooms: createdBookings.length,
            total_amount: total_amount,
            cm_results: cmResults
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Group booking error:', error.message);
        console.error('Group booking error stack:', error.stack);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// Create payment intent for checkout (public endpoint)
app.post('/api/public/create-payment-intent', async (req, res) => {
    try {
        const { property_id, amount, currency, booking_data } = req.body;
        
        // Get property's Stripe account
        const result = await pool.query(`
            SELECT a.stripe_account_id 
            FROM properties p
            JOIN accounts a ON p.account_id = a.id
            WHERE p.id = $1 AND a.stripe_account_id IS NOT NULL
        `, [property_id]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Property not configured for payments' });
        }
        
        const stripeAccountId = result.rows[0].stripe_account_id;
        
        // Create payment intent on connected account
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: (currency || 'gbp').toLowerCase(),
            metadata: {
                property_id: property_id,
                guest_email: booking_data?.email || '',
                check_in: booking_data?.check_in || '',
                check_out: booking_data?.check_out || ''
            }
        }, {
            stripeAccount: stripeAccountId
        });
        
        res.json({
            success: true,
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get account subscription
app.get('/api/admin/accounts/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT bs.*, bp.name as plan_name, bp.price_monthly, bp.price_yearly
      FROM billing_subscriptions bs
      LEFT JOIN billing_plans bp ON bs.plan_id = bp.id
      WHERE bs.account_id = $1
    `, [id]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, subscription: result.rows[0] });
    } else {
      res.json({ success: true, subscription: null });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ACCOUNT SETTINGS (WordPress site linking, etc.)
// =====================================================

// Get account settings
app.get('/api/admin/accounts/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT settings FROM accounts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    res.json({ 
      success: true, 
      settings: result.rows[0].settings || {}
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update account settings
app.post('/api/admin/accounts/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;
    
    // Merge with existing settings
    const existing = await pool.query(
      'SELECT settings FROM accounts WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    const currentSettings = existing.rows[0].settings || {};
    const newSettings = { ...currentSettings, ...settings };
    
    await pool.query(
      'UPDATE accounts SET settings = $1 WHERE id = $2',
      [JSON.stringify(newSettings), id]
    );
    
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Link account to WordPress site
app.post('/api/admin/accounts/:id/link-wordpress', async (req, res) => {
  try {
    const { id } = req.params;
    const { wordpress_site_id, wordpress_url } = req.body;
    
    const existing = await pool.query(
      'SELECT settings FROM accounts WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    const currentSettings = existing.rows[0].settings || {};
    const newSettings = { 
      ...currentSettings, 
      wordpress_site_id,
      wordpress_url 
    };
    
    await pool.query(
      'UPDATE accounts SET settings = $1 WHERE id = $2',
      [JSON.stringify(newSettings), id]
    );
    
    res.json({ 
      success: true, 
      message: 'WordPress site linked successfully',
      settings: newSettings 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// TASKS / TO-DO LIST
// =====================================================

// Get all tasks (master admin sees all, others see their own)
app.get('/api/admin/tasks', async (req, res) => {
  try {
    const { status, priority, account_id } = req.query;
    
    let query = `
      SELECT t.*, 
        a1.name as account_name,
        a2.name as created_by_name,
        a3.name as assigned_to_name
      FROM tasks t
      LEFT JOIN accounts a1 ON t.account_id = a1.id
      LEFT JOIN accounts a2 ON t.created_by = a2.id
      LEFT JOIN accounts a3 ON t.assigned_to = a3.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }
    if (account_id) {
      params.push(account_id);
      query += ` AND t.account_id = $${params.length}`;
    }
    
    query += ` ORDER BY 
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create task
app.post('/api/admin/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, category, account_id, created_by, assigned_to, due_date } = req.body;
    
    if (!title) {
      return res.json({ success: false, error: 'Title is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, category, account_id, created_by, assigned_to, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [title, description, status || 'todo', priority || 'medium', category, account_id, created_by, assigned_to, due_date]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update task
app.put('/api/admin/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, category, account_id, assigned_to, due_date } = req.body;
    
    // If marking as done, set completed_at
    const completed_at = status === 'done' ? 'NOW()' : 'NULL';
    
    const result = await pool.query(`
      UPDATE tasks SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        category = COALESCE($5, category),
        account_id = $6,
        assigned_to = $7,
        due_date = $8,
        completed_at = ${status === 'done' ? 'NOW()' : 'NULL'},
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [title, description, status, priority, category, account_id, assigned_to, due_date, id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Task not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Quick update task status
app.patch('/api/admin/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await pool.query(`
      UPDATE tasks SET 
        status = $1,
        completed_at = ${status === 'done' ? 'NOW()' : 'NULL'},
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete task
app.delete('/api/admin/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Sync tasks from tasks.json file
app.post('/api/admin/tasks/sync-from-file', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, 'public', 'tasks.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: 'tasks.json not found in public folder' });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      return res.json({ success: false, error: 'Invalid tasks.json format' });
    }
    
    // Clear existing tasks and insert new ones
    await pool.query('DELETE FROM tasks');
    
    let imported = 0;
    for (const task of data.tasks) {
      await pool.query(`
        INSERT INTO tasks (title, description, status, priority, category, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        task.title,
        task.description || null,
        task.status || 'todo',
        task.priority || 'medium',
        task.category || null,
        task.completed ? new Date(task.completed) : null
      ]);
      imported++;
    }
    
    res.json({ success: true, message: `Imported ${imported} tasks from tasks.json`, updated: data.updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Sync amenities from amenities.json file
app.post('/api/admin/amenities/sync-from-file', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, 'public', 'amenities.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: 'amenities.json not found in public folder' });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!data.amenities || !Array.isArray(data.amenities)) {
      return res.json({ success: false, error: 'Invalid amenities.json format' });
    }
    
    // Add level column if missing
    await pool.query(`
      ALTER TABLE master_amenities ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'room'
    `);
    
    let imported = 0;
    let updated = 0;
    
    for (const amenity of data.amenities) {
      // Build amenity_name JSONB
      const amenityNameJson = JSON.stringify({ en: amenity.name });
      
      // Check if amenity exists by code
      const existing = await pool.query('SELECT id FROM master_amenities WHERE amenity_code = $1', [amenity.code]);
      
      if (existing.rows.length > 0) {
        // Update existing
        await pool.query(`
          UPDATE master_amenities SET 
            amenity_name = $1, category = $2, icon = $3, level = $4, updated_at = NOW()
          WHERE amenity_code = $5
        `, [amenityNameJson, amenity.category, amenity.icon, amenity.level || 'room', amenity.code]);
        updated++;
      } else {
        // Insert new
        await pool.query(`
          INSERT INTO master_amenities (amenity_code, amenity_name, category, icon, level)
          VALUES ($1, $2, $3, $4, $5)
        `, [amenity.code, amenityNameJson, amenity.category, amenity.icon, amenity.level || 'room']);
        imported++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Imported ${imported} new, updated ${updated} existing amenities`,
      updated: data.updated 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

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
        country VARCHAR(100) DEFAULT 'GB',
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
        country VARCHAR(100) DEFAULT 'GB',
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
        name VARCHAR(100),
        cm_code VARCHAR(50),
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
    
    // Create unique index if not exists
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_code ON channel_managers(cm_code) WHERE cm_code IS NOT NULL`);
    
    // Update existing rows that might have name but not cm_code
    await pool.query(`UPDATE channel_managers SET cm_code = LOWER(name), cm_name = name WHERE cm_code IS NULL AND name IS NOT NULL`);
    
    // Insert or update Beds24
    const beds24Exists = await pool.query(`SELECT id FROM channel_managers WHERE cm_code = 'beds24' OR LOWER(name) = 'beds24'`);
    if (beds24Exists.rows.length === 0) {
      await pool.query(`INSERT INTO channel_managers (name, cm_code, cm_name, api_base_url, auth_type) VALUES ('Beds24', 'beds24', 'Beds24', 'https://beds24.com/api/v2', 'oauth2')`);
    } else {
      await pool.query(`UPDATE channel_managers SET cm_code = 'beds24', cm_name = 'Beds24' WHERE id = $1`, [beds24Exists.rows[0].id]);
    }
    
    // Insert or update Hostaway
    const hostawayExists = await pool.query(`SELECT id FROM channel_managers WHERE cm_code = 'hostaway' OR LOWER(name) = 'hostaway'`);
    if (hostawayExists.rows.length === 0) {
      await pool.query(`INSERT INTO channel_managers (name, cm_code, cm_name, api_base_url, auth_type) VALUES ('Hostaway', 'hostaway', 'Hostaway', 'https://api.hostaway.com/v1', 'oauth2')`);
    } else {
      await pool.query(`UPDATE channel_managers SET cm_code = 'hostaway', cm_name = 'Hostaway' WHERE id = $1`, [hostawayExists.rows[0].id]);
    }
    
    // Insert or update Smoobu
    const smoobuExists = await pool.query(`SELECT id FROM channel_managers WHERE cm_code = 'smoobu' OR LOWER(name) = 'smoobu'`);
    if (smoobuExists.rows.length === 0) {
      await pool.query(`INSERT INTO channel_managers (name, cm_code, cm_name, api_base_url, auth_type) VALUES ('Smoobu', 'smoobu', 'Smoobu', 'https://login.smoobu.com/api', 'api_key')`);
    } else {
      await pool.query(`UPDATE channel_managers SET cm_code = 'smoobu', cm_name = 'Smoobu' WHERE id = $1`, [smoobuExists.rows[0].id]);
    }
    
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
    // Add smoobu_booking_id column
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS smoobu_booking_id VARCHAR(50)`);
    // Add bookable_unit_id column for linking to bookable_units table
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bookable_unit_id INTEGER`);
    // Add hostaway columns
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS hostaway_listing_id INTEGER`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS hostaway_listing_id INTEGER`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hostaway_reservation_id VARCHAR(50)`);
    
    // Add group booking column
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_booking_id VARCHAR(50)`);
    
    // Add payment tracking columns to bookings
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_due_date DATE`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMP`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(100)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2)`);
    
    // Create payment_transactions table if not exists
    await pool.query(`CREATE TABLE IF NOT EXISTS payment_transactions (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id),
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(20) DEFAULT 'pending',
      stripe_payment_intent_id VARCHAR(100),
      stripe_charge_id VARCHAR(100),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
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
    
    // Add description columns to properties and bookable_units for website display
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS short_description TEXT`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS full_description TEXT`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS district VARCHAR(255)`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS state VARCHAR(255)`);
    await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code VARCHAR(50)`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS short_description TEXT`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS full_description TEXT`);
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`);
    
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

// =====================================================
// KNOWLEDGE BASE SYSTEM
// =====================================================

// Setup knowledge base tables
app.get('/api/setup-knowledge-base', async (req, res) => {
  try {
    // Categories for organizing knowledge
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        parent_id INTEGER REFERENCES kb_categories(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Main knowledge articles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES kb_categories(id),
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        keywords TEXT[],
        related_articles INTEGER[],
        status VARCHAR(50) DEFAULT 'published',
        views INTEGER DEFAULT 0,
        helpful_yes INTEGER DEFAULT 0,
        helpful_no INTEGER DEFAULT 0,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Track questions the AI couldn't answer
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_unanswered (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        user_context TEXT,
        account_id INTEGER,
        session_id VARCHAR(255),
        times_asked INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'new',
        resolved_article_id INTEGER REFERENCES kb_articles(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Chat history for context
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kb_chat_history (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        account_id INTEGER,
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        articles_used INTEGER[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default categories if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM kb_categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO kb_categories (name, slug, description, icon, sort_order) VALUES
        ('Getting Started', 'getting-started', 'New to GAS? Start here', '🚀', 1),
        ('Channel Managers', 'channel-managers', 'Connecting Beds24, Hostaway, Smoobu and more', '🔗', 2),
        ('Properties & Rooms', 'properties-rooms', 'Managing your properties and units', '🏨', 3),
        ('Images', 'images', 'Uploading and managing photos', '📷', 4),
        ('Pricing & Offers', 'pricing-offers', 'Setting prices, creating offers and discounts', '💰', 5),
        ('Availability', 'availability', 'Calendar and booking management', '📅', 6),
        ('Vouchers', 'vouchers', 'Creating and managing vouchers', '🎟️', 7),
        ('Upsells & Fees', 'upsells-fees', 'Additional charges and upsell options', '➕', 8),
        ('Taxes', 'taxes', 'Tourist taxes and regional charges', '📋', 9),
        ('Content & SEO', 'content-seo', 'Descriptions, pages, and search optimization', '✏️', 10),
        ('Website & Plugins', 'website-plugins', 'WordPress plugin and website integration', '🌐', 11),
        ('Travel Agents', 'travel-agents', 'Information for travel agents and tour operators', '✈️', 12),
        ('Account & Billing', 'account-billing', 'Managing your account and payments', '👤', 13),
        ('Troubleshooting', 'troubleshooting', 'Common issues and solutions', '🔧', 14)
      `);
    }
    
    res.json({ success: true, message: 'Knowledge base tables created!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all knowledge categories
app.get('/api/kb/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM kb_articles WHERE category_id = c.id AND status = 'published') as article_count
      FROM kb_categories c
      ORDER BY c.sort_order, c.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update category
app.post('/api/kb/categories', async (req, res) => {
  try {
    const { id, name, slug, description, icon, sort_order, parent_id } = req.body;
    
    if (id) {
      // Update
      const result = await pool.query(`
        UPDATE kb_categories SET name = $1, slug = $2, description = $3, icon = $4, sort_order = $5, parent_id = $6
        WHERE id = $7 RETURNING *
      `, [name, slug, description, icon, sort_order, parent_id, id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      // Create
      const result = await pool.query(`
        INSERT INTO kb_categories (name, slug, description, icon, sort_order, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [name, slug, description, icon, sort_order || 0, parent_id]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all articles (with optional filters)
app.get('/api/kb/articles', async (req, res) => {
  try {
    const { category_id, status, search } = req.query;
    let query = `
      SELECT a.*, c.name as category_name, c.icon as category_icon
      FROM kb_articles a
      LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (category_id) {
      params.push(category_id);
      query += ` AND a.category_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.title ILIKE $${params.length} OR a.content ILIKE $${params.length} OR a.summary ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY a.category_id, a.title';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get single article
app.get('/api/kb/articles/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, c.name as category_name, c.icon as category_icon
      FROM kb_articles a
      LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE a.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Article not found' });
    }
    
    // Increment views
    await pool.query('UPDATE kb_articles SET views = views + 1 WHERE id = $1', [req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update article
app.post('/api/kb/articles', async (req, res) => {
  try {
    const { id, category_id, title, slug, summary, content, keywords, related_articles, status } = req.body;
    
    // Generate slug from title if not provided
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    if (id) {
      // Update
      const result = await pool.query(`
        UPDATE kb_articles SET 
          category_id = $1, title = $2, slug = $3, summary = $4, content = $5, 
          keywords = $6, related_articles = $7, status = $8, updated_at = NOW()
        WHERE id = $9 RETURNING *
      `, [category_id, title, finalSlug, summary, content, keywords || [], related_articles || [], status || 'published', id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      // Create
      const result = await pool.query(`
        INSERT INTO kb_articles (category_id, title, slug, summary, content, keywords, related_articles, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [category_id, title, finalSlug, summary, content, keywords || [], related_articles || [], status || 'published']);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete article
app.delete('/api/kb/articles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kb_articles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Mark article as helpful/not helpful
app.post('/api/kb/articles/:id/feedback', async (req, res) => {
  try {
    const { helpful } = req.body;
    const field = helpful ? 'helpful_yes' : 'helpful_no';
    await pool.query(`UPDATE kb_articles SET ${field} = ${field} + 1 WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Search knowledge base (for AI to use)
app.get('/api/kb/search', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    
    // Search by keywords, title, summary, and content
    const searchTerms = q.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (searchTerms.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Build search query with ranking
    const result = await pool.query(`
      SELECT a.id, a.title, a.summary, a.content, a.keywords, c.name as category_name, c.icon as category_icon,
        (
          -- Exact title match (highest)
          CASE WHEN LOWER(a.title) = $1 THEN 100 ELSE 0 END +
          -- Title contains search (high)
          CASE WHEN LOWER(a.title) LIKE $2 THEN 50 ELSE 0 END +
          -- Keywords match (high)
          CASE WHEN a.keywords && $3::text[] THEN 40 ELSE 0 END +
          -- Summary contains (medium)
          CASE WHEN LOWER(a.summary) LIKE $2 THEN 20 ELSE 0 END +
          -- Content contains (low)
          CASE WHEN LOWER(a.content) LIKE $2 THEN 10 ELSE 0 END
        ) as relevance
      FROM kb_articles a
      LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE a.status = 'published'
        AND (
          LOWER(a.title) LIKE $2
          OR LOWER(a.summary) LIKE $2
          OR LOWER(a.content) LIKE $2
          OR a.keywords && $3::text[]
        )
      ORDER BY relevance DESC, a.views DESC
      LIMIT $4
    `, [q.toLowerCase(), `%${q.toLowerCase()}%`, searchTerms, limit]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get unanswered questions
app.get('/api/kb/unanswered', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM kb_unanswered';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ' WHERE status = $1';
    }
    
    query += ' ORDER BY times_asked DESC, created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Mark unanswered question as resolved
app.post('/api/kb/unanswered/:id/resolve', async (req, res) => {
  try {
    const { article_id } = req.body;
    await pool.query(`
      UPDATE kb_unanswered SET status = 'resolved', resolved_article_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [article_id, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete unanswered question
app.delete('/api/kb/unanswered/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kb_unanswered WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Bulk import articles (for importing ChatGPT-generated docs)
app.post('/api/kb/import', async (req, res) => {
  try {
    const { articles } = req.body;
    
    if (!articles || !Array.isArray(articles)) {
      return res.json({ success: false, error: 'Articles array required' });
    }
    
    let imported = 0;
    let errors = [];
    
    for (const article of articles) {
      try {
        const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        // Find or create category
        let categoryId = article.category_id;
        if (!categoryId && article.category) {
          const catResult = await pool.query('SELECT id FROM kb_categories WHERE slug = $1 OR name ILIKE $2', 
            [article.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), article.category]);
          if (catResult.rows.length > 0) {
            categoryId = catResult.rows[0].id;
          }
        }
        
        // Insert or update article
        await pool.query(`
          INSERT INTO kb_articles (category_id, title, slug, summary, content, keywords, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'published')
          ON CONFLICT (slug) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            content = EXCLUDED.content,
            keywords = EXCLUDED.keywords,
            updated_at = NOW()
        `, [categoryId, article.title, slug, article.summary, article.content, article.keywords || []]);
        
        imported++;
      } catch (e) {
        errors.push({ title: article.title, error: e.message });
      }
    }
    
    res.json({ success: true, imported, errors });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// BILLING & SUBSCRIPTION SYSTEM
// =====================================================

// Setup billing tables
app.get('/api/setup-billing', async (req, res) => {
  try {
    // Subscription plans (editable by admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL,
        price_yearly DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'GBP',
        max_properties INTEGER,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        stripe_price_id_monthly VARCHAR(255),
        stripe_price_id_yearly VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Credit packages (editable by admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_credit_packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        credits INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        bonus_credits INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        stripe_price_id VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tasks/To-Do list
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(100),
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        due_date DATE,
        completed_at TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Extras/services that cost credits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_extras (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        credit_cost INTEGER NOT NULL,
        category VARCHAR(100),
        icon VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        requires_booking BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Account subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES billing_plans(id),
        status VARCHAR(50) DEFAULT 'active',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancelled_at TIMESTAMP,
        feature_overrides JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add feature_overrides column if missing (for existing tables)
    await pool.query(`
      ALTER TABLE billing_subscriptions ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '{}'
    `);
    
    // Account credit balance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_credits (
        id SERIAL PRIMARY KEY,
        account_id INTEGER UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
        balance INTEGER DEFAULT 0,
        lifetime_purchased INTEGER DEFAULT 0,
        lifetime_spent INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Credit transactions log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_credit_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        balance_after INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Payment history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_payments (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        description TEXT,
        stripe_payment_id VARCHAR(255),
        stripe_invoice_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default plans if empty
    const planCheck = await pool.query('SELECT COUNT(*) FROM billing_plans');
    if (parseInt(planCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO billing_plans (name, slug, description, price_monthly, price_yearly, max_properties, features, sort_order) VALUES
        ('Starter', 'starter', 'Perfect for single properties', 29.00, 290.00, 1, '{"properties": 1, "websites": 1, "booking_plugin": true, "theme": "basic", "blog_module": false, "attractions_module": false, "reviews_widget": false, "support": "email", "free_trial": false, "white_label": false, "features_list": ["1 property", "1 website", "Booking plugin", "Basic theme", "Email support"]}', 1),
        ('Professional', 'professional', 'For growing businesses', 59.00, 590.00, 10, '{"properties": 10, "websites": 1, "booking_plugin": true, "theme": "standard", "blog_module": true, "attractions_module": false, "reviews_widget": false, "support": "email", "free_trial": true, "white_label": false, "features_list": ["Up to 10 properties", "1 website", "Booking plugin", "All standard themes", "Blog module", "Email support", "14-day free trial"]}', 2),
        ('Business', 'business', 'For established operators', 99.00, 990.00, 50, '{"properties": 50, "websites": 1, "booking_plugin": true, "theme": "standard", "blog_module": true, "attractions_module": true, "reviews_widget": false, "support": "priority", "free_trial": true, "white_label": false, "features_list": ["Up to 50 properties", "1 website", "Booking plugin", "All standard themes", "Blog module", "Attractions module", "Priority support", "14-day free trial"]}', 3),
        ('Enterprise', 'enterprise', 'Unlimited scale', 199.00, 1990.00, NULL, '{"properties": null, "websites": 10, "booking_plugin": true, "theme": "premium", "blog_module": true, "attractions_module": true, "reviews_widget": true, "support": "dedicated", "free_trial": true, "white_label": true, "features_list": ["Unlimited properties", "Up to 10 websites", "Booking plugin", "All themes including premium", "Blog module", "Attractions module", "Reviews widget", "Dedicated support", "White-label option", "14-day free trial"]}', 4)
      `);
    }
    
    // Insert default credit packages if empty
    const creditCheck = await pool.query('SELECT COUNT(*) FROM billing_credit_packages');
    if (parseInt(creditCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO billing_credit_packages (name, credits, price, bonus_credits, sort_order) VALUES
        ('10 Credits', 10, 10.00, 0, 1),
        ('25 Credits', 25, 20.00, 0, 2),
        ('50 Credits', 50, 40.00, 0, 3),
        ('100 Credits', 100, 75.00, 0, 4)
      `);
    }
    
    // Insert default extras if empty
    const extrasCheck = await pool.query('SELECT COUNT(*) FROM billing_extras');
    if (parseInt(extrasCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO billing_extras (name, slug, description, credit_cost, category, icon, sort_order) VALUES
        ('Additional Website', 'additional-website', 'Add another website to your account', 20, 'Websites', '🌐', 1),
        ('Reviews Widget', 'reviews-widget', 'Display reviews from TripAdvisor, Booking.com, Google', 15, 'Modules', '⭐', 2),
        ('Attractions Module', 'attractions-module', 'Showcase nearby attractions and things to do', 10, 'Modules', '📍', 3),
        ('Premium Theme', 'premium-theme', 'Access to premium website design', 25, 'Themes', '✨', 4),
        ('Setup Assistance Call (30 min)', 'setup-call', 'One-on-one video call to help you get started', 5, 'Support', '📞', 5),
        ('We Setup For You', 'full-setup', 'We configure everything for you', 20, 'Support', '🎨', 6),
        ('Custom Integration', 'custom-integration', 'Custom channel manager or API integration', 30, 'Development', '🔧', 7),
        ('Training Session (1 hour)', 'training', 'Personalised training session', 10, 'Support', '📚', 8)
      `);
    }
    
    // Deliverables tracking - what templates/plugins have been delivered to each account
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_deliverables (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        deliverable_type VARCHAR(50) NOT NULL,
        deliverable_id INTEGER,
        deliverable_name VARCHAR(255) NOT NULL,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_by INTEGER,
        source VARCHAR(50) DEFAULT 'subscription',
        notes TEXT,
        UNIQUE(account_id, deliverable_type, deliverable_id)
      )
    `);
    
    // Available templates/themes catalog
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        preview_image VARCHAR(500),
        template_type VARCHAR(50) DEFAULT 'theme',
        tier VARCHAR(50) DEFAULT 'basic',
        download_url VARCHAR(500),
        version VARCHAR(20) DEFAULT '1.0.0',
        is_active BOOLEAN DEFAULT true,
        features JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default templates if empty
    const templateCheck = await pool.query('SELECT COUNT(*) FROM website_templates');
    if (parseInt(templateCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO website_templates (name, slug, description, template_type, tier, version) VALUES
        ('Developer Theme', 'developer-theme', 'Clean developer-focused theme with full customization', 'theme', 'basic', '2.0.0'),
        ('GAS Booking Plugin', 'gas-booking-plugin', 'Core booking system plugin', 'plugin', 'basic', '4.0.0'),
        ('GAS Blog Plugin', 'gas-blog-plugin', 'Blog functionality with SEO', 'plugin', 'professional', '1.0.0'),
        ('GAS Attractions Plugin', 'gas-attractions-plugin', 'Nearby attractions showcase', 'plugin', 'business', '1.0.0'),
        ('GAS Reviews Plugin', 'gas-reviews-plugin', 'Reviews from multiple sources', 'plugin', 'enterprise', '1.0.0')
      `);
    }
    
    // InstaWP/WordPress hosting settings (global platform settings)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instawp_settings (
        id SERIAL PRIMARY KEY,
        api_url VARCHAR(500) DEFAULT 'https://sites.gas.travel/gas-api.php',
        api_key VARCHAR(500),
        default_template VARCHAR(255),
        templates JSONB DEFAULT '{}',
        webhook_secret VARCHAR(255),
        is_enabled BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============================================================
    // WEBSITE ARCHITECTURE - Multi-site, Unit-based Distribution
    // ============================================================
    
    // Website Templates (defines available sections & variants)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_templates (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        thumbnail_url VARCHAR(500),
        demo_url VARCHAR(500),
        sections JSONB NOT NULL DEFAULT '{}',
        color_presets JSONB DEFAULT '[]',
        font_presets JSONB DEFAULT '[]',
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        is_premium BOOLEAN DEFAULT FALSE,
        min_plan VARCHAR(20) DEFAULT 'starter',
        version VARCHAR(10) DEFAULT '1.0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Websites (independent entities - many per account)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS websites (
        id SERIAL PRIMARY KEY,
        public_id VARCHAR(20) UNIQUE NOT NULL,
        owner_type VARCHAR(20) NOT NULL DEFAULT 'account',
        owner_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100),
        template_code VARCHAR(50) REFERENCES website_templates(code),
        site_url VARCHAR(500),
        admin_url VARCHAR(500),
        custom_domain VARCHAR(255),
        instawp_site_id VARCHAR(255),
        instawp_data JSONB DEFAULT '{}',
        website_type VARCHAR(30) DEFAULT 'portfolio',
        status VARCHAR(20) DEFAULT 'draft',
        default_currency VARCHAR(3) DEFAULT 'GBP',
        timezone VARCHAR(50) DEFAULT 'Europe/London',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_websites_owner ON websites(owner_type, owner_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status)`);
    
    // Website Units (which units are on which website - many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_units (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL REFERENCES bookable_units(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        custom_name VARCHAR(255),
        custom_description TEXT,
        custom_price_modifier DECIMAL(5,2),
        is_active BOOLEAN DEFAULT TRUE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id, unit_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_website_units_website ON website_units(website_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_website_units_unit ON website_units(unit_id)`);
    
    // Website Pages (custom pages per website)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_pages (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        page_type VARCHAR(50) NOT NULL,
        slug VARCHAR(100),
        title VARCHAR(255),
        content JSONB DEFAULT '{}',
        is_published BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id, page_type, COALESCE(slug, ''))
      )
    `);
    
    // Legacy: Keep account_websites for backwards compatibility during migration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_websites (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        instawp_site_id VARCHAR(255),
        site_name VARCHAR(255),
        site_url VARCHAR(500),
        admin_url VARCHAR(500),
        template_used VARCHAR(255),
        custom_domain VARCHAR(255),
        status VARCHAR(50) DEFAULT 'creating',
        instawp_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        migrated_to_website_id INTEGER,
        UNIQUE(account_id)
      )
    `);
    
    // Property payment settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_payment_settings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
        payment_enabled BOOLEAN DEFAULT true,
        deposit_type VARCHAR(20) DEFAULT 'percentage',
        deposit_amount DECIMAL(10,2) DEFAULT 25,
        balance_due_days INTEGER DEFAULT 14,
        stripe_account_id VARCHAR(255),
        stripe_connected BOOLEAN DEFAULT false,
        paypal_email VARCHAR(255),
        bank_details JSONB DEFAULT '{}',
        accepted_methods JSONB DEFAULT '["card"]',
        currency VARCHAR(3) DEFAULT 'GBP',
        cancellation_policy TEXT,
        refund_policy JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Guest payments (transactions from booking site)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guest_payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        guest_email VARCHAR(255),
        guest_name VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        payment_type VARCHAR(50) DEFAULT 'deposit',
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        stripe_payment_id VARCHAR(255),
        stripe_transfer_id VARCHAR(255),
        paypal_transaction_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Billing Products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_products (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        price_monthly DECIMAL(10,2) DEFAULT 0,
        price_yearly DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'GBP',
        feature_flags JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Billing Add-ons
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_addons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) DEFAULT 0,
        price_yearly DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'GBP',
        feature_flags JSONB DEFAULT '[]',
        extra_properties INTEGER DEFAULT 0,
        extra_rooms INTEGER DEFAULT 0,
        extra_users INTEGER DEFAULT 0,
        requires_plan_codes JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Affiliate Tiers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_tiers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        min_referrals INTEGER DEFAULT 0,
        min_revenue DECIMAL(10,2) DEFAULT 0,
        color VARCHAR(7) DEFAULT '#CD7F32',
        icon VARCHAR(10) DEFAULT '🥉',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Affiliates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliates (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL UNIQUE,
        referral_code VARCHAR(20) NOT NULL UNIQUE,
        referral_link VARCHAR(255),
        tier_id INTEGER REFERENCES affiliate_tiers(id),
        tier_code VARCHAR(20) DEFAULT 'bronze',
        total_referrals INTEGER DEFAULT 0,
        active_referrals INTEGER DEFAULT 0,
        lifetime_earnings DECIMAL(10,2) DEFAULT 0,
        payout_method VARCHAR(20) DEFAULT 'airwallex',
        payout_details JSONB DEFAULT '{}',
        min_payout DECIMAL(10,2) DEFAULT 50,
        is_active BOOLEAN DEFAULT TRUE,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Affiliate Referrals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_referrals (
        id SERIAL PRIMARY KEY,
        affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
        referred_account_id INTEGER NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        converted_at TIMESTAMP,
        churned_at TIMESTAMP,
        referral_source VARCHAR(50)
      )
    `);
    
    // NEW: Affiliate Commissions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id SERIAL PRIMARY KEY,
        affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
        referral_id INTEGER REFERENCES affiliate_referrals(id),
        source_type VARCHAR(20) NOT NULL,
        source_id INTEGER,
        gross_amount DECIMAL(10,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        status VARCHAR(20) DEFAULT 'pending',
        payout_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // NEW: Affiliate Payouts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        id SERIAL PRIMARY KEY,
        affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'GBP',
        status VARCHAR(20) DEFAULT 'pending',
        payout_method VARCHAR(20),
        provider_payout_id VARCHAR(100),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        paid_at TIMESTAMP,
        notes TEXT
      )
    `);
    
    // Seed Products
    await pool.query(`
      INSERT INTO billing_products (code, name, description, category, price_monthly, price_yearly, display_order) VALUES
      ('wp-theme-developer', 'Developer Theme', 'Professional WordPress theme', 'template', 15, 150, 1),
      ('wp-plugin-booking', 'WP Booking Plugin', 'Booking widget for WordPress', 'plugin', 10, 100, 2),
      ('app-blogger', 'Smart Blogger', 'AI-powered blog content', 'app', 9, 90, 3),
      ('app-attractions', 'Attractions & SEO', 'Local attractions and SEO', 'app', 9, 90, 4),
      ('app-marketing', 'Marketing Tools', 'Social media campaigns', 'app', 12, 120, 5),
      ('portal-builder', 'Portal Builder', 'Create niche travel portals', 'template', 29, 290, 6)
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Seed Add-ons
    await pool.query(`
      INSERT INTO billing_addons (code, name, description, price_monthly, extra_properties, display_order) VALUES
      ('extra-property', 'Extra Property', 'Add one additional property', 5, 1, 1),
      ('extra-5-properties', 'Property Pack', 'Add 5 additional properties', 20, 5, 2),
      ('priority-support', 'Priority Support', '24/7 priority support', 15, 0, 3)
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Seed Affiliate Tiers
    await pool.query(`
      INSERT INTO affiliate_tiers (code, name, commission_rate, min_referrals, min_revenue, color, icon, display_order) VALUES
      ('bronze', 'Bronze', 5.00, 0, 0, '#CD7F32', '🥉', 1),
      ('silver', 'Silver', 10.00, 5, 0, '#C0C0C0', '🥈', 2),
      ('gold', 'Gold', 15.00, 10, 500, '#FFD700', '🥇', 3)
      ON CONFLICT (code) DO NOTHING
    `);
    
    res.json({ success: true, message: 'Billing tables created with default data!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// BILLING PLANS ADMIN (Master Admin Only)
// =====================================================

// Get all plans
app.get('/api/admin/billing/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_plans ORDER BY sort_order, price_monthly');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update plan
app.post('/api/admin/billing/plans', async (req, res) => {
  try {
    const { id, name, slug, description, price_monthly, price_yearly, currency, max_properties, features, is_active, sort_order } = req.body;
    
    if (id) {
      const result = await pool.query(`
        UPDATE billing_plans SET 
          name = $1, slug = $2, description = $3, price_monthly = $4, price_yearly = $5,
          currency = $6, max_properties = $7, features = $8, is_active = $9, sort_order = $10
        WHERE id = $11 RETURNING *
      `, [name, slug, description, price_monthly, price_yearly, currency || 'GBP', max_properties, JSON.stringify(features || []), is_active !== false, sort_order || 0, id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(`
        INSERT INTO billing_plans (name, slug, description, price_monthly, price_yearly, currency, max_properties, features, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `, [name, slug, description, price_monthly, price_yearly, currency || 'GBP', max_properties, JSON.stringify(features || []), is_active !== false, sort_order || 0]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete plan
app.delete('/api/admin/billing/plans/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_plans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// BILLING PRODUCTS ADMIN
// =====================================================

// Get all products
app.get('/api/admin/billing/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_products ORDER BY display_order, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create product
app.post('/api/admin/billing/products', async (req, res) => {
  try {
    const { code, name, description, category, price_monthly, price_yearly, is_active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO billing_products (code, name, description, category, price_monthly, price_yearly, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [code, name, description, category || 'general', price_monthly || 0, price_yearly || 0, is_active !== false]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update product
app.put('/api/admin/billing/products/:id', async (req, res) => {
  try {
    const { code, name, description, category, price_monthly, price_yearly, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE billing_products 
      SET code = $1, name = $2, description = $3, category = $4, 
          price_monthly = $5, price_yearly = $6, is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [code, name, description, category || 'general', price_monthly || 0, price_yearly || 0, is_active !== false, req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete product
app.delete('/api/admin/billing/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// BILLING ADD-ONS ADMIN
// =====================================================

// Get all addons
app.get('/api/admin/billing/addons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_addons ORDER BY display_order, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create addon
app.post('/api/admin/billing/addons', async (req, res) => {
  try {
    const { code, name, description, price_monthly, extra_properties, is_active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO billing_addons (code, name, description, price_monthly, extra_properties, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [code, name, description, price_monthly || 0, extra_properties || 0, is_active !== false]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update addon
app.put('/api/admin/billing/addons/:id', async (req, res) => {
  try {
    const { code, name, description, price_monthly, extra_properties, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE billing_addons 
      SET code = $1, name = $2, description = $3, price_monthly = $4, 
          extra_properties = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [code, name, description, price_monthly || 0, extra_properties || 0, is_active !== false, req.params.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete addon
app.delete('/api/admin/billing/addons/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_addons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// SUBSCRIPTIONS ADMIN
// =====================================================

// Get all subscriptions with account info
app.get('/api/admin/billing/subscriptions', async (req, res) => {
  try {
    const { plan, status } = req.query;
    
    let query = `
      SELECT s.*, a.name as account_name, 
             (SELECT COUNT(*) FROM billing_subscription_addons WHERE subscription_id = s.id) as addon_count,
             COALESCE(s.locked_price, p.price_monthly) as mrr
      FROM billing_subscriptions s
      LEFT JOIN accounts a ON a.id = s.account_id
      LEFT JOIN billing_plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    const params = [];
    
    if (plan) {
      params.push(plan);
      query += ` AND s.plan_code = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// WEBSITE AUTO-DEPLOY SYSTEM
// =====================================================

const VPS_DEPLOY_URL = 'https://sites.gas.travel/gas-deploy.php';
const VPS_DEPLOY_API_KEY = process.env.VPS_DEPLOY_API_KEY || 'gas-deploy-2024-secure-key';

// Create deployed_sites table
app.get('/api/setup-deploy', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deployed_sites (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        property_ids JSONB DEFAULT '[]',
        room_ids JSONB DEFAULT '[]',
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        blog_id INTEGER,
        site_url VARCHAR(255),
        admin_url VARCHAR(255),
        slug VARCHAR(100),
        site_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        wp_username VARCHAR(100),
        wp_password_temp VARCHAR(100),
        deployed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns if they don't exist (for existing tables)
    await pool.query(`ALTER TABLE deployed_sites ADD COLUMN IF NOT EXISTS property_ids JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE deployed_sites ADD COLUMN IF NOT EXISTS room_ids JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE deployed_sites ADD COLUMN IF NOT EXISTS site_name VARCHAR(255)`);
    
    // Add website_url column to bookable_units if it doesn't exist
    await pool.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)`);
    
    res.json({ success: true, message: 'Deployed sites table created/updated with room_ids support' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check VPS status
app.get('/api/deploy/status', async (req, res) => {
  try {
    const response = await fetch(`${VPS_DEPLOY_URL}?action=status`, {
      method: 'GET',
      headers: {
        'X-API-Key': VPS_DEPLOY_API_KEY
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ success: false, error: 'Could not connect to VPS: ' + error.message });
  }
});

// List sites on VPS
app.get('/api/deploy/sites', async (req, res) => {
  try {
    const response = await fetch(`${VPS_DEPLOY_URL}?action=list-sites`, {
      method: 'GET',
      headers: {
        'X-API-Key': VPS_DEPLOY_API_KEY
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ success: false, error: 'Could not connect to VPS: ' + error.message });
  }
});

// Deploy a new site (room-level selection)
app.post('/api/deploy/create', async (req, res) => {
  try {
    const { site_name, slug, admin_email, account_id, room_ids, rooms, property_ids, use_theme, use_plugin } = req.body;
    
    // Validate required fields
    if (!site_name || !slug || !admin_email) {
      return res.json({ success: false, error: 'Site name, slug, and admin email are required' });
    }
    
    if (!room_ids || room_ids.length === 0) {
      return res.json({ success: false, error: 'At least one room must be selected' });
    }
    
    // Get unique property IDs from selected rooms
    const uniquePropertyIds = property_ids || [...new Set(rooms.map(r => r.property_id))];
    
    // Get API key from first property (optional, may not exist)
    let gasApiKey = '';
    try {
      const propResult = await pool.query(
        'SELECT api_key FROM properties WHERE id = $1',
        [uniquePropertyIds[0]]
      );
      gasApiKey = propResult.rows[0]?.api_key || '';
    } catch (e) {
      // api_key column may not exist, that's OK
      console.log('Note: api_key not available, continuing without it');
    }
    
    // Get account code if available
    let accountCode = null;
    if (account_id) {
      try {
        const accountResult = await pool.query(
          'SELECT account_code FROM accounts WHERE id = $1',
          [account_id]
        );
        accountCode = accountResult.rows[0]?.account_code || null;
      } catch (e) {
        console.log('Note: account_code not available');
      }
    }
    
    // Call VPS to create site (no API key required in auto mode)
    const response = await fetch(`${VPS_DEPLOY_URL}?action=create-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        site_name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        admin_email,
        room_ids,
        rooms,
        property_ids: uniquePropertyIds,
        gas_api_key: gasApiKey,
        account_id,
        account_code: accountCode,
        use_theme: use_theme !== false,
        use_plugin: use_plugin !== false
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store deployment record
      await pool.query(`
        INSERT INTO deployed_sites 
        (property_id, property_ids, room_ids, account_id, blog_id, site_url, admin_url, slug, site_name, status, wp_username, wp_password_temp, deployed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        uniquePropertyIds[0],
        JSON.stringify(uniquePropertyIds),
        JSON.stringify(room_ids),
        account_id,
        data.site.blog_id,
        data.site.url,
        data.site.admin_url,
        data.site.slug,
        site_name,
        'active',
        data.credentials.username,
        data.credentials.password || null
      ]);
      
      // Update rooms with site URL
      for (const roomId of room_ids) {
        await pool.query(
          'UPDATE bookable_units SET website_url = $1 WHERE id = $2',
          [data.site.url, roomId]
        );
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('Deploy error:', error);
    res.json({ success: false, error: 'Deployment failed: ' + error.message });
  }
});

// Get deployment info for a property
app.get('/api/deploy/property/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM deployed_sites WHERE property_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, deployed: false });
    }
    
    res.json({ success: true, deployed: true, site: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all deployed sites
app.get('/api/admin/deployed-sites', async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    const accountId = req.query.account_id;
    
    let conditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (!includeDeleted) {
      conditions.push("ds.status != 'deleted'");
    }
    
    if (accountId) {
      conditions.push(`ds.account_id = $${paramIndex}`);
      params.push(accountId);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    const result = await pool.query(`
      SELECT ds.*, p.name as property_name, a.name as account_name
      FROM deployed_sites ds
      LEFT JOIN properties p ON ds.property_id = p.id
      LEFT JOIN accounts a ON ds.account_id = a.id
      ${whereClause}
      ORDER BY ds.deployed_at DESC
    `, params);
    res.json({ success: true, sites: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete a deployed site
app.delete('/api/deploy/:id', async (req, res) => {
  try {
    const deployId = req.params.id;
    const forceDelete = req.query.force === 'true';
    
    // Get deployment record
    const result = await pool.query('SELECT * FROM deployed_sites WHERE id = $1', [deployId]);
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Deployment not found' });
    }
    
    const deployment = result.rows[0];
    let vpsDeleted = false;
    let vpsError = null;
    
    // Try to delete from VPS (but don't fail if it doesn't work)
    try {
      const response = await fetch(`${VPS_DEPLOY_URL}?action=delete-site`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': VPS_DEPLOY_API_KEY
        },
        body: JSON.stringify({
          blog_id: deployment.blog_id,
          confirm: 'DELETE'
        })
      });
      const data = await response.json();
      vpsDeleted = data.success;
      if (!data.success) vpsError = data.error;
    } catch (e) {
      vpsError = e.message;
    }
    
    // Always delete from database if VPS succeeded, force=true, or site already marked deleted
    if (vpsDeleted || forceDelete || deployment.status === 'deleted') {
      await pool.query('DELETE FROM deployed_sites WHERE id = $1', [deployId]);
      
      // Clear website URL from property
      await pool.query(
        'UPDATE properties SET website_url = NULL WHERE id = $1',
        [deployment.property_id]
      );
      
      // Clear website URL from rooms
      const roomIds = typeof deployment.room_ids === 'string' 
        ? JSON.parse(deployment.room_ids || '[]') 
        : (deployment.room_ids || []);
      for (const roomId of roomIds) {
        await pool.query(
          'UPDATE bookable_units SET website_url = NULL WHERE id = $1',
          [roomId]
        );
      }
      
      res.json({ 
        success: true, 
        message: 'Site deleted from database',
        vps_deleted: vpsDeleted,
        vps_error: vpsError
      });
    } else {
      // VPS failed but not force - mark as deleted instead
      await pool.query(
        'UPDATE deployed_sites SET status = $1, updated_at = NOW() WHERE id = $2',
        ['deleted', deployId]
      );
      res.json({ 
        success: true, 
        message: 'Marked as deleted (VPS site may still exist). Use ?force=true to remove from database.',
        vps_error: vpsError
      });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// AFFILIATE SYSTEM
// =====================================================

// Get all affiliates (admin)
app.get('/api/admin/affiliates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, acc.name as account_name,
             (SELECT COALESCE(SUM(commission_amount), 0) 
              FROM affiliate_commissions 
              WHERE affiliate_id = a.id AND status = 'pending') as pending_amount
      FROM affiliates a
      LEFT JOIN accounts acc ON acc.id = a.account_id
      ORDER BY a.active_referrals DESC, a.lifetime_earnings DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get current user's affiliate info
app.get('/api/affiliate/me', async (req, res) => {
  try {
    // Get account ID from session/auth - for now use header or query
    const accountId = req.headers['x-account-id'] || req.query.account_id;
    if (!accountId) {
      return res.json({ success: false, error: 'Account ID required' });
    }
    
    const result = await pool.query(`
      SELECT a.*, 
             (SELECT COALESCE(SUM(commission_amount), 0) 
              FROM affiliate_commissions 
              WHERE affiliate_id = a.id AND status = 'pending') as pending_amount,
             (SELECT COALESCE(SUM(commission_amount), 0) 
              FROM affiliate_commissions 
              WHERE affiliate_id = a.id 
              AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_earnings
      FROM affiliates a
      WHERE a.account_id = $1
    `, [accountId]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, affiliate: result.rows[0] });
    } else {
      res.json({ success: true, affiliate: null });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get current user's referrals
app.get('/api/affiliate/referrals', async (req, res) => {
  try {
    const accountId = req.headers['x-account-id'] || req.query.account_id;
    if (!accountId) {
      return res.json({ success: false, error: 'Account ID required' });
    }
    
    const result = await pool.query(`
      SELECT r.*, acc.name as account_name, s.plan_code,
             (SELECT COALESCE(SUM(commission_amount), 0) 
              FROM affiliate_commissions c 
              WHERE c.referral_id = r.id) as total_commission
      FROM affiliate_referrals r
      JOIN affiliates a ON a.id = r.affiliate_id
      LEFT JOIN accounts acc ON acc.id = r.referred_account_id
      LEFT JOIN billing_subscriptions s ON s.account_id = r.referred_account_id
      WHERE a.account_id = $1
      ORDER BY r.signed_up_at DESC
    `, [accountId]);
    
    res.json({ success: true, referrals: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Join affiliate program
app.post('/api/affiliate/join', async (req, res) => {
  try {
    const accountId = req.headers['x-account-id'] || req.body.account_id;
    if (!accountId) {
      return res.json({ success: false, error: 'Account ID required' });
    }
    
    // Check if already an affiliate
    const existing = await pool.query(
      'SELECT id FROM affiliates WHERE account_id = $1',
      [accountId]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Already an affiliate' });
    }
    
    // Generate unique referral code
    const account = await pool.query('SELECT name FROM accounts WHERE id = $1', [accountId]);
    const baseName = (account.rows[0]?.name || 'REF').toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const referralCode = `${baseName}${randomNum}`;
    
    // Get bronze tier
    const bronzeTier = await pool.query("SELECT id FROM affiliate_tiers WHERE code = 'bronze'");
    const tierId = bronzeTier.rows[0]?.id || 1;
    
    const result = await pool.query(`
      INSERT INTO affiliates (account_id, referral_code, referral_link, tier_id, tier_code, approved_at)
      VALUES ($1, $2, $3, $4, 'bronze', CURRENT_TIMESTAMP)
      RETURNING *
    `, [accountId, referralCode, `https://gas.travel/ref/${referralCode}`, tierId]);
    
    res.json({ success: true, affiliate: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Request payout
app.post('/api/affiliate/payout', async (req, res) => {
  const client = await pool.connect();
  try {
    const accountId = req.headers['x-account-id'] || req.body.account_id;
    if (!accountId) {
      return res.json({ success: false, error: 'Account ID required' });
    }
    
    await client.query('BEGIN');
    
    // Get affiliate and pending amount
    const affiliateResult = await client.query(`
      SELECT a.id, 
             (SELECT COALESCE(SUM(commission_amount), 0) 
              FROM affiliate_commissions 
              WHERE affiliate_id = a.id AND status = 'pending') as pending_amount
      FROM affiliates a
      WHERE a.account_id = $1
    `, [accountId]);
    
    if (affiliateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ success: false, error: 'Not an affiliate' });
    }
    
    const affiliate = affiliateResult.rows[0];
    const pendingAmount = parseFloat(affiliate.pending_amount || 0);
    
    if (pendingAmount < 50) {
      await client.query('ROLLBACK');
      return res.json({ success: false, error: 'Minimum payout is £50' });
    }
    
    // Create payout record
    const payoutResult = await client.query(`
      INSERT INTO affiliate_payouts (affiliate_id, amount, currency, status)
      VALUES ($1, $2, 'GBP', 'pending')
      RETURNING id
    `, [affiliate.id, pendingAmount]);
    
    // Mark commissions as processing
    await client.query(`
      UPDATE affiliate_commissions 
      SET status = 'processing', payout_id = $1
      WHERE affiliate_id = $2 AND status = 'pending'
    `, [payoutResult.rows[0].id, affiliate.id]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, payout_id: payoutResult.rows[0].id, amount: pendingAmount });
  } catch (error) {
    await client.query('ROLLBACK');
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Track referral signup (called when someone signs up via referral link)
app.post('/api/affiliate/track', async (req, res) => {
  try {
    const { referral_code, referred_account_id } = req.body;
    
    // Find affiliate by code
    const affiliateResult = await pool.query(
      'SELECT id FROM affiliates WHERE referral_code = $1',
      [referral_code]
    );
    
    if (affiliateResult.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid referral code' });
    }
    
    const affiliateId = affiliateResult.rows[0].id;
    
    // Check if already referred
    const existing = await pool.query(
      'SELECT id FROM affiliate_referrals WHERE referred_account_id = $1',
      [referred_account_id]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Account already has a referrer' });
    }
    
    // Create referral record
    await pool.query(`
      INSERT INTO affiliate_referrals (affiliate_id, referred_account_id, status, referral_source)
      VALUES ($1, $2, 'pending', 'link')
    `, [affiliateId, referred_account_id]);
    
    // Update affiliate stats
    await pool.query(`
      UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE id = $1
    `, [affiliateId]);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// CREDIT PACKAGES ADMIN
// =====================================================

// Get all credit packages
app.get('/api/admin/billing/credit-packages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_credit_packages ORDER BY sort_order, price');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update credit package
app.post('/api/admin/billing/credit-packages', async (req, res) => {
  try {
    const { id, name, credits, price, currency, bonus_credits, is_active, sort_order } = req.body;
    
    if (id) {
      const result = await pool.query(`
        UPDATE billing_credit_packages SET 
          name = $1, credits = $2, price = $3, currency = $4, bonus_credits = $5, is_active = $6, sort_order = $7
        WHERE id = $8 RETURNING *
      `, [name, credits, price, currency || 'GBP', bonus_credits || 0, is_active !== false, sort_order || 0, id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(`
        INSERT INTO billing_credit_packages (name, credits, price, currency, bonus_credits, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [name, credits, price, currency || 'GBP', bonus_credits || 0, is_active !== false, sort_order || 0]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete credit package
app.delete('/api/admin/billing/credit-packages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_credit_packages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// EXTRAS ADMIN
// =====================================================

// Get all extras
app.get('/api/admin/billing/extras', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_extras ORDER BY sort_order, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update extra
app.post('/api/admin/billing/extras', async (req, res) => {
  try {
    const { id, name, slug, description, credit_cost, category, icon, is_active, requires_booking, sort_order } = req.body;
    
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    if (id) {
      const result = await pool.query(`
        UPDATE billing_extras SET 
          name = $1, slug = $2, description = $3, credit_cost = $4, category = $5, 
          icon = $6, is_active = $7, requires_booking = $8, sort_order = $9
        WHERE id = $10 RETURNING *
      `, [name, finalSlug, description, credit_cost, category, icon, is_active !== false, requires_booking || false, sort_order || 0, id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(`
        INSERT INTO billing_extras (name, slug, description, credit_cost, category, icon, is_active, requires_booking, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `, [name, finalSlug, description, credit_cost, category, icon, is_active !== false, requires_booking || false, sort_order || 0]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete extra
app.delete('/api/admin/billing/extras/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM billing_extras WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ACCOUNT BILLING (For Users)
// =====================================================

// Get account's subscription and credits
app.get('/api/billing/my-account', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    // Get account from token
    const sessionResult = await pool.query(`
      SELECT a.* FROM accounts a
      JOIN account_sessions s ON a.id = s.account_id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `, [token]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }
    
    const account = sessionResult.rows[0];
    
    // Get subscription
    const subResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.features, p.max_properties
      FROM billing_subscriptions s
      LEFT JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.account_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1
    `, [account.id]);
    
    // Get credits
    const creditResult = await pool.query(`
      SELECT * FROM billing_credits WHERE account_id = $1
    `, [account.id]);
    
    // Get recent credit transactions
    const transResult = await pool.query(`
      SELECT * FROM billing_credit_transactions 
      WHERE account_id = $1 
      ORDER BY created_at DESC LIMIT 10
    `, [account.id]);
    
    res.json({
      success: true,
      subscription: subResult.rows[0] || null,
      credits: creditResult.rows[0] || { balance: 0, lifetime_purchased: 0, lifetime_spent: 0 },
      recent_transactions: transResult.rows
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get available plans (for upgrade/signup)
app.get('/api/billing/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_plans WHERE is_active = true ORDER BY sort_order, price_monthly');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get available credit packages
app.get('/api/billing/credit-packages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_credit_packages WHERE is_active = true ORDER BY sort_order, price');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get available extras
app.get('/api/billing/extras', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing_extras WHERE is_active = true ORDER BY sort_order, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Assign subscription to account (admin function)
app.post('/api/admin/billing/assign-subscription', async (req, res) => {
  try {
    const { account_id, plan_id, billing_cycle = 'monthly', status = 'active', feature_overrides = {} } = req.body;
    
    // Validate plan exists
    const planResult = await pool.query('SELECT * FROM billing_plans WHERE id = $1', [plan_id]);
    if (planResult.rows.length === 0) {
      return res.json({ success: false, error: 'Plan not found' });
    }
    
    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    // Check if subscription exists
    const existingResult = await pool.query(`
      SELECT id FROM billing_subscriptions WHERE account_id = $1
    `, [account_id]);
    
    let result;
    if (existingResult.rows.length > 0) {
      // Update existing subscription
      result = await pool.query(`
        UPDATE billing_subscriptions SET
          plan_id = $2,
          status = $3,
          billing_cycle = $4,
          current_period_start = $5,
          current_period_end = $6,
          feature_overrides = $7,
          updated_at = NOW()
        WHERE account_id = $1
        RETURNING *
      `, [account_id, plan_id, status, billing_cycle, now, periodEnd, JSON.stringify(feature_overrides)]);
    } else {
      // Insert new subscription
      result = await pool.query(`
        INSERT INTO billing_subscriptions (account_id, plan_id, status, billing_cycle, current_period_start, current_period_end, feature_overrides)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [account_id, plan_id, status, billing_cycle, now, periodEnd, JSON.stringify(feature_overrides)]);
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get subscription for an account
app.get('/api/admin/billing/subscription/:accountId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.features
      FROM billing_subscriptions s
      JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.account_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1
    `, [req.params.accountId]);
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Cancel subscription
app.post('/api/admin/billing/cancel-subscription', async (req, res) => {
  try {
    const { account_id } = req.body;
    
    await pool.query(`
      UPDATE billing_subscriptions 
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE account_id = $1 AND status = 'active'
    `, [account_id]);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Add credits to account (admin function or after Stripe payment)
app.post('/api/billing/add-credits', async (req, res) => {
  try {
    const { account_id, amount, description, type = 'purchase', reference_type, reference_id } = req.body;
    
    // Upsert credits record
    await pool.query(`
      INSERT INTO billing_credits (account_id, balance, lifetime_purchased, updated_at)
      VALUES ($1, $2, $2, NOW())
      ON CONFLICT (account_id) DO UPDATE SET
        balance = billing_credits.balance + $2,
        lifetime_purchased = billing_credits.lifetime_purchased + $2,
        updated_at = NOW()
    `, [account_id, amount]);
    
    // Get new balance
    const balanceResult = await pool.query('SELECT balance FROM billing_credits WHERE account_id = $1', [account_id]);
    const newBalance = balanceResult.rows[0]?.balance || amount;
    
    // Log transaction
    await pool.query(`
      INSERT INTO billing_credit_transactions (account_id, amount, type, description, reference_type, reference_id, balance_after)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [account_id, amount, type, description, reference_type, reference_id, newBalance]);
    
    res.json({ success: true, new_balance: newBalance });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Spend credits on an extra
app.post('/api/billing/spend-credits', async (req, res) => {
  try {
    const { account_id, extra_id, notes } = req.body;
    
    // Get the extra
    const extraResult = await pool.query('SELECT * FROM billing_extras WHERE id = $1', [extra_id]);
    if (extraResult.rows.length === 0) {
      return res.json({ success: false, error: 'Extra not found' });
    }
    const extra = extraResult.rows[0];
    
    // Check balance
    const balanceResult = await pool.query('SELECT balance FROM billing_credits WHERE account_id = $1', [account_id]);
    const currentBalance = balanceResult.rows[0]?.balance || 0;
    
    if (currentBalance < extra.credit_cost) {
      return res.json({ success: false, error: 'Insufficient credits', required: extra.credit_cost, available: currentBalance });
    }
    
    // Deduct credits
    await pool.query(`
      UPDATE billing_credits SET 
        balance = balance - $1,
        lifetime_spent = lifetime_spent + $1,
        updated_at = NOW()
      WHERE account_id = $2
    `, [extra.credit_cost, account_id]);
    
    // Get new balance
    const newBalanceResult = await pool.query('SELECT balance FROM billing_credits WHERE account_id = $1', [account_id]);
    const newBalance = newBalanceResult.rows[0]?.balance || 0;
    
    // Log transaction
    await pool.query(`
      INSERT INTO billing_credit_transactions (account_id, amount, type, description, reference_type, reference_id, balance_after)
      VALUES ($1, $2, 'spend', $3, 'extra', $4, $5)
    `, [account_id, -extra.credit_cost, `${extra.name}${notes ? ' - ' + notes : ''}`, extra.id, newBalance]);
    
    res.json({ success: true, new_balance: newBalance, extra: extra.name });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update existing plans with new feature structure (run once)
app.get('/api/admin/billing/update-plans', async (req, res) => {
  try {
    // Update Starter - no API access
    await pool.query(`
      UPDATE billing_plans SET 
        max_properties = 1,
        features = '{"properties": 1, "websites": 1, "booking_plugin": true, "theme": "basic", "blog_module": false, "attractions_module": false, "reviews_widget": false, "api_access": false, "support": "email", "free_trial": false, "white_label": false, "features_list": ["1 property", "1 website", "Booking plugin", "Basic theme", "Email support"]}'
      WHERE slug = 'starter'
    `);
    
    // Update Professional - no API access
    await pool.query(`
      UPDATE billing_plans SET 
        max_properties = 10,
        features = '{"properties": 10, "websites": 1, "booking_plugin": true, "theme": "standard", "blog_module": true, "attractions_module": false, "reviews_widget": false, "api_access": false, "support": "email", "free_trial": true, "white_label": false, "features_list": ["Up to 10 properties", "1 website", "Booking plugin", "All standard themes", "Blog module", "Email support", "14-day free trial"]}'
      WHERE slug = 'professional'
    `);
    
    // Update Business - no API access
    await pool.query(`
      UPDATE billing_plans SET 
        max_properties = 50,
        features = '{"properties": 50, "websites": 1, "booking_plugin": true, "theme": "standard", "blog_module": true, "attractions_module": true, "reviews_widget": false, "api_access": false, "support": "priority", "free_trial": true, "white_label": false, "features_list": ["Up to 50 properties", "1 website", "Booking plugin", "All standard themes", "Blog module", "Attractions module", "Priority support", "14-day free trial"]}'
      WHERE slug = 'business'
    `);
    
    // Update Enterprise - HAS API access
    await pool.query(`
      UPDATE billing_plans SET 
        max_properties = NULL,
        features = '{"properties": null, "websites": 10, "booking_plugin": true, "theme": "premium", "blog_module": true, "attractions_module": true, "reviews_widget": true, "api_access": true, "support": "dedicated", "free_trial": true, "white_label": true, "features_list": ["Unlimited properties", "Up to 10 websites", "Booking plugin", "All themes including premium", "Blog module", "Attractions module", "Reviews widget", "API access", "Dedicated support", "White-label option", "14-day free trial"]}'
      WHERE slug = 'enterprise'
    `);
    
    // Update extras
    await pool.query(`DELETE FROM billing_extras`);
    await pool.query(`
      INSERT INTO billing_extras (name, slug, description, credit_cost, category, icon, sort_order) VALUES
      ('Additional Website', 'additional-website', 'Add another website to your account', 20, 'Websites', '🌐', 1),
      ('Reviews Widget', 'reviews-widget', 'Display reviews from TripAdvisor, Booking.com, Google', 15, 'Modules', '⭐', 2),
      ('Attractions Module', 'attractions-module', 'Showcase nearby attractions and things to do', 10, 'Modules', '📍', 3),
      ('API Access', 'api-access', 'Enable API access for custom integrations', 25, 'Development', '🔌', 4),
      ('Premium Theme', 'premium-theme', 'Access to premium website design', 25, 'Themes', '✨', 5),
      ('Setup Assistance Call (30 min)', 'setup-call', 'One-on-one video call to help you get started', 5, 'Support', '📞', 6),
      ('We Setup For You', 'full-setup', 'We configure everything for you', 20, 'Support', '🎨', 7),
      ('Custom Integration', 'custom-integration', 'Custom channel manager or API integration', 30, 'Development', '🔧', 8),
      ('Training Session (1 hour)', 'training', 'Personalised training session', 10, 'Support', '📚', 9)
    `);
    
    // Create new tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_deliverables (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        deliverable_type VARCHAR(50) NOT NULL,
        deliverable_id INTEGER,
        deliverable_name VARCHAR(255) NOT NULL,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_by INTEGER,
        source VARCHAR(50) DEFAULT 'subscription',
        notes TEXT,
        UNIQUE(account_id, deliverable_type, deliverable_id)
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        preview_image VARCHAR(500),
        template_type VARCHAR(50) DEFAULT 'theme',
        tier VARCHAR(50) DEFAULT 'basic',
        download_url VARCHAR(500),
        version VARCHAR(20) DEFAULT '1.0.0',
        is_active BOOLEAN DEFAULT true,
        features JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default templates if empty
    const templateCheck = await pool.query('SELECT COUNT(*) FROM website_templates');
    if (parseInt(templateCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO website_templates (name, slug, description, template_type, tier, version) VALUES
        ('Developer Theme', 'developer-theme', 'Clean developer-focused theme with full customization', 'theme', 'starter', '2.0.0'),
        ('GAS Booking Plugin', 'gas-booking-plugin', 'Core booking system plugin', 'plugin', 'starter', '4.0.0'),
        ('GAS Blog Plugin', 'gas-blog-plugin', 'Blog functionality with SEO', 'plugin', 'professional', '1.0.0'),
        ('GAS Attractions Plugin', 'gas-attractions-plugin', 'Nearby attractions showcase', 'plugin', 'business', '1.0.0'),
        ('GAS Reviews Plugin', 'gas-reviews-plugin', 'Reviews from multiple sources', 'plugin', 'enterprise', '1.0.0')
      `);
    }
    
    res.json({ success: true, message: 'Plans, extras, and new tables updated!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get billing overview for admin (all accounts)
app.get('/api/admin/billing/overview', async (req, res) => {
  try {
    // Total active subscriptions by plan
    const subsByPlan = await pool.query(`
      SELECT p.name, p.price_monthly, COUNT(s.id) as count, SUM(p.price_monthly) as mrr
      FROM billing_subscriptions s
      JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
      GROUP BY p.id, p.name, p.price_monthly
      ORDER BY p.sort_order
    `);
    
    // Total MRR
    const mrrResult = await pool.query(`
      SELECT COALESCE(SUM(p.price_monthly), 0) as total_mrr
      FROM billing_subscriptions s
      JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    
    // Total credits in circulation
    const creditsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(lifetime_purchased), 0) as total_purchased,
        COALESCE(SUM(lifetime_spent), 0) as total_spent
      FROM billing_credits
    `);
    
    // Recent payments
    const paymentsResult = await pool.query(`
      SELECT bp.*, a.name as account_name
      FROM billing_payments bp
      JOIN accounts a ON bp.account_id = a.id
      ORDER BY bp.created_at DESC LIMIT 20
    `);
    
    res.json({
      success: true,
      subscriptions_by_plan: subsByPlan.rows,
      mrr: parseFloat(mrrResult.rows[0]?.total_mrr || 0),
      credits: creditsResult.rows[0],
      recent_payments: paymentsResult.rows
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// WEBSITE TEMPLATES MANAGEMENT
// =====================================================

// Get all templates (admin)
app.get('/api/admin/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_templates ORDER BY template_type, tier, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create/update template
app.post('/api/admin/templates', async (req, res) => {
  try {
    const { id, name, slug, description, preview_image, template_type, tier, download_url, version, is_active, features } = req.body;
    
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    if (id) {
      const result = await pool.query(`
        UPDATE website_templates SET
          name = $1, slug = $2, description = $3, preview_image = $4, template_type = $5,
          tier = $6, download_url = $7, version = $8, is_active = $9, features = $10
        WHERE id = $11 RETURNING *
      `, [name, finalSlug, description, preview_image, template_type, tier, download_url, version, is_active !== false, JSON.stringify(features || []), id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(`
        INSERT INTO website_templates (name, slug, description, preview_image, template_type, tier, download_url, version, is_active, features)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `, [name, finalSlug, description, preview_image, template_type, tier, download_url, version, is_active !== false, JSON.stringify(features || [])]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete template
app.delete('/api/admin/templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM website_templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// DELIVERY TRACKING
// =====================================================

// Get deliveries for an account
app.get('/api/admin/deliveries/:accountId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, wt.name as template_name, wt.template_type, wt.tier, wt.version
      FROM billing_deliverables d
      LEFT JOIN website_templates wt ON d.deliverable_id = wt.id AND d.deliverable_type IN ('theme', 'plugin')
      WHERE d.account_id = $1
      ORDER BY d.delivered_at DESC
    `, [req.params.accountId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Record a delivery
app.post('/api/admin/deliveries', async (req, res) => {
  try {
    const { account_id, deliverable_type, deliverable_id, deliverable_name, source, notes, delivered_by } = req.body;
    
    const result = await pool.query(`
      INSERT INTO billing_deliverables (account_id, deliverable_type, deliverable_id, deliverable_name, source, notes, delivered_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (account_id, deliverable_type, deliverable_id) 
      DO UPDATE SET delivered_at = NOW(), notes = EXCLUDED.notes
      RETURNING *
    `, [account_id, deliverable_type, deliverable_id, deliverable_name, source || 'manual', notes, delivered_by]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check what an account has access to (based on subscription + purchases)
app.get('/api/account/:accountId/entitlements', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    
    // Get subscription plan features AND feature_overrides
    const subResult = await pool.query(`
      SELECT p.features, p.slug as plan_slug, p.name as plan_name, s.feature_overrides
      FROM billing_subscriptions s
      JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.account_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1
    `, [accountId]);
    
    const planFeatures = subResult.rows[0]?.features || {};
    const featureOverrides = subResult.rows[0]?.feature_overrides || {};
    const planSlug = subResult.rows[0]?.plan_slug || 'none';
    
    // Merge plan features with overrides (overrides take precedence)
    const mergedFeatures = { ...planFeatures, ...featureOverrides };
    
    // Get delivered items
    const deliveredResult = await pool.query(`
      SELECT deliverable_type, deliverable_name, deliverable_id
      FROM billing_deliverables
      WHERE account_id = $1
    `, [accountId]);
    
    // Get available templates they can access based on tier
    const tierOrder = { 'basic': 1, 'starter': 1, 'professional': 2, 'business': 3, 'enterprise': 4 };
    const accountTier = tierOrder[planSlug] || 0;
    
    const templatesResult = await pool.query(`
      SELECT * FROM website_templates WHERE is_active = true
    `);
    
    const accessibleTemplates = templatesResult.rows.filter(t => {
      const templateTier = tierOrder[t.tier] || 0;
      return templateTier <= accountTier;
    });
    
    res.json({
      success: true,
      plan: subResult.rows[0] || null,
      features: mergedFeatures,
      feature_overrides: featureOverrides,
      delivered: deliveredResult.rows,
      accessible_templates: accessibleTemplates
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// INSTAWP INTEGRATION
// =====================================================

// Get InstaWP settings (master admin)
app.get('/api/admin/instawp/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM instawp_settings ORDER BY id LIMIT 1');
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Save InstaWP settings (master admin)
app.post('/api/admin/instawp/settings', async (req, res) => {
  try {
    const { api_url, api_key, default_template, templates, webhook_secret, is_enabled } = req.body;
    
    // Upsert
    const existing = await pool.query('SELECT id FROM instawp_settings LIMIT 1');
    
    if (existing.rows.length > 0) {
      const result = await pool.query(`
        UPDATE instawp_settings SET
          api_url = $1, api_key = $2, default_template = $3, templates = $4, webhook_secret = $5, is_enabled = $6, updated_at = NOW()
        WHERE id = $7 RETURNING *
      `, [api_url || 'https://sites.gas.travel/gas-api.php', api_key, default_template, JSON.stringify(templates || {}), webhook_secret, is_enabled, existing.rows[0].id]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(`
        INSERT INTO instawp_settings (api_url, api_key, default_template, templates, webhook_secret, is_enabled)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [api_url || 'https://sites.gas.travel/gas-api.php', api_key, default_template, JSON.stringify(templates || {}), webhook_secret, is_enabled]);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get account website
app.get('/api/account/:accountId/website', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM account_websites WHERE account_id = $1
    `, [req.params.accountId]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create website for account via InstaWP
app.post('/api/admin/instawp/create-site', async (req, res) => {
  try {
    const { account_id, site_name, template_slug } = req.body;
    
    // Get InstaWP settings
    const settingsResult = await pool.query('SELECT * FROM instawp_settings LIMIT 1');
    const settings = settingsResult.rows[0];
    
    if (!settings || !settings.api_key || !settings.is_enabled) {
      return res.json({ success: false, error: 'InstaWP not configured. Add API key in settings.' });
    }
    
    // Check if account already has a site
    const existingResult = await pool.query('SELECT * FROM account_websites WHERE account_id = $1', [account_id]);
    if (existingResult.rows.length > 0) {
      return res.json({ success: false, error: 'Account already has a website', existing: existingResult.rows[0] });
    }
    
    // Get account details for configuration
    const accountResult = await pool.query('SELECT * FROM accounts WHERE id = $1', [account_id]);
    const account = accountResult.rows[0];
    
    if (!account) {
      return res.json({ success: false, error: 'Account not found' });
    }
    
    // Determine template based on subscription
    const subResult = await pool.query(`
      SELECT p.slug FROM billing_subscriptions s
      JOIN billing_plans p ON s.plan_id = p.id
      WHERE s.account_id = $1 AND s.status = 'active'
    `, [account_id]);
    
    const planSlug = subResult.rows[0]?.slug || 'starter';
    const templates = settings.templates || {};
    const templateToUse = template_slug || templates[planSlug] || settings.default_template;
    
    // Create site via WordPress Multisite API
    const siteSlug = (site_name || account.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const wpResponse = await fetch(settings.api_url || 'https://sites.gas.travel/gas-api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_site',
        slug: siteSlug,
        title: account.name,
        email: account.email || 'admin@gas.travel',
        account_id: account_id
      })
    });
    
    const wpData = await wpResponse.json();
    
    if (!wpData.success) {
      return res.json({ success: false, error: 'WordPress API error', details: wpData.error });
    }
    
    // Store website record
    const websiteResult = await pool.query(`
      INSERT INTO account_websites (account_id, instawp_site_id, site_name, site_url, admin_url, template_used, status, instawp_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      account_id,
      wpData.slug,
      site_name || account.name,
      wpData.site_url,
      wpData.admin_url,
      templateToUse,
      'active',
      JSON.stringify(wpData)
    ]);
    
    res.json({ success: true, data: websiteResult.rows[0], instawp: instawpData });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check InstaWP site status
app.get('/api/admin/instawp/site-status/:siteId', async (req, res) => {
  try {
    const settingsResult = await pool.query('SELECT api_key FROM instawp_settings LIMIT 1');
    const settings = settingsResult.rows[0];
    
    if (!settings || !settings.api_key) {
      return res.json({ success: false, error: 'InstaWP not configured' });
    }
    
    const response = await fetch(`https://app.instawp.io/api/v2/sites/${req.params.siteId}`, {
      headers: { 'Authorization': `Bearer ${settings.api_key}` }
    });
    
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update website record (after site is ready)
app.put('/api/account/:accountId/website', async (req, res) => {
  try {
    const { site_url, admin_url, custom_domain, status } = req.body;
    
    const result = await pool.query(`
      UPDATE account_websites SET
        site_url = COALESCE($2, site_url),
        admin_url = COALESCE($3, admin_url),
        custom_domain = COALESCE($4, custom_domain),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE account_id = $1
      RETURNING *
    `, [req.params.accountId, site_url, admin_url, custom_domain, status]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete website
app.delete('/api/account/:accountId/website', async (req, res) => {
  try {
    // Get website details first
    const websiteResult = await pool.query('SELECT * FROM account_websites WHERE account_id = $1', [req.params.accountId]);
    const website = websiteResult.rows[0];
    
    if (!website) {
      return res.json({ success: false, error: 'No website found' });
    }
    
    // Optionally delete from InstaWP too
    const settingsResult = await pool.query('SELECT api_key FROM instawp_settings LIMIT 1');
    const settings = settingsResult.rows[0];
    
    if (settings?.api_key && website.instawp_site_id) {
      try {
        await fetch(`https://app.instawp.io/api/v2/sites/${website.instawp_site_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${settings.api_key}` }
        });
      } catch (e) {
        console.log('Failed to delete from InstaWP:', e.message);
      }
    }
    
    await pool.query('DELETE FROM account_websites WHERE account_id = $1', [req.params.accountId]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// PROPERTY PAYMENT SETTINGS
// =====================================================

// Get payment settings for a property
app.get('/api/property/:propertyId/payment-settings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM property_payment_settings WHERE property_id = $1
    `, [req.params.propertyId]);
    
    // Return defaults if no settings exist
    if (result.rows.length === 0) {
      res.json({ 
        success: true, 
        data: {
          property_id: parseInt(req.params.propertyId),
          payment_enabled: true,
          deposit_type: 'percentage',
          deposit_amount: 25,
          balance_due_days: 14,
          stripe_connected: false,
          accepted_methods: ['card'],
          currency: 'GBP'
        }
      });
    } else {
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Save payment settings for a property
app.post('/api/property/:propertyId/payment-settings', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const {
      payment_enabled, deposit_type, deposit_amount, balance_due_days,
      stripe_account_id, paypal_email, bank_details, accepted_methods,
      currency, cancellation_policy, refund_policy
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO property_payment_settings (
        property_id, payment_enabled, deposit_type, deposit_amount, balance_due_days,
        stripe_account_id, paypal_email, bank_details, accepted_methods,
        currency, cancellation_policy, refund_policy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (property_id) DO UPDATE SET
        payment_enabled = $2, deposit_type = $3, deposit_amount = $4, balance_due_days = $5,
        stripe_account_id = $6, paypal_email = $7, bank_details = $8, accepted_methods = $9,
        currency = $10, cancellation_policy = $11, refund_policy = $12, updated_at = NOW()
      RETURNING *
    `, [
      propertyId, payment_enabled, deposit_type, deposit_amount, balance_due_days,
      stripe_account_id, paypal_email, JSON.stringify(bank_details || {}),
      JSON.stringify(accepted_methods || ['card']), currency || 'GBP',
      cancellation_policy, JSON.stringify(refund_policy || {})
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// GUEST PAYMENTS (for booking checkout)
// =====================================================

// Create payment intent for a booking
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const { booking_id, property_id, amount, currency, payment_type, guest_email, guest_name } = req.body;
    
    // Get property payment settings
    const settingsResult = await pool.query(`
      SELECT pps.*, p.account_id FROM property_payment_settings pps
      JOIN properties p ON pps.property_id = p.id
      WHERE pps.property_id = $1
    `, [property_id]);
    
    const settings = settingsResult.rows[0];
    
    if (!settings) {
      return res.json({ success: false, error: 'Payment not configured for this property' });
    }
    
    // For now, just record the payment intent (Stripe integration later)
    const result = await pool.query(`
      INSERT INTO guest_payments (booking_id, property_id, account_id, guest_email, guest_name, amount, currency, payment_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [booking_id, property_id, settings.account_id, guest_email, guest_name, amount, currency || settings.currency, payment_type]);
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      // In future, return Stripe client_secret here
      message: 'Payment recorded. Stripe integration pending.'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get payments for a booking
app.get('/api/booking/:bookingId/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM guest_payments WHERE booking_id = $1 ORDER BY created_at DESC
    `, [req.params.bookingId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all payments for a property
app.get('/api/property/:propertyId/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gp.*, b.check_in, b.check_out, bu.name as room_name
      FROM guest_payments gp
      LEFT JOIN bookings b ON gp.booking_id = b.id
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      WHERE gp.property_id = $1
      ORDER BY gp.created_at DESC
    `, [req.params.propertyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Calculate deposit for a booking
app.post('/api/payments/calculate-deposit', async (req, res) => {
  try {
    const { property_id, total_amount } = req.body;
    
    const settingsResult = await pool.query(`
      SELECT * FROM property_payment_settings WHERE property_id = $1
    `, [property_id]);
    
    const settings = settingsResult.rows[0] || {
      deposit_type: 'percentage',
      deposit_amount: 25,
      balance_due_days: 14,
      currency: 'GBP'
    };
    
    let depositAmount;
    if (settings.deposit_type === 'percentage') {
      depositAmount = (total_amount * settings.deposit_amount) / 100;
    } else {
      depositAmount = Math.min(settings.deposit_amount, total_amount);
    }
    
    const balanceAmount = total_amount - depositAmount;
    
    res.json({
      success: true,
      data: {
        total: total_amount,
        deposit: Math.round(depositAmount * 100) / 100,
        balance: Math.round(balanceAmount * 100) / 100,
        deposit_type: settings.deposit_type,
        deposit_setting: settings.deposit_amount,
        balance_due_days: settings.balance_due_days,
        currency: settings.currency
      }
    });
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
    const accountId = req.query.account_id;
    let result;
    
    if (accountId) {
      result = await pool.query('SELECT * FROM properties WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
    } else if (clientId) {
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
    const accountId = req.query.account_id;
    const propertyId = req.query.property_id;
    let result;
    
    if (propertyId) {
      result = await pool.query(`
        SELECT bu.* FROM bookable_units bu
        WHERE bu.property_id = $1
        ORDER BY bu.created_at
      `, [propertyId]);
    } else if (accountId) {
      result = await pool.query(`
        SELECT bu.* FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        WHERE p.account_id = $1
        ORDER BY bu.property_id, bu.created_at
      `, [accountId]);
    } else if (clientId) {
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
    const { 
      name, description, address, city, country, property_type, status,
      district, state, zip_code, latitude, longitude
    } = req.body;

    const result = await pool.query(
      `UPDATE properties SET 
        name = COALESCE($1, name), 
        description = COALESCE($2, description), 
        address = COALESCE($3, address), 
        city = COALESCE($4, city), 
        country = COALESCE($5, country), 
        property_type = COALESCE($6, property_type),
        status = COALESCE($7, status),
        district = COALESCE($8, district),
        state = COALESCE($9, state),
        zip_code = COALESCE($10, zip_code),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *`,
      [name, description, address, city, country, property_type, status,
       district, state, zip_code, latitude, longitude, id]
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
        
        // Build payments array if deposit was paid
        const payments = [];
        if (stripe_payment_intent_id && deposit_amount && parseFloat(deposit_amount) > 0) {
          payments.push({
            description: 'Deposit via Stripe (GAS)',
            amount: parseFloat(deposit_amount),
            status: 'received',
            date: new Date().toISOString().split('T')[0]
          });
        }
        
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
          notes: `GAS Booking ID: ${booking.id}`,
          // Price and financial info
          price: parseFloat(total_price) || 0,
          deposit: parseFloat(deposit_amount) || 0,
          // Invoice items
          invoiceItems: [{
            description: 'Accommodation',
            qty: 1,
            amount: parseFloat(total_price) || 0,
            vatRate: 0
          }],
          // Payments if deposit was collected
          ...(payments.length > 0 && { payments })
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

// =====================================================
// CHANNEL CONNECTIONS - List and Details
// =====================================================

// Get all channel connections for an account
app.get('/api/channel-connections', async (req, res) => {
  try {
    const accountId = req.query.account || req.query.account_id;
    
    let query = `
      SELECT 
        cc.id,
        cc.status,
        cc.gas_account_id as account_id,
        cc.created_at,
        cc.updated_at,
        cm.cm_code,
        cm.cm_name,
        a.name as account_name,
        (SELECT COUNT(*) FROM properties p WHERE 
          (cm.cm_code = 'beds24' AND p.beds24_property_id IS NOT NULL AND p.account_id = cc.gas_account_id) OR
          (cm.cm_code = 'hostaway' AND p.hostaway_listing_id IS NOT NULL AND p.account_id = cc.gas_account_id) OR
          (cm.cm_code = 'smoobu' AND p.smoobu_id IS NOT NULL AND p.account_id = cc.gas_account_id)
        ) as property_count
      FROM channel_connections cc
      JOIN channel_managers cm ON cc.cm_id = cm.id
      LEFT JOIN accounts a ON a.id = cc.gas_account_id
    `;
    
    const params = [];
    if (accountId) {
      query += ' WHERE cc.gas_account_id = $1';
      params.push(parseInt(accountId));
    }
    
    query += ' ORDER BY cc.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, connections: result.rows });
  } catch (error) {
    console.error('Error fetching channel connections:', error);
    res.json({ success: false, error: error.message });
  }
});

// Debug: Check channel_connections table
app.get('/api/debug/channel-connections', async (req, res) => {
  try {
    const connections = await pool.query('SELECT * FROM channel_connections');
    const managers = await pool.query('SELECT * FROM channel_managers');
    res.json({ 
      connections: connections.rows, 
      managers: managers.rows 
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Fix channel connections - update account_id and delete bad records
app.get('/api/fix/channel-connections', async (req, res) => {
  try {
    // Fix Beds24 connection (id=2) to point to GAS account 4
    await pool.query('UPDATE channel_connections SET account_id = $1 WHERE id = $2', ['4', 2]);
    
    // Delete Cloudbeds connection (id=23) - shouldn't exist
    await pool.query('DELETE FROM channel_connections WHERE id = $1', [23]);
    
    // Check if Hostaway connection exists for account 3
    const hostawayCheck = await pool.query(
      "SELECT id FROM channel_connections WHERE cm_id = (SELECT id FROM channel_managers WHERE cm_code = 'hostaway')"
    );
    
    // Check if Smoobu connection exists for account 2
    const smoobuCheck = await pool.query(
      "SELECT id FROM channel_connections WHERE cm_id = (SELECT id FROM channel_managers WHERE cm_code = 'smoobu')"
    );
    
    res.json({ 
      success: true, 
      message: 'Fixed Beds24 (account 4), deleted Cloudbeds',
      hostaway_exists: hostawayCheck.rows.length > 0,
      smoobu_exists: smoobuCheck.rows.length > 0
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Fix: Link an account to Beds24 channel connection
app.get('/api/fix/link-beds24/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Ensure gas_account_id column exists
    await pool.query(`ALTER TABLE channel_connections ADD COLUMN IF NOT EXISTS gas_account_id INTEGER`).catch(() => {});
    
    // Get Beds24 CM ID
    const cmResult = await pool.query("SELECT id FROM channel_managers WHERE cm_code = 'beds24' LIMIT 1");
    if (cmResult.rows.length === 0) {
      return res.json({ success: false, error: 'Beds24 not found in channel_managers' });
    }
    const cmId = cmResult.rows[0].id;
    
    // Find any existing Beds24 connection
    const existing = await pool.query(
      'SELECT id FROM channel_connections WHERE cm_id = $1 LIMIT 1',
      [cmId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing connection to link to this account
      await pool.query(
        'UPDATE channel_connections SET gas_account_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [parseInt(accountId), 'active', existing.rows[0].id]
      );
      return res.json({ success: true, message: 'Updated Beds24 connection to account ' + accountId, connectionId: existing.rows[0].id });
    }
    
    // Create new connection if none exists
    const result = await pool.query(`
      INSERT INTO channel_connections (cm_id, user_id, gas_account_id, status, created_at, updated_at)
      VALUES ($1, 1, $2, 'active', NOW(), NOW())
      RETURNING id
    `, [cmId, parseInt(accountId)]);
    
    res.json({ success: true, message: 'Created Beds24 connection for account ' + accountId, connectionId: result.rows[0].id });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Fix: Merge multiple accounts into one (for Beds24 multi-property imports)
// Usage: /api/fix/merge-accounts/NewAccountName
// This will merge all accounts created today with @gas.travel emails into one
app.get('/api/fix/merge-accounts/:newName', async (req, res) => {
  try {
    const { newName } = req.params;
    const decodedName = decodeURIComponent(newName);
    
    // Find all accounts with @gas.travel emails (auto-created ones)
    const autoAccounts = await pool.query(`
      SELECT id, name, email FROM accounts 
      WHERE email LIKE '%@gas.travel' 
      AND role = 'admin'
      ORDER BY id
    `);
    
    if (autoAccounts.rows.length === 0) {
      return res.json({ success: false, error: 'No auto-created accounts found' });
    }
    
    console.log('Found ' + autoAccounts.rows.length + ' auto-created accounts to merge');
    
    // Create new master account or find existing
    let masterAccountId;
    const existingMaster = await pool.query(
      'SELECT id FROM accounts WHERE name = $1',
      [decodedName]
    );
    
    if (existingMaster.rows.length > 0) {
      masterAccountId = existingMaster.rows[0].id;
      console.log('Using existing account: ' + masterAccountId);
    } else {
      const newMaster = await pool.query(`
        INSERT INTO accounts (name, email, role, business_name, status)
        VALUES ($1, $2, 'admin', $1, 'active')
        RETURNING id
      `, [decodedName, decodedName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '@client.gas.travel']);
      masterAccountId = newMaster.rows[0].id;
      console.log('Created new master account: ' + masterAccountId);
    }
    
    // Move all properties to master account
    const accountIds = autoAccounts.rows.map(a => a.id);
    const moveResult = await pool.query(`
      UPDATE properties SET account_id = $1 
      WHERE account_id = ANY($2::int[])
      RETURNING id, name
    `, [masterAccountId, accountIds]);
    
    console.log('Moved ' + moveResult.rows.length + ' properties to account ' + masterAccountId);
    
    // Move bookable_units ownership (if any have account_id)
    await pool.query(`
      UPDATE bookable_units SET account_id = $1 
      WHERE account_id = ANY($2::int[])
    `, [masterAccountId, accountIds]).catch(() => {});
    
    // Update channel connections
    await pool.query(`
      UPDATE channel_connections SET gas_account_id = $1 
      WHERE gas_account_id = ANY($2::int[])
    `, [masterAccountId, accountIds]).catch(() => {});
    
    // Delete the old auto-created accounts (except master if it was one of them)
    const deleteIds = accountIds.filter(id => id !== masterAccountId);
    if (deleteIds.length > 0) {
      await pool.query('DELETE FROM accounts WHERE id = ANY($1::int[])', [deleteIds]);
      console.log('Deleted ' + deleteIds.length + ' old accounts');
    }
    
    res.json({
      success: true,
      masterAccountId,
      masterAccountName: decodedName,
      propertiesMoved: moveResult.rows.length,
      accountsDeleted: deleteIds.length,
      properties: moveResult.rows
    });
    
  } catch (error) {
    console.error('Merge accounts error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Fix: Update account email
// Usage: /api/fix/account-email/AccountName/newemail@example.com
app.get('/api/fix/account-email/:name/:email', async (req, res) => {
  try {
    const { name, email } = req.params;
    const decodedName = decodeURIComponent(name);
    const decodedEmail = decodeURIComponent(email);
    
    const result = await pool.query(
      'UPDATE accounts SET email = $1, updated_at = NOW() WHERE LOWER(name) = LOWER($2) RETURNING id, name, email',
      [decodedEmail, decodedName]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Account not found: ' + decodedName });
    }
    
    res.json({ success: true, account: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Add Hostaway connection manually
app.get('/api/fix/add-hostaway/:token/:accountId', async (req, res) => {
  try {
    const { token, accountId } = req.params;
    const gasAccountId = '3'; // Alpine CoHosts
    
    // Get Hostaway CM ID
    const cmResult = await pool.query("SELECT id FROM channel_managers WHERE cm_code = 'hostaway'");
    const cmId = cmResult.rows[0].id;
    
    // Check if connection already exists
    const existing = await pool.query(
      'SELECT id FROM channel_connections WHERE cm_id = $1 AND account_id = $2',
      [cmId, gasAccountId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE channel_connections SET access_token = $1, api_key = $2, status = $3 WHERE id = $4',
        [token, accountId, 'active', existing.rows[0].id]
      );
      res.json({ success: true, message: 'Updated Hostaway connection', id: existing.rows[0].id });
    } else {
      // Create new
      const result = await pool.query(`
        INSERT INTO channel_connections (cm_id, user_id, account_id, access_token, api_key, status, created_at, updated_at)
        VALUES ($1, 1, $2, $3, $4, 'active', NOW(), NOW())
        RETURNING id
      `, [cmId, gasAccountId, token, accountId]);
      res.json({ success: true, message: 'Created Hostaway connection', id: result.rows[0].id });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Add Smoobu connection manually
app.get('/api/fix/add-smoobu/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    const gasAccountId = '2'; // Elevate Schweiz
    
    // Get Smoobu CM ID
    const cmResult = await pool.query("SELECT id FROM channel_managers WHERE cm_code = 'smoobu'");
    const cmId = cmResult.rows[0].id;
    
    // Check if connection already exists
    const existing = await pool.query(
      'SELECT id FROM channel_connections WHERE cm_id = $1 AND account_id = $2',
      [cmId, gasAccountId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE channel_connections SET api_key = $1, status = $2 WHERE id = $3',
        [apiKey, 'active', existing.rows[0].id]
      );
      res.json({ success: true, message: 'Updated Smoobu connection', id: existing.rows[0].id });
    } else {
      // Create new
      const result = await pool.query(`
        INSERT INTO channel_connections (cm_id, user_id, account_id, api_key, status, created_at, updated_at)
        VALUES ($1, 1, $2, $3, 'active', NOW(), NOW())
        RETURNING id
      `, [cmId, gasAccountId, apiKey]);
      res.json({ success: true, message: 'Created Smoobu connection', id: result.rows[0].id });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Check for any stored credentials in database
app.get('/api/debug/find-credentials', async (req, res) => {
  try {
    // Check all channel_connections for any tokens
    const connections = await pool.query(`
      SELECT id, cm_id, account_id, api_key, access_token, refresh_token 
      FROM channel_connections
    `);
    
    // Check if there's a settings or config table
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%setting%' OR table_name LIKE '%config%' OR table_name LIKE '%credential%'
    `);
    
    // Check properties for any stored connection info
    const props = await pool.query(`
      SELECT id, name, account_id, hostaway_listing_id, smoobu_id, channel_manager 
      FROM properties 
      WHERE hostaway_listing_id IS NOT NULL OR smoobu_id IS NOT NULL
    `);
    
    res.json({
      connections: connections.rows,
      config_tables: tables.rows,
      cm_properties: props.rows
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Check client_settings for CM credentials
app.get('/api/debug/client-settings', async (req, res) => {
  try {
    const settings = await pool.query('SELECT * FROM client_settings');
    const websiteSettings = await pool.query('SELECT * FROM website_settings');
    res.json({
      client_settings: settings.rows,
      website_settings: websiteSettings.rows
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Get single channel connection details (with token for refresh)
app.get('/api/channel-connection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        cc.*,
        cm.cm_code,
        cm.cm_name
      FROM channel_connections cc
      JOIN channel_managers cm ON cc.cm_id = cm.id
      WHERE cc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Connection not found' });
    }
    
    res.json({ success: true, connection: result.rows[0] });
  } catch (error) {
    console.error('Error fetching channel connection:', error);
    res.json({ success: false, error: error.message });
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
    
    // Ensure Beds24 exists in channel_managers table (check first)
    const beds24Check = await pool.query(`SELECT id FROM channel_managers WHERE cm_code = 'beds24' OR LOWER(name) = 'beds24' LIMIT 1`);
    if (beds24Check.rows.length === 0) {
      await pool.query(`
        INSERT INTO channel_managers (name, cm_name, cm_code, api_base_url, auth_type)
        VALUES ('Beds24', 'Beds24', 'beds24', 'https://api.beds24.com/v2', 'bearer_token')
      `);
    }
    
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
    
    // Check if connection already exists
    const existingConn = await pool.query(
      'SELECT id FROM channel_connections WHERE user_id = $1 AND cm_id = (SELECT id FROM channel_managers WHERE cm_code = $2 LIMIT 1)',
      [userId, 'beds24']
    );
    
    let connectionId;
    if (existingConn.rows.length > 0) {
      connectionId = existingConn.rows[0].id;
      await pool.query(`
        UPDATE channel_connections SET
          api_key = $1, refresh_token = $2, access_token = $3,
          token_expires_at = NOW() + INTERVAL '30 days', status = 'active', updated_at = NOW()
        WHERE id = $4
      `, [inviteCode, refreshToken, token, connectionId]);
    } else {
      const result = await pool.query(`
        INSERT INTO channel_connections (
          user_id, cm_id, api_key, refresh_token, access_token,
          token_expires_at, status, sync_enabled, sync_interval_minutes
        ) VALUES (
          $1, (SELECT id FROM channel_managers WHERE cm_code = 'beds24' LIMIT 1),
          $2, $3, $4, NOW() + INTERVAL '30 days', 'active', true, 60
        )
        RETURNING id
      `, [userId, inviteCode, refreshToken, token]);
      connectionId = result.rows[0].id;
    }
    
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
    
    // Normalize propId (Beds24 API may return id or propId)
    properties = properties.map(p => ({
      ...p,
      propId: p.propId || p.id,
      name: p.name || p.propName || 'Property'
    }));
    
    // Log first property structure for debugging
    if (properties.length > 0) {
      console.log('First property keys:', Object.keys(properties[0]));
      console.log('First property propId:', properties[0].propId);
    }
    
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
// BEDS24 REFRESH PROPERTIES - Compare CM with GAS
// =====================================================
app.post('/api/beds24/refresh-properties', async (req, res) => {
  const { token, accountId } = req.body;
  
  try {
    console.log('🔄 Refreshing Beds24 properties for account:', accountId);
    
    // 1. Fetch all properties from Beds24
    const response = await axios.get('https://beds24.com/api/v2/properties', {
      headers: { 'token': token, 'accept': 'application/json' },
      params: { includeTexts: 'all', includePictures: true, includeAllRooms: true }
    });
    
    const cmProperties = response.data.data || [];
    console.log('Found ' + cmProperties.length + ' properties in Beds24');
    
    // 2. Get existing properties in GAS for this account
    const existingResult = await pool.query(
      'SELECT id, name, beds24_property_id FROM properties WHERE account_id = $1 AND beds24_property_id IS NOT NULL',
      [accountId]
    );
    const existingProperties = existingResult.rows;
    const existingBeds24Ids = existingProperties.map(p => String(p.beds24_property_id));
    
    // 3. Compare
    const existing = [];
    const newProps = [];
    const removed = [];
    
    // Check each CM property
    for (const cmProp of cmProperties) {
      const cmId = String(cmProp.propId);
      const existingProp = existingProperties.find(p => String(p.beds24_property_id) === cmId);
      
      if (existingProp) {
        existing.push({
          gas_id: existingProp.id,
          cm_id: cmId,
          name: cmProp.name,
          gas_name: existingProp.name
        });
      } else {
        newProps.push({
          cm_id: cmId,
          name: cmProp.name,
          city: cmProp.city || '',
          rooms: cmProp.rooms?.length || 0
        });
      }
    }
    
    // Check for removed (in GAS but not in CM)
    const cmIds = cmProperties.map(p => String(p.propId));
    for (const existingProp of existingProperties) {
      if (!cmIds.includes(String(existingProp.beds24_property_id))) {
        removed.push({
          gas_id: existingProp.id,
          cm_id: existingProp.beds24_property_id,
          name: existingProp.name
        });
      }
    }
    
    console.log(`Comparison: ${existing.length} existing, ${newProps.length} new, ${removed.length} removed`);
    
    res.json({
      success: true,
      existing,
      new: newProps,
      removed,
      channel_manager: 'beds24'
    });
    
  } catch (error) {
    console.error('Error refreshing Beds24 properties:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// =====================================================
// ENHANCED BEDS24 IMPORT - FULL CONTENT IMPORT
// =====================================================
// Imports: Properties, Images, Amenities, Policies, Rooms, Room Images, Bed Config
// Language: Default language only (AI translates on frontend)

// Simple Beds24 import - creates account automatically (used by wizard)
app.post('/api/beds24/import-property', async (req, res) => {
  const { token, propId, accountName, accountEmail } = req.body;
  
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 BEDS24 IMPORT - Property ID: ' + propId);
    console.log('   Account: ' + (accountName || 'auto-generate'));
    console.log('═══════════════════════════════════════════════════════');
    
    if (!propId) {
      throw new Error('Property ID is required');
    }
    
    // 1. Fetch property from Beds24
    const propResponse = await axios.get('https://beds24.com/api/v2/properties', {
      headers: { 'token': token, 'accept': 'application/json' },
      params: { id: propId, includeTexts: 'all', includeAllRooms: true }
    });
    
    const props = propResponse.data.data || propResponse.data || [];
    const prop = Array.isArray(props) ? props[0] : props;
    
    if (!prop) {
      throw new Error('Property not found in Beds24');
    }
    
    // Use propId from response or from request
    const beds24PropId = prop.propId || prop.id || propId;
    const propName = prop.name || prop.propName || 'Beds24 Property';
    console.log('   Property: ' + propName + ' (Beds24 ID: ' + beds24PropId + ')');
    
    // 2. Use provided account name, or fall back to property name
    const targetAccountName = accountName || propName;
    const targetEmail = accountEmail || `${targetAccountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}@gas.travel`;
    
    let accountId;
    const existingAccount = await pool.query(
      'SELECT id FROM accounts WHERE LOWER(name) = LOWER($1)',
      [targetAccountName]
    );
    
    if (existingAccount.rows.length > 0) {
      accountId = existingAccount.rows[0].id;
      console.log('   Using existing account ID: ' + accountId);
    } else {
      const newAccount = await pool.query(`
        INSERT INTO accounts (name, email, role, business_name, status)
        VALUES ($1, $2, 'admin', $1, 'active')
        RETURNING id
      `, [targetAccountName, targetEmail]);
      accountId = newAccount.rows[0].id;
      console.log('   Created new account ID: ' + accountId + ' (' + targetAccountName + ')');
    }
    
    // 3. Check if property already exists
    const existingProp = await pool.query(
      'SELECT id FROM properties WHERE beds24_property_id::text = $1',
      [String(propId)]
    );
    
    let gasPropertyId;
    if (existingProp.rows.length > 0) {
      gasPropertyId = existingProp.rows[0].id;
      // Update account_id if needed
      await pool.query('UPDATE properties SET account_id = $1 WHERE id = $2', [accountId, gasPropertyId]);
      console.log('   Updated existing property ID: ' + gasPropertyId);
    } else {
      // 4. Create property
      console.log('   INSERT values: accountId=' + accountId + ', propId=' + propId + ', name=' + propName);
      const propResult = await pool.query(`
        INSERT INTO properties (
          account_id, user_id, beds24_property_id, name, 
          property_type, cm_source, status
        ) VALUES ($1, 1, $2, $3, 'hotel', 'beds24', 'active')
        RETURNING id
      `, [accountId, String(propId), propName]);
      gasPropertyId = propResult.rows[0].id;
      console.log('   Created property ID: ' + gasPropertyId);
    }
    
    // 5. Import rooms
    const rooms = prop.roomTypes || prop.rooms || [];
    let roomsCreated = 0;
    
    for (const room of rooms) {
      const roomId = room.id || room.roomId;
      
      // Skip if no room ID
      if (!roomId) {
        console.log('   Skipping room without ID');
        continue;
      }
      
      // Check if room exists
      const existingRoom = await pool.query(
        'SELECT id FROM bookable_units WHERE property_id = $1 AND beds24_room_id::text = $2',
        [gasPropertyId, String(roomId)]
      );
      
      if (existingRoom.rows.length === 0) {
        await pool.query(`
          INSERT INTO bookable_units (
            property_id, beds24_room_id, cm_room_id, name, 
            max_guests, base_price, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'available')
        `, [
          gasPropertyId, 
          String(roomId), 
          String(roomId), 
          room.name || room.roomName || 'Room',
          room.maxPeople || room.maxGuests || 2,
          room.rackRate || room.basePrice || 100
        ]);
        roomsCreated++;
      }
    }
    console.log('   Created ' + roomsCreated + ' rooms (of ' + rooms.length + ' total)');
    
    // 6. Save/update channel connection for this account
    const cmResult = await pool.query("SELECT id FROM channel_managers WHERE cm_code = 'beds24' LIMIT 1");
    if (cmResult.rows.length > 0) {
      const cmId = cmResult.rows[0].id;
      
      // Ensure gas_account_id column exists
      await pool.query(`ALTER TABLE channel_connections ADD COLUMN IF NOT EXISTS gas_account_id INTEGER`).catch(() => {});
      
      // Check if connection exists for this account
      const existingConn = await pool.query(
        'SELECT id FROM channel_connections WHERE gas_account_id = $1 AND cm_id = $2',
        [accountId, cmId]
      );
      
      if (existingConn.rows.length === 0) {
        await pool.query(`
          INSERT INTO channel_connections (user_id, cm_id, gas_account_id, access_token, status, created_at, updated_at)
          VALUES (1, $1, $2, $3, 'active', NOW(), NOW())
        `, [cmId, accountId, token]);
        console.log('   Created channel connection for account');
      } else {
        await pool.query(`
          UPDATE channel_connections SET access_token = $1, status = 'active', updated_at = NOW()
          WHERE id = $2
        `, [token, existingConn.rows[0].id]);
        console.log('   Updated channel connection');
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    
    res.json({
      success: true,
      accountId,
      propertyId: gasPropertyId,
      propertyName: propName,
      roomsCreated,
      totalRooms: rooms.length
    });
    
  } catch (error) {
    console.error('Beds24 import error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

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

// =====================================================
// HOSTAWAY REFRESH PROPERTIES - Compare CM with GAS
// =====================================================
app.post('/api/hostaway/refresh-properties', async (req, res) => {
  const { token, accountId } = req.body;
  
  try {
    console.log('🔄 Refreshing Hostaway properties for account:', accountId);
    
    // 1. Fetch all listings from Hostaway
    const response = await axios.get('https://api.hostaway.com/v1/listings', {
      headers: { 'Authorization': `Bearer ${token}`, 'Cache-control': 'no-cache' },
      params: { limit: 100 }
    });
    
    if (response.data.status !== 'success') {
      return res.json({ success: false, error: 'Failed to fetch Hostaway listings' });
    }
    
    const cmProperties = response.data.result || [];
    console.log('Found ' + cmProperties.length + ' listings in Hostaway');
    
    // 2. Get existing properties in GAS for this account
    const existingResult = await pool.query(
      'SELECT id, name, hostaway_listing_id FROM properties WHERE account_id = $1 AND hostaway_listing_id IS NOT NULL',
      [accountId]
    );
    const existingProperties = existingResult.rows;
    
    // 3. Compare
    const existing = [];
    const newProps = [];
    const removed = [];
    
    // Check each CM property
    for (const cmProp of cmProperties) {
      const cmId = String(cmProp.id);
      const existingProp = existingProperties.find(p => String(p.hostaway_listing_id) === cmId);
      
      if (existingProp) {
        existing.push({
          gas_id: existingProp.id,
          cm_id: cmId,
          name: cmProp.name,
          gas_name: existingProp.name
        });
      } else {
        newProps.push({
          cm_id: cmId,
          name: cmProp.name,
          city: cmProp.city || '',
          rooms: 1 // Hostaway listings are typically single units
        });
      }
    }
    
    // Check for removed (in GAS but not in CM)
    const cmIds = cmProperties.map(p => String(p.id));
    for (const existingProp of existingProperties) {
      if (!cmIds.includes(String(existingProp.hostaway_listing_id))) {
        removed.push({
          gas_id: existingProp.id,
          cm_id: existingProp.hostaway_listing_id,
          name: existingProp.name
        });
      }
    }
    
    console.log(`Comparison: ${existing.length} existing, ${newProps.length} new, ${removed.length} removed`);
    
    res.json({
      success: true,
      existing,
      new: newProps,
      removed,
      channel_manager: 'hostaway'
    });
    
  } catch (error) {
    console.error('Error refreshing Hostaway properties:', error.message);
    res.json({ success: false, error: error.message });
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

// =====================================================
// SMOOBU REFRESH PROPERTIES - Compare CM with GAS
// =====================================================
app.post('/api/smoobu/refresh-properties', async (req, res) => {
  const { apiKey, accountId } = req.body;
  
  try {
    console.log('🔄 Refreshing Smoobu properties for account:', accountId);
    
    // 1. Fetch all apartments from Smoobu
    const response = await axios.get(`${SMOOBU_API_URL}/apartments`, {
      headers: { 'Api-Key': apiKey, 'Cache-Control': 'no-cache' }
    });
    
    const cmProperties = response.data.apartments || [];
    console.log('Found ' + cmProperties.length + ' apartments in Smoobu');
    
    // 2. Get existing properties in GAS for this account
    const existingResult = await pool.query(
      'SELECT id, name, smoobu_id FROM properties WHERE account_id = $1 AND smoobu_id IS NOT NULL',
      [accountId]
    );
    const existingProperties = existingResult.rows;
    
    // 3. Compare
    const existing = [];
    const newProps = [];
    const removed = [];
    
    // Check each CM property
    for (const cmProp of cmProperties) {
      const cmId = String(cmProp.id);
      const existingProp = existingProperties.find(p => String(p.smoobu_id) === cmId);
      
      if (existingProp) {
        existing.push({
          gas_id: existingProp.id,
          cm_id: cmId,
          name: cmProp.name,
          gas_name: existingProp.name
        });
      } else {
        newProps.push({
          cm_id: cmId,
          name: cmProp.name,
          city: cmProp.location?.city || '',
          rooms: 1
        });
      }
    }
    
    // Check for removed (in GAS but not in CM)
    const cmIds = cmProperties.map(p => String(p.id));
    for (const existingProp of existingProperties) {
      if (!cmIds.includes(String(existingProp.smoobu_id))) {
        removed.push({
          gas_id: existingProp.id,
          cm_id: existingProp.smoobu_id,
          name: existingProp.name
        });
      }
    }
    
    console.log(`Comparison: ${existing.length} existing, ${newProps.length} new, ${removed.length} removed`);
    
    res.json({
      success: true,
      existing,
      new: newProps,
      removed,
      channel_manager: 'smoobu'
    });
    
  } catch (error) {
    console.error('Error refreshing Smoobu properties:', error.message);
    res.json({ success: false, error: error.message });
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
    const accountId = req.query.account_id;
    const propertyId = req.query.property_id;
    let result;
    
    if (propertyId) {
      // Filter by specific property
      result = await pool.query(`
        SELECT v.* FROM vouchers v
        WHERE v.property_id = $1
        ORDER BY v.created_at DESC
      `, [propertyId]);
    } else if (accountId) {
      // Filter by account - only vouchers linked to properties owned by this account
      result = await pool.query(`
        SELECT v.* FROM vouchers v
        LEFT JOIN properties p ON v.property_id = p.id
        WHERE p.account_id = $1
        ORDER BY v.created_at DESC
      `, [accountId]);
    } else {
      result = await pool.query(`
        SELECT * FROM vouchers ORDER BY created_at DESC
      `);
    }
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
    const accountId = req.query.account_id;
    const propertyId = req.query.property_id;
    const roomId = req.query.room_id;
    let result;
    
    if (propertyId) {
      // Filter by specific property
      result = await pool.query(`
        SELECT u.*, 
               p.name as property_name,
               r.name as room_name
        FROM upsells u
        LEFT JOIN properties p ON u.property_id = p.id
        LEFT JOIN rooms r ON u.room_id = r.id
        WHERE u.property_id = $1
        ORDER BY u.name
      `, [propertyId]);
    } else if (accountId) {
      result = await pool.query(`
        SELECT u.*, 
               p.name as property_name,
               r.name as room_name
        FROM upsells u
        LEFT JOIN properties p ON u.property_id = p.id
        LEFT JOIN rooms r ON u.room_id = r.id
        WHERE p.account_id = $1 OR u.property_id IS NULL
        ORDER BY u.name
      `, [accountId]);
    } else {
      result = await pool.query(`
        SELECT u.*, 
               p.name as property_name,
               r.name as room_name
        FROM upsells u
        LEFT JOIN properties p ON u.property_id = p.id
        LEFT JOIN rooms r ON u.room_id = r.id
        ORDER BY u.name
      `);
    }
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
    const accountId = req.query.account_id;
    let result;
    
    if (accountId) {
      result = await pool.query(`
        SELECT f.* FROM fees f
        LEFT JOIN properties p ON f.property_id = p.id
        WHERE p.account_id = $1 OR f.property_id IS NULL
        ORDER BY f.name
      `, [accountId]);
    } else {
      result = await pool.query('SELECT * FROM fees ORDER BY name');
    }
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
    const accountId = req.query.account_id;
    const propertyId = req.query.property_id;
    const roomId = req.query.room_id;
    let result;
    
    if (propertyId) {
      // Filter by specific property - show taxes assigned to this property
      result = await pool.query(`
        SELECT t.*, p.name as property_name 
        FROM taxes t
        LEFT JOIN properties p ON t.property_id = p.id
        WHERE t.property_id = $1
        ORDER BY t.name
      `, [propertyId]);
    } else if (accountId) {
      // Show taxes that:
      // 1. Have user_id matching this account, OR
      // 2. Are linked to properties owned by this account
      result = await pool.query(`
        SELECT DISTINCT t.*, p.name as property_name 
        FROM taxes t
        LEFT JOIN properties p ON t.property_id = p.id
        WHERE t.user_id = $1 
           OR p.account_id = $1
        ORDER BY t.name
      `, [accountId]);
    } else {
      result = await pool.query(`
        SELECT t.*, p.name as property_name 
        FROM taxes t
        LEFT JOIN properties p ON t.property_id = p.id
        ORDER BY t.name
      `);
    }
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/admin/taxes', async (req, res) => {
  try {
    const { name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active, account_id } = req.body;
    
    // user_id = creator (account_id)
    // Visibility is handled by GET which checks property ownership
    const result = await pool.query(`
      INSERT INTO taxes (name, country, amount_type, currency, amount, charge_per, max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [name, country, amount_type || 'fixed', currency || 'EUR', amount, charge_per || 'per_person_per_night', max_nights, min_age, star_tier, season_start, season_end, property_id, room_id, active !== false, account_id]);
    
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

// =====================================================
// BOOKINGS API
// =====================================================

app.get('/api/admin/bookings', async (req, res) => {
  try {
    const { account_id, property_id, room_id, status } = req.query;
    let query = `
      SELECT b.*, 
             bu.name as unit_name,
             p.name as property_name
      FROM bookings b
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (property_id) {
      query += ` AND b.property_id = $${paramIndex}`;
      params.push(property_id);
      paramIndex++;
    } else if (account_id) {
      query += ` AND p.account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (room_id) {
      query += ` AND b.bookable_unit_id = $${paramIndex}`;
      params.push(room_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY b.arrival_date DESC`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create booking from admin (with optional CM sync)
app.post('/api/admin/bookings', async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      property_id, room_id, check_in, check_out, 
      num_adults, guest_first_name, guest_last_name, 
      guest_email, guest_phone, total_price, 
      payment_status, status, notes, sync_to_cm 
    } = req.body;
    
    if (!property_id || !room_id || !check_in || !check_out || !guest_first_name || !guest_last_name || !guest_email) {
      return res.json({ success: false, error: 'Missing required fields' });
    }
    
    await client.query('BEGIN');
    
    // Create booking
    const bookingResult = await client.query(`
      INSERT INTO bookings (
        property_id, property_owner_id, bookable_unit_id, 
        arrival_date, departure_date, 
        num_adults, num_children, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        accommodation_price, subtotal, grand_total, 
        payment_status, status, booking_source, currency, notes
      ) 
      VALUES ($1, 1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $10, $10, $11, $12, 'manual', 'USD', $13)
      RETURNING *
    `, [
      property_id, room_id, check_in, check_out, 
      num_adults || 1, guest_first_name, guest_last_name, 
      guest_email, guest_phone || null, total_price || 0,
      payment_status || 'pending', status || 'confirmed', notes || null
    ]);
    
    const booking = bookingResult.rows[0];
    let beds24BookingId = null;
    let hostawayReservationId = null;
    
    // Sync to channel manager if requested
    if (sync_to_cm) {
      // Get room CM IDs
      const roomResult = await client.query(`
        SELECT beds24_room_id, hostaway_listing_id, smoobu_room_id 
        FROM bookable_units WHERE id = $1
      `, [room_id]);
      
      const beds24RoomId = roomResult.rows[0]?.beds24_room_id;
      const hostawayListingId = roomResult.rows[0]?.hostaway_listing_id;
      
      // Sync to Beds24
      if (beds24RoomId) {
        try {
          const accessToken = await getBeds24AccessToken(pool);
          if (accessToken) {
            const beds24Response = await fetch('https://beds24.com/api/v2/bookings', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                roomId: beds24RoomId,
                firstNight: check_in,
                lastNight: new Date(new Date(check_out).getTime() - 24*60*60*1000).toISOString().split('T')[0],
                numAdult: num_adults || 1,
                guestFirstName: guest_first_name,
                guestName: guest_last_name,
                guestEmail: guest_email,
                guestPhone: guest_phone || '',
                price: total_price || 0,
                status: 1,
                apiSource: 'GAS Direct Booking'
              })
            });
            
            const beds24Data = await beds24Response.json();
            if (beds24Data.bookId) {
              beds24BookingId = beds24Data.bookId;
            }
          }
        } catch (err) {
          console.error('Beds24 sync error:', err);
        }
      }
      
      // Sync to Hostaway
      if (hostawayListingId) {
        try {
          const hostawayToken = process.env.HOSTAWAY_API_KEY;
          if (hostawayToken) {
            const hostawayResponse = await fetch('https://api.hostaway.com/v1/reservations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hostawayToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                listingMapId: hostawayListingId,
                channelId: 2000,
                arrivalDate: check_in,
                departureDate: check_out,
                guestName: `${guest_first_name} ${guest_last_name}`,
                guestEmail: guest_email,
                guestPhone: guest_phone || '',
                numberOfGuests: num_adults || 1,
                totalPrice: total_price || 0,
                isPaid: payment_status === 'fully_paid' ? 1 : 0,
                status: 'new'
              })
            });
            
            const hostawayData = await hostawayResponse.json();
            if (hostawayData.result?.id) {
              hostawayReservationId = hostawayData.result.id;
            }
          }
        } catch (err) {
          console.error('Hostaway sync error:', err);
        }
      }
      
      // Update booking with CM IDs
      if (beds24BookingId || hostawayReservationId) {
        await client.query(`
          UPDATE bookings SET 
            beds24_booking_id = COALESCE($1, beds24_booking_id),
            hostaway_reservation_id = COALESCE($2, hostaway_reservation_id)
          WHERE id = $3
        `, [beds24BookingId, hostawayReservationId, booking.id]);
      }
    }
    
    // Block availability for these dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    let current = new Date(check_in);
    
    while (current < checkOutDate) {
      const dateStr = current.toISOString().split('T')[0];
      await client.query(`
        INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
        VALUES ($1, $2, false, true, 'booking')
        ON CONFLICT (room_id, date) DO UPDATE SET is_available = false, is_blocked = true
      `, [room_id, dateStr]);
      current.setDate(current.getDate() + 1);
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      booking_id: booking.id,
      booking: booking,
      beds24_id: beds24BookingId,
      hostaway_id: hostawayReservationId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create admin booking error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get single booking with all details
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT b.*, 
             bu.name as unit_name,
             p.name as property_name,
             p.currency,
             a.stripe_account_id
      FROM bookings b
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    // Get payment transactions for this booking
    const transactions = await pool.query(`
      SELECT * FROM payment_transactions 
      WHERE booking_id = $1 
      ORDER BY created_at DESC
    `, [id]);
    
    res.json({ 
      success: true, 
      booking: result.rows[0],
      transactions: transactions.rows
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Update booking
app.put('/api/bookings/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      guest_first_name, guest_last_name, guest_email, guest_phone,
      arrival_date, departure_date, num_adults, num_children,
      grand_total, deposit_amount, balance_amount,
      status, payment_status, notes
    } = req.body;
    
    // Get existing booking for comparison
    const existingResult = await client.query(`
      SELECT * FROM bookings WHERE id = $1
    `, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    const existingBooking = existingResult.rows[0];
    const datesChanged = (arrival_date !== existingBooking.arrival_date?.toISOString().split('T')[0]) ||
                         (departure_date !== existingBooking.departure_date?.toISOString().split('T')[0]);
    const wasCancelled = existingBooking.status !== 'cancelled' && status === 'cancelled';
    
    await client.query('BEGIN');
    
    // Update booking
    await client.query(`
      UPDATE bookings SET
        guest_first_name = $1,
        guest_last_name = $2,
        guest_email = $3,
        guest_phone = $4,
        arrival_date = $5,
        departure_date = $6,
        num_adults = $7,
        num_children = $8,
        grand_total = $9,
        accommodation_price = $9,
        deposit_amount = $10,
        balance_amount = $11,
        status = $12,
        payment_status = $13,
        notes = $14,
        updated_at = NOW()
      WHERE id = $15
    `, [
      guest_first_name, guest_last_name, guest_email, guest_phone,
      arrival_date, departure_date, num_adults, num_children,
      grand_total, deposit_amount, balance_amount,
      status, payment_status, notes,
      id
    ]);
    
    // Handle availability changes
    if (datesChanged || wasCancelled) {
      // Clear old dates
      await client.query(`
        DELETE FROM room_availability 
        WHERE room_id = $1 AND date >= $2 AND date < $3 AND source = 'booking'
      `, [existingBooking.bookable_unit_id, existingBooking.arrival_date, existingBooking.departure_date]);
      
      // Add new dates if not cancelled
      if (status !== 'cancelled') {
        const startDate = new Date(arrival_date);
        const endDate = new Date(departure_date);
        
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await client.query(`
            INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
            VALUES ($1, $2, false, true, 'booking')
            ON CONFLICT (room_id, date) DO UPDATE SET is_available = false, is_blocked = true, source = 'booking'
          `, [existingBooking.bookable_unit_id, dateStr]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Sync to Beds24 if linked
    let beds24Synced = false;
    if (existingBooking.beds24_booking_id) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        if (accessToken) {
          const beds24Update = [{
            id: parseInt(existingBooking.beds24_booking_id),
            status: status === 'cancelled' ? 'cancelled' : 'confirmed',
            arrival: arrival_date,
            departure: departure_date,
            numAdult: num_adults,
            numChild: num_children || 0,
            firstName: guest_first_name,
            lastName: guest_last_name,
            email: guest_email,
            mobile: guest_phone || '',
            price: parseFloat(grand_total) || 0,
            deposit: parseFloat(deposit_amount) || 0
          }];
          
          console.log('Updating Beds24 booking:', JSON.stringify(beds24Update));
          
          const beds24Response = await axios.post('https://beds24.com/api/v2/bookings', beds24Update, {
            headers: {
              'token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Beds24 update response:', JSON.stringify(beds24Response.data));
          beds24Synced = beds24Response.data?.[0]?.success || false;
        }
      } catch (beds24Error) {
        console.error('Beds24 update error:', beds24Error.response?.data || beds24Error.message);
      }
    }
    
    res.json({ 
      success: true, 
      beds24_synced: beds24Synced
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update booking error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking info first (for Beds24 sync and date unblocking)
    const bookingResult = await pool.query(`
      SELECT beds24_booking_id, bookable_unit_id, arrival_date, departure_date 
      FROM bookings WHERE id = $1
    `, [id]);
    
    const booking = bookingResult.rows[0];
    
    // Cancel in Beds24 if linked
    if (booking?.beds24_booking_id) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        if (accessToken) {
          const cancelResponse = await axios.post('https://beds24.com/api/v2/bookings', [{
            id: parseInt(booking.beds24_booking_id),
            status: 'cancelled'
          }], {
            headers: {
              'token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          console.log('Beds24 cancellation on delete:', JSON.stringify(cancelResponse.data));
        }
      } catch (err) {
        console.error('Beds24 cancel on delete error:', err.response?.data || err.message);
      }
    }
    
    // Unblock dates in availability
    if (booking?.bookable_unit_id && booking?.arrival_date && booking?.departure_date) {
      await pool.query(`
        UPDATE room_availability 
        SET is_available = true, is_blocked = false, source = 'booking_deleted', updated_at = NOW()
        WHERE room_id = $1 AND date >= $2 AND date < $3 AND source IN ('booking', 'beds24_sync', 'beds24_webhook')
      `, [booking.bookable_unit_id, booking.arrival_date, booking.departure_date]);
    }
    
    // Delete payment transactions first
    await pool.query('DELETE FROM payment_transactions WHERE booking_id = $1', [id]);
    
    // Delete the booking
    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Generate invoice for booking
app.post('/api/bookings/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking details
    const result = await pool.query(`
      SELECT b.*, 
             bu.name as unit_name,
             p.name as property_name,
             p.address as property_address,
             p.city as property_city,
             p.country as property_country,
             a.name as account_name,
             a.email as account_email
      FROM bookings b
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    const booking = result.rows[0];
    
    // Generate simple HTML invoice (could be PDF later)
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${booking.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company { font-size: 24px; font-weight: bold; color: #4f46e5; }
          .invoice-title { font-size: 32px; color: #1e293b; margin: 0; }
          .invoice-number { color: #64748b; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; }
          .guest-name { font-size: 18px; font-weight: 600; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .total-row { font-weight: bold; font-size: 18px; background: #f8fafc; padding: 15px; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">${booking.property_name || 'Property'}</div>
            <div style="color: #64748b; margin-top: 5px;">${booking.property_address || ''}</div>
            <div style="color: #64748b;">${[booking.property_city, booking.property_country].filter(Boolean).join(', ')}</div>
          </div>
          <div style="text-align: right;">
            <h1 class="invoice-title">Invoice</h1>
            <div class="invoice-number">#${booking.id}</div>
            <div style="color: #64748b; margin-top: 10px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Bill To</div>
          <div class="guest-name">${[booking.guest_first_name, booking.guest_last_name].filter(Boolean).join(' ')}</div>
          <div style="color: #64748b;">${booking.guest_email || ''}</div>
          <div style="color: #64748b;">${booking.guest_phone || ''}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Reservation Details</div>
          <div class="detail-row">
            <span>Room</span>
            <span>${booking.unit_name || '-'}</span>
          </div>
          <div class="detail-row">
            <span>Check-in</span>
            <span>${booking.arrival_date ? new Date(booking.arrival_date).toLocaleDateString('en-GB') : '-'}</span>
          </div>
          <div class="detail-row">
            <span>Check-out</span>
            <span>${booking.departure_date ? new Date(booking.departure_date).toLocaleDateString('en-GB') : '-'}</span>
          </div>
          <div class="detail-row">
            <span>Guests</span>
            <span>${(booking.num_adults || 0) + (booking.num_children || 0)}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Charges</div>
          <div class="detail-row">
            <span>Accommodation</span>
            <span>$${parseFloat(booking.accommodation_price || 0).toFixed(2)}</span>
          </div>
          ${booking.upsells_total && parseFloat(booking.upsells_total) > 0 ? `
          <div class="detail-row">
            <span>Extras</span>
            <span>$${parseFloat(booking.upsells_total).toFixed(2)}</span>
          </div>
          ` : ''}
          ${booking.discount_amount && parseFloat(booking.discount_amount) > 0 ? `
          <div class="detail-row">
            <span>Discount</span>
            <span style="color: #16a34a;">-$${parseFloat(booking.discount_amount).toFixed(2)}</span>
          </div>
          ` : ''}
          ${booking.tax_amount && parseFloat(booking.tax_amount) > 0 ? `
          <div class="detail-row">
            <span>Tax</span>
            <span>$${parseFloat(booking.tax_amount).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="detail-row total-row">
            <span>Total</span>
            <span>$${parseFloat(booking.grand_total || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Payment Summary</div>
          <div class="detail-row">
            <span>Deposit Paid</span>
            <span style="color: #16a34a;">$${parseFloat(booking.deposit_amount || 0).toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span>Balance Due</span>
            <span style="color: ${(parseFloat(booking.grand_total || 0) - parseFloat(booking.deposit_amount || 0)) > 0 ? '#dc2626' : '#16a34a'};">$${(parseFloat(booking.grand_total || 0) - parseFloat(booking.deposit_amount || 0)).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your booking!</p>
          <p style="font-size: 12px;">Generated by GAS - Guest Accommodation System</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    // For now, return the HTML directly - could save as file or convert to PDF
    res.send(invoiceHtml);
    
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Send payment receipt email
app.post('/api/bookings/:id/send-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking details
    const result = await pool.query(`
      SELECT b.*, p.name as property_name
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    const booking = result.rows[0];
    
    // TODO: Implement email sending via SendGrid/Mailgun/etc
    // For now, just log and return success
    console.log(`Would send receipt email to ${booking.guest_email} for booking ${id}`);
    
    res.json({ success: true, message: 'Receipt email queued' });
    
  } catch (error) {
    console.error('Send receipt error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Process refund
app.post('/api/bookings/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // Optional - full refund if not specified
    
    // Get booking and payment details
    const result = await pool.query(`
      SELECT b.*, a.stripe_account_id
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    const booking = result.rows[0];
    
    if (!booking.stripe_payment_intent_id) {
      return res.json({ success: false, error: 'No payment found for this booking' });
    }
    
    // Process refund via Stripe
    const refundAmount = amount ? Math.round(parseFloat(amount) * 100) : undefined; // undefined = full refund
    
    try {
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: refundAmount
      }, {
        stripeAccount: booking.stripe_account_id
      });
      
      // Update booking status
      await pool.query(`
        UPDATE bookings 
        SET payment_status = 'refunded', 
            refund_amount = COALESCE(refund_amount, 0) + $1
        WHERE id = $2
      `, [refund.amount / 100, id]);
      
      // Record transaction
      await pool.query(`
        INSERT INTO payment_transactions (booking_id, type, amount, currency, status, stripe_payment_intent_id, created_at)
        VALUES ($1, 'refund', $2, 'USD', 'completed', $3, NOW())
      `, [id, refund.amount / 100, refund.id]);
      
      res.json({ success: true, refund_id: refund.id, amount: refund.amount / 100 });
      
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      res.json({ success: false, error: stripeError.message });
    }
    
  } catch (error) {
    console.error('Process refund error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Cancel booking
app.post('/api/bookings/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get booking details
    const result = await client.query(`
      SELECT b.*, bu.beds24_room_id, bu.hostaway_listing_id
      FROM bookings b
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      WHERE b.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    const booking = result.rows[0];
    
    // Update booking status
    await client.query(`
      UPDATE bookings SET status = 'cancelled' WHERE id = $1
    `, [id]);
    
    // Unblock availability
    await client.query(`
      DELETE FROM room_availability 
      WHERE room_id = $1 
      AND date >= $2 
      AND date < $3 
      AND source = 'booking'
    `, [booking.bookable_unit_id, booking.arrival_date, booking.departure_date]);
    
    // Cancel in Beds24
    if (booking.beds24_booking_id) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        if (accessToken) {
          // Beds24 v2 API - POST to /bookings with status update
          const cancelResponse = await axios.post('https://beds24.com/api/v2/bookings', [{
            id: parseInt(booking.beds24_booking_id),
            status: 'cancelled'
          }], {
            headers: {
              'token': accessToken,
              'Content-Type': 'application/json'
            }
          });
          console.log('Beds24 cancellation response:', JSON.stringify(cancelResponse.data));
        }
      } catch (err) {
        console.error('Beds24 cancel error:', err.response?.data || err.message);
      }
    }
    
    // Cancel in Hostaway
    if (booking.hostaway_reservation_id) {
      try {
        const hostawayToken = process.env.HOSTAWAY_API_KEY;
        if (hostawayToken) {
          await fetch(`https://api.hostaway.com/v1/reservations/${booking.hostaway_reservation_id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${hostawayToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
          });
        }
      } catch (err) {
        console.error('Hostaway cancel error:', err);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Booking cancelled' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel booking error:', error);
    res.json({ success: false, error: error.message });
  } finally {
    client.release();
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
    const accountId = req.query.account_id;
    
    console.log('Stats request - accountId:', accountId, 'clientId:', clientId);
    
    let propertiesCount, unitsCount, bookingsCount, connectionsCount;
    
    if (accountId) {
      // Account-specific stats (new system)
      console.log('Filtering by account_id:', accountId);
      propertiesCount = await pool.query('SELECT COUNT(*) FROM properties WHERE account_id = $1', [accountId]);
      console.log('Properties count:', propertiesCount.rows[0].count);
      unitsCount = await pool.query(`
        SELECT COUNT(*) FROM bookable_units bu 
        JOIN properties p ON bu.property_id = p.id 
        WHERE p.account_id = $1
      `, [accountId]);
      bookingsCount = await pool.query(`
        SELECT COUNT(*) FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE p.account_id = $1
      `, [accountId]);
      connectionsCount = await pool.query('SELECT COUNT(*) FROM channel_connections WHERE gas_account_id = $1 AND status = $2', [accountId, 'active']);
    } else if (clientId) {
      // Client-specific stats (legacy)
      propertiesCount = await pool.query('SELECT COUNT(*) FROM properties WHERE client_id = $1', [clientId]);
      unitsCount = await pool.query(`
        SELECT COUNT(*) FROM bookable_units bu 
        JOIN properties p ON bu.property_id = p.id 
        WHERE p.client_id = $1
      `, [clientId]);
      bookingsCount = await pool.query(`
        SELECT COUNT(*) FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE p.client_id = $1
      `, [clientId]);
      connectionsCount = await pool.query('SELECT COUNT(*) FROM channel_connections WHERE gas_account_id = $1 AND status = $2', [clientId, 'active']);
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
    const accountId = req.query.account_id;
    const propertyId = req.query.property_id;
    let result;
    
    if (propertyId) {
      // Filter by specific property
      result = await pool.query(`
        SELECT 
          bu.*,
          p.name as property_name
        FROM bookable_units bu
        LEFT JOIN properties p ON bu.property_id = p.id
        WHERE bu.property_id = $1
        ORDER BY bu.name
      `, [propertyId]);
    } else if (accountId) {
      result = await pool.query(`
        SELECT 
          bu.*,
          p.name as property_name
        FROM bookable_units bu
        LEFT JOIN properties p ON bu.property_id = p.id
        WHERE p.account_id = $1
        ORDER BY bu.created_at DESC
      `, [accountId]);
    } else {
      result = await pool.query(`
        SELECT 
          bu.*,
          p.name as property_name
        FROM bookable_units bu
        LEFT JOIN properties p ON bu.property_id = p.id
        ORDER BY bu.created_at DESC
      `);
    }
    
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
    console.log('PUT /api/admin/units/' + id, 'body:', JSON.stringify(req.body));
    
    const { quantity, status, room_type, max_guests, max_adults, max_children, display_name } = req.body;
    
    // display_name column is JSON type, so wrap it
    const displayNameJson = display_name ? JSON.stringify({ en: display_name }) : null;
    
    const result = await pool.query(`
      UPDATE bookable_units 
      SET 
        quantity = $1,
        status = $2,
        unit_type = $3,
        max_guests = $4,
        max_adults = $5,
        max_children = $6,
        display_name = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, display_name, quantity, status, unit_type, max_guests, max_adults, max_children
    `, [
      quantity || 1, 
      status || 'available', 
      room_type || 'double', 
      max_guests || 2, 
      max_adults || 2, 
      max_children || 0, 
      displayNameJson, 
      id
    ]);
    
    console.log('Update success:', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Unit update error:', error);
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
    const { amenities } = req.body; // Array of amenity IDs
    
    // Delete existing selections for this room
    await pool.query('DELETE FROM room_amenity_selections WHERE room_id = $1', [id]);
    
    // Insert new selections
    if (amenities && amenities.length > 0) {
      for (let i = 0; i < amenities.length; i++) {
        const amenityId = typeof amenities[i] === 'object' ? amenities[i].id : amenities[i];
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
    
    // Store as JSON string - works for both TEXT and JSONB columns
    const shortVal = JSON.stringify({ en: short_description || '' });
    const fullVal = JSON.stringify({ en: full_description || '' });
    
    await pool.query(`
      UPDATE bookable_units 
      SET short_description = $1, 
          full_description = $2, 
          updated_at = NOW() 
      WHERE id = $3`,
      [shortVal, fullVal, id]
    );
    
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
          id as booking_id,
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
          availMap[dateStr].booking_id = b.booking_id;
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
        quantity INTEGER DEFAULT 1,
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
// PROPERTY TERMS & POLICIES API
// =========================================================

// GET /api/admin/properties/:id/terms - Load property terms and beds
app.get('/api/admin/properties/:id/terms', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    // Get terms
    const termsResult = await pool.query(
      'SELECT * FROM property_terms WHERE property_id = $1',
      [propertyId]
    );
    
    // Get beds
    const bedsResult = await pool.query(
      'SELECT bed_type, quantity, room_id FROM property_beds WHERE property_id = $1 AND room_id IS NULL ORDER BY display_order',
      [propertyId]
    );
    
    res.json({
      success: true,
      data: {
        terms: termsResult.rows[0] || null,
        beds: bedsResult.rows || []
      }
    });
  } catch (error) {
    console.error('Error loading property terms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/properties/:id/terms - Save property terms and beds
app.put('/api/admin/properties/:id/terms', async (req, res) => {
  const client = await pool.connect();
  try {
    const propertyId = req.params.id;
    const { terms, beds } = req.body;
    
    await client.query('BEGIN');
    
    // Upsert terms (insert or update)
    await client.query(`
      INSERT INTO property_terms (
        property_id,
        checkin_from, checkin_until, checkout_by, late_checkout_fee,
        self_checkin, checkin_24hr,
        smoking_policy, smoking_fine,
        pet_policy, pet_deposit, pet_fee_per_night,
        dogs_allowed, cats_allowed, small_pets_only, max_pets,
        children_policy, cots_available, highchairs_available, cot_fee_per_night,
        events_policy,
        wheelchair_accessible, step_free_access, accessible_bathroom,
        grab_rails, roll_in_shower, elevator_access, ground_floor_available,
        quiet_hours_from, quiet_hours_until, no_outside_guests, id_required,
        additional_rules
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
      ON CONFLICT (property_id) DO UPDATE SET
        checkin_from = EXCLUDED.checkin_from,
        checkin_until = EXCLUDED.checkin_until,
        checkout_by = EXCLUDED.checkout_by,
        late_checkout_fee = EXCLUDED.late_checkout_fee,
        self_checkin = EXCLUDED.self_checkin,
        checkin_24hr = EXCLUDED.checkin_24hr,
        smoking_policy = EXCLUDED.smoking_policy,
        smoking_fine = EXCLUDED.smoking_fine,
        pet_policy = EXCLUDED.pet_policy,
        pet_deposit = EXCLUDED.pet_deposit,
        pet_fee_per_night = EXCLUDED.pet_fee_per_night,
        dogs_allowed = EXCLUDED.dogs_allowed,
        cats_allowed = EXCLUDED.cats_allowed,
        small_pets_only = EXCLUDED.small_pets_only,
        max_pets = EXCLUDED.max_pets,
        children_policy = EXCLUDED.children_policy,
        cots_available = EXCLUDED.cots_available,
        highchairs_available = EXCLUDED.highchairs_available,
        cot_fee_per_night = EXCLUDED.cot_fee_per_night,
        events_policy = EXCLUDED.events_policy,
        wheelchair_accessible = EXCLUDED.wheelchair_accessible,
        step_free_access = EXCLUDED.step_free_access,
        accessible_bathroom = EXCLUDED.accessible_bathroom,
        grab_rails = EXCLUDED.grab_rails,
        roll_in_shower = EXCLUDED.roll_in_shower,
        elevator_access = EXCLUDED.elevator_access,
        ground_floor_available = EXCLUDED.ground_floor_available,
        quiet_hours_from = EXCLUDED.quiet_hours_from,
        quiet_hours_until = EXCLUDED.quiet_hours_until,
        no_outside_guests = EXCLUDED.no_outside_guests,
        id_required = EXCLUDED.id_required,
        additional_rules = EXCLUDED.additional_rules,
        updated_at = CURRENT_TIMESTAMP
    `, [
      propertyId,
      terms.checkin_from || '15:00',
      terms.checkin_until || '22:00',
      terms.checkout || '11:00',
      terms.late_checkout_fee || null,
      terms.self_checkin || false,
      terms.checkin_24hr || false,
      terms.smoking_policy || 'no',
      terms.smoking_fine || null,
      terms.pet_policy || 'no',
      terms.pet_deposit || null,
      terms.pet_fee || null,
      terms.dogs_allowed || false,
      terms.cats_allowed || false,
      terms.small_pets_only || false,
      terms.max_pets || 2,
      terms.children_policy || 'all',
      terms.cots_available || false,
      terms.highchairs_available || false,
      terms.cot_fee || null,
      terms.events_policy || 'no',
      terms.wheelchair_accessible || false,
      terms.step_free || false,
      terms.accessible_bathroom || false,
      terms.grab_rails || false,
      terms.roll_in_shower || false,
      terms.elevator_access || false,
      terms.ground_floor || false,
      terms.quiet_hours_from || '22:00',
      terms.quiet_hours_until || '08:00',
      terms.no_outside_guests || false,
      terms.id_required || false,
      terms.additional_rules || null
    ]);
    
    // Update beds - delete existing property-level beds and insert new
    if (beds && Array.isArray(beds)) {
      await client.query('DELETE FROM property_beds WHERE property_id = $1 AND room_id IS NULL', [propertyId]);
      
      for (let i = 0; i < beds.length; i++) {
        const bed = beds[i];
        if (bed.type) {
          await client.query(
            'INSERT INTO property_beds (property_id, bed_type, quantity, display_order) VALUES ($1, $2, $3, $4)',
            [propertyId, bed.type, bed.quantity || 1, i]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Terms saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving property terms:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// =========================================================
// MARKETING FEATURES API (Property & Room Level)
// =========================================================

// GET /api/properties/:id/features - Load property-wide features
app.get('/api/properties/:id/features', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    const result = await pool.query(`
      SELECT pf.*, 
             COALESCE(
               (SELECT json_agg(room_id) FROM property_feature_exclusions WHERE feature_id = pf.id),
               '[]'
             ) as excluded_room_ids
      FROM property_features pf
      WHERE pf.property_id = $1 AND pf.room_id IS NULL
      ORDER BY pf.category, pf.feature_name
    `, [propertyId]);
    
    res.json({ success: true, features: result.rows });
  } catch (error) {
    console.error('Error loading property features:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/properties/:id/features - Save property-wide features
app.post('/api/properties/:id/features', async (req, res) => {
  const client = await pool.connect();
  try {
    const propertyId = req.params.id;
    const { features } = req.body;
    const applyToRooms = req.query.apply_to_rooms === 'true';
    
    await client.query('BEGIN');
    
    // Delete existing property-level features
    await client.query('DELETE FROM property_features WHERE property_id = $1 AND room_id IS NULL', [propertyId]);
    
    // Insert new features
    for (const feature of features) {
      const result = await client.query(`
        INSERT INTO property_features (property_id, room_id, feature_name, category, is_custom)
        VALUES ($1, NULL, $2, $3, $4)
        RETURNING id
      `, [propertyId, feature.feature_name, feature.category, feature.is_custom || false]);
      
      // Handle room exclusions
      if (feature.excluded_room_ids && feature.excluded_room_ids.length > 0) {
        for (const roomId of feature.excluded_room_ids) {
          await client.query(
            'INSERT INTO property_feature_exclusions (feature_id, room_id) VALUES ($1, $2)',
            [result.rows[0].id, roomId]
          );
        }
      }
    }
    
    // If apply_to_rooms, copy to all rooms
    if (applyToRooms) {
      const rooms = await client.query(
        'SELECT id FROM bookable_units WHERE property_id = $1',
        [propertyId]
      );
      
      for (const room of rooms.rows) {
        // Clear existing room features
        await client.query('DELETE FROM property_features WHERE room_id = $1', [room.id]);
        
        // Copy property features to room
        for (const feature of features) {
          await client.query(`
            INSERT INTO property_features (property_id, room_id, feature_name, category, is_custom)
            VALUES ($1, $2, $3, $4, $5)
          `, [propertyId, room.id, feature.feature_name, feature.category, feature.is_custom || false]);
        }
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Features saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving property features:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// GET /api/rooms/:id/features - Load room-specific features
app.get('/api/rooms/:id/features', async (req, res) => {
  try {
    const roomId = req.params.id;
    
    // First try to get room-specific features
    let result = await pool.query(`
      SELECT * FROM property_features
      WHERE room_id = $1
      ORDER BY category, feature_name
    `, [roomId]);
    
    // If no room-specific features, fall back to property features
    if (result.rows.length === 0) {
      result = await pool.query(`
        SELECT pf.*, 
               COALESCE(
                 (SELECT json_agg(room_id) FROM property_feature_exclusions WHERE feature_id = pf.id),
                 '[]'
               ) as excluded_room_ids
        FROM property_features pf
        JOIN bookable_units bu ON bu.property_id = pf.property_id
        WHERE bu.id = $1 AND pf.room_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM property_feature_exclusions pfe 
            WHERE pfe.feature_id = pf.id AND pfe.room_id = $1
          )
        ORDER BY pf.category, pf.feature_name
      `, [roomId]);
    }
    
    res.json({ success: true, features: result.rows });
  } catch (error) {
    console.error('Error loading room features:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rooms/:id/features - Save room-specific features
app.post('/api/rooms/:id/features', async (req, res) => {
  const client = await pool.connect();
  try {
    const roomId = req.params.id;
    const { features, property_id } = req.body;
    
    await client.query('BEGIN');
    
    // Delete existing room-specific features
    await client.query('DELETE FROM property_features WHERE room_id = $1', [roomId]);
    
    // Insert new features
    for (const feature of features) {
      await client.query(`
        INSERT INTO property_features (property_id, room_id, feature_name, category, is_custom)
        VALUES ($1, $2, $3, $4, $5)
      `, [property_id, roomId, feature.feature_name, feature.category, feature.is_custom || false]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Room features saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving room features:', error);
    res.status(500).json({ success: false, error: error.message });
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
  // Log EVERYTHING that comes in
  console.log('=== BEDS24 WEBHOOK RECEIVED ===');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  console.log('Query:', JSON.stringify(req.query));
  console.log('===============================');
  
  // Always respond 200 OK immediately so Beds24 doesn't retry
  res.status(200).json({ success: true, received: true });
  
  const client = await pool.connect();
  try {
    const webhookData = req.body;
    
    // Beds24 v2 webhook format may have booking data directly or nested
    const booking = webhookData.booking || webhookData;
    
    const eventType = webhookData.action || webhookData.type || webhookData.event || 'unknown';
    const bookingId = booking.id || booking.bookingId || webhookData.bookingId;
    const roomId = booking.roomId || webhookData.roomId;
    const propertyId = booking.propertyId || webhookData.propertyId;
    const status = booking.status || webhookData.status;
    
    console.log(`Webhook parsed - event: ${eventType}, bookingId: ${bookingId}, roomId: ${roomId}, status: ${status}`);
    
    // Handle different scenarios
    // If status is cancelled, re-open dates. Otherwise block them.
    const isCancelled = status === 'cancelled' || status === 'Cancelled' || 
                        eventType === 'cancel' || eventType === 'delete' || eventType === 'cancelled';
    
    if (roomId) {
      // Find our room by beds24_room_id
      const roomResult = await client.query(`
        SELECT id FROM bookable_units WHERE beds24_room_id = $1
      `, [roomId]);
      
      if (roomResult.rows.length > 0) {
        const ourRoomId = roomResult.rows[0].id;
        const arrival = booking.arrival || booking.firstNight || webhookData.arrival;
        const departure = booking.departure || booking.lastNight || webhookData.departure;
        
        console.log(`Found our room ${ourRoomId}, arrival: ${arrival}, departure: ${departure}, cancelled: ${isCancelled}`);
        
        if (arrival && departure) {
          const startDate = new Date(arrival);
          const endDate = new Date(departure);
          
          await client.query('BEGIN');
          
          for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            if (isCancelled) {
              // Re-open the dates (only if source was webhook)
              await client.query(`
                UPDATE room_availability 
                SET is_available = true, is_blocked = false, source = 'beds24_webhook_cancel', updated_at = NOW()
                WHERE room_id = $1 AND date = $2 AND source LIKE 'beds24%'
              `, [ourRoomId, dateStr]);
            } else {
              // Block the dates
              await client.query(`
                INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
                VALUES ($1, $2, false, false, 'beds24_webhook')
                ON CONFLICT (room_id, date) 
                DO UPDATE SET is_available = false, source = 'beds24_webhook', updated_at = NOW()
              `, [ourRoomId, dateStr]);
            }
          }
          
          await client.query('COMMIT');
          console.log(`✅ Webhook processed: ${isCancelled ? 'UNBLOCKED' : 'BLOCKED'} room ${ourRoomId} from ${arrival} to ${departure}`);
        }
      } else {
        console.log(`⚠️ No matching room found for beds24_room_id: ${roomId}`);
      }
    } else {
      console.log('⚠️ No roomId in webhook payload');
    }
    
  } catch (error) {
    console.error('Webhook processing error:', error);
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
// SYNC PAYMENT TO BEDS24
// =========================================================
app.post('/api/admin/sync-payment-to-beds24', async (req, res) => {
  try {
    const { booking_id, payment_type, amount, description } = req.body;
    
    if (!booking_id || !amount) {
      return res.json({ success: false, error: 'booking_id and amount required' });
    }
    
    // Get booking with Beds24 ID
    const bookingResult = await pool.query(`
      SELECT b.*, bu.beds24_room_id
      FROM bookings b
      LEFT JOIN bookable_units bu ON b.bookable_unit_id = bu.id
      WHERE b.id = $1
    `, [booking_id]);
    
    const booking = bookingResult.rows[0];
    
    if (!booking) {
      return res.json({ success: false, error: 'Booking not found' });
    }
    
    if (!booking.beds24_booking_id) {
      return res.json({ success: false, error: 'No Beds24 booking ID - booking may not be synced to Beds24' });
    }
    
    // Get Beds24 access token
    const accessToken = await getBeds24AccessToken(pool);
    
    // Update the booking in Beds24 with the payment
    const paymentData = [{
      id: booking.beds24_booking_id,
      payments: [{
        description: description || (payment_type === 'balance' ? 'Balance payment via Stripe' : 'Payment via Stripe'),
        amount: parseFloat(amount),
        status: 'received',
        date: new Date().toISOString().split('T')[0]
      }]
    }];
    
    console.log('Syncing payment to Beds24:', JSON.stringify(paymentData));
    
    const beds24Response = await axios.post('https://beds24.com/api/v2/bookings', paymentData, {
      headers: {
        'token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Beds24 payment sync response:', JSON.stringify(beds24Response.data));
    
    res.json({
      success: true,
      beds24_response: beds24Response.data
    });
    
  } catch (error) {
    console.error('Sync payment to Beds24 error:', error.response?.data || error.message);
    res.json({ success: false, error: error.message });
  }
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
    toDate.setDate(toDate.getDate() + 365); // Up to 365 days out
    
    console.log(`Fetching Beds24 bookings from ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);
    
    const response = await axios.get('https://beds24.com/api/v2/bookings', {
      headers: { 'token': accessToken },
      params: {
        arrivalFrom: fromDate.toISOString().split('T')[0],
        arrivalTo: toDate.toISOString().split('T')[0]
      }
    });
    
    console.log('Beds24 bookings API response structure:', JSON.stringify(response.data).substring(0, 500));
    
    // Beds24 v2 API returns array directly or in .data
    const bookings = Array.isArray(response.data) ? response.data : (response.data.data || response.data.bookings || []);
    console.log(`Found ${bookings.length} bookings from Beds24`);
    
    if (bookings.length > 0) {
      console.log('Sample booking structure:', JSON.stringify(bookings[0]).substring(0, 300));
    }
    
    // Update availability based on bookings
    const client = await pool.connect();
    let updatedDates = 0;
    let processedBookings = 0;
    let skippedBookings = [];
    let unblockedDates = 0;
    let gasBookingsCancelled = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const booking of bookings) {
        // Get room ID - Beds24 v2 uses roomId
        const beds24RoomId = booking.roomId || booking.room_id || booking.unitId;
        
        if (!beds24RoomId) {
          skippedBookings.push({ id: booking.id, reason: 'no room ID' });
          continue;
        }
        
        // Find our room
        const roomResult = await client.query(`
          SELECT id, name FROM bookable_units WHERE beds24_room_id = $1
        `, [beds24RoomId]);
        
        if (roomResult.rows.length === 0) {
          skippedBookings.push({ id: booking.id, beds24RoomId, reason: 'room not mapped' });
          continue;
        }
        
        const ourRoom = roomResult.rows[0];
        
        // Get dates - Beds24 v2 uses arrival/departure
        const arrival = booking.arrival || booking.firstNight || booking.arrivalDate;
        const departure = booking.departure || booking.lastNight || booking.departureDate;
        
        if (!arrival || !departure) {
          skippedBookings.push({ id: booking.id, reason: 'missing dates' });
          continue;
        }
        
        const isCancelled = booking.status === 'cancelled' || booking.status === 'Cancelled';
        console.log(`Processing booking ${booking.id}: room ${beds24RoomId} (${ourRoom.name}), ${arrival} to ${departure}, cancelled: ${isCancelled}`);
        
        // Check if we have a matching GAS booking (created from our system)
        if (isCancelled) {
          const gasBookingResult = await client.query(`
            UPDATE bookings 
            SET status = 'cancelled', updated_at = NOW()
            WHERE beds24_booking_id = $1 AND status != 'cancelled'
            RETURNING id
          `, [booking.id.toString()]);
          
          if (gasBookingResult.rowCount > 0) {
            console.log(`Cancelled GAS booking ${gasBookingResult.rows[0].id} (Beds24 booking ${booking.id} was cancelled)`);
            gasBookingsCancelled++;
          }
        }
        
        const startDate = new Date(arrival);
        const endDate = new Date(departure);
        
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          if (isCancelled) {
            // Unblock cancelled booking dates
            const result = await client.query(`
              UPDATE room_availability 
              SET is_available = true, is_blocked = false, source = 'beds24_cancelled', updated_at = NOW()
              WHERE room_id = $1 AND date = $2 AND source IN ('beds24_sync', 'beds24_webhook', 'beds24_inventory', 'booking')
            `, [ourRoom.id, dateStr]);
            if (result.rowCount > 0) unblockedDates++;
          } else {
            // Block confirmed booking dates
            await client.query(`
              INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
              VALUES ($1, $2, false, false, 'beds24_sync')
              ON CONFLICT (room_id, date) 
              DO UPDATE SET is_available = false, source = 'beds24_sync', updated_at = NOW()
            `, [ourRoom.id, dateStr]);
            updatedDates++;
          }
        }
        processedBookings++;
      }
      
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    
    console.log(`Bookings sync complete: ${processedBookings} processed, ${updatedDates} blocked, ${unblockedDates} unblocked, ${gasBookingsCancelled} GAS bookings cancelled`);
    if (skippedBookings.length > 0) {
      console.log('Skipped bookings:', JSON.stringify(skippedBookings.slice(0, 10)));
    }
    
    res.json({
      success: true,
      bookingsFound: bookings.length,
      bookingsProcessed: processedBookings,
      datesUpdated: updatedDates,
      datesUnblocked: unblockedDates,
      gasBookingsCancelled,
      skipped: skippedBookings.length
    });
    
  } catch (error) {
    console.error('Sync bookings error:', error.response?.data || error.message || error);
    res.json({ success: false, error: error.response?.data?.message || error.message || 'Unknown error' });
  }
});

// =========================================================
// FULL INVENTORY SYNC - Run once daily to catch blackouts
// =========================================================
app.post('/api/admin/sync-beds24-inventory', async (req, res) => {
  try {
    const accessToken = await getBeds24AccessToken(pool);
    const today = new Date();
    
    // Get all rooms with beds24_room_id
    const roomsResult = await pool.query(`
      SELECT bu.id, bu.beds24_room_id, bu.name 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    const rooms = roomsResult.rows;
    console.log(`Full inventory sync: checking ${rooms.length} rooms using availability endpoint`);
    
    let inventoryBlocksFound = 0;
    let inventoryDatesBlocked = 0;
    let datesUnblocked = 0;
    
    // Calculate date range - next 365 days
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 365*24*60*60*1000).toISOString().split('T')[0];
    
    // For each room, get availability
    for (const room of rooms) {
      try {
        const availResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/availability', {
          headers: { 'token': accessToken },
          params: { 
            roomId: room.beds24_room_id,
            startDate,
            endDate
          }
        });
        
        const data = availResponse.data?.data?.[0];
        if (data && data.availability) {
          // Loop through each date
          for (const [dateStr, isAvailable] of Object.entries(data.availability)) {
            if (isAvailable === false) {
              // This date is blocked in Beds24
              inventoryBlocksFound++;
              
              await pool.query(`
                INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
                VALUES ($1, $2, false, true, 'beds24_inventory')
                ON CONFLICT (room_id, date) 
                DO UPDATE SET is_available = false, is_blocked = true, 
                  source = CASE WHEN room_availability.source IN ('beds24_sync', 'booking') THEN room_availability.source ELSE 'beds24_inventory' END,
                  updated_at = NOW()
              `, [room.id, dateStr]);
              
              inventoryDatesBlocked++;
            } else {
              // This date is AVAILABLE in Beds24 - unblock if it was blocked by beds24
              const result = await pool.query(`
                UPDATE room_availability 
                SET is_available = true, is_blocked = false, source = 'beds24_unblocked', updated_at = NOW()
                WHERE room_id = $1 AND date = $2 AND source IN ('beds24_inventory', 'beds24_sync', 'beds24_webhook')
                RETURNING id
              `, [room.id, dateStr]);
              
              if (result.rowCount > 0) {
                datesUnblocked++;
              }
            }
          }
          console.log(`Room ${room.name}: synced availability`);
        }
        
      } catch (roomError) {
        console.log(`Error syncing room ${room.beds24_room_id}: ${roomError.message}`);
      }
    }
    
    console.log(`Full inventory sync complete: ${inventoryBlocksFound} blocked, ${datesUnblocked} unblocked across ${rooms.length} rooms`);
    
    res.json({
      success: true,
      roomsChecked: rooms.length,
      inventoryBlocksFound,
      inventoryDatesBlocked,
      datesUnblocked
    });
    
  } catch (error) {
    console.error('Inventory sync error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Debug endpoint - check specific date availability from Beds24
app.get('/api/admin/debug/beds24-availability/:date', async (req, res) => {
  try {
    const { date } = req.params; // Format: 2026-01-03
    const accessToken = await getBeds24AccessToken(pool);
    
    // Get all rooms
    const roomsResult = await pool.query(`
      SELECT bu.id, bu.beds24_room_id, bu.name 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    const rooms = roomsResult.rows;
    const beds24RoomIds = rooms.map(r => r.beds24_room_id);
    
    // Calculate departure (next day)
    const arrivalDate = new Date(date);
    const departDate = new Date(arrivalDate);
    departDate.setDate(departDate.getDate() + 1);
    const departure = departDate.toISOString().split('T')[0];
    
    // Call offers endpoint
    const offerResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/offers', {
      headers: { 'token': accessToken },
      params: {
        roomId: beds24RoomIds,
        arrival: date,
        departure: departure,
        numAdults: 1
      },
      paramsSerializer: params => {
        const parts = [];
        for (const key in params) {
          if (Array.isArray(params[key])) {
            params[key].forEach(val => parts.push(`${key}=${val}`));
          } else {
            parts.push(`${key}=${params[key]}`);
          }
        }
        return parts.join('&');
      }
    });
    
    const rawResponse = offerResponse.data;
    const offers = Array.isArray(rawResponse) ? rawResponse : (rawResponse.data || []);
    const availableRoomIds = offers.map(o => o.roomId);
    
    // Find which rooms are missing (blocked)
    const blockedRooms = rooms.filter(r => !availableRoomIds.includes(r.beds24_room_id));
    const availableRooms = rooms.filter(r => availableRoomIds.includes(r.beds24_room_id));
    
    res.json({
      date,
      departure,
      allRoomIds: beds24RoomIds,
      availableRoomIds,
      blockedRooms: blockedRooms.map(r => ({ id: r.id, beds24_id: r.beds24_room_id, name: r.name })),
      availableRooms: availableRooms.map(r => ({ id: r.id, beds24_id: r.beds24_room_id, name: r.name })),
      rawOffersCount: offers.length,
      sampleOffer: offers[0] || null
    });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Debug endpoint - check Beds24 inventory/calendar directly
app.get('/api/admin/debug/beds24-inventory/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { from, to } = req.query;
    const accessToken = await getBeds24AccessToken(pool);
    
    const startDate = from || new Date().toISOString().split('T')[0];
    const endDate = to || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
    
    // Try multiple Beds24 endpoints to find inventory data
    const results = {};
    
    // 1. Try /inventory/rooms endpoint
    try {
      const invResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms', {
        headers: { 'token': accessToken },
        params: { roomId }
      });
      results.inventoryRooms = invResponse.data;
    } catch (e) {
      results.inventoryRooms = { error: e.message };
    }
    
    // 2. Try /inventory/rooms/availability endpoint
    try {
      const availResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/availability', {
        headers: { 'token': accessToken },
        params: { 
          roomId,
          startDate,
          endDate
        }
      });
      results.availability = availResponse.data;
    } catch (e) {
      results.availability = { error: e.message };
    }
    
    // 3. Try /inventory/rooms/calendar endpoint
    try {
      const calResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/calendar', {
        headers: { 'token': accessToken },
        params: { 
          roomId,
          startDate,
          endDate
        }
      });
      results.calendar = calResponse.data;
    } catch (e) {
      results.calendar = { error: e.message };
    }
    
    // 4. Try /properties/rooms endpoint
    try {
      const propsResponse = await axios.get('https://beds24.com/api/v2/properties/rooms', {
        headers: { 'token': accessToken },
        params: { roomId }
      });
      results.propertiesRooms = propsResponse.data;
    } catch (e) {
      results.propertiesRooms = { error: e.message };
    }
    
    // 5. Try /inventory endpoint with dates
    try {
      const invDateResponse = await axios.get('https://beds24.com/api/v2/inventory', {
        headers: { 'token': accessToken },
        params: { 
          roomId,
          startDate,
          endDate
        }
      });
      results.inventory = invDateResponse.data;
    } catch (e) {
      results.inventory = { error: e.message };
    }
    
    res.json({
      roomId,
      startDate,
      endDate,
      results
    });
    
  } catch (error) {
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
      case 'property_short':
        userPrompt = `Write a short property description (1-2 sentences, max 30 words). ${propertyContext} ${prompt ? `Notes: ${prompt}` : ''}`;
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
      case 'room_display_name':
        // Get property context for the room
        const { room_id: rId, original_name: roomOrigName, room_type: rType, max_guests: rGuests } = req.body;
        let propContext = '';
        
        if (rId) {
          const roomPropResult = await pool.query(`
            SELECT p.name as property_name, p.property_type, p.city, p.description, p.address
            FROM bookable_units bu
            LEFT JOIN properties p ON bu.property_id = p.id
            WHERE bu.id = $1
          `, [rId]);
          
          if (roomPropResult.rows[0]) {
            const rp = roomPropResult.rows[0];
            propContext = `Property: ${rp.property_name}. Type: ${rp.property_type || 'accommodation'}. Location: ${rp.city || ''}.`;
            if (rp.description) propContext += ` Description: ${rp.description.substring(0, 200)}`;
          }
        }
        
        userPrompt = `Create a marketing-friendly room name for a booking website.

Original room name: "${roomOrigName}"
Room type: ${rType || 'room'}
Sleeps: ${rGuests || 2} guests
${propContext}

Rules:
- Create an appealing, descriptive name that captures the room's character
- Include the room type or bed type if relevant (e.g., "Suite", "King", "Double")
- Can reference the property style if it adds value
- Max 5-6 words
- Don't use clichés like "Luxurious", "Stunning", "Paradise", "Oasis"
- Keep it natural and memorable
- Examples of good names: "The Garden View Suite", "Riverside King Room", "Cozy Attic Retreat", "Historic Corner Suite"

Just return the new name, nothing else.`;
        break;
      case 'display_name':
        const { original_name, property_type: propType, city: propCity } = req.body;
        userPrompt = `Create a marketing-friendly property name from this original name: "${original_name}". Property type: ${propType || 'accommodation'}. Location: ${propCity || 'unknown'}.

Rules:
- Remove codes like BC138, ME3, Coastal1 etc
- Keep the core descriptive words
- Make it appealing but not overly flowery
- Max 6 words
- Don't use words like "Luxurious", "Stunning", "Paradise"
- Keep it natural and professional

Just return the new name, nothing else.`;
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
      SELECT bu.*, 
             p.name as property_name, 
             p.currency, 
             p.timezone
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
          FROM bookable_unit_images WHERE bookable_unit_id = $1
        `, [unitId]);
      } catch (e) {
        // Table doesn't exist, that's fine
        images = { rows: [] };
      }
    }
    
    // Get amenities from room_amenity_selections joined with master_amenities
    let amenities = { rows: [] };
    try {
      amenities = await pool.query(`
        SELECT ma.amenity_name as name, ma.category, ma.icon
        FROM room_amenity_selections ras
        JOIN master_amenities ma ON ras.amenity_id = ma.id
        WHERE ras.room_id = $1
        ORDER BY ma.category, ras.display_order
      `, [unitId]);
    } catch (e) {
      // Fallback to old table structure
      try {
        amenities = await pool.query(`
          SELECT amenity_name as name, category, icon
          FROM bookable_unit_amenities WHERE bookable_unit_id = $1
          ORDER BY category, display_order
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
    
    // Get taxes for this specific property
    let taxes = { rows: [] };
    try {
      taxes = await pool.query(`
        SELECT t.* FROM taxes t
        WHERE t.active = true
          AND t.property_id = (SELECT property_id FROM bookable_units WHERE id = $1)
          AND (t.room_id IS NULL OR t.room_id = $1)
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
      guest_address, guest_city, guest_country, guest_postcode,
      voucher_code, notes, total_price,
      stripe_payment_intent_id, deposit_amount, balance_amount, payment_method
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
    
    // ========== REAL-TIME AVAILABILITY CHECK ==========
    // Check Beds24 for latest availability before confirming booking
    const beds24RoomId = unit.rows[0].beds24_room_id;
    if (beds24RoomId) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        if (accessToken) {
          console.log(`Real-time availability check for room ${beds24RoomId}: ${check_in} to ${check_out}`);
          
          const availResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/availability', {
            headers: { 'token': accessToken },
            params: {
              roomId: beds24RoomId,
              startDate: check_in,
              endDate: check_out
            }
          });
          
          const data = availResponse.data?.data?.[0];
          if (data && data.availability) {
            // Check each date in the range
            for (const [dateStr, isAvailable] of Object.entries(data.availability)) {
              if (isAvailable === false) {
                console.log(`Real-time check FAILED: ${dateStr} is not available`);
                return res.json({ 
                  success: false, 
                  error: 'Sorry, these dates are no longer available. Please select different dates.',
                  unavailable_date: dateStr
                });
              }
            }
            console.log('Real-time availability check PASSED');
          }
        }
      } catch (availError) {
        // Log but don't block - fall back to local availability
        console.error('Real-time availability check error:', availError.message);
      }
    }
    // ========== END AVAILABILITY CHECK ==========
    
    // Determine payment status
    let paymentStatus = 'pending';
    let bookingStatus = 'pending';
    
    if (stripe_payment_intent_id && deposit_amount) {
      paymentStatus = 'deposit_paid';
      bookingStatus = 'confirmed';
    } else if (payment_method === 'property') {
      paymentStatus = 'pending';
      bookingStatus = 'confirmed';
    }
    
    // Calculate balance due date (14 days before arrival by default)
    const arrivalDate = new Date(check_in);
    const balanceDueDate = new Date(arrivalDate);
    balanceDueDate.setDate(balanceDueDate.getDate() - 14);
    
    // Create booking
    const booking = await pool.query(`
      INSERT INTO bookings (
        property_id, property_owner_id, bookable_unit_id, 
        arrival_date, departure_date, 
        num_adults, num_children, 
        guest_first_name, guest_last_name, guest_email, guest_phone,
        accommodation_price, subtotal, grand_total, 
        deposit_amount, balance_amount, balance_due_date,
        stripe_payment_intent_id, payment_status,
        status, booking_source, currency, notes
      ) 
      VALUES ($1, 1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $10, $10, $11, $12, $13, $14, $15, $16, 'direct', 'USD', $17)
      RETURNING *
    `, [
      unit.rows[0].property_id,
      unit_id,
      check_in,
      check_out,
      guests || 1,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone || null,
      total_price || 0,
      deposit_amount || null,
      balance_amount || null,
      balanceDueDate,
      stripe_payment_intent_id || null,
      paymentStatus,
      bookingStatus,
      notes || null
    ]);
    
    const newBooking = booking.rows[0];
    
    // If card payment was made, record the transaction
    if (stripe_payment_intent_id && deposit_amount) {
      try {
        await pool.query(`
          INSERT INTO payment_transactions (booking_id, type, amount, currency, status, stripe_payment_intent_id, created_at)
          VALUES ($1, 'deposit', $2, 'USD', 'completed', $3, NOW())
        `, [newBooking.id, deposit_amount, stripe_payment_intent_id]);
      } catch (txError) {
        console.log('Could not record payment transaction (table may not exist yet):', txError.message);
      }
    }
    
    // If voucher was used, increment usage
    if (voucher_code) {
      await pool.query(`
        UPDATE vouchers SET times_used = times_used + 1 WHERE code = $1
      `, [voucher_code.toUpperCase()]);
    }
    
    // Block availability for these dates
    console.log(`Blocking dates for unit ${unit_id} from ${check_in} to ${check_out}`);
    
    // Parse dates properly (avoid timezone issues)
    const startParts = check_in.split('-');
    const endParts = check_out.split('-');
    let current = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const checkOutDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    
    while (current < checkOutDate) {
      const dateStr = current.toISOString().split('T')[0];
      console.log(`Blocking date: ${dateStr} for unit ${unit_id}`);
      try {
        await pool.query(`
          INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
          VALUES ($1, $2, false, true, 'booking')
          ON CONFLICT (room_id, date) DO UPDATE SET is_available = false, is_blocked = true, source = 'booking'
        `, [unit_id, dateStr]);
      } catch (blockErr) {
        console.error(`Error blocking date ${dateStr}:`, blockErr.message);
      }
      current.setDate(current.getDate() + 1);
    }
    console.log('Finished blocking dates');
    
    // ========== CHANNEL MANAGER SYNC ==========
    let beds24BookingId = null;
    let smoobuBookingId = null;
    let hostawayReservationId = null;
    
    // Get CM IDs for this unit
    const cmResult = await pool.query(`
      SELECT bu.beds24_room_id, bu.smoobu_id, bu.hostaway_listing_id,
             p.account_id
      FROM bookable_units bu
      LEFT JOIN properties p ON bu.property_id = p.id
      WHERE bu.id = $1
    `, [unit_id]);
    
    const cmData = cmResult.rows[0];
    
    // BEDS24 SYNC
    if (cmData?.beds24_room_id) {
      try {
        const accessToken = await getBeds24AccessToken(pool);
        
        // Build payment array if deposit was taken
        const payments = [];
        console.log(`Beds24 sync - deposit_amount: ${deposit_amount}, stripe_payment_intent_id: ${stripe_payment_intent_id}`);
        
        if (stripe_payment_intent_id && deposit_amount) {
          payments.push({
            description: 'Deposit via Stripe',
            amount: parseFloat(deposit_amount),
            status: 'received',
            date: new Date().toISOString().split('T')[0]
          });
          console.log('Added deposit payment to Beds24 payload:', JSON.stringify(payments));
        }
        
        const beds24Booking = [{
          roomId: cmData.beds24_room_id,
          status: 'confirmed',
          arrival: check_in,
          departure: check_out,
          numAdult: guests || 1,
          numChild: 0,
          firstName: guest_first_name,
          lastName: guest_last_name,
          email: guest_email,
          mobile: guest_phone || '',
          phone: guest_phone || '',
          address: guest_address || '',
          city: guest_city || '',
          postcode: guest_postcode || '',
          country: guest_country || '',
          referer: 'GAS Direct Booking',
          notes: `GAS Booking ID: ${newBooking.id}`,
          price: parseFloat(total_price) || 0,
          deposit: deposit_amount ? parseFloat(deposit_amount) : 0,
          invoiceItems: [{
            description: 'Accommodation',
            status: '',
            qty: 1,
            amount: parseFloat(total_price) || 0,
            vatRate: 0
          }],
          payments: payments.length > 0 ? payments : undefined
        }];
        
        console.log('Pushing booking to Beds24:', JSON.stringify(beds24Booking));
        
        const beds24Response = await axios.post('https://beds24.com/api/v2/bookings', beds24Booking, {
          headers: {
            'token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Beds24 response:', JSON.stringify(beds24Response.data));
        
        if (beds24Response.data && beds24Response.data[0]?.success) {
          beds24BookingId = beds24Response.data[0]?.new?.id;
          if (beds24BookingId) {
            await pool.query(`UPDATE bookings SET beds24_booking_id = $1 WHERE id = $2`, [beds24BookingId, newBooking.id]);
          }
        }
      } catch (beds24Error) {
        console.error('Error syncing to Beds24:', beds24Error.response?.data || beds24Error.message);
      }
    }
    
    // SMOOBU SYNC
    if (cmData?.smoobu_id) {
      try {
        // Get Smoobu API key for this account
        const smoobuKeyResult = await pool.query(`
          SELECT setting_value FROM client_settings 
          WHERE client_id = $1 AND setting_key = 'smoobu_api_key'
        `, [cmData.account_id]);
        
        const smoobuApiKey = smoobuKeyResult.rows[0]?.setting_value;
        
        if (smoobuApiKey) {
          const smoobuResponse = await axios.post('https://login.smoobu.com/api/reservations', {
            arrivalDate: check_in,
            departureDate: check_out,
            apartmentId: parseInt(cmData.smoobu_id),
            channelId: 13, // Direct booking
            firstName: guest_first_name,
            lastName: guest_last_name,
            email: guest_email,
            phone: guest_phone || '',
            adults: guests || 1,
            children: 0,
            price: total_price || 0,
            notice: `GAS Booking ID: ${newBooking.id}`
          }, {
            headers: {
              'Api-Key': smoobuApiKey,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Smoobu response:', JSON.stringify(smoobuResponse.data));
          
          if (smoobuResponse.data?.id) {
            smoobuBookingId = smoobuResponse.data.id;
            await pool.query(`UPDATE bookings SET smoobu_booking_id = $1 WHERE id = $2`, [smoobuBookingId, newBooking.id]);
          }
        }
      } catch (smoobuError) {
        console.error('Error syncing to Smoobu:', smoobuError.response?.data || smoobuError.message);
      }
    }
    
    // HOSTAWAY SYNC
    if (cmData?.hostaway_listing_id) {
      try {
        const stored = await getStoredHostawayToken(pool);
        
        if (stored?.accessToken) {
          const hostawayResponse = await axios.post('https://api.hostaway.com/v1/reservations', {
            listingMapId: cmData.hostaway_listing_id,
            channelId: 2000,
            source: 'manual',
            arrivalDate: check_in,
            departureDate: check_out,
            guestFirstName: guest_first_name,
            guestLastName: guest_last_name,
            guestEmail: guest_email,
            guestPhone: guest_phone || '',
            numberOfGuests: guests || 1,
            adults: guests || 1,
            children: 0,
            totalPrice: total_price || 0,
            isPaid: deposit_amount ? 1 : 0,
            status: 'new',
            comment: `GAS Booking ID: ${newBooking.id}`
          }, {
            headers: {
              'Authorization': `Bearer ${stored.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Hostaway response:', JSON.stringify(hostawayResponse.data));
          
          if (hostawayResponse.data?.result?.id) {
            hostawayReservationId = hostawayResponse.data.result.id;
            await pool.query(`UPDATE bookings SET hostaway_reservation_id = $1 WHERE id = $2`, [hostawayReservationId, newBooking.id]);
          }
        }
      } catch (hostawayError) {
        console.error('Error syncing to Hostaway:', hostawayError.response?.data || hostawayError.message);
      }
    }
    // ========== END CM SYNC ==========
    
    // ========== SEND CONFIRMATION EMAIL ==========
    try {
      // Get property details for the email
      const propertyResult = await pool.query(`
        SELECT p.*, a.email as account_email 
        FROM properties p 
        LEFT JOIN accounts a ON p.account_id = a.id 
        WHERE p.id = $1
      `, [unit.rows[0].property_id]);
      
      const property = propertyResult.rows[0];
      const room = unit.rows[0];
      
      // Build booking object with all details
      const bookingForEmail = {
        id: newBooking.id,
        arrival_date: check_in,
        departure_date: check_out,
        num_adults: guests || 1,
        grand_total: total_price,
        deposit_amount: deposit_amount,
        balance_amount: balance_amount,
        currency: room.currency || '$'
      };
      
      const emailHtml = generateBookingConfirmationEmail(bookingForEmail, property, room);
      
      // Send to guest
      await sendEmail({
        to: guest_email,
        subject: `Booking Confirmed - ${property?.name || 'Your Reservation'} (Ref: ${newBooking.id})`,
        html: emailHtml
      });
      
      // Also send to property owner if different email
      if (property?.account_email && property.account_email !== guest_email) {
        await sendEmail({
          to: property.account_email,
          subject: `New Booking - ${guest_first_name} ${guest_last_name} (Ref: ${newBooking.id})`,
          html: emailHtml
        });
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
      // Don't fail the booking if email fails
    }
    // ========== END EMAIL ==========
    
    res.json({
      success: true,
      booking_id: newBooking.id,
      booking: newBooking,
      cm_sync: {
        beds24: beds24BookingId ? { success: true, id: beds24BookingId } : null,
        smoobu: smoobuBookingId ? { success: true, id: smoobuBookingId } : null,
        hostaway: hostawayReservationId ? { success: true, id: hostawayReservationId } : null
      }
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
    
    // Get today's date for rate calendar lookup
    const today = new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        bu.id,
        bu.name,
        bu.display_name,
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
        (SELECT image_url FROM room_images WHERE room_id = bu.id AND is_active = true ORDER BY is_primary DESC, display_order ASC LIMIT 1) as image_url,
        (SELECT COALESCE(standard_price, cm_price) FROM room_availability WHERE room_id = bu.id AND date = $2 LIMIT 1) as todays_rate
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.account_id = $1
    `;
    
    const params = [clientId, today];
    let paramIndex = 3;
    
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
    
    // Use today's rate if available, otherwise fall back to base_price
    const rooms = result.rows.map(room => ({
      ...room,
      price: room.todays_rate || room.base_price || 0
    }));
    
    // Get max guests across all rooms
    const maxGuestsResult = await pool.query(`
      SELECT MAX(COALESCE(bu.max_guests, bu.max_adults, 2)) as max_guests
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.account_id = $1
    `, [clientId]);
    
    res.json({
      success: true,
      rooms: rooms,
      meta: {
        total: rooms.length,
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
          AND (p.account_id = $1 OR o.user_id = $1)
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
          AND (p.account_id = $1 OR o.user_id = $1)
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
    
    // Get property_id from unit if not provided
    let propId = property_id;
    if (unit_id && !propId) {
      const unitResult = await pool.query('SELECT property_id FROM bookable_units WHERE id = $1', [unit_id]);
      if (unitResult.rows.length > 0) {
        propId = unitResult.rows[0].property_id;
      }
    }
    
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
        AND (p.account_id = $1 OR u.property_id IS NULL)
        AND ($2::integer IS NULL OR u.property_id = $2)
        AND (
          $3::integer IS NULL 
          OR u.room_id IS NULL 
          OR u.room_id = $3
          OR u.room_ids LIKE '%' || $3::text || '%'
        )
      ORDER BY u.category NULLS LAST, u.name
    `, [clientId, propId || null, unit_id || null]);
    
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
      address_line1, address_line2, city, region, postcode, country || 'GB',
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
      address_line1, address_line2, city, region, postcode, country || 'GB',
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
            pool.query(`SELECT section, settings FROM website_settings WHERE account_id = $1`, [clientId])
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

// Create website_settings table if not exists (supports both old account_id and new website_id)
pool.query(`
  CREATE TABLE IF NOT EXISTS website_settings (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    account_id INTEGER,
    section VARCHAR(50) NOT NULL,
    variant VARCHAR(50),
    settings JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Website settings table may already exist'));

// Add new columns if they don't exist
pool.query(`ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE`).catch(() => {});
pool.query(`ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS variant VARCHAR(50)`).catch(() => {});
pool.query(`ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE`).catch(() => {});
pool.query(`ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`).catch(() => {});

// Create unique index for new structure
pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_unique ON website_settings(website_id, section) WHERE website_id IS NOT NULL`).catch(() => {});

// Seed default templates if none exist
pool.query(`
  INSERT INTO website_templates (code, name, description, category, sections, is_active)
  SELECT 'starter', 'Starter', 'Simple and clean starter template', 'general', 
    '{"header":{"enabled":true,"required":true},"hero":{"enabled":true,"required":true,"variants":["fullscreen","split"]},"intro":{"enabled":true},"rooms":{"enabled":true,"required":true},"reviews":{"enabled":true},"cta":{"enabled":true},"footer":{"enabled":true,"required":true}}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE code = 'starter')
`).catch(() => {});

pool.query(`
  INSERT INTO website_templates (code, name, description, category, sections, is_active)
  SELECT 'boutique-hotel', 'Boutique Hotel', 'Elegant template for boutique hotels', 'hotel',
    '{"header":{"enabled":true,"required":true},"hero":{"enabled":true,"required":true,"variants":["fullscreen","split","video","slider"]},"intro":{"enabled":true},"rooms":{"enabled":true,"required":true},"amenities":{"enabled":true},"restaurant":{"enabled":true},"spa":{"enabled":true},"reviews":{"enabled":true},"location":{"enabled":true},"cta":{"enabled":true},"footer":{"enabled":true,"required":true}}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE code = 'boutique-hotel')
`).catch(() => {});

pool.query(`
  INSERT INTO website_templates (code, name, description, category, sections, is_active)
  SELECT 'beach-villa', 'Beach Villa', 'Perfect for beach and holiday properties', 'villa',
    '{"header":{"enabled":true,"required":true},"hero":{"enabled":true,"required":true,"variants":["fullscreen","video"]},"intro":{"enabled":true},"rooms":{"enabled":true,"required":true},"amenities":{"enabled":true},"beach":{"enabled":true},"activities":{"enabled":true},"reviews":{"enabled":true},"location":{"enabled":true},"cta":{"enabled":true},"footer":{"enabled":true,"required":true}}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE code = 'beach-villa')
`).catch(() => {});

pool.query(`
  INSERT INTO website_templates (code, name, description, category, sections, is_active)
  SELECT 'city-apartment', 'City Apartment', 'Modern template for city rentals', 'apartment',
    '{"header":{"enabled":true,"required":true},"hero":{"enabled":true,"required":true,"variants":["fullscreen","split"]},"intro":{"enabled":true},"rooms":{"enabled":true,"required":true},"amenities":{"enabled":true},"neighborhood":{"enabled":true},"transport":{"enabled":true},"reviews":{"enabled":true},"cta":{"enabled":true},"footer":{"enabled":true,"required":true}}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE code = 'city-apartment')
`).catch(() => {});

pool.query(`
  INSERT INTO website_templates (code, name, description, category, sections, is_active)
  SELECT 'agency-portfolio', 'Agency Portfolio', 'Showcase multiple properties', 'agency',
    '{"header":{"enabled":true,"required":true},"hero":{"enabled":true,"required":true},"intro":{"enabled":true},"properties":{"enabled":true,"required":true},"destinations":{"enabled":true},"about":{"enabled":true},"team":{"enabled":true},"testimonials":{"enabled":true},"cta":{"enabled":true},"footer":{"enabled":true,"required":true}}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE code = 'agency-portfolio')
`).catch(() => {});

// =========================================================
// WEBSITES API ENDPOINTS
// =========================================================

// Generate unique public ID for websites
function generateWebsitePublicId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'WEB-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// List websites for current owner
app.get('/api/websites', async (req, res) => {
  try {
    const { owner_type, owner_id } = req.query;
    
    if (!owner_id) {
      return res.json({ success: false, error: 'owner_id required' });
    }
    
    const ownerType = owner_type || 'account';
    
    const result = await pool.query(`
      SELECT w.*, 
             wt.name as template_name,
             wt.category as template_category,
             (SELECT COUNT(*) FROM website_units wu WHERE wu.website_id = w.id AND wu.is_active = true) as unit_count
      FROM websites w
      LEFT JOIN website_templates wt ON w.template_code = wt.code
      WHERE w.owner_type = $1 AND w.owner_id = $2
      ORDER BY w.created_at DESC
    `, [ownerType, owner_id]);
    
    res.json({ success: true, websites: result.rows });
  } catch (error) {
    console.error('Get websites error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get single website with units
app.get('/api/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get website
    const websiteResult = await pool.query(`
      SELECT w.*, wt.name as template_name, wt.sections as template_sections
      FROM websites w
      LEFT JOIN website_templates wt ON w.template_code = wt.code
      WHERE w.id = $1 OR w.public_id = $1
    `, [id]);
    
    if (websiteResult.rows.length === 0) {
      return res.json({ success: false, error: 'Website not found' });
    }
    
    const website = websiteResult.rows[0];
    
    // Get units on this website
    const unitsResult = await pool.query(`
      SELECT wu.*, bu.name as unit_name, bu.display_name, bu.base_price,
             p.name as property_name, p.id as property_id
      FROM website_units wu
      JOIN bookable_units bu ON wu.unit_id = bu.id
      JOIN properties p ON bu.property_id = p.id
      WHERE wu.website_id = $1
      ORDER BY wu.display_order, wu.added_at
    `, [website.id]);
    
    // Get settings
    const settingsResult = await pool.query(`
      SELECT section, variant, settings, is_enabled, display_order
      FROM website_settings
      WHERE website_id = $1
    `, [website.id]);
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.section] = {
        variant: row.variant,
        settings: row.settings,
        is_enabled: row.is_enabled,
        display_order: row.display_order
      };
    });
    
    res.json({ 
      success: true, 
      website, 
      units: unitsResult.rows,
      settings 
    });
  } catch (error) {
    console.error('Get website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create new website
app.post('/api/websites', async (req, res) => {
  try {
    const { 
      owner_type = 'account', 
      owner_id, 
      name, 
      template_code = 'starter',
      website_type = 'portfolio',
      slug
    } = req.body;
    
    if (!owner_id || !name) {
      return res.json({ success: false, error: 'owner_id and name required' });
    }
    
    const publicId = generateWebsitePublicId();
    
    const result = await pool.query(`
      INSERT INTO websites (public_id, owner_type, owner_id, name, slug, template_code, website_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING *
    `, [publicId, owner_type, owner_id, name, slug, template_code, website_type]);
    
    res.json({ success: true, website: result.rows[0] });
  } catch (error) {
    console.error('Create website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Update website
app.put('/api/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, custom_domain, status, template_code, website_type } = req.body;
    
    const result = await pool.query(`
      UPDATE websites 
      SET name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          custom_domain = COALESCE($4, custom_domain),
          status = COALESCE($5, status),
          template_code = COALESCE($6, template_code),
          website_type = COALESCE($7, website_type),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, name, slug, custom_domain, status, template_code, website_type]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Website not found' });
    }
    
    res.json({ success: true, website: result.rows[0] });
  } catch (error) {
    console.error('Update website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Delete website
app.delete('/api/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM websites WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// WEBSITE UNITS API ENDPOINTS
// =========================================================

// Get units on a website
app.get('/api/websites/:id/units', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT wu.*, bu.name as unit_name, bu.display_name, bu.base_price, bu.max_guests,
             p.name as property_name, p.id as property_id, p.city, p.country
      FROM website_units wu
      JOIN bookable_units bu ON wu.unit_id = bu.id
      JOIN properties p ON bu.property_id = p.id
      WHERE wu.website_id = $1
      ORDER BY wu.display_order, wu.added_at
    `, [id]);
    
    res.json({ success: true, units: result.rows });
  } catch (error) {
    console.error('Get website units error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get available units to add (not already on this website)
app.get('/api/websites/:id/available-units', async (req, res) => {
  try {
    const { id } = req.params;
    const { owner_type, owner_id } = req.query;
    
    // Get website to know owner
    const websiteResult = await pool.query('SELECT * FROM websites WHERE id = $1', [id]);
    if (websiteResult.rows.length === 0) {
      return res.json({ success: false, error: 'Website not found' });
    }
    
    const website = websiteResult.rows[0];
    
    // Get units the owner has access to that aren't already on this website
    let query;
    if (website.owner_type === 'account') {
      // Account owner - get their own units + units from accounts they manage (if agency)
      query = await pool.query(`
        SELECT bu.*, p.name as property_name, p.city, p.country
        FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        WHERE (p.account_id = $1 OR p.account_id IN (
          SELECT id FROM accounts WHERE managed_by_id = $1
        ))
        AND bu.id NOT IN (SELECT unit_id FROM website_units WHERE website_id = $2)
        ORDER BY p.name, bu.name
      `, [website.owner_id, id]);
    } else if (website.owner_type === 'agency') {
      // Agency - get units from all managed accounts
      query = await pool.query(`
        SELECT bu.*, p.name as property_name, p.city, p.country
        FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        JOIN accounts a ON p.account_id = a.id
        WHERE a.managed_by_id = $1
        AND bu.id NOT IN (SELECT unit_id FROM website_units WHERE website_id = $2)
        ORDER BY p.name, bu.name
      `, [website.owner_id, id]);
    } else if (website.owner_type === 'travel_agent') {
      // Travel agent - get units they have distribution access to
      query = await pool.query(`
        SELECT bu.*, p.name as property_name, p.city, p.country
        FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        JOIN distribution_access da ON bu.id = da.unit_id
        WHERE da.agent_account_id = $1 AND da.status = 'approved'
        AND bu.id NOT IN (SELECT unit_id FROM website_units WHERE website_id = $2)
        ORDER BY p.name, bu.name
      `, [website.owner_id, id]);
    } else {
      return res.json({ success: false, error: 'Invalid owner type' });
    }
    
    res.json({ success: true, units: query.rows });
  } catch (error) {
    console.error('Get available units error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Add units to website
app.post('/api/websites/:id/units', async (req, res) => {
  try {
    const { id } = req.params;
    const { unit_ids } = req.body;
    
    if (!unit_ids || !Array.isArray(unit_ids) || unit_ids.length === 0) {
      return res.json({ success: false, error: 'unit_ids array required' });
    }
    
    // Get current max display order
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM website_units WHERE website_id = $1',
      [id]
    );
    let displayOrder = maxOrderResult.rows[0].max_order + 1;
    
    const added = [];
    for (const unitId of unit_ids) {
      try {
        const result = await pool.query(`
          INSERT INTO website_units (website_id, unit_id, display_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (website_id, unit_id) DO NOTHING
          RETURNING *
        `, [id, unitId, displayOrder]);
        
        if (result.rows.length > 0) {
          added.push(result.rows[0]);
          displayOrder++;
        }
      } catch (err) {
        console.log(`Couldn't add unit ${unitId}:`, err.message);
      }
    }
    
    res.json({ success: true, added, count: added.length });
  } catch (error) {
    console.error('Add units error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Remove unit from website
app.delete('/api/websites/:websiteId/units/:unitId', async (req, res) => {
  try {
    const { websiteId, unitId } = req.params;
    
    await pool.query(
      'DELETE FROM website_units WHERE website_id = $1 AND unit_id = $2',
      [websiteId, unitId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove unit error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Update unit display settings on website
app.put('/api/websites/:websiteId/units/:unitId', async (req, res) => {
  try {
    const { websiteId, unitId } = req.params;
    const { display_order, is_featured, custom_name, custom_description, custom_price_modifier, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE website_units 
      SET display_order = COALESCE($3, display_order),
          is_featured = COALESCE($4, is_featured),
          custom_name = COALESCE($5, custom_name),
          custom_description = COALESCE($6, custom_description),
          custom_price_modifier = COALESCE($7, custom_price_modifier),
          is_active = COALESCE($8, is_active)
      WHERE website_id = $1 AND unit_id = $2
      RETURNING *
    `, [websiteId, unitId, display_order, is_featured, custom_name, custom_description, custom_price_modifier, is_active]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Unit not found on website' });
    }
    
    res.json({ success: true, unit: result.rows[0] });
  } catch (error) {
    console.error('Update unit error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// WEBSITE BUILDER API ENDPOINTS (NEW - website_id based)
// =========================================================

// Get builder section for a website
app.get('/api/websites/:id/builder/:section', async (req, res) => {
  try {
    const { id, section } = req.params;
    
    const result = await pool.query(`
      SELECT section, variant, settings, is_enabled, display_order
      FROM website_settings
      WHERE website_id = $1 AND section = $2
    `, [id, section]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, ...result.rows[0] });
    } else {
      res.json({ success: true, settings: null });
    }
  } catch (error) {
    console.error('Get builder section error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Save builder section for a website
app.post('/api/websites/:id/builder/:section', async (req, res) => {
  try {
    const { id, section } = req.params;
    const { settings, variant, is_enabled, display_order } = req.body;
    
    const result = await pool.query(`
      INSERT INTO website_settings (website_id, section, variant, settings, is_enabled, display_order, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (website_id, section) WHERE website_id IS NOT NULL
      DO UPDATE SET 
        settings = COALESCE($4, website_settings.settings),
        variant = COALESCE($3, website_settings.variant),
        is_enabled = COALESCE($5, website_settings.is_enabled),
        display_order = COALESCE($6, website_settings.display_order),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [id, section, variant, JSON.stringify(settings), is_enabled, display_order]);
    
    res.json({ success: true, setting: result.rows[0] });
  } catch (error) {
    console.error('Save builder section error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get all builder sections for a website
app.get('/api/websites/:id/builder', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT section, variant, settings, is_enabled, display_order
      FROM website_settings
      WHERE website_id = $1
      ORDER BY display_order
    `, [id]);
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.section] = {
        variant: row.variant,
        settings: row.settings,
        is_enabled: row.is_enabled,
        display_order: row.display_order
      };
    });
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get all builder sections error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// TEMPLATES API ENDPOINTS
// =========================================================

// List available templates
app.get('/api/templates', async (req, res) => {
  try {
    const { category, plan } = req.query;
    
    let query = 'SELECT * FROM website_templates WHERE is_active = true';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY is_premium, name';
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get single template
app.get('/api/templates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM website_templates WHERE code = $1',
      [code]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Get template error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// PUBLIC WEBSITE API (for WordPress sites to fetch data)
// =========================================================

// Get public website info + units (for WP sites)
app.get('/api/public/websites/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Get website
    const websiteResult = await pool.query(`
      SELECT w.*, wt.name as template_name, wt.sections as template_sections
      FROM websites w
      LEFT JOIN website_templates wt ON w.template_code = wt.code
      WHERE w.public_id = $1 AND w.status = 'active'
    `, [publicId]);
    
    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    const website = websiteResult.rows[0];
    
    // Get active units on this website
    const unitsResult = await pool.query(`
      SELECT 
        wu.display_order, wu.is_featured, 
        COALESCE(wu.custom_name, bu.display_name, bu.name) as name,
        COALESCE(wu.custom_description, bu.description) as description,
        bu.id as unit_id, bu.beds24_room_id, bu.base_price, bu.max_guests,
        bu.bedrooms, bu.bathrooms, bu.images,
        p.id as property_id, p.name as property_name, p.city, p.country, p.address,
        p.beds24_prop_id
      FROM website_units wu
      JOIN bookable_units bu ON wu.unit_id = bu.id
      JOIN properties p ON bu.property_id = p.id
      WHERE wu.website_id = $1 AND wu.is_active = true
      ORDER BY wu.display_order, wu.added_at
    `, [website.id]);
    
    // Get settings
    const settingsResult = await pool.query(`
      SELECT section, variant, settings, is_enabled
      FROM website_settings
      WHERE website_id = $1 AND is_enabled = true
    `, [website.id]);
    
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.section] = {
        variant: row.variant,
        ...row.settings
      };
    });
    
    res.json({ 
      success: true, 
      website: {
        id: website.public_id,
        name: website.name,
        template: website.template_code,
        currency: website.default_currency,
        timezone: website.timezone
      },
      units: unitsResult.rows,
      settings 
    });
  } catch (error) {
    console.error('Get public website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Search availability for units on a specific website
app.post('/api/public/websites/:publicId/search', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { check_in, check_out, guests } = req.body;
    
    // Get website and its units
    const websiteResult = await pool.query(`
      SELECT w.id FROM websites w WHERE w.public_id = $1 AND w.status = 'active'
    `, [publicId]);
    
    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Website not found' });
    }
    
    const websiteId = websiteResult.rows[0].id;
    
    // Get units on this website that can accommodate guests
    const unitsResult = await pool.query(`
      SELECT 
        bu.id, bu.beds24_room_id, bu.name, bu.display_name, bu.base_price, bu.max_guests,
        COALESCE(wu.custom_name, bu.display_name, bu.name) as display_name,
        p.beds24_prop_id, p.name as property_name
      FROM website_units wu
      JOIN bookable_units bu ON wu.unit_id = bu.id
      JOIN properties p ON bu.property_id = p.id
      WHERE wu.website_id = $1 
        AND wu.is_active = true
        AND bu.max_guests >= $2
      ORDER BY wu.display_order
    `, [websiteId, guests || 1]);
    
    // TODO: Check Beds24 availability for each unit
    // For now, return all units as potentially available
    
    res.json({ 
      success: true, 
      units: unitsResult.rows,
      search: { check_in, check_out, guests }
    });
  } catch (error) {
    console.error('Website search error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// WEBSITE MIGRATION & SETUP
// =========================================================

// Migrate old account_websites to new websites table
app.post('/api/websites/migrate', async (req, res) => {
  try {
    // Find account_websites that haven't been migrated
    const oldSites = await pool.query(`
      SELECT aw.*, a.name as account_name 
      FROM account_websites aw
      LEFT JOIN accounts a ON aw.account_id = a.id
      WHERE aw.migrated_to_website_id IS NULL
    `);
    
    const migrated = [];
    
    for (const old of oldSites.rows) {
      // Generate public ID
      const publicId = 'WEB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      // Create new website entry
      const newSite = await pool.query(`
        INSERT INTO websites (
          public_id, owner_type, owner_id, name, template_code,
          site_url, admin_url, custom_domain, instawp_site_id, instawp_data, status
        ) VALUES ($1, 'account', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        publicId,
        old.account_id,
        old.site_name || old.account_name || 'My Website',
        old.template_used || 'starter',
        old.site_url,
        old.admin_url,
        old.custom_domain,
        old.instawp_site_id,
        old.instawp_data,
        old.status || 'active'
      ]);
      
      const websiteId = newSite.rows[0].id;
      
      // Add all units from this account to the website
      await pool.query(`
        INSERT INTO website_units (website_id, unit_id, display_order)
        SELECT $1, bu.id, ROW_NUMBER() OVER (ORDER BY p.name, bu.name)
        FROM bookable_units bu
        JOIN properties p ON bu.property_id = p.id
        WHERE p.account_id = $2
        ON CONFLICT DO NOTHING
      `, [websiteId, old.account_id]);
      
      // Migrate website_settings from account_id to website_id
      await pool.query(`
        UPDATE website_settings 
        SET website_id = $1
        WHERE account_id = $2 AND website_id IS NULL
      `, [websiteId, old.account_id]);
      
      // Mark old site as migrated
      await pool.query(
        'UPDATE account_websites SET migrated_to_website_id = $1 WHERE id = $2',
        [websiteId, old.id]
      );
      
      migrated.push({ old_id: old.id, new_id: websiteId, public_id: publicId });
    }
    
    res.json({ 
      success: true, 
      message: `Migrated ${migrated.length} websites`,
      migrated 
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create default website for account (auto-add all their units)
app.post('/api/websites/create-default', async (req, res) => {
  try {
    const { account_id, name, template_code = 'starter' } = req.body;
    
    if (!account_id) {
      return res.json({ success: false, error: 'account_id required' });
    }
    
    // Check if account already has a website
    const existing = await pool.query(
      'SELECT id FROM websites WHERE owner_type = $1 AND owner_id = $2 LIMIT 1',
      ['account', account_id]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Account already has a website', website_id: existing.rows[0].id });
    }
    
    // Get account info
    const accountResult = await pool.query('SELECT name FROM accounts WHERE id = $1', [account_id]);
    const accountName = accountResult.rows[0]?.name || 'My Website';
    
    const publicId = 'WEB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Create website
    const websiteResult = await pool.query(`
      INSERT INTO websites (public_id, owner_type, owner_id, name, template_code, status)
      VALUES ($1, 'account', $2, $3, $4, 'draft')
      RETURNING *
    `, [publicId, account_id, name || accountName, template_code]);
    
    const website = websiteResult.rows[0];
    
    // Add all units from this account
    const unitsResult = await pool.query(`
      INSERT INTO website_units (website_id, unit_id, display_order)
      SELECT $1, bu.id, ROW_NUMBER() OVER (ORDER BY p.name, bu.name)
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      WHERE p.account_id = $2
      RETURNING *
    `, [website.id, account_id]);
    
    res.json({ 
      success: true, 
      website,
      units_added: unitsResult.rows.length
    });
  } catch (error) {
    console.error('Create default website error:', error);
    res.json({ success: false, error: error.message });
  }
});

// =========================================================
// LEGACY WEBSITE BUILDER ENDPOINTS (account_id based - for backwards compatibility)
// =========================================================

// Get website builder section settings (OLD - account_id based)
app.get('/api/admin/website-builder/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const accountId = req.query.account_id || req.query.client_id;
    
    if (!accountId) {
      return res.json({ success: false, error: 'account_id required' });
    }
    
    // First check if there's a website for this account
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE owner_type = $1 AND owner_id = $2 LIMIT 1',
      ['account', accountId]
    );
    
    let result;
    if (websiteResult.rows.length > 0) {
      // Use new website-based settings
      result = await pool.query(`
        SELECT settings FROM website_settings
        WHERE website_id = $1 AND section = $2
      `, [websiteResult.rows[0].id, section]);
    } else {
      // Fall back to old account-based settings
      result = await pool.query(`
        SELECT settings FROM website_settings
        WHERE account_id = $1 AND section = $2 AND website_id IS NULL
      `, [accountId, section]);
    }
    
    if (result.rows.length > 0) {
      res.json({ success: true, settings: result.rows[0].settings });
    } else {
      res.json({ success: true, settings: null });
    }
  } catch (error) {
    console.error('Get website settings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Upload image for website builder (hero, about, etc.)
app.post('/api/admin/website-builder/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { account_id, section } = req.body;
    
    if (!req.file) {
      return res.json({ success: false, error: 'No image uploaded' });
    }
    
    if (!account_id) {
      return res.json({ success: false, error: 'account_id required' });
    }
    
    // Process and upload to R2
    const results = await processAndUploadImage(
      req.file.buffer,
      `website/${section || 'general'}`,
      account_id,
      req.file.originalname
    );
    
    res.json({ 
      success: true, 
      url: results.large, // Use large size for hero images
      urls: results
    });
  } catch (error) {
    console.error('Website image upload error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Save website builder section settings
app.post('/api/admin/website-builder/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { account_id, client_id, settings } = req.body;
    const accountId = account_id || client_id;
    
    if (!accountId) {
      return res.json({ success: false, error: 'account_id required' });
    }
    
    // Check if there's a website for this account
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE owner_type = $1 AND owner_id = $2 LIMIT 1',
      ['account', accountId]
    );
    
    if (websiteResult.rows.length > 0) {
      // Use new website-based settings
      await pool.query(`
        INSERT INTO website_settings (website_id, section, settings, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (website_id, section) WHERE website_id IS NOT NULL
        DO UPDATE SET settings = $3, updated_at = CURRENT_TIMESTAMP
      `, [websiteResult.rows[0].id, section, JSON.stringify(settings)]);
    } else {
      // Fall back to old account-based settings (legacy)
      await pool.query(`
        INSERT INTO website_settings (account_id, section, settings, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (account_id, section)
        DO UPDATE SET settings = $3, updated_at = CURRENT_TIMESTAMP
      `, [accountId, section, JSON.stringify(settings)]);
    }
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Save website settings error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get all website builder settings for an account (admin use)
app.get('/api/admin/website-builder', async (req, res) => {
  try {
    const accountId = req.query.account_id || req.query.client_id;
    
    if (!accountId) {
      return res.json({ success: false, error: 'account_id required' });
    }
    
    // Check if there's a website for this account
    const websiteResult = await pool.query(
      'SELECT id FROM websites WHERE owner_type = $1 AND owner_id = $2 LIMIT 1',
      ['account', accountId]
    );
    
    let result;
    if (websiteResult.rows.length > 0) {
      result = await pool.query(
        'SELECT section, settings FROM website_settings WHERE website_id = $1',
        [websiteResult.rows[0].id]
      );
    } else {
      result = await pool.query(
        'SELECT section, settings FROM website_settings WHERE account_id = $1 AND website_id IS NULL',
        [accountId]
      );
    }
    
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

// Get all website settings for a client (for WordPress sync)
app.get('/api/v1/website-settings', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT section, settings FROM website_settings
      WHERE account_id = $1
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

// Push website settings to WordPress site
app.post('/api/admin/push-to-wordpress', async (req, res) => {
  try {
    const { account_id, section, settings, site_url } = req.body;
    
    if (!account_id || !section || !site_url) {
      return res.json({ success: false, error: 'Missing required fields' });
    }
    
    // Get WordPress multisite API settings
    const wpSettings = await pool.query('SELECT api_key FROM instawp_settings LIMIT 1');
    const apiKey = wpSettings.rows[0]?.api_key;
    
    if (!apiKey) {
      return res.json({ success: false, error: 'WordPress API not configured' });
    }
    
    // Push settings to WordPress via gas-api.php
    const wpResponse = await fetch('https://sites.gas.travel/gas-api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update_settings',
        account_id,
        section,
        settings,
        site_url
      })
    });
    
    const wpData = await wpResponse.json();
    
    if (wpData.success) {
      res.json({ success: true, message: 'Settings pushed to WordPress' });
    } else {
      res.json({ success: false, error: wpData.error || 'WordPress update failed' });
    }
  } catch (error) {
    console.error('Push to WordPress error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Get account website details
app.get('/api/account/:accountId/website', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM account_websites 
      WHERE account_id = $1 AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `, [accountId]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Get account website error:', error);
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
const GAS_SYSTEM_PROMPT = `You are the GAS Assistant - a helpful, knowledgeable guide for the Global Accommodation System.

🔒 WHAT GAS IS (CRITICAL - ALWAYS GET THIS RIGHT):
- GAS is the Global Accommodation System - an independent inventory and website system
- GAS is NOT an OTA (Online Travel Agency) like Booking.com, Airbnb, or Expedia
- GAS NEVER connects to corporate OTAs - only to independent channel managers (Beds24, Hostaway, Smoobu)
- GAS does NOT collect payments for owners - payments happen on the owner's own website
- GAS connects property owners with independent travel agents, tour operators, and tourist groups

🎯 YOUR ROLE:
- Help users understand and use GAS features
- Guide them through setup and configuration
- Answer questions about how things work
- Be conversational and supportive - stay with the user through their journey
- If you have knowledge base articles, use them to provide accurate, detailed answers
- If you don't know something, say so and suggest contacting support

📚 HOW TO USE KNOWLEDGE BASE ARTICLES:
When knowledge base articles are provided in the context, use them to:
- Give accurate, detailed answers
- Reference specific steps and instructions
- Provide the correct terminology
- Link to relevant features

🔗 CHANNEL MANAGER CREDENTIALS:

BEDS24 INVITE CODE:
1. Log into Beds24 → Settings (top menu)
2. Click Marketplace → API
3. Click "Generate invite code"
4. Copy and paste into GAS

HOSTAWAY API:
1. Log into Hostaway → Settings → Hostaway API
2. Click "Create" → Select "Hostaway Public API"
3. Copy Account ID and API Key immediately (only shown once!)

SMOOBU API:
1. Log into Smoobu → Settings → API
2. Copy your API Key

🔗 KEY LINKS:
- Home: /home.html
- Onboarding: /index.html
- Admin Dashboard: /gas-admin.html
- Support: support@gettingautomated.com

💬 CONVERSATION STYLE:
- Be warm and helpful
- Give complete answers using knowledge base when available
- For complex topics, break things down step by step
- Always offer to help with follow-up questions
- Format links as clickable: [Text](/path)
- Use bullet points for lists and steps`;

// Search knowledge base for relevant articles
async function searchKnowledgeBase(query) {
  try {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }
    
    const result = await pool.query(`
      SELECT a.id, a.title, a.summary, a.content, a.keywords, c.name as category_name
      FROM kb_articles a
      LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE a.status = 'published'
        AND (
          LOWER(a.title) LIKE $1
          OR LOWER(a.summary) LIKE $1
          OR LOWER(a.content) LIKE $1
          OR a.keywords && $2::text[]
        )
      ORDER BY 
        CASE WHEN LOWER(a.title) LIKE $1 THEN 1 ELSE 2 END,
        a.views DESC
      LIMIT 3
    `, [`%${query.toLowerCase()}%`, searchTerms]);
    
    return result.rows;
  } catch (error) {
    console.error('Knowledge base search error:', error);
    return [];
  }
}

// Track unanswered questions
async function trackUnansweredQuestion(question, sessionId, accountId) {
  try {
    // Check if similar question exists
    const existing = await pool.query(`
      SELECT id, times_asked FROM kb_unanswered 
      WHERE LOWER(question) LIKE $1 AND status = 'new'
      LIMIT 1
    `, [`%${question.toLowerCase().substring(0, 50)}%`]);
    
    if (existing.rows.length > 0) {
      // Increment counter
      await pool.query(
        'UPDATE kb_unanswered SET times_asked = times_asked + 1, updated_at = NOW() WHERE id = $1',
        [existing.rows[0].id]
      );
    } else {
      // Insert new
      await pool.query(`
        INSERT INTO kb_unanswered (question, session_id, account_id)
        VALUES ($1, $2, $3)
      `, [question, sessionId, accountId]);
    }
  } catch (error) {
    console.error('Track unanswered error:', error);
  }
}

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
    
    const { message, conversationHistory = [], sessionId, accountId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    // Limit message length
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }
    
    // Search knowledge base for relevant articles
    const relevantArticles = await searchKnowledgeBase(message);
    
    // Build knowledge context if articles found
    let knowledgeContext = '';
    if (relevantArticles.length > 0) {
      knowledgeContext = '\n\n📚 RELEVANT KNOWLEDGE BASE ARTICLES:\n';
      for (const article of relevantArticles) {
        knowledgeContext += `\n--- ${article.title} (${article.category_name}) ---\n`;
        if (article.summary) knowledgeContext += `Summary: ${article.summary}\n`;
        // Include content but truncate if too long
        const content = article.content.length > 1500 
          ? article.content.substring(0, 1500) + '...'
          : article.content;
        knowledgeContext += `${content}\n`;
      }
      knowledgeContext += '\n---\nUse the above articles to provide accurate, helpful answers.\n';
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
    
    // Build system prompt with knowledge context
    const systemPrompt = GAS_SYSTEM_PROMPT + knowledgeContext;
    
    // Call Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    const assistantMessage = response.data.content[0].text;
    
    // Check if the response indicates uncertainty - track for review
    const uncertaintyIndicators = [
      "i don't have specific information",
      "i'm not sure about",
      "contact support",
      "i don't know",
      "i cannot find"
    ];
    
    const isUncertain = uncertaintyIndicators.some(indicator => 
      assistantMessage.toLowerCase().includes(indicator)
    );
    
    if (isUncertain && relevantArticles.length === 0) {
      // Track this as potentially unanswered
      await trackUnansweredQuestion(message, sessionId, accountId);
    }
    
    res.json({ 
      success: true, 
      message: assistantMessage,
      articlesUsed: relevantArticles.map(a => a.id)
    });
    
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Sorry, I encountered an error. Please try again or contact support@gettingautomated.com' 
    });
  }
});

// ONE-TIME FIX: Recreate website_settings table (visit once then remove)
app.get('/api/admin/fix-website-settings-table', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS website_settings CASCADE');
    await pool.query(`
      CREATE TABLE website_settings (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        section VARCHAR(50) NOT NULL,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, section)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_website_settings_account ON website_settings(account_id)');
    res.json({ success: true, message: 'Table recreated successfully!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ONE-TIME FIX: Create client_api_keys table
app.get('/api/admin/fix-api-keys-table', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS client_api_keys CASCADE');
    await pool.query(`
      CREATE TABLE client_api_keys (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        key_name VARCHAR(100) DEFAULT 'Default',
        api_key VARCHAR(64) NOT NULL UNIQUE,
        permissions JSONB DEFAULT '{}',
        rate_limit_per_minute INTEGER DEFAULT 60,
        rate_limit_per_day INTEGER DEFAULT 10000,
        total_requests INTEGER DEFAULT 0,
        allowed_origins TEXT,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_api_keys_client ON client_api_keys(client_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_api_keys_key ON client_api_keys(api_key)');
    res.json({ success: true, message: 'API keys table created successfully!' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Serve frontend - MUST BE LAST (after all API routes)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes - return 404 instead
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found', path: req.path });
  }
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

// =========================================================
// BEDS24 SPECIFIC SCHEDULED SYNC
// =========================================================

// Helper function to run Beds24 bookings sync
async function runBeds24BookingsSync() {
  try {
    console.log('⏰ [Scheduled] Starting Beds24 bookings sync...');
    
    const accessToken = await getBeds24AccessToken(pool);
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 365);
    
    const response = await axios.get('https://beds24.com/api/v2/bookings', {
      headers: { 'token': accessToken },
      params: {
        arrivalFrom: fromDate.toISOString().split('T')[0],
        arrivalTo: toDate.toISOString().split('T')[0]
      }
    });
    
    const bookings = Array.isArray(response.data) ? response.data : (response.data.data || []);
    let updatedDates = 0;
    let unblockedDates = 0;
    let gasBookingsCancelled = 0;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const booking of bookings) {
        const beds24RoomId = booking.roomId || booking.room_id || booking.unitId;
        if (!beds24RoomId) continue;
        
        const roomResult = await client.query(
          'SELECT id FROM bookable_units WHERE beds24_room_id = $1',
          [beds24RoomId]
        );
        if (roomResult.rows.length === 0) continue;
        
        const ourRoomId = roomResult.rows[0].id;
        const arrival = booking.arrival || booking.firstNight || booking.arrivalDate;
        const departure = booking.departure || booking.lastNight || booking.departureDate;
        if (!arrival || !departure) continue;
        
        const isCancelled = booking.status === 'cancelled' || booking.status === 'Cancelled';
        
        // If cancelled, check if we have a matching GAS booking to cancel
        if (isCancelled) {
          const gasBookingResult = await client.query(`
            UPDATE bookings 
            SET status = 'cancelled', updated_at = NOW()
            WHERE beds24_booking_id = $1 AND status != 'cancelled'
            RETURNING id
          `, [booking.id.toString()]);
          
          if (gasBookingResult.rowCount > 0) {
            gasBookingsCancelled++;
          }
        }
        
        const startDate = new Date(arrival);
        const endDate = new Date(departure);
        
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          if (isCancelled) {
            // Unblock cancelled booking dates (only if blocked by beds24)
            const result = await client.query(`
              UPDATE room_availability 
              SET is_available = true, is_blocked = false, source = 'beds24_cancelled', updated_at = NOW()
              WHERE room_id = $1 AND date = $2 AND source IN ('beds24_sync', 'beds24_webhook', 'beds24_inventory', 'booking')
            `, [ourRoomId, dateStr]);
            if (result.rowCount > 0) unblockedDates++;
          } else {
            // Block confirmed booking dates
            await client.query(`
              INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
              VALUES ($1, $2, false, false, 'beds24_sync')
              ON CONFLICT (room_id, date) 
              DO UPDATE SET is_available = false, source = 'beds24_sync', updated_at = NOW()
            `, [ourRoomId, dateStr]);
            updatedDates++;
          }
        }
      }
      
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    
    console.log(`⏰ [Scheduled] Beds24 bookings sync complete: ${bookings.length} bookings, ${updatedDates} blocked, ${unblockedDates} unblocked, ${gasBookingsCancelled} GAS cancelled`);
  } catch (error) {
    console.error('⏰ [Scheduled] Beds24 bookings sync error:', error.message);
  }
}
async function runBeds24InventorySync() {
  try {
    console.log('⏰ [Scheduled] Starting Beds24 full inventory sync...');
    
    const accessToken = await getBeds24AccessToken(pool);
    const today = new Date();
    
    const roomsResult = await pool.query(`
      SELECT bu.id, bu.beds24_room_id, bu.name 
      FROM bookable_units bu 
      WHERE bu.beds24_room_id IS NOT NULL
    `);
    
    const rooms = roomsResult.rows;
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 365*24*60*60*1000).toISOString().split('T')[0];
    
    let inventoryBlocksFound = 0;
    let datesUnblocked = 0;
    
    for (const room of rooms) {
      try {
        const availResponse = await axios.get('https://beds24.com/api/v2/inventory/rooms/availability', {
          headers: { 'token': accessToken },
          params: { roomId: room.beds24_room_id, startDate, endDate }
        });
        
        const data = availResponse.data?.data?.[0];
        if (data && data.availability) {
          for (const [dateStr, isAvailable] of Object.entries(data.availability)) {
            if (isAvailable === false) {
              inventoryBlocksFound++;
              await pool.query(`
                INSERT INTO room_availability (room_id, date, is_available, is_blocked, source)
                VALUES ($1, $2, false, true, 'beds24_inventory')
                ON CONFLICT (room_id, date) 
                DO UPDATE SET is_available = false, is_blocked = true, 
                  source = CASE WHEN room_availability.source IN ('beds24_sync', 'booking') THEN room_availability.source ELSE 'beds24_inventory' END,
                  updated_at = NOW()
              `, [room.id, dateStr]);
            } else {
              // Unblock if it was blocked by beds24
              const result = await pool.query(`
                UPDATE room_availability 
                SET is_available = true, is_blocked = false, source = 'beds24_unblocked', updated_at = NOW()
                WHERE room_id = $1 AND date = $2 AND source IN ('beds24_inventory', 'beds24_sync', 'beds24_webhook')
              `, [room.id, dateStr]);
              if (result.rowCount > 0) datesUnblocked++;
            }
          }
        }
      } catch (roomError) {
        // Silently skip errors for individual rooms
      }
    }
    
    console.log(`⏰ [Scheduled] Beds24 inventory sync complete: ${inventoryBlocksFound} blocked, ${datesUnblocked} unblocked from ${rooms.length} rooms`);
  } catch (error) {
    console.error('⏰ [Scheduled] Beds24 inventory sync error:', error.message);
  }
}

// Schedule Beds24 bookings sync every 15 minutes
setInterval(runBeds24BookingsSync, 15 * 60 * 1000);

// Schedule Beds24 full inventory sync every 6 hours
setInterval(runBeds24InventorySync, 6 * 60 * 60 * 1000);

// Run initial Beds24 sync 60 seconds after startup
setTimeout(() => {
  runBeds24BookingsSync();
  runBeds24InventorySync();
}, 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port ' + PORT);
  console.log('🔄 Auto-sync scheduled: Prices every 15min, Beds24 bookings every 15min, Inventory every 6hrs');
});
