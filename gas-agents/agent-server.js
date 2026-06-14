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
// Body: {
//   checkIn, checkOut,                  // YYYY-MM-DD
//   adults (default 2), children (default 0),
//   destinationCode  | hotelCodes[],    // wholesale fan-out hint
//   operatorPropertyIds[]               // optional — operator-direct filter
// }
//
// Returns: { success, count, markup_applied_pct, results: [
//   { source: 'hotelbeds' | 'operator', net_rate, sell_rate, currency, ... }
// ] }
const { searchAvailability: hbSearch } = require('./lib/hotelbeds');

app.post('/api/search', requireAgent, async (req, res) => {
    try {
        const {
            checkIn, checkOut,
            adults = 2, children = 0,
            destinationCode, hotelCodes,
            operatorPropertyIds,
        } = req.body || {};
        if (!checkIn || !checkOut) {
            return res.status(400).json({ success: false, error: 'checkIn + checkOut required (YYYY-MM-DD)' });
        }
        const a = parseInt(adults, 10) || 2;
        const c = parseInt(children, 10) || 0;

        // Agent markup from accounts row.
        const agentRow = await pool.query(`SELECT agent_markup_pct FROM accounts WHERE id = $1`, [req.agent.sub]);
        const markupPct = parseFloat(agentRow.rows[0]?.agent_markup_pct) || 0;
        const markup = 1 + (markupPct / 100);
        const applyMarkup = (net) => Math.round(net * markup * 100) / 100;

        const results = [];
        const debug = {};

        // === Hotelbeds wholesale half ===
        if (destinationCode || (Array.isArray(hotelCodes) && hotelCodes.length)) {
            const hb = await hbSearch(pool, 272, {
                stay: { checkIn, checkOut },
                occupancies: { rooms: 1, adults: a, children: c },
                destinationCode,
                hotelCodes,
            });
            debug.hotelbeds_ok = hb.ok;
            debug.hotelbeds_total = hb.data?.hotels?.total;
            debug.hotelbeds_audit = hb.data?.auditData;
            if (!hb.ok) debug.hotelbeds_error = hb.error;
            if (hb.ok) {
                const hotels = hb.data?.hotels?.hotels || [];
                for (const h of hotels) {
                    for (const rm of (h.rooms || [])) {
                        const cheapest = (rm.rates || []).reduce((best, rate) =>
                            !best || parseFloat(rate.net) < parseFloat(best.net) ? rate : best, null);
                        if (!cheapest) continue;
                        const net = parseFloat(cheapest.net);
                        results.push({
                            source: 'hotelbeds',
                            hotel_code: h.code,
                            hotel_name: h.name,
                            zone: h.zoneName,
                            destination: h.destinationName,
                            category: h.categoryName,
                            room_code: rm.code,
                            room_name: rm.name,
                            board: cheapest.boardName,
                            net_rate: net,
                            sell_rate: applyMarkup(net),
                            currency: cheapest.currency || h.currency,
                            rate_key: cheapest.rateKey,
                            rate_type: cheapest.rateType,
                            cancellation_policies: cheapest.cancellationPolicies || [],
                            allotment: cheapest.allotment,
                        });
                    }
                }
            } else {
                // Don't fail the whole search if Hotelbeds glitches — return what
                // we have + a warning.
                console.warn('[search] Hotelbeds failed:', hb.error);
            }
        }

        // === Operator-direct half ===
        // Pulls distribution_access rows for this agent (status='approved') and
        // joins to bookable_units + room_availability for the stay window.
        // current_price on distribution_access is the agreed wholesale-to-agent
        // net (fixed-price model). If absent, falls back to room_availability
        // cm_price/direct_price per night.
        if (Array.isArray(operatorPropertyIds) && operatorPropertyIds.length) {
            const op = await pool.query(`
                SELECT
                    p.id AS property_id, p.name AS hotel_name, p.city, p.country, p.currency,
                    bu.id AS bookable_unit_id, bu.name AS room_name, bu.max_guests,
                    da.current_price AS agreed_net_rate,
                    ra.date,
                    COALESCE(ra.direct_price, ra.cm_price) AS night_price,
                    ra.is_available
                  FROM distribution_access da
                  JOIN properties p ON p.id = da.property_id
                  JOIN bookable_units bu ON bu.property_id = p.id
             LEFT JOIN room_availability ra ON ra.room_id = bu.id
                                          AND ra.date >= $2::date
                                          AND ra.date < $3::date
                 WHERE da.travel_agent_id = $1
                   AND da.status = 'approved'
                   AND da.property_id = ANY($4::int[])
                   AND bu.max_guests >= $5
            `, [req.agent.sub, checkIn, checkOut, operatorPropertyIds, a + c]);

            // Group by unit; require ALL nights available; sum per-night prices
            // unless DA has agreed_net_rate (then use it × nights).
            const byUnit = new Map();
            for (const row of op.rows) {
                if (!byUnit.has(row.bookable_unit_id)) {
                    byUnit.set(row.bookable_unit_id, {
                        ...row,
                        nights: 0,
                        sum: 0,
                        all_available: true,
                    });
                }
                const u = byUnit.get(row.bookable_unit_id);
                if (row.date) {
                    u.nights++;
                    if (row.is_available === false) u.all_available = false;
                    if (row.night_price != null) u.sum += parseFloat(row.night_price);
                }
            }
            for (const u of byUnit.values()) {
                if (!u.all_available || u.nights === 0) continue;
                const net = u.agreed_net_rate != null
                    ? parseFloat(u.agreed_net_rate) * u.nights
                    : u.sum;
                if (!Number.isFinite(net) || net <= 0) continue;
                results.push({
                    source: 'operator',
                    property_id: u.property_id,
                    hotel_name: u.hotel_name,
                    zone: u.city,
                    destination: u.country,
                    room_name: u.room_name,
                    max_guests: u.max_guests,
                    bookable_unit_id: u.bookable_unit_id,
                    nights: u.nights,
                    net_rate: Math.round(net * 100) / 100,
                    sell_rate: applyMarkup(net),
                    currency: u.currency || 'EUR',
                });
            }
        }

        results.sort((x, y) => x.sell_rate - y.sell_rate);
        res.json({
            success: true,
            count: results.length,
            markup_applied_pct: markupPct,
            results,
            debug,
        });
    } catch (error) {
        console.error('[search]', error);
        res.status(500).json({ success: false, error: error.message });
    }
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
const { createBooking: hbBook } = require('./lib/hotelbeds');

app.post('/api/book', requireAgent, async (req, res) => {
    try {
        const { source, rateKey, holder, paxes, sell_rate, currency } = req.body || {};
        if (source !== 'hotelbeds') {
            // Operator-direct booking via TA portal follows in a later ship.
            return res.status(501).json({ success: false, error: 'operator-direct booking via TA portal not yet wired — TA.4.1' });
        }
        if (!rateKey || !holder?.name || !holder?.surname) {
            return res.status(400).json({ success: false, error: 'rateKey + holder.name + holder.surname required' });
        }
        // Use account 272's Hotelbeds creds (singleton inventory account).
        const result = await hbBook(pool, 272, {
            rateKey,
            holder,
            paxes,
            clientReference: `GAS-AG${req.agent.sub}-${Date.now()}`,
        });
        if (!result.ok) {
            return res.json({ success: false, error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error), raw: result.raw });
        }
        const booking = result.data?.booking || {};

        // Persist: hotelbeds_bookings ledger (created earlier in main app) +
        // bookings mirror with travel_agent_id stamped for the dashboard.
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS hotelbeds_bookings (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER NOT NULL,
                    reference VARCHAR(100) UNIQUE,
                    status VARCHAR(50),
                    client_reference VARCHAR(100),
                    hotel_code VARCHAR(50),
                    hotel_name VARCHAR(255),
                    check_in DATE,
                    check_out DATE,
                    total_net NUMERIC(12,2),
                    currency VARCHAR(10),
                    holder_name VARCHAR(255),
                    holder_email VARCHAR(255),
                    raw JSONB,
                    travel_agent_id INTEGER,
                    sell_price NUMERIC(12,2),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            // The main app's create-table doesn't have travel_agent_id +
            // sell_price; add them idempotently here so this app can write them.
            await pool.query(`ALTER TABLE hotelbeds_bookings ADD COLUMN IF NOT EXISTS travel_agent_id INTEGER`);
            await pool.query(`ALTER TABLE hotelbeds_bookings ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12,2)`);

            await pool.query(
                `INSERT INTO hotelbeds_bookings (
                    account_id, reference, status, client_reference,
                    hotel_code, hotel_name, check_in, check_out,
                    total_net, currency, holder_name, holder_email, raw,
                    travel_agent_id, sell_price
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                 ON CONFLICT (reference) DO UPDATE SET
                    status = EXCLUDED.status,
                    travel_agent_id = COALESCE(EXCLUDED.travel_agent_id, hotelbeds_bookings.travel_agent_id),
                    sell_price = COALESCE(EXCLUDED.sell_price, hotelbeds_bookings.sell_price),
                    raw = EXCLUDED.raw`,
                [
                    272,
                    booking.reference || null,
                    booking.status || null,
                    booking.clientReference || null,
                    booking.hotel?.code != null ? String(booking.hotel.code) : null,
                    booking.hotel?.name || null,
                    booking.hotel?.checkIn || null,
                    booking.hotel?.checkOut || null,
                    parseFloat(booking.totalNet) || null,
                    booking.currency || null,
                    `${holder.name} ${holder.surname}`,
                    holder.email || null,
                    JSON.stringify(result.data),
                    req.agent.sub,
                    sell_rate != null ? parseFloat(sell_rate) : null,
                ]
            );
        } catch (persistErr) {
            console.error('[book] persist failed (booking was made upstream):', persistErr.message);
            // Surface but don't fail — Hotelbeds reference is captured in
            // the response so the agent can still see what was booked.
        }

        const net = parseFloat(booking.totalNet) || 0;
        const sell = sell_rate != null ? parseFloat(sell_rate) : net;
        res.json({
            success: true,
            booking,
            net_paid: net,
            sell_charged: sell,
            margin: sell - net,
            currency: booking.currency,
        });
    } catch (error) {
        console.error('[book]', error);
        res.status(500).json({ success: false, error: error.message });
    }
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
        const imageStrips = Object.entries(imagesByType).map(([t, list]) => {
            const sorted = list.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
            return `
              <div style="margin-top:1rem;">
                <div style="font-size:0.85rem; font-weight:600; color:#475569; margin-bottom:0.5rem;">${t} <span style="color:#94a3b8; font-weight:400;">(${list.length})</span></div>
                <div style="display:flex; overflow-x:auto; gap:0.5rem; padding-bottom:0.5rem;">
                  ${sorted.map((img) => `<img src="${imgUrl(img.path)}" alt="${t}" style="height:180px; width:280px; object-fit:cover; border-radius:8px; flex-shrink:0;" loading="lazy" onerror="this.style.display='none'">`).join('')}
                </div>
              </div>`;
        }).join('');

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
        const roomGrid = Array.from(roomsByName.values()).map((rm) => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem;">
                <strong style="font-size:0.85rem;">${rm.name}</strong>
                ${rm.codes.length > 1 ? `<span style="font-size:0.65rem; color:#6366f1; background:#eef2ff; padding:0.1rem 0.35rem; border-radius:999px; margin-left:0.35rem;">${rm.codes.length} variants</span>` : ''}
                <div style="font-size:0.7rem; color:#94a3b8; margin-top:0.25rem; font-family: ui-monospace, monospace;">${rm.codes.join(' · ')}</div>
            </div>
        `).join('');

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
