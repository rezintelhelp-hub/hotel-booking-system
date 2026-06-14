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

// ---- TA.2 placeholder: unified search ------------------------------------

app.post('/api/search', requireAgent, async (req, res) => {
    // Wired in TA.2. Body shape per docs/gas-travel-agent-unified-model.md:
    //   { destination | hotelCodes | geoBox, checkIn, checkOut, occupancies[] }
    // Returns merged operator + Hotelbeds results with markup applied.
    res.status(501).json({
        success: false,
        error: 'not implemented yet',
        phase: 'TA.2',
        spec: 'docs/gas-travel-agent-unified-model.md',
    });
});

// ---- TA.4 placeholder: unified booking ------------------------------------

app.post('/api/book', requireAgent, async (req, res) => {
    res.status(501).json({
        success: false,
        error: 'not implemented yet',
        phase: 'TA.4',
    });
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
<div class="placeholder">
  Phase <code>TA.3</code> — unified search UI lands here once the
  <code>POST /api/search</code> endpoint is wired in TA.2.
  <br><br>
  Spec: <code>docs/gas-travel-agent-unified-model.md</code>.
</div>` + HTML_FOOT);
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
