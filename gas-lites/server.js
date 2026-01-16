/**
 * GAS Lites - Lightweight property micro-sites
 * Standalone Express server for lite.gas.travel
 * 
 * Each property gets a free "playing card" page with:
 * - Property info, images, pricing
 * - QR code for printing
 * - Booking widget
 * - Optional offer overlays (Turbines integration)
 */

const express = require('express');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection - uses same DB as main GAS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Ensure lites table exists
async function ensureLitesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_lites (
      id SERIAL PRIMARY KEY,
      property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id),
      slug VARCHAR(100) UNIQUE NOT NULL,
      custom_title VARCHAR(255),
      custom_tagline VARCHAR(500),
      theme VARCHAR(50) DEFAULT 'default',
      accent_color VARCHAR(7) DEFAULT '#3b82f6',
      show_pricing BOOLEAN DEFAULT true,
      show_availability BOOLEAN DEFAULT true,
      show_reviews BOOLEAN DEFAULT true,
      show_qr BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ gas_lites table ready');
}

// ============================================
// PUBLIC ROUTES - lite.gas.travel/:slug
// ============================================

// Main lite page
app.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const offer = req.query.offer; // Optional offer code from Turbines
    
    // Get lite config and property data
    const liteResult = await pool.query(`
      SELECT l.*, 
             p.name, p.description, p.short_description, p.full_description,
             p.address, p.city, p.state, p.country, p.postal_code,
             p.latitude, p.longitude,
             p.currency, p.check_in_time, p.check_out_time,
             p.contact_email, p.contact_phone, p.website_url,
             p.average_rating, p.total_reviews,
             p.pets_allowed, p.smoking_allowed, p.children_allowed, p.events_allowed,
             a.business_name as account_name
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN accounts a ON l.account_id = a.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send(renderNotFound(slug));
    }
    
    const lite = liteResult.rows[0];
    
    // Increment view counter
    await pool.query('UPDATE gas_lites SET views = views + 1 WHERE id = $1', [lite.id]);
    
    // Get rooms/units
    const roomsResult = await pool.query(`
      SELECT bu.*, 
             (SELECT image_url FROM room_images ri WHERE ri.room_id = bu.id AND ri.is_primary = true LIMIT 1) as primary_image
      FROM bookable_units bu
      WHERE bu.property_id = $1 AND (bu.is_hidden = false OR bu.is_hidden IS NULL)
      ORDER BY bu.created_at
    `, [lite.property_id]);
    
    // Get property images
    const imagesResult = await pool.query(`
      SELECT image_url as url, caption, is_primary FROM property_images
      WHERE property_id = $1
      ORDER BY is_primary DESC, display_order ASC
      LIMIT 10
    `, [lite.property_id]);
    
    // Get today's pricing for each room
    const today = new Date().toISOString().split('T')[0];
    const pricingResult = await pool.query(`
      SELECT room_id, cm_price, direct_price, standard_price
      FROM room_availability
      WHERE room_id = ANY($1) AND date = $2
    `, [roomsResult.rows.map(r => r.id), today]);
    
    const pricingMap = {};
    pricingResult.rows.forEach(p => {
      pricingMap[p.room_id] = p.direct_price || p.standard_price || p.cm_price;
    });
    
    // Check for active offer
    let activeOffer = null;
    if (offer) {
      const offerResult = await pool.query(`
        SELECT * FROM offers
        WHERE promo_code = $1 AND active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_until IS NULL OR valid_until >= NOW())
      `, [offer.toUpperCase()]);
      if (offerResult.rows.length > 0) {
        activeOffer = offerResult.rows[0];
      }
    }
    
    // Generate QR code
    const liteUrl = `https://lite.gas.travel/${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 200, margin: 1 });
    
    // Render the lite page
    res.send(renderLitePage({
      lite,
      rooms: roomsResult.rows,
      images: imagesResult.rows,
      pricing: pricingMap,
      offer: activeOffer,
      qrCode,
      liteUrl
    }));
    
  } catch (error) {
    console.error('Lite page error:', error);
    res.status(500).send(renderError());
  }
});

// QR code image endpoint
app.get('/:slug/qr', async (req, res) => {
  try {
    const { slug } = req.params;
    const size = parseInt(req.query.size) || 300;
    
    const liteUrl = `https://lite.gas.travel/${slug}`;
    const qrBuffer = await QRCode.toBuffer(liteUrl, { width: size, margin: 2 });
    
    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).send('QR generation failed');
  }
});

