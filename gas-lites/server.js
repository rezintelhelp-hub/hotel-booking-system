/**
 * GAS Lites - Full Property Pages + Promotional Cards
 * 
 * Routes:
 * - /:slug - Full room page with tabs (like WordPress plugin)
 * - /:slug/card - Promotional card for social/print
 * - /:slug/qr - QR code image
 * - /:slug/print - Printable card
 */

const express = require('express');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
// MAIN ROOM PAGE - /:slug
// ============================================
app.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const liteResult = await pool.query(`
      SELECT l.*, p.*, a.business_name as account_name
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN accounts a ON l.account_id = a.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send(renderNotFound(slug));
    }
    
    const lite = liteResult.rows[0];
    const propertyId = lite.property_id;
    
    await pool.query('UPDATE gas_lites SET views = views + 1 WHERE id = $1', [lite.id]);
    
    // Get room
    const roomsResult = await pool.query(`
      SELECT * FROM bookable_units
      WHERE property_id = $1 AND (is_hidden = false OR is_hidden IS NULL)
      ORDER BY created_at LIMIT 1
    `, [propertyId]);
    const room = roomsResult.rows[0];
    const roomId = room?.id;
    
    // Get images (room first, then property)
    let images = [];
    if (roomId) {
      const roomImgRes = await pool.query(`
        SELECT image_url as url, caption, is_primary FROM room_images
        WHERE room_id = $1 AND is_active = true
        ORDER BY is_primary DESC, display_order ASC LIMIT 20
      `, [roomId]);
      images = roomImgRes.rows;
    }
    if (images.length === 0) {
      const propImgRes = await pool.query(`
        SELECT image_url as url, caption, is_primary FROM property_images
        WHERE property_id = $1 AND is_active = true
        ORDER BY is_primary DESC, display_order ASC LIMIT 20
      `, [propertyId]);
      images = propImgRes.rows;
    }
    
    // Get amenities
    let amenities = [];
    if (roomId) {
      const amenRes = await pool.query(`
        SELECT ma.amenity_name, ma.icon, ma.category
        FROM room_amenity_selections ras
        JOIN master_amenities ma ON ma.id = ras.amenity_id
        WHERE ras.room_id = $1
        ORDER BY ma.category, ma.amenity_name
      `, [roomId]);
      amenities = amenRes.rows;
    }
    
    // Get reviews
    const reviewsRes = await pool.query(`
      SELECT * FROM reviews
      WHERE property_id = $1 AND is_approved = true
      ORDER BY review_date DESC LIMIT 10
    `, [propertyId]);
    const reviews = reviewsRes.rows;
    
    // Get pricing
    const today = new Date().toISOString().split('T')[0];
    let pricing = null;
    if (roomId) {
      const priceRes = await pool.query(`
        SELECT cm_price, direct_price, standard_price, min_stay
        FROM room_availability WHERE room_id = $1 AND date = $2
      `, [roomId, today]);
      pricing = priceRes.rows[0];
    }
    
    const liteUrl = `https://lite.gas.travel/\${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 150, margin: 1 });
    
    res.send(renderFullPage({ lite, room, images, amenities, reviews, pricing, qrCode, liteUrl }));
  } catch (error) {
    console.error('Lite page error:', error);
    res.status(500).send(renderError(error.message));
  }
});

