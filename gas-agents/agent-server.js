/**
 * GAS Agents — travel-agent portal at agents.gas.travel
 *
 * Sibling Node app to gas-lites/. Own Railway service. Shares the main
 * Postgres via DATABASE_URL but doesn't share process/memory with the
 * operator admin at admin.gas.travel — so agent-side issues can't degrade
 * operator/Hebden/Cotswolds flows.
 *
 * Architecture per docs/gas-travel-agent-unified-model.md:
 *   - GET  /                       landing + login
 *   - POST /api/auth/login         agent sign-in (JWT)
 *   - GET  /search                 unified inventory search (TA.3 — placeholder)
 *   - POST /api/search             unified search endpoint (TA.2 — placeholder)
 *   - POST /api/book               unified booking dispatch (TA.4 — placeholder)
 *   - GET  /dashboard              agent's bookings + commission (TA.5 — placeholder)
 *
 * Everything below /api/* requires a valid agent JWT (master_admin can also
 * call them for testing). HTML routes render through res.send for now —
 * static templates will move into public/ once the design lands.
 */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';
const JWT_TTL = '12h';

// ---- Auth helpers ---------------------------------------------------------

function signAgentToken(account) {
    return jwt.sign(
        { sub: account.id, role: account.role, kind: 'agent' },
        JWT_SECRET,
        { expiresIn: JWT_TTL }
    );
}

function requireAgent(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'auth required' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // Master admin can call agent endpoints for testing.
        if (payload.role !== 'travel_agent' && payload.role !== 'agency_admin' && payload.role !== 'master_admin') {
            return res.status(403).json({ success: false, error: 'agent role required' });
        }
        req.agent = payload;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: 'invalid token' });
    }
}

// ---- Health + version (for Railway probes + deploy verification) -------

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/api/version', (req, res) => {
    res.json({
        app: 'gas-agents',
        version: require('./package.json').version,
        commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        deployed_at: process.env.RAILWAY_DEPLOYMENT_CREATED_AT || null,
    });
});

// ---- Auth endpoints -------------------------------------------------------