// Printable version
app.get('/:slug/print', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get lite data (same as main page)
    const liteResult = await pool.query(`
      SELECT l.*, p.name, p.city, p.country, p.currency,
             p.contact_phone, p.contact_email
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send('Not found');
    }
    
    const lite = liteResult.rows[0];
    const liteUrl = `https://lite.gas.travel/${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 400, margin: 2 });
    
    // Get primary image
    const imageResult = await pool.query(`
      SELECT image_url as url FROM property_images
      WHERE property_id = $1
      ORDER BY is_primary DESC, display_order ASC
      LIMIT 1
    `, [lite.property_id]);
    
    res.send(renderPrintCard({
      lite,
      qrCode,
      liteUrl,
      image: imageResult.rows[0]?.url
    }));
    
  } catch (error) {
    console.error('Print page error:', error);
    res.status(500).send('Error generating print view');
  }
});

// ============================================
// API ROUTES - For GAS Admin to manage lites
// ============================================

// Check if slug is available
app.get('/api/check-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [slug.toLowerCase()]);
    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Get lite by property ID
app.get('/api/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const result = await pool.query('SELECT * FROM gas_lites WHERE property_id = $1', [propertyId]);
    res.json({ success: true, lite: result.rows[0] || null });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all lites for an account
app.get('/api/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const result = await pool.query(`
      SELECT l.*, p.name as property_name, p.city
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      WHERE l.account_id = $1
      ORDER BY l.created_at DESC
    `, [accountId]);
    res.json({ success: true, lites: result.rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Create a new lite
app.post('/api/lites', async (req, res) => {
  try {
    const {
      property_id, account_id, slug,
      custom_title, custom_tagline,
      theme, accent_color,
      show_pricing, show_availability, show_reviews, show_qr
    } = req.body;
    
    // Validate slug
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Check if slug exists
    const existing = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [cleanSlug]);
    if (existing.rows.length > 0) {
      return res.json({ success: false, error: 'Slug already taken' });
    }
    
    // Check if property already has a lite
    const existingProp = await pool.query('SELECT id, slug FROM gas_lites WHERE property_id = $1', [property_id]);
    if (existingProp.rows.length > 0) {
      return res.json({ success: false, error: `Property already has a lite: ${existingProp.rows[0].slug}` });
    }
    
    const result = await pool.query(`
      INSERT INTO gas_lites (
        property_id, account_id, slug,
        custom_title, custom_tagline,
        theme, accent_color,
        show_pricing, show_availability, show_reviews, show_qr
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      property_id, account_id, cleanSlug,
      custom_title || null, custom_tagline || null,
      theme || 'default', accent_color || '#3b82f6',
      show_pricing !== false, show_availability !== false, show_reviews !== false, show_qr !== false
    ]);
    
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Update a lite
app.put('/api/lites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug, custom_title, custom_tagline,
      theme, accent_color,
      show_pricing, show_availability, show_reviews, show_qr,
      active
    } = req.body;
    
    let cleanSlug = null;
    if (slug) {
      cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      // Check if new slug is taken by another lite
      const existing = await pool.query('SELECT id FROM gas_lites WHERE slug = $1 AND id != $2', [cleanSlug, id]);
      if (existing.rows.length > 0) {
        return res.json({ success: false, error: 'Slug already taken' });
      }
    }
    
    const result = await pool.query(`
      UPDATE gas_lites SET
        slug = COALESCE($1, slug),
        custom_title = $2,
        custom_tagline = $3,
        theme = COALESCE($4, theme),
        accent_color = COALESCE($5, accent_color),
        show_pricing = COALESCE($6, show_pricing),
        show_availability = COALESCE($7, show_availability),
        show_reviews = COALESCE($8, show_reviews),
        show_qr = COALESCE($9, show_qr),
        active = COALESCE($10, active),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      cleanSlug, custom_title, custom_tagline,
      theme, accent_color,
      show_pricing, show_availability, show_reviews, show_qr,
      active, id
    ]);
    
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete a lite
app.delete('/api/lites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM gas_lites WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get lite stats
app.get('/api/lites/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT views, created_at FROM gas_lites WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Lite not found' });
    }
    res.json({ success: true, stats: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================================
// HTML RENDERING FUNCTIONS
// ============================================

function renderLitePage({ lite, rooms, images, pricing, offer, qrCode, liteUrl }) {
  const primaryImage = images.find(i => i.is_primary) || images[0];
  const currencySymbol = getCurrencySymbol(lite.currency);
  const lowestPrice = Math.min(...Object.values(pricing).filter(p => p > 0)) || null;
  
  const title = lite.custom_title || lite.name;
  const tagline = lite.custom_tagline || lite.short_description || '';
  const description = lite.full_description || lite.description || '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | GAS Lite</title>
  <meta name="description" content="${tagline.substring(0, 160)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${tagline}">
  <meta property="og:image" content="${primaryImage?.url || ''}">
  <meta property="og:url" content="${liteUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      min-height: 100vh;
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .card {
      background: white;
      border-radius: 24px;
      overflow: hidden;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .hero {
      position: relative;
      height: 280px;
      overflow: hidden;
    }
    .hero img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hero-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      padding: 2rem 1.5rem 1rem;
      color: white;
    }
    .location {
      font-size: 0.85rem;
      opacity: 0.9;
      margin-bottom: 0.25rem;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 700;
    }
    ${offer ? `
    .offer-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #ef4444;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    ` : ''}
    .content {
      padding: 1.5rem;
    }
    .tagline {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f1f5f9;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #475569;
    }
    .rooms {
      margin-bottom: 1.5rem;
    }
    .room {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .room:last-child {
      border-bottom: none;
    }
    .room-name {
      font-weight: 500;
      color: #1e293b;
    }
    .room-price {
      font-weight: 600;
      color: ${lite.accent_color};
    }
    ${offer ? `
    .room-price-original {
      text-decoration: line-through;
      color: #94a3b8;
      font-size: 0.85rem;
      margin-right: 0.5rem;
    }
    ` : ''}
    .rating {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .stars {
      color: #fbbf24;
    }
    .rating-text {
      color: #64748b;
      font-size: 0.9rem;
    }
    .cta {
      display: block;
      width: 100%;
      background: ${lite.accent_color};
      color: white;
      text-align: center;
      padding: 1rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
    }
    .qr-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .qr-section img {
      width: 80px;
      height: 80px;
    }
    .qr-text {
      font-size: 0.8rem;
      color: #64748b;
    }
    .footer {
      text-align: center;
      padding: 0.75rem;
      background: #f1f5f9;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .footer a {
      color: #64748b;
      text-decoration: none;
    }
    .contact {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .contact a {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #475569;
      text-decoration: none;
      font-size: 0.85rem;
    }
    .gallery {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }
    .gallery img {
      width: 100px;
      height: 70px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <img src="${primaryImage?.url || '/placeholder.jpg'}" alt="${title}">
      ${offer ? `<div class="offer-badge">🔥 ${offer.discount_value}% OFF</div>` : ''}
      <div class="hero-overlay">
        <div class="location">📍 ${lite.city}${lite.country ? ', ' + lite.country : ''}</div>
        <h1 class="title">${title}</h1>
      </div>
    </div>
    
    <div class="content">
      ${tagline ? `<p class="tagline">${tagline}</p>` : ''}
      
      ${images.length > 1 ? `
      <div class="gallery">
        ${images.slice(1, 6).map(img => `<img src="${img.url}" alt="">`).join('')}
      </div>
      ` : ''}
      
      <div class="features">
        ${rooms.length > 0 ? `<div class="feature">🛏️ ${rooms.reduce((sum, r) => sum + (r.bedroom_count || 1), 0)} Beds</div>` : ''}
        ${rooms.length > 0 ? `<div class="feature">👥 Up to ${Math.max(...rooms.map(r => r.max_guests || 2))} guests</div>` : ''}
        ${lite.pets_allowed ? '<div class="feature">🐕 Pets OK</div>' : ''}
        ${lite.children_allowed ? '<div class="feature">👶 Family friendly</div>' : ''}
      </div>
      
      ${lite.show_reviews && lite.average_rating ? `
      <div class="rating">
        <span class="stars">★★★★★</span>
        <span class="rating-text">${lite.average_rating} (${lite.total_reviews} reviews)</span>
      </div>
      ` : ''}
      
      ${lite.show_pricing && rooms.length > 0 ? `
      <div class="rooms">
        ${rooms.map(room => {
          const price = pricing[room.id];
          const discountedPrice = offer ? Math.round(price * (1 - offer.discount_value / 100)) : null;
          return `
          <div class="room">
            <span class="room-name">${room.name || room.display_name || 'Room'}</span>
            <span>
              ${offer && price ? `<span class="room-price-original">${currencySymbol}${Math.round(price)}</span>` : ''}
              <span class="room-price">${price ? currencySymbol + Math.round(discountedPrice || price) : 'Check availability'}</span>
            </span>
          </div>
          `;
        }).join('')}
      </div>
      ` : ''}
      
      <div class="contact">
        ${lite.contact_phone ? `<a href="tel:${lite.contact_phone}">📞 ${lite.contact_phone}</a>` : ''}
        ${lite.contact_email ? `<a href="mailto:${lite.contact_email}">✉️ Email</a>` : ''}
      </div>
      
      <a href="${lite.website_url || '#'}" class="cta">
        ${offer ? `Book Now - Save ${offer.discount_value}%` : 'Check Availability'}
      </a>
    </div>
    
    ${lite.show_qr ? `
    <div class="qr-section">
      <img src="${qrCode}" alt="QR Code">
      <div class="qr-text">
        Scan to view on your phone<br>
        <strong>${liteUrl.replace('https://', '')}</strong>
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      Powered by <a href="https://gas.travel">GAS.travel</a>
    </div>
  </div>
</body>
</html>`;
}

function renderPrintCard({ lite, qrCode, liteUrl, image }) {
  const title = lite.custom_title || lite.name;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print - ${title}</title>
  <style>
    @page { size: A6; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      width: 105mm;
      height: 148mm;
      padding: 8mm;
      display: flex;
      flex-direction: column;
    }
    .card {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .image {
      height: 45%;
      background: #f1f5f9;
    }
    .image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .content {
      padding: 4mm;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .title {
      font-size: 14pt;
      font-weight: 700;
      margin-bottom: 2mm;
    }
    .location {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 4mm;
    }
    .qr-area {
      display: flex;
      align-items: center;
      gap: 4mm;
      margin-top: auto;
      padding-top: 4mm;
      border-top: 1px solid #e2e8f0;
    }
    .qr-area img {
      width: 25mm;
      height: 25mm;
    }
    .qr-text {
      font-size: 8pt;
      color: #64748b;
    }
    .qr-url {
      font-size: 9pt;
      font-weight: 600;
      color: #1e293b;
    }
    .contact {
      font-size: 8pt;
      color: #475569;
      margin-bottom: 2mm;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="image">
      ${image ? `<img src="${image}" alt="${title}">` : ''}
    </div>
    <div class="content">
      <h1 class="title">${title}</h1>
      <p class="location">📍 ${lite.city}, ${lite.country}</p>
      
      <div class="contact">
        ${lite.contact_phone ? `📞 ${lite.contact_phone}` : ''}
        ${lite.contact_email ? `<br>✉️ ${lite.contact_email}` : ''}
      </div>
      
      <div class="qr-area">
        <img src="${qrCode}" alt="QR">
        <div>
          <div class="qr-text">Scan to book direct</div>
          <div class="qr-url">${liteUrl.replace('https://', '')}</div>
        </div>
      </div>
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
}

function renderNotFound(slug) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Not Found | GAS Lite</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f1f5f9;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { color: #1e293b; margin-bottom: 0.5rem; }
    p { color: #64748b; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Not Found</h1>
    <p>"${slug}" doesn't exist yet.</p>
    <p><a href="https://gas.travel">Create your free GAS Lite →</a></p>
  </div>
</body>
</html>`;
}

function renderError() {
  return `<!DOCTYPE html>
<html>
<head><title>Error | GAS Lite</title></head>
<body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="text-align: center;">
    <h1>⚠️ Something went wrong</h1>
    <p>Please try again later.</p>
  </div>
</body>
</html>`;
}

function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', PHP: '₱', THB: '฿',
    JPY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'CHF', INR: '₹'
  };
  return symbols[currency] || currency + ' ';
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.LITES_PORT || process.env.PORT || 3002;

async function start() {
  await ensureLitesTable();
  app.listen(PORT, () => {
    console.log(`🚀 GAS Lites server running on port ${PORT}`);
    console.log(`   Public: https://lite.gas.travel/:slug`);
    console.log(`   API: /api/lites/*`);
  });
}

start().catch(console.error);

module.exports = app;
