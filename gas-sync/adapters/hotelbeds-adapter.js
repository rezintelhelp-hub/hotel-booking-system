/**
 * Hotelbeds Adapter — wholesale bedbank inventory.
 *
 * Different shape from the PMS adapters (beds24/hostaway/smoobu): we don't
 * sync the operator's own listings, we query Hotelbeds for third-party hotel
 * inventory available for resale.
 *
 * Auth: each request signs (apiKey + secret + unix_timestamp) with SHA256
 * and sends the result in the X-Signature header. Stateless — no OAuth tokens
 * to refresh.
 *
 * Per-account credentials live on accounts table (hotelbeds_api_key,
 * hotelbeds_secret, hotelbeds_environment). Master GAS can keep its own
 * credentials too for testing.
 */

const axios = require('axios');
const crypto = require('crypto');

const HOTELBEDS_BASES = {
  test: 'https://api.test.hotelbeds.com',
  production: 'https://api.hotelbeds.com',
};

function makeSignature(apiKey, secret) {
  const ts = Math.floor(Date.now() / 1000);
  return crypto.createHash('sha256').update(`${apiKey}${secret}${ts}`).digest('hex');
}

function headers({ apiKey, secret, accept = 'application/json' }) {
  return {
    'Api-key': apiKey,
    'X-Signature': makeSignature(apiKey, secret),
    'Accept': accept,
    'Accept-Encoding': 'gzip',
  };
}

function baseFor(env) {
  return HOTELBEDS_BASES[env === 'production' ? 'production' : 'test'];
}

class HotelbedsAdapter {
  constructor({ apiKey, secret, environment = 'test' }) {
    if (!apiKey || !secret) throw new Error('Hotelbeds: apiKey + secret required');
    this.apiKey = apiKey;
    this.secret = secret;
    this.environment = environment;
    this.base = baseFor(environment);
  }

  // GET /hotel-api/1.0/status — verifies the credentials sign correctly and
  // the account is active. Returns { ok, raw }.
  async testConnection() {
    try {
      const resp = await axios.get(`${this.base}/hotel-api/1.0/status`, {
        headers: headers({ apiKey: this.apiKey, secret: this.secret }),
        timeout: 10000,
      });
      return { ok: true, status: resp.data?.status || 'unknown', raw: resp.data };
    } catch (e) {
      const upstream = e.response?.data?.error || e.response?.data || e.message;
      return { ok: false, error: upstream, http: e.response?.status || null };
    }
  }

  // POST /hotel-api/1.0/hotels — availability search.
  // params: { stay: { checkIn, checkOut }, occupancies: [{rooms, adults, children}],
  //          destination: { code }  OR  geolocation: { latitude, longitude, radius, unit } }
  // Adds sourceMarket if caller didn't (Hotelbeds cert recommends source market
  // declaration for correct localised pricing).
  async searchAvailability(params) {
    try {
      const payload = { sourceMarket: 'UK', ...params };
      const resp = await axios.post(`${this.base}/hotel-api/1.0/hotels`, payload, {
        headers: {
          ...headers({ apiKey: this.apiKey, secret: this.secret }),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return {
        ok: false,
        error: e.response?.data?.error || e.message,
        http: e.response?.status || null,
        raw: e.response?.data || null,
      };
    }
  }

  // POST /hotel-api/1.0/checkrates — verifies the rate is still bookable.
  async checkRates(rateKey) {
    try {
      const resp = await axios.post(`${this.base}/hotel-api/1.0/checkrates`, {
        rooms: [{ rateKey }],
      }, {
        headers: {
          ...headers({ apiKey: this.apiKey, secret: this.secret }),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, raw: e.response?.data || null };
    }
  }

  // POST /hotel-api/1.0/bookings — confirms a booking against a rateKey.
  // Cert requires 60s+ timeout for booking confirmation.
  async createBooking(payload) {
    try {
      const resp = await axios.post(`${this.base}/hotel-api/1.0/bookings`, payload, {
        headers: {
          ...headers({ apiKey: this.apiKey, secret: this.secret }),
          'Content-Type': 'application/json',
        },
        timeout: 75000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, raw: e.response?.data || null };
    }
  }

  // GET /hotel-content-api/1.0/hotels/{code} — full hotel detail (images,
  // descriptions, facilities, address, GPS). Cert requires that this data
  // be cached in our DB, not fetched per-search.
  async getHotelContent(hotelCode, { language = 'ENG' } = {}) {
    try {
      const params = new URLSearchParams({ language });
      const resp = await axios.get(`${this.base}/hotel-content-api/1.0/hotels/${encodeURIComponent(hotelCode)}/details?${params.toString()}`, {
        headers: headers({ apiKey: this.apiKey, secret: this.secret }),
        timeout: 15000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, raw: e.response?.data || null };
    }
  }

  async getBooking(reference) {
    try {
      const resp = await axios.get(`${this.base}/hotel-api/1.0/bookings/${encodeURIComponent(reference)}`, {
        headers: headers({ apiKey: this.apiKey, secret: this.secret }),
        timeout: 15000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, raw: e.response?.data || null };
    }
  }

  // GET /hotel-content-api/1.0/locations/destinations — Content API endpoint.
  // Lists Hotelbeds destinations with their canonical codes. Same Hotels API
  // key signs it.
  async listDestinations({ countryCode, from = 1, to = 200, language = 'ENG' } = {}) {
    try {
      const params = new URLSearchParams({
        fields: 'code,name,countryCode',
        language,
        from: String(from),
        to: String(to),
      });
      if (countryCode) params.set('countryCode', countryCode);
      const resp = await axios.get(`${this.base}/hotel-content-api/1.0/locations/destinations?${params.toString()}`, {
        headers: headers({ apiKey: this.apiKey, secret: this.secret }),
        timeout: 15000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, http: e.response?.status || null };
    }
  }

  async cancelBooking(reference, cancellationFlag = 'CANCELLATION') {
    try {
      const resp = await axios.delete(`${this.base}/hotel-api/1.0/bookings/${encodeURIComponent(reference)}?cancellationFlag=${cancellationFlag}`, {
        headers: headers({ apiKey: this.apiKey, secret: this.secret }),
        timeout: 15000,
      });
      return { ok: true, data: resp.data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.error || e.message, raw: e.response?.data || null };
    }
  }
}

// Helper for server-side code to grab an adapter bound to an account's
// stored credentials. Returns null if the account isn't connected.
async function getHotelbedsAdapterForAccount(pool, accountId) {
  const r = await pool.query(
    `SELECT hotelbeds_api_key, hotelbeds_secret, hotelbeds_environment, hotelbeds_status
       FROM accounts WHERE id = $1`,
    [accountId]
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  if (!row.hotelbeds_api_key || !row.hotelbeds_secret) return null;
  if (row.hotelbeds_status && row.hotelbeds_status !== 'active') return null;
  return new HotelbedsAdapter({
    apiKey: row.hotelbeds_api_key,
    secret: row.hotelbeds_secret,
    environment: row.hotelbeds_environment || 'test',
  });
}

module.exports = { HotelbedsAdapter, getHotelbedsAdapterForAccount };