// POST /api/auth/login { email, password } -> { token }
// Authenticates against the existing accounts table. Only travel_agent /
// agency_admin / master_admin can hold an agent session.
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ success: false, error: 'email + password required' });
        const r = await pool.query(
            `SELECT id, name, email, role, password_hash FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1`,
            [String(email).trim()]
        );
        if (r.rows.length === 0) return res.status(401).json({ success: false, error: 'invalid credentials' });
        const acc = r.rows[0];
        if (!['travel_agent', 'agency_admin', 'master_admin'].includes(acc.role)) {
            return res.status(403).json({ success: false, error: 'this account is not authorised as a travel agent' });
        }
        if (!acc.password_hash) {
            return res.status(401).json({ success: false, error: 'no password set; ask GAS support to enable agent login' });
        }
        const ok = await bcrypt.compare(password, acc.password_hash);
        if (!ok) return res.status(401).json({ success: false, error: 'invalid credentials' });
        const token = signAgentToken(acc);
        res.json({ success: true, token, agent: { id: acc.id, name: acc.name, email: acc.email, role: acc.role } });
    } catch (error) {
        console.error('[agent login]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/me — returns the signed-in agent's profile (probe-friendly).
app.get('/api/me', requireAgent, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT id, name, email, role, agent_markup_pct, agent_commission_pct FROM accounts WHERE id = $1`,
            [req.agent.sub]
        );
        if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'agent not found' });
        res.json({ success: true, agent: r.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ---- TA.2: unified search --------------------------------------------------
// gas-agents is a thin renderer. Hotelbeds adapter + business logic live in
// admin.gas.travel alongside the other adapters; we proxy via HTTPS so
// agents.gas.travel can crash/redeploy without touching operator flows.
const ADMIN_API_BASE = process.env.ADMIN_API_BASE || 'https://admin.gas.travel';
async function callAdmin(path, body) {
    const secret = process.env.INTERNAL_AGENT_SECRET;
    if (!secret) return { ok: false, error: 'INTERNAL_AGENT_SECRET not set' };
    try {
        const resp = await fetch(`${ADMIN_API_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Auth': secret,
            },
            body: JSON.stringify(body),
        });
        const data = await resp.json();
        return { ok: resp.ok, status: resp.status, data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

app.post('/api/search', requireAgent, async (req, res) => {
    // Thin proxy — business logic lives in admin.
    const r = await callAdmin('/api/internal/agent-search', {
        agent_id: req.agent.sub,
        ...req.body,
    });
    if (!r.ok && r.error) return res.status(500).json({ success: false, error: r.error });
    res.status(r.status || 200).json(r.data);
});

// Dev-only: issue a master_admin session without a password check. Gated by
// the JWT secret so only Steve can call it. Remove before TA goes live.
app.post('/api/auth/dev-token', async (req, res) => {
    try {
        const { secret } = req.body || {};
        if (!secret || secret !== JWT_SECRET) {
            return res.status(403).json({ success: false, error: 'invalid secret' });
        }
        // Look up the first master_admin account (Steve).
        const r = await pool.query(
            `SELECT id, name, email FROM accounts WHERE role = 'master_admin' ORDER BY id LIMIT 1`
        );
        if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'no master_admin account' });
        const acc = r.rows[0];
        const token = jwt.sign(
            { sub: acc.id, role: 'master_admin', kind: 'agent', dev: true },
            JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({ success: true, token, agent: { id: acc.id, name: acc.name, email: acc.email, role: 'master_admin' } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ---- TA.4: unified booking dispatch --------------------------------------
// Body: {
//   source: 'hotelbeds' | 'operator',
//   rateKey,                             // Hotelbeds only
//   holder: { name, surname, email? },
//   paxes: [{ roomId, type:'AD'|'CH', name?, surname?, age? }],   // optional
//   // operator-direct fields land here in a future ship — TA.4 ships HB only
// }
app.post('/api/book', requireAgent, async (req, res) => {
    const r = await callAdmin('/api/internal/agent-book', {
        agent_id: req.agent.sub,
        ...req.body,
    });
    if (!r.ok && r.error) return res.status(500).json({ success: false, error: r.error });
    res.status(r.status || 200).json(r.data);
});

// ---- HTML pages (minimal scaffolds — full UI lands in TA.3 / TA.5) -------

const HTML_HEAD = `
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GAS Agents</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         max-width: 640px; margin: 4rem auto; padding: 0 1.5rem; color: #1e293b; line-height: 1.55; }
  h1 { font-size: 1.6rem; margin: 0 0 0.5rem; }
  .lead { color: #64748b; margin-bottom: 2rem; }
  form { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 12px; }
  label { display: block; font-size: 0.8rem; color: #475569; margin: 0.5rem 0 0.25rem; font-weight: 600; }
  input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; }
  button { background: #1e293b; color: white; border: 0; padding: 0.7rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; margin-top: 0.75rem; }
  .err { color: #b91c1c; font-size: 0.85rem; margin-top: 0.75rem; min-height: 1.2em; }
  .placeholder { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem; font-size: 0.85rem; color: #92400e; }
  code { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; }
</style></head><body>`;
const HTML_FOOT = `</body></html>`;

app.get('/', (req, res) => {
    res.send(HTML_HEAD + `
<h1>GAS Agents</h1>
<p class="lead">Travel-agent portal for the GAS network. Unified inventory search across operator-direct + wholesale.</p>
<form id="loginForm" autocomplete="on">
  <label>Email</label>
  <input name="email" type="email" required autocomplete="email">
  <label>Password</label>
  <input name="password" type="password" required autocomplete="current-password">
  <button type="submit">Sign in</button>
  <div class="err" id="err"></div>
</form>
<p class="lead" style="margin-top: 2rem; font-size: 0.8rem;">Need an account? Contact <a href="mailto:partnerships@gas.travel">partnerships@gas.travel</a>.</p>
<p style="margin-top: 1rem; font-size: 0.75rem; color:#94a3b8;">
  <a href="#" onclick="devLogin(); return false;" style="color:#6366f1;">Dev login (master admin)</a>
</p>
<script>
window.devLogin = async function() {
  const secret = prompt('Paste the AGENT_JWT_SECRET from Railway:');
  if (!secret) return;
  const r = await fetch('/api/auth/dev-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  });
  const data = await r.json();
  if (data.success) {
    localStorage.setItem('gas_agent_token', data.token);
    localStorage.setItem('gas_agent_profile', JSON.stringify(data.agent));
    window.location.href = '/search';
  } else {
    document.getElementById('err').textContent = data.error || 'Dev login failed';
  }
};
</script>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
    });
    const data = await r.json();
    if (data.success) {
      localStorage.setItem('gas_agent_token', data.token);
      localStorage.setItem('gas_agent_profile', JSON.stringify(data.agent));
      window.location.href = '/search';
    } else {
      errEl.textContent = data.error || 'Sign-in failed';
    }
  } catch (e2) {
    errEl.textContent = e2.message;
  }
});
</script>` + HTML_FOOT);
});

app.get('/search', (req, res) => {
    res.send(HTML_HEAD + `
<h1>Search inventory</h1>
<p class="lead">Hotelbeds wholesale + your approved operator-direct properties, with your markup applied.</p>

<form id="sf">
  <label>Destination code (Hotelbeds — e.g. <code>LVS</code> Las Vegas, <code>MIA</code> Miami, <code>FLL</code> Fort Lauderdale)</label>
  <input name="destinationCode" placeholder="LVS" autocomplete="off">

  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
    <div><label>Check-in</label><input name="checkIn" type="date" required></div>
    <div><label>Check-out</label><input name="checkOut" type="date" required></div>
  </div>

  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
    <div><label>Adults</label><input name="adults" type="number" value="2" min="1" max="6"></div>
    <div><label>Children</label><input name="children" type="number" value="0" min="0" max="4"></div>
  </div>

  <button type="submit">Search</button>
  <div class="err" id="err"></div>
</form>

<div id="meta" style="margin-top: 1rem; font-size: 0.8rem; color:#64748b;"></div>
<div id="results" style="margin-top: 0.5rem;"></div>

<script>
const token = localStorage.getItem('gas_agent_token');
if (!token) window.location.href = '/';

// Default dates 14 days out, 2 nights.
const dIn = new Date(Date.now() + 14*86400000).toISOString().slice(0,10);
const dOut = new Date(Date.now() + 16*86400000).toISOString().slice(0,10);
document.querySelector('[name="checkIn"]').value = dIn;
document.querySelector('[name="checkOut"]').value = dOut;

const fmtMoney = (n, cur) => (cur || '') + ' ' + n.toFixed(2);

document.getElementById('sf').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = {
    destinationCode: (f.get('destinationCode') || '').trim().toUpperCase(),
    checkIn: f.get('checkIn'),
    checkOut: f.get('checkOut'),
    adults: parseInt(f.get('adults'), 10) || 2,
    children: parseInt(f.get('children'), 10) || 0,
  };
  document.getElementById('err').textContent = '';
  document.getElementById('meta').textContent = 'Searching…';
  document.getElementById('results').innerHTML = '';
  try {
    const r = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!data.success) {
      document.getElementById('err').textContent = data.error || 'Search failed';
      document.getElementById('meta').textContent = '';
      return;
    }
    document.getElementById('meta').innerHTML =
      data.count + ' results · your markup ' + data.markup_applied_pct + '% applied to net rates'
      + (data.debug ? '<br><small style="color:#94a3b8;">debug: ' + JSON.stringify(data.debug) + '</small>' : '');
    window._results = data.results;
    const html = data.results.map((r, i) => {
      const margin = r.sell_rate - r.net_rate;
      const sourceLabel = r.source === 'hotelbeds'
        ? '<span style="background:#dbeafe; color:#1e40af; font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:999px;">HB</span>'
        : '<span style="background:#dcfce7; color:#166534; font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:999px;">Operator</span>';
      const bookBtn = r.source === 'hotelbeds'
        ? '<button onclick="openBook(' + i + ')" style="margin-top:0.4rem; font-size:0.75rem; padding: 0.3rem 0.6rem; background:#1e293b; color:white; border:0; border-radius:6px; cursor:pointer;">Book this</button>'
        : '<span style="font-size:0.7rem; color:#94a3b8;">(operator-direct book: TA.4.1)</span>';
      const hotelLink = r.source === 'hotelbeds' && r.hotel_code
        ? '<a href="/hotel/' + r.hotel_code + '" target="_blank" style="color:#1e293b; text-decoration:none;"><strong>' + (r.hotel_name || '') + '</strong></a>'
        : '<strong>' + (r.hotel_name || '') + '</strong>';
      return '<div style="background:white; border:1px solid #e2e8f0; border-radius:10px; padding:0.75rem; margin-bottom:0.5rem;">'
        + '<div style="display:flex; justify-content:space-between; gap:0.5rem;">'
        + '<div>' + hotelLink + ' ' + sourceLabel
        + '<div style="font-size:0.75rem; color:#64748b;">' + (r.zone || '') + ' · ' + (r.category || '') + '</div>'
        + '<div style="font-size:0.75rem; color:#475569; margin-top:0.25rem;">' + (r.room_name || '') + (r.board ? ' · ' + r.board : '') + '</div>'
        + '</div>'
        + '<div style="text-align:right;">'
        + '<div style="font-size:1.1rem; font-weight:700; color:#059669;">' + fmtMoney(r.sell_rate, r.currency) + '</div>'
        + '<div style="font-size:0.7rem; color:#94a3b8;">net ' + fmtMoney(r.net_rate, r.currency) + ' · margin ' + fmtMoney(margin, r.currency) + '</div>'
        + bookBtn
        + '</div></div></div>';
    }).join('');
    document.getElementById('results').innerHTML = html || '<p style="color:#94a3b8;">No availability for those dates.</p>';

window.openBook = function(i) {
  const r = window._results[i];
  const formHtml = '<div id="bookForm" style="margin-top:1rem; padding:1rem; background:#f1f5f9; border:2px solid #6366f1; border-radius:10px;">'
    + '<strong>' + r.hotel_name + ' · ' + r.room_name + '</strong><br>'
    + '<span style="font-size:0.75rem; color:#64748b;">Sell ' + fmtMoney(r.sell_rate, r.currency) + ' · net ' + fmtMoney(r.net_rate, r.currency) + '</span>'
    + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.75rem;">'
    + '<div><label>First name</label><input id="bkN" type="text" placeholder="Guest first name"></div>'
    + '<div><label>Surname</label><input id="bkS" type="text" placeholder="Guest surname"></div>'
    + '</div>'
    + '<label>Email (optional)</label><input id="bkE" type="email" placeholder="guest@example.com">'
    + '<button onclick="confirmBook(' + i + ')" style="margin-top:0.6rem; background:#6366f1; color:white; border:0; padding:0.6rem 1rem; border-radius:6px; cursor:pointer;">Confirm Booking</button>'
    + '<button onclick="document.getElementById(\\'bookForm\\').remove()" style="margin-left:0.5rem; background:transparent; color:#64748b; border:1px solid #cbd5e1; padding:0.6rem 1rem; border-radius:6px; cursor:pointer;">Cancel</button>'
    + '<div id="bkResult" style="margin-top:0.75rem; font-size:0.8rem;"></div>'
    + '</div>';
  document.getElementById('results').insertAdjacentHTML('afterbegin', formHtml);
  document.getElementById('bookForm').scrollIntoView({behavior:'smooth', block:'center'});
};

window.confirmBook = async function(i) {
  const r = window._results[i];
  const name = document.getElementById('bkN').value.trim();
  const surname = document.getElementById('bkS').value.trim();
  const email = document.getElementById('bkE').value.trim();
  const result = document.getElementById('bkResult');
  if (!name || !surname) { result.innerHTML = '<span style="color:#dc2626;">First name + surname required</span>'; return; }
  result.innerHTML = 'Booking…';
  try {
    const r2 = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        source: r.source,
        rateKey: r.rate_key,
        holder: { name, surname, email },
        sell_rate: r.sell_rate,
        currency: r.currency,
      }),
    });
    const data = await r2.json();
    if (data.success) {
      result.innerHTML = '<span style="color:#059669;">✓ Booked: ref <code>' + data.booking.reference + '</code> · margin ' + fmtMoney(data.margin, data.currency) + '</span>';
    } else {
      result.innerHTML = '<span style="color:#dc2626;">' + (data.error || 'failed') + '</span>';
    }
  } catch (e2) {
    result.innerHTML = '<span style="color:#dc2626;">' + e2.message + '</span>';
  }
};
  } catch (e2) {
    document.getElementById('err').textContent = e2.message;
    document.getElementById('meta').textContent = '';
  }
});
</script>` + HTML_FOOT);
});

// Hotel detail page — renders from the cached Hotelbeds content (description,
// images, facilities, rooms). NO live Hotelbeds calls so it doesn't burn the
// sandbox quota. Useful both as a pre-purchase browsing surface for agents and
// as a demo screen we can show Resort Breaks without depending on live API.
app.get('/hotel/:code', async (req, res) => {
    try {
        const code = parseInt(req.params.code, 10);
        if (!Number.isFinite(code)) return res.status(400).send('invalid code');
        const r = await pool.query(`SELECT * FROM hotelbeds_hotel_content WHERE code = $1`, [code]);
        if (r.rows.length === 0) {
            return res.send(HTML_HEAD + `<h1>Hotel ${code}</h1><p class="lead">No cached content for this hotel. Open it in the admin search panel first to pull content.</p>` + HTML_FOOT);
        }
        const h = r.rows[0];
        const images = Array.isArray(h.images) ? h.images : (typeof h.images === 'string' ? JSON.parse(h.images) : []);
        const facilities = Array.isArray(h.facilities) ? h.facilities : (typeof h.facilities === 'string' ? JSON.parse(h.facilities) : []);
        const rooms = Array.isArray(h.rooms) ? h.rooms : (typeof h.rooms === 'string' ? JSON.parse(h.rooms) : []);
        const phones = Array.isArray(h.phones) ? h.phones : (typeof h.phones === 'string' ? JSON.parse(h.phones) : []);
        // Raw blob carries fields we didn't normalise into columns: points of
        // interest, issues, wildcards, board types, accommodation, segments.
        const raw = h.raw ? (typeof h.raw === 'string' ? JSON.parse(h.raw) : h.raw) : null;
        const rawHotel = raw?.hotel || {};
        const pois = Array.isArray(rawHotel.interestPoints) ? rawHotel.interestPoints : [];
        const issues = Array.isArray(rawHotel.issues) ? rawHotel.issues : [];
        const wildcards = Array.isArray(rawHotel.wildcards) ? rawHotel.wildcards : [];
        const boards = Array.isArray(rawHotel.boards) ? rawHotel.boards : [];
        const segments = Array.isArray(rawHotel.segments) ? rawHotel.segments : [];
        const accommodationType = rawHotel.accommodationTypeCode || rawHotel.accommodationType || null;

        // Group images by type for a nicer scroll-strip layout (Restaurant /
        // Room / Pool / Beach / Entrance / Common etc.).
        const imagesByType = {};
        for (const img of images) {
            const typeName = img.type?.description?.content || img.type?.code || 'Other';
            (imagesByType[typeName] = imagesByType[typeName] || []).push(img);
        }
        const imgUrl = (p) => {
            // /giata/bigger/{path} is the confirmed-working CDN URL. Plain
            // /giata/{path} silently 404s for some paths. onerror=hide so
            // any genuinely-missing image disappears rather than showing
            // a broken-image icon.
            const hasSize = /^(bigger|big|small|xl|xxl|original)\//i.test(p);
            return hasSize
                ? `https://photos.hotelbeds.com/giata/${p}`
                : `https://photos.hotelbeds.com/giata/bigger/${p}`;
        };
        // Customer-facing: one big photo grid in priority order (Room → Pool →
        // Beach → General view → Restaurant → Bar → Lobby → other), not flat
        // horizontal strips per category. Clicking opens a fullscreen lightbox.
        const TYPE_PRIORITY = ['Room', 'General view', 'Pool', 'Beach', 'Restaurant', 'Bar', 'Lobby', 'Sports and Entertainment'];
        const allImagesSorted = images.slice().sort((a, b) => {
            const ta = a.type?.description?.content || '';
            const tb = b.type?.description?.content || '';
            const pa = TYPE_PRIORITY.indexOf(ta);
            const pb = TYPE_PRIORITY.indexOf(tb);
            const pra = pa === -1 ? 99 : pa;
            const prb = pb === -1 ? 99 : pb;
            if (pra !== prb) return pra - prb;
            return (a.order || 0) - (b.order || 0);
        });
        const imageGrid = allImagesSorted.map((img, i) => {
            const url = imgUrl(img.path);
            return `<div style="aspect-ratio: 4/3; overflow:hidden; border-radius:8px; cursor:pointer; background:#f1f5f9;" onclick="openLb(${i})"><img src="${url}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" onerror="this.parentNode.style.display='none'"></div>`;
        }).join('');
        const lbUrls = allImagesSorted.map((img) => imgUrl(img.path));

        const facList = facilities
            .filter((f) => f.indYesOrNo)
            .map((f) => {
                const name = f.description?.content || '';
                if (!name) return '';
                const fee = f.indFee ? ' <span style="font-size:0.65rem; color:#f59e0b;">(extra fee)</span>' : '';
                return `<span style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:999px; padding:0.2rem 0.6rem; margin:0.15rem; display:inline-block; font-size:0.75rem;">${name}${fee}</span>`;
            }).join('');

        // Group rooms by description name to collapse Hotelbeds' subtle
        // variants (DBL.ST-1 / DBL.ST-2 / DBL.ST-3 are all "Double Standard").
        // Render as a grid not a list — friendlier for a demo screen.
        const roomsByName = new Map();
        for (const rm of rooms) {
            const k = (rm.description || rm.roomCode || '').toUpperCase();
            if (!roomsByName.has(k)) roomsByName.set(k, { name: rm.description || rm.roomCode || '', codes: [] });
            roomsByName.get(k).codes.push(rm.roomCode);
        }
        // Customer-facing: just the friendly room name, no Hotelbeds codes.
        // Codes are operator-side noise.
        const roomGrid = Array.from(roomsByName.values()).map((rm) => {
            const friendly = rm.name
                .toLowerCase()
                .replace(/\bstandard\b/gi, '')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\b\w/g, (l) => l.toUpperCase());
            return `<div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; font-size:0.85rem;">${friendly}</div>`;
        }).join('');

        const mapsLink = (h.latitude && h.longitude)
            ? `<a href="https://maps.google.com/?q=${h.latitude},${h.longitude}" target="_blank" style="color:#6366f1; font-size:0.85rem;">📍 ${h.latitude}, ${h.longitude}</a>`
            : '';

        res.send(`
<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h.name} — GAS Agents</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 980px; margin: 2rem auto; padding: 0 1.5rem; color:#1e293b; line-height: 1.55; }
  h1 { font-size: 1.8rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color:#475569; }
  .lead { color:#64748b; margin: 0; }
  .meta { font-size: 0.8rem; color:#94a3b8; margin: 0.5rem 0; }
  code { background:#f1f5f9; padding:0.1rem 0.35rem; border-radius:4px; font-size:0.85rem; }
  a.back { font-size: 0.8rem; color:#6366f1; text-decoration:none; }
</style></head><body>
<a href="/search" class="back">← back to search</a>
<h1 style="margin-top:0.5rem;">${h.name}</h1>
<p class="lead">${h.category_name || ''} · ${h.zone_name || ''}${h.destination_name ? ' · ' + h.destination_name : ''}</p>
<p class="meta">Code <code>${h.code}</code> · ${h.address || ''}${h.city ? ', ' + h.city : ''} ${mapsLink}</p>

${h.description ? `<h2>About</h2><p style="font-size:0.95rem; color:#1e293b;">${h.description}</p>` : ''}

<h2>Gallery (${images.length} images)</h2>
${imageStrips || '<p class="lead">No images cached.</p>'}

${facList ? `<h2>Facilities</h2><div>${facList}</div>` : ''}

${roomGrid ? `<h2>Room types (${rooms.length})</h2><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.5rem;">${roomGrid}</div>` : ''}

${pois.length ? `
<h2>Points of interest</h2>
<ul style="font-size:0.85rem; color:#475569; padding-left:1.25rem; margin: 0.25rem 0;">
${pois.slice(0, 20).map((p) => `<li>${p.poiName || ''}${p.distance ? ` <span style="color:#94a3b8; font-size:0.75rem;">(${p.distance} km)</span>` : ''}</li>`).join('')}
</ul>` : ''}

${boards.length ? `
<h2>Board types available</h2>
<div>${boards.map((b) => `<span style="background:#dbeafe; color:#1e40af; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:999px; margin:0.15rem; display:inline-block;">${b.description?.content || b.code}</span>`).join('')}</div>` : ''}

${segments.length ? `
<h2>Segments</h2>
<div>${segments.map((s) => `<span style="background:#f1f5f9; color:#475569; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:999px; margin:0.15rem; display:inline-block;">${s.description?.content || s.code}</span>`).join('')}</div>` : ''}

${issues.length ? `
<h2>Important notices</h2>
<div style="background:#fef3c7; border: 1px solid #fde68a; border-radius:8px; padding: 0.75rem; font-size: 0.8rem;">
<ul style="margin:0; padding-left: 1.25rem; color:#92400e;">
${issues.slice(0, 10).map((i) => `<li>${i.issueCode || ''}${i.dateFrom ? ` (from ${i.dateFrom}${i.dateTo ? ' to ' + i.dateTo : ''})` : ''}${i.alternative ? ' — alternative: ' + i.alternative : ''}</li>`).join('')}
</ul></div>` : ''}

${(phones.length || wildcards.length || accommodationType) ? `
<h2>Other</h2>
<div style="font-size:0.8rem; color:#64748b;">
${accommodationType ? `<div>Accommodation: <code>${accommodationType}</code></div>` : ''}
${phones.length ? `<div>Phones: ${phones.map((p) => p.phoneNumber || p.content).filter(Boolean).join(' · ')}</div>` : ''}
${wildcards.length ? `<div>Wildcards: ${wildcards.map((w) => w.roomType?.description?.content || w.characteristicCode).filter(Boolean).join(' · ')}</div>` : ''}
</div>` : ''}

<p class="meta" style="margin-top:2rem;">Cached from Hotelbeds Content API · refreshed ${new Date(h.refreshed_at).toLocaleString()}</p>
</body></html>`);
    } catch (error) {
        console.error('[hotel detail]', error);
        res.status(500).send('Error: ' + error.message);
    }
});

app.get('/dashboard', (req, res) => {
    res.send(HTML_HEAD + `
<h1>Bookings &amp; commission</h1>
<div class="placeholder">
  Phase <code>TA.5</code> — agent dashboard.
</div>` + HTML_FOOT);
});

// 404 catch-all so unknown agent.gas.travel paths don't leak Express defaults.
app.use((req, res) => {
    res.status(404).send(HTML_HEAD + `<h1>Not found</h1><p class="lead">No route at <code>${req.path}</code>.</p>` + HTML_FOOT);
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[gas-agents] listening on :${PORT}`));
