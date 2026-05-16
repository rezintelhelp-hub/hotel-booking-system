/**
 * Deliveroo Adapter — Menu / Orders / Update Order Status APIs
 * (Partner Platform Suite)
 *
 * Auth: OAuth2 client_credentials. Access token expires in ~1h, cached in memory.
 * Rate limits: not yet documented per-endpoint; default to 60 rpm + exponential
 * backoff on 429 / 5xx.
 * Pagination: per-endpoint; usually `?limit=...&cursor=...` or page-based.
 *
 * Cert path (Menu API): 17 scenarios in the developer portal — see tasks
 * #104–#108 and the project_channex_stripe_tokenization.md memory for the
 * GAS-side architecture (outbox + delta updates + batching + backoff).
 *
 * Sandbox URLs:
 *   API:  https://api-sandbox.developers.deliveroo.com
 *   Auth: https://auth-sandbox.developers.deliveroo.com
 *
 * Production URLs:
 *   API:  https://api.developers.deliveroo.com
 *   Auth: https://auth.developers.deliveroo.com
 */

const axios = require('axios');

const SANDBOX = {
  api: 'https://api-sandbox.developers.deliveroo.com',
  auth: 'https://auth-sandbox.developers.deliveroo.com',
};
const PRODUCTION = {
  api: 'https://api.developers.deliveroo.com',
  auth: 'https://auth.developers.deliveroo.com',
};

// =====================================================
// RATE LIMITER (60 rpm default — refine per cert feedback)
// =====================================================
class RateLimiter {
  constructor(rpm = 60) {
    this.rpm = rpm;
    this.requests = [];
  }
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60000);
    if (this.requests.length >= this.rpm) {
      const wait = 60000 - (now - this.requests[0]);
      console.log(`[Deliveroo] rate limit, waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
    this.requests.push(Date.now());
  }
}

// =====================================================
// ADAPTER
// =====================================================
class DeliverooAdapter {
  constructor(config = {}) {
    this.name = 'deliveroo';
    this.version = '0.1.0';
    this.capabilities = [
      'menu_upload',
      'menu_unavailabilities',
      'orders_webhook',
      'order_status_update',
      'menu_v3_async',
    ];

    this.clientId = config.clientId || process.env.DELIVEROO_MENU_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.DELIVEROO_MENU_CLIENT_SECRET;
    const env = config.environment || process.env.DELIVEROO_ENV || 'sandbox';
    const urls = env === 'production' ? PRODUCTION : SANDBOX;
    this.apiUrl = config.apiUrl || urls.api;
    this.authUrl = config.authUrl || urls.auth;

    this.rateLimiter = new RateLimiter(config.rpm || 60);

    this.pool = config.pool || null;
    this.connectionId = config.connectionId || null;

    this._token = null;
    this._tokenExpiresAt = 0;

    console.log('[Deliveroo] adapter init', {
      env,
      hasClientId: !!this.clientId,
      hasSecret: !!this.clientSecret,
      apiUrl: this.apiUrl,
    });
  }

  // ===== AUTH =====
  async _getAccessToken() {
    if (this._token && Date.now() < this._tokenExpiresAt - 60_000) return this._token;
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Deliveroo client credentials missing');
    }
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await axios.post(
      `${this.authUrl}/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 15_000,
      }
    );
    this._token = res.data.access_token;
    this._tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this._token;
  }

  // ===== REQUEST HELPER =====
  async request(method, path, { body, params, retries = 3 } = {}) {
    await this.rateLimiter.throttle();
    const token = await this._getAccessToken();
    let attempt = 0;
    while (true) {
      try {
        const res = await axios({
          method,
          url: `${this.apiUrl}${path}`,
          data: body,
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30_000,
          validateStatus: () => true,
        });
        if (res.status >= 200 && res.status < 300) {
          return { success: true, status: res.status, data: res.data };
        }
        // Retry on 429 / 5xx with backoff
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const retryAfter = parseInt(res.headers['retry-after'], 10);
          const wait = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : Math.min(30_000, 1000 * Math.pow(2, attempt));
          console.warn(`[Deliveroo] ${res.status} on ${method} ${path}, retry in ${wait}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, wait));
          attempt++;
          continue;
        }
        return { success: false, status: res.status, error: res.data, raw: res.data };
      } catch (err) {
        if (attempt < retries) {
          const wait = Math.min(30_000, 1000 * Math.pow(2, attempt));
          console.warn(`[Deliveroo] network error ${err.message}, retry in ${wait}ms`);
          await new Promise(r => setTimeout(r, wait));
          attempt++;
          continue;
        }
        return { success: false, error: err.message, code: 'NETWORK' };
      }
    }
  }

  // ===== SCENARIO 1: FETCH BRAND ID =====
  // GET /site/v1/restaurant_locations/{site_id} — returns the brand_id for
  // a specific site. brand_id is then used as a path param on Menu API calls.
  async getSiteBrand(siteId) {
    return this.request('GET', `/site/v1/restaurant_locations/${siteId}`);
  }

  // Kept as alias — old code may still reference getBrands.
  async getBrands(siteId = '101') {
    return this.getSiteBrand(siteId);
  }

  // ===== MENU API v1 (Scenarios 2–8) =====
  async uploadMenu(brandId, menuPayload) {
    return this.request('PUT', `/menu/v1/brands/${brandId}/menus/${menuPayload.menu_id || 'default'}`, {
      body: menuPayload,
    });
  }

  async getMenu(brandId, menuId = 'default') {
    return this.request('GET', `/menu/v1/brands/${brandId}/menus/${menuId}`);
  }

  // ===== ITEM AVAILABILITY (Scenarios 8–13) =====
  async updateUnavailabilities(siteId, items) {
    // items: [{ id, unavailable: true/false, unavailable_until?: ISO date }]
    return this.request('POST', `/menu/v1/sites/${siteId}/unavailabilities`, {
      body: { items },
    });
  }

  async resetUnavailabilities(siteId) {
    return this.request('DELETE', `/menu/v1/sites/${siteId}/unavailabilities`);
  }

  // ===== MENU V3 ASYNC (Scenarios 14–17) =====
  async generateUploadUrl(brandId) {
    return this.request('POST', `/menu/v3/brands/${brandId}/upload_url`);
  }

  async asyncMenuUpload(brandId, payload) {
    return this.request('POST', `/menu/v3/brands/${brandId}/menus`, { body: payload });
  }

  async getMenuJobStatus(brandId, jobId) {
    return this.request('GET', `/menu/v3/brands/${brandId}/jobs/${jobId}`);
  }

  async getMenuAsync(brandId, menuId = 'default') {
    return this.request('GET', `/menu/v3/brands/${brandId}/menus/${menuId}`);
  }

  // ===== ORDERS API =====
  // Orders arrive via webhook (/api/webhooks/deliveroo/order in GAS).
  // Order status updates (accept / mark ready / reject) below.
  async acceptOrder(orderId) {
    return this.request('PATCH', `/order/v1/orders/${orderId}/sync_status`, {
      body: { status: 'in_kitchen' },
    });
  }

  async markOrderReady(orderId) {
    return this.request('PATCH', `/order/v1/orders/${orderId}/sync_status`, {
      body: { status: 'ready_for_collection' },
    });
  }

  async rejectOrder(orderId, reason = 'busy') {
    return this.request('PATCH', `/order/v1/orders/${orderId}/sync_status`, {
      body: { status: 'rejected', reject_reason: reason },
    });
  }

  // ===== HEALTH =====
  async testConnection() {
    try {
      await this._getAccessToken();
      return { success: true, message: 'Token obtained' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { DeliverooAdapter };