// ============================================
// PROMO CARD - /:slug/card
// ============================================
app.get('/:slug/card', async (req, res) => {
  try {
    const { slug } = req.params;
    const offer = req.query.offer;
    
    const liteResult = await pool.query(`
      SELECT l.*, p.name, p.city, p.country, p.currency, p.short_description,
             p.average_rating, p.pets_allowed, p.children_allowed
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send(renderNotFound(slug));
    }
    
    const lite = liteResult.rows[0];
    
    const imgRes = await pool.query(`
      SELECT image_url as url FROM property_images
      WHERE property_id = $1 AND is_active = true
      ORDER BY is_primary DESC LIMIT 1
    `, [lite.property_id]);
    
    const roomRes = await pool.query(`
      SELECT bedroom_count, max_guests FROM bookable_units
      WHERE property_id = $1 AND (is_hidden = false OR is_hidden IS NULL)
    `, [lite.property_id]);
    
    const today = new Date().toISOString().split('T')[0];
    const priceRes = await pool.query(`
      SELECT MIN(COALESCE(direct_price, cm_price)) as price
      FROM room_availability ra
      JOIN bookable_units bu ON ra.room_id = bu.id
      WHERE bu.property_id = $1 AND ra.date = $2
    `, [lite.property_id, today]);
    
    let activeOffer = null;
    if (offer) {
      const offerRes = await pool.query(`
        SELECT * FROM offers WHERE promo_code = $1 AND active = true
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
      `, [offer.toUpperCase()]);
      activeOffer = offerRes.rows[0];
    }
    
    const liteUrl = `https://lite.gas.travel/\${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 200, margin: 1 });
    
    res.send(renderPromoCard({
      lite, image: imgRes.rows[0]?.url, rooms: roomRes.rows,
      price: priceRes.rows[0]?.price, offer: activeOffer, qrCode, liteUrl
    }));
  } catch (error) {
    console.error('Card error:', error);
    res.status(500).send(renderError());
  }
});

// QR Code
app.get('/:slug/qr', async (req, res) => {
  try {
    const size = parseInt(req.query.size) || 300;
    const qrBuffer = await QRCode.toBuffer(`https://lite.gas.travel/\${req.params.slug}`, { width: size, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).send('QR generation failed');
  }
});

// Print Card
app.get('/:slug/print', async (req, res) => {
  try {
    const { slug } = req.params;
    const liteResult = await pool.query(`
      SELECT l.*, p.name, p.city, p.country, p.contact_phone, p.contact_email
      FROM gas_lites l JOIN properties p ON l.property_id = p.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) return res.status(404).send('Not found');
    
    const lite = liteResult.rows[0];
    const liteUrl = `https://lite.gas.travel/\${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 400, margin: 2 });
    
    const imgRes = await pool.query(`
      SELECT image_url as url FROM property_images
      WHERE property_id = $1 AND is_active = true ORDER BY is_primary DESC LIMIT 1
    `, [lite.property_id]);
    
    res.send(renderPrintCard({ lite, qrCode, liteUrl, image: imgRes.rows[0]?.url }));
  } catch (error) {
    res.status(500).send('Error');
  }
});

// ============================================
// API ENDPOINTS
// ============================================
app.get('/api/check-slug/:slug', async (req, res) => {
  const result = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [req.params.slug.toLowerCase()]);
  res.json({ available: result.rows.length === 0 });
});

app.get('/api/property/:propertyId', async (req, res) => {
  const result = await pool.query('SELECT * FROM gas_lites WHERE property_id = $1', [req.params.propertyId]);
  res.json({ success: true, lite: result.rows[0] || null });
});

app.get('/api/account/:accountId', async (req, res) => {
  const result = await pool.query(`
    SELECT l.*, p.name as property_name, p.city FROM gas_lites l
    JOIN properties p ON l.property_id = p.id WHERE l.account_id = $1
  `, [req.params.accountId]);
  res.json({ success: true, lites: result.rows });
});

app.post('/api/lites', async (req, res) => {
  try {
    const { property_id, account_id, slug, custom_title, custom_tagline, theme, accent_color } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [cleanSlug]);
    if (existing.rows.length > 0) return res.json({ success: false, error: 'Slug taken' });
    const result = await pool.query(`
      INSERT INTO gas_lites (property_id, account_id, slug, custom_title, custom_tagline, theme, accent_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [property_id, account_id, cleanSlug, custom_title, custom_tagline, theme || 'default', accent_color || '#3b82f6']);
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.put('/api/lites/:id', async (req, res) => {
  try {
    const { slug, custom_title, custom_tagline, theme, accent_color, active } = req.body;
    const result = await pool.query(`
      UPDATE gas_lites SET slug = COALESCE($1, slug), custom_title = $2, custom_tagline = $3,
      theme = COALESCE($4, theme), accent_color = COALESCE($5, accent_color),
      active = COALESCE($6, active), updated_at = NOW() WHERE id = $7 RETURNING *
    `, [slug?.toLowerCase(), custom_title, custom_tagline, theme, accent_color, active, req.params.id]);
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/lites/:id', async (req, res) => {
  await pool.query('DELETE FROM gas_lites WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/availability/:roomId', async (req, res) => {
  const { from, to } = req.query;
  const result = await pool.query(`
    SELECT date, is_available, is_blocked, cm_price, direct_price, standard_price, min_stay
    FROM room_availability WHERE room_id = $1 AND date >= $2 AND date <= $3 ORDER BY date
  `, [req.params.roomId, from, to]);
  res.json({ success: true, availability: result.rows });
});

// ============================================
// RENDER FUNCTIONS
// ============================================
function getCurrencySymbol(c) {
  const s = { USD:'$', EUR:'€', GBP:'£', PHP:'₱', THB:'฿', JPY:'¥', AUD:'A$', CAD:'C$', INR:'₹' };
  return s[c] || (c ? c+' ' : '$');
}

function renderNotFound(slug) {
  return `<!DOCTYPE html><html><head><title>Not Found</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9;margin:0}
  .c{text-align:center;padding:2rem}h1{color:#1e293b}p{color:#64748b}a{color:#3b82f6}</style></head>
  <body><div class="c"><h1>🔍 Not Found</h1><p>"\${slug}" doesn't exist yet.</p>
  <p><a href="https://gas.travel">Create your free GAS Lite →</a></p></div></body></html>`;
}

function renderError(msg) {
  return `<!DOCTYPE html><html><head><title>Error</title></head>
  <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh">
  <div style="text-align:center"><h1>⚠️ Error</h1><p>\${msg||'Please try again.'}</p></div></body></html>`;
}

function renderFullPage({ lite, room, images, amenities, reviews, pricing, qrCode, liteUrl }) {
  const title = lite.custom_title || lite.name;
  const desc = room?.full_description || room?.short_description || lite.full_description || lite.description || '';
  const currency = getCurrencySymbol(lite.currency);
  const price = pricing?.direct_price || pricing?.standard_price || pricing?.cm_price;
  const accent = lite.accent_color || '#3b82f6';
  
  const amenByCategory = {};
  amenities.forEach(a => {
    const cat = a.category || 'General';
    if (!amenByCategory[cat]) amenByCategory[cat] = [];
    amenByCategory[cat].push(a);
  });
  
  const avgRating = lite.average_rating || (reviews.length > 0 
    ? (reviews.reduce((s,r) => s + (r.rating||0), 0) / reviews.length).toFixed(1) : null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Book Direct</title>
  <meta name="description" content="${(room?.short_description || lite.short_description || '').substring(0,160)}">
  <meta property="og:title" content="${title}">
  <meta property="og:image" content="${images[0]?.url || ''}">
  <meta property="og:url" content="${liteUrl}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --accent: ${accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* Header */
    .header { background: white; border-bottom: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .logo { font-weight: 700; font-size: 1.25rem; color: var(--accent); text-decoration: none; }
    .share-btn { background: none; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    
    /* Gallery */
    .gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; height: 450px; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .gallery-main { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
    .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; }
    .gallery-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: opacity 0.2s; }
    .gallery-thumb:hover { opacity: 0.85; }
    .gallery-more { position: relative; cursor: pointer; }
    .gallery-more img { width: 100%; height: 100%; object-fit: cover; }
    .gallery-more-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
    
    /* Lightbox */
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; align-items: center; justify-content: center; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; }
    .lightbox-close { position: absolute; top: 20px; right: 20px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; }
    .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: white; border: none; width: 50px; height: 50px; border-radius: 50%; font-size: 24px; cursor: pointer; }
    .lightbox-prev { left: 20px; }
    .lightbox-next { right: 20px; }
    
    /* Layout */
    .room-layout { display: grid; grid-template-columns: 1fr 380px; gap: 32px; }
    @media (max-width: 900px) { 
      .room-layout { grid-template-columns: 1fr; } 
      .gallery { height: 300px; grid-template-columns: 1fr; }
      .gallery-grid { display: none; }
    }
    
    /* Room Header */
    .room-header { margin-bottom: 24px; }
    .room-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
    .room-location { color: #64748b; margin-bottom: 12px; }
    .room-meta { display: flex; flex-wrap: wrap; gap: 16px; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #64748b; }
    .rating-badge { background: var(--accent); color: white; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    
    /* Tabs */
    .tabs-nav { display: flex; gap: 4px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; overflow-x: auto; }
    .tab-btn { padding: 12px 20px; border: none; background: none; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
    .tab-btn:hover { color: #1e293b; }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Description */
    .description { font-size: 15px; line-height: 1.8; }
    .description p { margin-bottom: 16px; }
    
    /* Amenities */
    .amenities-category { margin-bottom: 24px; }
    .amenities-category h4 { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .amenity-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: white; border-radius: 8px; font-size: 14px; }
    
    /* Reviews */
    .reviews-summary { display: flex; align-items: center; gap: 20px; padding: 20px; background: linear-gradient(135deg, var(--accent), #8b5cf6); border-radius: 12px; color: white; margin-bottom: 24px; }
    .reviews-avg { font-size: 48px; font-weight: 700; line-height: 1; }
    .review-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .review-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .reviewer-name { font-weight: 600; }
    .review-date { color: #64748b; font-size: 13px; }
    .review-rating { color: #fbbf24; }
    
    /* Accordion */
    .accordion-item { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
    .accordion-header { width: 100%; padding: 16px 20px; background: white; border: none; display: flex; justify-content: space-between; cursor: pointer; font-size: 15px; font-weight: 500; }
    .accordion-content { padding: 0 20px; max-height: 0; overflow: hidden; transition: all 0.3s; }
    .accordion-item.open .accordion-content { padding: 0 20px 20px; max-height: 500px; }
    .accordion-icon { font-size: 20px; transition: transform 0.3s; }
    .accordion-item.open .accordion-icon { transform: rotate(45deg); }
    
    /* Booking Card */
    .booking-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 24px; position: sticky; top: 80px; }
    .price-display { margin-bottom: 20px; }
    .price-amount { font-size: 28px; font-weight: 700; }
    .price-period { color: #64748b; font-size: 14px; }
    .date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .date-field label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .date-field input, .guest-field select { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
    .guest-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .book-btn { width: 100%; padding: 16px; background: var(--accent); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .book-btn:hover { filter: brightness(0.9); }
    .book-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
    .qr-section { display: flex; align-items: center; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .qr-section img { width: 60px; height: 60px; }
    .qr-text { font-size: 12px; color: #64748b; }
    
    /* Map */
    .map-section { margin-top: 24px; border-radius: 12px; overflow: hidden; height: 300px; }
    .map-section iframe { width: 100%; height: 100%; border: none; }
    
    /* Footer */
    .footer { text-align: center; padding: 40px 20px; color: #64748b; font-size: 13px; }
    .footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="logo">GAS Lite</a>
    <button class="share-btn" onclick="shareProperty()">📤 Share</button>
  </header>
  
  <div class="container">
    <div class="gallery">
      ${images.length > 0 ? `
        <img src="${images[0].url}" alt="${title}" class="gallery-main" onclick="openLightbox(0)">
        <div class="gallery-grid">
          ${images.slice(1, 5).map((img, i) => {
            if (i === 3 && images.length > 5) {
              return `<div class="gallery-more" onclick="openLightbox(4)">
                <img src="${img.url}" alt="">
                <div class="gallery-more-overlay">+${images.length - 5} more</div>
              </div>`;
            }
            return `<img src="${img.url}" alt="" class="gallery-thumb" onclick="openLightbox(${i + 1})">`;
          }).join('')}
        </div>
      ` : `<div style="background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:60px;grid-column:1/-1;">🏠</div>`}
    </div>
    
    <div class="lightbox" id="lightbox">
      <button class="lightbox-close" onclick="closeLightbox()">×</button>
      <button class="lightbox-nav lightbox-prev" onclick="navLightbox(-1)">‹</button>
      <img src="" id="lightbox-img" alt="">
      <button class="lightbox-nav lightbox-next" onclick="navLightbox(1)">›</button>
    </div>
    
    <div class="room-layout">
      <div class="room-main">
        <div class="room-header">
          <h1 class="room-title">${title}</h1>
          <p class="room-location">📍 ${lite.city || ''}${lite.state ? ', ' + lite.state : ''}${lite.country ? ', ' + lite.country : ''}</p>
          <div class="room-meta">
            ${room ? `
              ${room.bedroom_count ? `<span class="meta-item">🛏️ ${room.bedroom_count} Bedroom${room.bedroom_count > 1 ? 's' : ''}</span>` : ''}
              ${room.bathroom_count ? `<span class="meta-item">🚿 ${room.bathroom_count} Bath</span>` : ''}
              ${room.max_guests ? `<span class="meta-item">👥 Up to ${room.max_guests} guests</span>` : ''}
            ` : ''}
            ${avgRating ? `<span class="rating-badge">★ ${avgRating}</span>` : ''}
          </div>
        </div>
        
        <div class="tabs">
          <div class="tabs-nav">
            <button class="tab-btn active" onclick="showTab('description')">Description</button>
            <button class="tab-btn" onclick="showTab('features')">Features</button>
            <button class="tab-btn" onclick="showTab('reviews')">Reviews (${reviews.length})</button>
            <button class="tab-btn" onclick="showTab('terms')">Terms</button>
            ${lite.latitude ? `<button class="tab-btn" onclick="showTab('location')">Location</button>` : ''}
          </div>
          
          <div class="tab-content active" id="tab-description">
            <div class="description">
              ${desc ? desc.split('\\n').map(p => `<p>${p}</p>`).join('') : '<p>No description available.</p>'}
            </div>
          </div>
          
          <div class="tab-content" id="tab-features">
            ${Object.keys(amenByCategory).length > 0 ? 
              Object.entries(amenByCategory).map(([cat, items]) => `
                <div class="amenities-category">
                  <h4>${cat}</h4>
                  <div class="amenities-grid">
                    ${items.map(a => `<div class="amenity-item"><span>${a.icon || '✓'}</span><span>${a.amenity_name}</span></div>`).join('')}
                  </div>
                </div>
              `).join('')
            : '<p style="color:#64748b;">No amenities listed.</p>'}
          </div>
          
          <div class="tab-content" id="tab-reviews">
            ${reviews.length > 0 ? `
              <div class="reviews-summary">
                <div><div class="reviews-avg">${avgRating}</div><div style="color:#fbbf24;font-size:20px;">★★★★★</div></div>
                <div><div>${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div><div style="font-size:13px;opacity:0.8;">Guest ratings</div></div>
              </div>
              ${reviews.map(r => `
                <div class="review-card">
                  <div class="review-header">
                    <div><div class="reviewer-name">${r.guest_name || 'Guest'}</div>
                    <div class="review-date">${r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</div></div>
                    <div class="review-rating">${'★'.repeat(Math.round(r.rating || 5))}</div>
                  </div>
                  <div>${r.comment || ''}</div>
                </div>
              `).join('')}
            ` : '<p style="color:#64748b;text-align:center;padding:40px;">No reviews yet.</p>'}
          </div>
          
          <div class="tab-content" id="tab-terms">
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>House Rules</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content">${lite.house_rules || '<p>No house rules specified.</p>'}</div>
            </div>
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>Cancellation Policy</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content">${lite.cancellation_policy || '<p>Contact host for cancellation policy.</p>'}</div>
            </div>
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>Check-in / Check-out</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content"><p><strong>Check-in:</strong> ${lite.check_in_time || '3:00 PM'}</p><p><strong>Check-out:</strong> ${lite.check_out_time || '11:00 AM'}</p></div>
            </div>
          </div>
          
          <div class="tab-content" id="tab-location">
            ${lite.latitude && lite.longitude ? `
              <div class="map-section">
                <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lite.longitude-0.01},${lite.latitude-0.01},${lite.longitude+0.01},${lite.latitude+0.01}&layer=mapnik&marker=${lite.latitude},${lite.longitude}"></iframe>
              </div>
            ` : '<p>Location not available.</p>'}
          </div>
        </div>
      </div>
      
      <div class="room-sidebar">
        <div class="booking-card">
          <div class="price-display">
            ${price ? `<span class="price-amount">${currency}${Math.round(price)}</span><span class="price-period"> / night</span>` : '<span class="price-amount">Check availability</span>'}
          </div>
          <div class="date-inputs">
            <div class="date-field"><label>Check-in</label><input type="date" id="checkin" min="${new Date().toISOString().split('T')[0]}"></div>
            <div class="date-field"><label>Check-out</label><input type="date" id="checkout"></div>
          </div>
          <div class="guest-fields">
            <div class="guest-field"><label>Adults</label><select id="adults">${[1,2,3,4,5,6,7,8].map(n => `<option>${n}</option>`).join('')}</select></div>
            <div class="guest-field"><label>Children</label><select id="children">${[0,1,2,3,4,5].map(n => `<option>${n}</option>`).join('')}</select></div>
          </div>
          <button class="book-btn" id="bookBtn" disabled>Select dates</button>
          <div class="qr-section">
            <img src="${qrCode}" alt="QR">
            <div class="qr-text">Scan to view on mobile<br><strong>lite.gas.travel/${lite.slug}</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <footer class="footer">Powered by <a href="https://gas.travel">GAS.travel</a> • <a href="${liteUrl}/card">View Promo Card</a></footer>
  
  <script>
    const images = ${JSON.stringify(images.map(i => i.url))};
    let currentImage = 0;
    
    function openLightbox(i) { currentImage = i; document.getElementById('lightbox-img').src = images[i]; document.getElementById('lightbox').classList.add('active'); }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('active'); }
    function navLightbox(d) { currentImage = (currentImage + d + images.length) % images.length; document.getElementById('lightbox-img').src = images[currentImage]; }
    function showTab(id) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelector('[onclick="showTab(\\''+id+'\\')"]').classList.add('active');
      document.getElementById('tab-' + id).classList.add('active');
    }
    function toggleAccordion(h) { h.parentElement.classList.toggle('open'); }
    function shareProperty() { if (navigator.share) navigator.share({ title: '${title}', url: '${liteUrl}' }); else { navigator.clipboard.writeText('${liteUrl}'); alert('Link copied!'); } }
    
    const checkinEl = document.getElementById('checkin'), checkoutEl = document.getElementById('checkout'), bookBtn = document.getElementById('bookBtn');
    checkinEl.addEventListener('change', () => {
      const next = new Date(checkinEl.value); next.setDate(next.getDate() + 1);
      checkoutEl.min = next.toISOString().split('T')[0];
      if (checkoutEl.value && checkoutEl.value <= checkinEl.value) checkoutEl.value = next.toISOString().split('T')[0];
      updateBtn();
    });
    checkoutEl.addEventListener('change', updateBtn);
    function updateBtn() {
      if (checkinEl.value && checkoutEl.value) {
        const nights = Math.ceil((new Date(checkoutEl.value) - new Date(checkinEl.value)) / 86400000);
        bookBtn.textContent = 'Book ' + nights + ' night' + (nights > 1 ? 's' : '');
        bookBtn.disabled = false;
      }
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') navLightbox(-1); if (e.key === 'ArrowRight') navLightbox(1); });
    document.getElementById('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  </script>
</body>
</html>`;
}

function renderPromoCard({ lite, image, rooms, price, offer, qrCode, liteUrl }) {
  const title = lite.custom_title || lite.name;
  const currency = getCurrencySymbol(lite.currency);
  const totalBeds = rooms.reduce((s, r) => s + (r.bedroom_count || 1), 0);
  const maxGuests = Math.max(...rooms.map(r => r.max_guests || 2), 2);
  const accent = lite.accent_color || '#3b82f6';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | GAS Lite Card</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #1e293b, #0f172a); min-height: 100vh; padding: 20px; display: flex; justify-content: center; align-items: center; }
    .card { background: white; border-radius: 24px; overflow: hidden; max-width: 400px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .hero { position: relative; height: 240px; }
    .hero img { width: 100%; height: 100%; object-fit: cover; }
    .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 40px 20px 20px; color: white; }
    .location { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
    .title { font-size: 1.5rem; font-weight: 700; }
    ${offer ? `.offer-badge { position: absolute; top: 16px; right: 16px; background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }` : ''}
    .content { padding: 20px; }
    .tagline { color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
    .features { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .feature { background: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #475569; }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .price { font-size: 24px; font-weight: 700; color: ${accent}; }
    .cta { display: block; width: 100%; background: ${accent}; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 600; text-decoration: none; }
    .qr-section { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .qr-section img { width: 70px; height: 70px; }
    .qr-text { font-size: 12px; color: #64748b; }
    .qr-url { font-weight: 600; color: #1e293b; }
    .footer { text-align: center; padding: 12px; font-size: 12px; color: #94a3b8; background: #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      ${image ? `<img src="${image}" alt="${title}">` : '<div style="background:#e2e8f0;height:100%;display:flex;align-items:center;justify-content:center;font-size:60px;">🏠</div>'}
      ${offer ? `<div class="offer-badge">🔥 ${offer.discount_value}% OFF</div>` : ''}
      <div class="hero-overlay">
        <div class="location">📍 ${lite.city}${lite.country ? ', ' + lite.country : ''}</div>
        <h1 class="title">${title}</h1>
      </div>
    </div>
    <div class="content">
      ${lite.short_description ? `<p class="tagline">${lite.short_description}</p>` : ''}
      <div class="features">
        <div class="feature">🛏️ ${totalBeds} Bed${totalBeds > 1 ? 's' : ''}</div>
        <div class="feature">👥 Up to ${maxGuests}</div>
        ${lite.pets_allowed ? '<div class="feature">🐕 Pets OK</div>' : ''}
        ${lite.children_allowed ? '<div class="feature">👶 Family</div>' : ''}
      </div>
      <div class="price-row">
        <div>${price ? `<span class="price">${currency}${Math.round(price)}</span><span style="color:#64748b;font-size:14px;"> / night</span>` : '<span class="price">View rates</span>'}</div>
        ${lite.average_rating ? `<div style="color:#fbbf24;font-size:16px;">★ ${lite.average_rating}</div>` : ''}
      </div>
      <a href="${liteUrl}" class="cta">View Full Details →</a>
    </div>
    <div class="qr-section">
      <img src="${qrCode}" alt="QR">
      <div><div class="qr-text">Scan to view on your phone</div><div class="qr-url">lite.gas.travel/${lite.slug}</div></div>
    </div>
    <div class="footer">Powered by GAS.travel</div>
  </div>
</body>
</html>`;
}

function renderPrintCard({ lite, qrCode, liteUrl, image }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print - ${lite.custom_title || lite.name}</title>
<style>
  @page { size: A6; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; width: 105mm; height: 148mm; padding: 8mm; }
  .card { border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
  .image { height: 45%; background: #f1f5f9; }
  .image img { width: 100%; height: 100%; object-fit: cover; }
  .content { padding: 4mm; flex: 1; display: flex; flex-direction: column; }
  .title { font-size: 14pt; font-weight: 700; margin-bottom: 2mm; }
  .location { font-size: 9pt; color: #64748b; margin-bottom: 4mm; }
  .qr-area { display: flex; align-items: center; gap: 4mm; margin-top: auto; padding-top: 4mm; border-top: 1px solid #e2e8f0; }
  .qr-area img { width: 25mm; height: 25mm; }
  .qr-text { font-size: 8pt; color: #64748b; }
  .qr-url { font-size: 9pt; font-weight: 600; }
  @media print { body { print-color-adjust: exact; } }
</style></head>
<body>
  <div class="card">
    <div class="image">${image ? `<img src="${image}">` : ''}</div>
    <div class="content">
      <h1 class="title">${lite.custom_title || lite.name}</h1>
      <p class="location">📍 ${lite.city}, ${lite.country}</p>
      <div class="qr-area">
        <img src="${qrCode}">
        <div><div class="qr-text">Scan to book direct</div><div class="qr-url">lite.gas.travel/${lite.slug}</div></div>
      </div>
    </div>
  </div>
  <script>window.print();</script>
</body></html>`;
}

// Start server
const PORT = process.env.PORT || 3002;
async function start() {
  await ensureLitesTable();
  app.listen(PORT, () => {
    console.log(`🚀 GAS Lites server running on port ${PORT}`);
    console.log(`   Full page: /:slug`);
    console.log(`   Promo card: /:slug/card`);
    console.log(`   QR: /:slug/qr`);
    console.log(`   Print: /:slug/print`);
  });
}
start().catch(console.error);
module.exports = app;
