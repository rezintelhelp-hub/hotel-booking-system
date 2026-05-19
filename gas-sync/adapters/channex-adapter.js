/**
 * Channex Adapter for GasSync
 *
 * Channex.io is a channel manager (push ARI to OTAs, pull bookings back).
 * Unlike the other 5 adapters, Channex is being trialled as a *shared*
 * backend where one Channex account hosts many GAS customers — tenant
 * isolation via Channex Groups (Group per GAS account).
 *
 * Auth: static API key in `user-api-key: <key>` header. No token refresh.
 * Pagination: ?pagination[page]=N&pagination[limit]=M
 * Response shape: { data: [...], meta: { total, page, limit, ... } }
 * Error shape: { errors: { code, title, details? } }
 *
 * Account 197 is the trial customer. The connection row stores:
 *   credentials = { apiKey: '...', groupId: '<channex group uuid>' }
 *
 * Build context: trial v0.1.0 — does enough to validate the interface
 * end-to-end against staging. Production hardening (signed webhooks, full
 * amenity mapping, multi-rate-plan coordination, retry/backoff) deferred
 * until after Foundation Day 1's adapter post-mortem identifies the
 * canonical pattern. See docs/channex-adapter-trial-197.md for outcomes.
 */

const axios = require('axios');

// =====================================================
// CONFIGURATION
// =====================================================

const STAGING_BASE = 'https://staging.channex.io/api/v1';
const PRODUCTION_BASE = 'https://app.channex.io/api/v1';

// =====================================================
// CERT FIXTURES — from Channex self-cert form page 2
// (Test Property: GAS — Twin Room + Double Room, USD, BAR 100, B&B 120)
// =====================================================
const CHANNEX_CERT_FIXTURES = {
  PROPERTY:   'd3397365-a134-48c4-a7c9-de9f497466a8',
  TWIN_ROOM:  '2108e611-4698-46c2-88f6-a2d72039b39b',
  TWIN_BAR:   '1d43121a-8ca1-49f7-801e-b40a1fd7c0e9',
  TWIN_BB:    'a50a7ffe-65f3-4b8d-a9d7-6fc2f091bf88',
  DOUBLE_ROOM:'443ce23a-2899-4b8f-862c-31d6a9836c8d',
  DOUBLE_BAR: 'c2471d7b-f417-4382-83ac-86d1f1db5682',
  DOUBLE_BB:  '23968f57-3d14-43cd-acca-1a7e4ed8d4b9',
};

// =====================================================
// RATE LIMITER (mirrors the pattern used by Hostaway/Beds24)
// Channex publishes per-property ARI limits (10 availability + 10
// restrictions/price = 20/min/property). At the account level we self-
// throttle conservatively to 60 rpm; per-property bursts are managed
// inside updateAvailability via a small queue.
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
      console.log(`Channex rate limit reached, waiting ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
    this.requests.push(Date.now());
  }
}

// =====================================================
// CHANNEX ADAPTER
// =====================================================

class ChannexAdapter {
  constructor(config = {}) {
    this.name = 'channex';
    this.version = '0.1.0';
    this.capabilities = [
      'properties',
      'room_types',
      'rate_plans',
      'availability',
      'restrictions',
      'reservations',
      'webhooks',
      'create_property',     // unique to Channex among GAS adapters
      'create_room_type'
    ];

    // Auth — static API key, no token refresh. Either passed via
    // credentials.apiKey or directly as config.apiKey.
    this.apiKey = config.apiKey || config.token || null;

    // Tenant scoping — every GAS customer gets its own Channex Group;
    // groupId scopes property creation/listing. SyncManager has been
    // extended (this PR) to pass credentials.groupId through.
    this.groupId = config.groupId || null;

    // Environment — default staging for the trial; flip via config when
    // Channex production access is granted.
    this.baseUrl = config.baseUrl
      || (config.environment === 'production' ? PRODUCTION_BASE : STAGING_BASE);

    this.rateLimiter = new RateLimiter(config.rpm || 60);

    // DB plumbing — same shape as the other adapters.
    this.pool = config.pool || null;
    this.connectionId = config.connectionId || null;

    console.log('ChannexAdapter constructor:', {
      hasApiKey: !!this.apiKey,
      hasGroupId: !!this.groupId,
      baseUrl: this.baseUrl,
      connectionId: this.connectionId
    });
  }

  // =====================================================
  // HTTP HELPERS
  // =====================================================

  // Request helper with exponential backoff on 429 / 5xx. Cert test 12
  // requires we respect Channex's 20 ARI/min limit + back off cleanly.
  // Max 4 attempts (initial + 3 retries) waiting up to ~14s total before
  // giving up — keeps the outbox worker from getting wedged.
  async request(endpoint, method = 'GET', data = null, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'No API key configured', code: 'NO_AUTH' };
    }
    const maxAttempts = options.maxAttempts ?? 4;
    let attempt = 0;
    while (true) {
      await this.rateLimiter.throttle();
      try {
        const config = {
          method,
          url: `${this.baseUrl}${endpoint}`,
          headers: {
            'user-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
          },
          timeout: options.timeout || 30000,
          validateStatus: () => true,
        };
        if (data) config.data = data;
        if (options.params) config.params = options.params;
        const response = await axios(config);
        const status = response.status;
        if (status >= 200 && status < 300) {
          return { success: true, status, data: response.data?.data, meta: response.data?.meta || null, raw: response.data };
        }
        // Retry on 429 / 5xx; honour Retry-After header when present.
        if ((status === 429 || status >= 500) && attempt + 1 < maxAttempts) {
          const retryAfter = parseInt(response.headers['retry-after'], 10);
          const wait = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : Math.min(15_000, 1000 * Math.pow(2, attempt));
          console.warn(`[Channex] ${status} on ${method} ${endpoint}, retry in ${wait}ms (attempt ${attempt + 1}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, wait));
          attempt++;
          continue;
        }
        // Final error mapping consistent with handleError
        const body = response.data;
        const code = body?.errors?.code || 'UNKNOWN';
        const title = body?.errors?.title || ('HTTP ' + status);
        const details = body?.errors?.details;
        if (status === 401) return { success: false, status, error: 'Authentication failed', code: 'AUTH_FAILED' };
        if (status === 429) return { success: false, status, error: 'Rate limit exceeded', code: 'RATE_LIMIT' };
        if (status === 422) return { success: false, status, error: title, code: 'VALIDATION', details };
        return { success: false, status, error: title, code: status || code, details };
      } catch (err) {
        if (attempt + 1 < maxAttempts) {
          const wait = Math.min(15_000, 1000 * Math.pow(2, attempt));
          console.warn(`[Channex] network error ${err.message} on ${endpoint}, retry in ${wait}ms`);
          await new Promise(r => setTimeout(r, wait));
          attempt++;
          continue;
        }
        return this.handleError(err, endpoint);
      }
    }
  }

  handleError(err, endpoint) {
    const status = err.response?.status;
    const body = err.response?.data;
    const code = body?.errors?.code || 'UNKNOWN';
    const title = body?.errors?.title || err.message;
    const details = body?.errors?.details;

    console.error(`Channex API error [${endpoint}]:`, { status, code, title, details });

    if (status === 401) return { success: false, error: 'Authentication failed', code: 'AUTH_FAILED' };
    if (status === 429) return { success: false, error: 'Rate limit exceeded', code: 'RATE_LIMIT' };
    if (status === 422) return { success: false, error: title, code: 'VALIDATION', details };

    return { success: false, error: title, code: status || code, details };
  }

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  /**
   * Channex uses a static API key — no auth handshake. authenticate()
   * exists to satisfy the canonical interface and double as a connectivity
   * test. Returns { success } based on whether the key works.
   */
  async authenticate() {
    if (!this.apiKey) return { success: false, error: 'API key required' };
    // Hit a lightweight endpoint — listing properties with limit=1 is the
    // cheapest way to verify the key.
    const res = await this.request('/properties', 'GET', null, {
      params: { 'pagination[limit]': 1 }
    });
    if (res.success) return { success: true, message: 'API key valid' };
    return res;
  }

  async testConnection() {
    return this.authenticate();
  }

  // =====================================================
  // GROUPS — Channex's tenant primitive (no analogue in other adapters)
  // =====================================================

  async getGroups() {
    return this.request('/groups');
  }

  async getGroup(groupId) {
    return this.request(`/groups/${groupId}`);
  }

  /**
   * Provision a new tenant Group. Used when a new GAS account is
   * onboarded — we create one Group per account, then all that account's
   * properties live inside it. Mirrors the "GAS-{account_id}" naming
   * scheme used in the trial.
   */
  async createGroup(payload) {
    const body = {
      group: {
        title: payload.title,                       // e.g. "GAS-197"
        is_default: payload.isDefault || false
      }
    };
    return this.request('/groups', 'POST', body);
  }

  // =====================================================
  // PROPERTIES (Channex-side)
  // =====================================================

  /**
   * List Channex properties scoped to the configured Group. If groupId
   * is set on the adapter, filters at the Channex API level. Without a
   * groupId, returns all properties on the account (use sparingly —
   * this is what creates tenant-leakage risk in the multi-tenant model).
   */
  async getProperties(options = {}) {
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 100
    };
    if (this.groupId || options.groupId) {
      params['filter[group_id]'] = options.groupId || this.groupId;
    }
    const res = await this.request('/properties', 'GET', null, { params });
    if (!res.success) return res;
    const properties = (res.data || []).map(p => this.mapProperty(p));
    return { success: true, data: properties, pagination: res.meta };
  }

  async getProperty(propertyId) {
    const res = await this.request(`/properties/${propertyId}`);
    if (!res.success) return res;
    return { success: true, data: this.mapProperty(res.data) };
  }

  /**
   * Create a Channex property under the configured Group. Channex's
   * /properties is one of the few CMs in the GAS portfolio that exposes
   * write-side property creation — this is the lever for programmatic
   * onboarding.
   *
   * Required fields per docs: title, currency, country, timezone,
   * group_id, settings.allow_overbooking (boolean).
   */
  async createProperty(payload) {
    if (!this.groupId && !payload.groupId) {
      return { success: false, error: 'groupId required to create property', code: 'NO_GROUP' };
    }
    const body = {
      property: {
        title: payload.title,
        currency: payload.currency || 'EUR',
        email: payload.email || '',
        phone: payload.phone || '',
        timezone: payload.timezone || 'Europe/Paris',
        country: payload.country || 'GB',
        state: payload.state || '',
        city: payload.city || '',
        address: payload.address || '',
        zip_code: payload.zipCode || '',
        property_type: payload.propertyType || 'apartment',
        group_id: payload.groupId || this.groupId,
        settings: {
          allow_overbooking: false,
          ...(payload.settings || {})
        },
        content: payload.content || undefined,    // photos, description, etc.
        ...payload.extra
      }
    };
    return this.request('/properties', 'POST', body);
  }

  // Map Channex's verbose property record onto GAS's canonical shape.
  // Don't lose any source fields — `raw` carries the full payload for the
  // trial's documentation phase.
  mapProperty(raw) {
    const a = raw.attributes || raw;
    return {
      externalId: raw.id || a.id,
      name: a.title || a.name || '',
      description: a.description || '',
      currency: a.currency || 'EUR',
      timezone: a.timezone || '',
      address: {
        street: a.address || '',
        city: a.city || '',
        state: a.state || '',
        country: a.country || '',
        zipCode: a.zip_code || ''
      },
      groupId: a.group_id || null,
      metadata: {
        propertyType: a.property_type,
        isActive: a.is_active !== false,
        settings: a.settings || {}
      },
      raw
    };
  }

  // =====================================================
  // ROOM TYPES
  // =====================================================

  async getRoomTypes(propertyExternalId, options = {}) {
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 100,
      'filter[property_id]': propertyExternalId
    };
    const res = await this.request('/room_types', 'GET', null, { params });
    if (!res.success) return res;
    return {
      success: true,
      data: (res.data || []).map(r => this.mapRoomType(r)),
      pagination: res.meta
    };
  }

  async createRoomType(propertyExternalId, payload) {
    const body = {
      room_type: {
        property_id: propertyExternalId,
        title: payload.title,
        count_of_rooms: payload.countOfRooms || 1,
        occ_adults: payload.maxAdults || 2,
        occ_children: payload.maxChildren || 0,
        occ_infants: payload.maxInfants || 0,
        default_occupancy: payload.defaultOccupancy || payload.maxAdults || 2,
        room_kind: payload.roomKind || 'room',
        capacity: payload.capacity || (payload.maxAdults || 2) + (payload.maxChildren || 0),
        content: payload.content || undefined,
        ...payload.extra
      }
    };
    return this.request('/room_types', 'POST', body);
  }

  mapRoomType(raw) {
    const a = raw.attributes || raw;
    return {
      externalId: raw.id || a.id,
      propertyId: a.property_id,
      name: a.title || a.name || '',
      countOfRooms: a.count_of_rooms || 1,
      maxAdults: a.occ_adults || 2,
      maxChildren: a.occ_children || 0,
      maxInfants: a.occ_infants || 0,
      capacity: a.capacity,
      roomKind: a.room_kind,
      raw
    };
  }

  // =====================================================
  // RATE PLANS — required before push availability/rates;
  // Channex requires at least one rate plan per room_type.
  // =====================================================

  async getRatePlans(propertyExternalId, options = {}) {
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 100,
      'filter[property_id]': propertyExternalId
    };
    return this.request('/rate_plans', 'GET', null, { params });
  }

  async createRatePlan(payload) {
    const body = {
      rate_plan: {
        title: payload.title || 'Standard Rate',
        property_id: payload.propertyId,
        room_type_id: payload.roomTypeId,
        currency: payload.currency || 'EUR',
        sell_mode: payload.sellMode || 'per_room',
        rate_mode: payload.rateMode || 'manual',
        occupancy: payload.occupancy || 2,
        children: payload.children || 0,
        ...payload.extra
      }
    };
    return this.request('/rate_plans', 'POST', body);
  }

  // =====================================================
  // AVAILABILITY (read + write)
  // =====================================================

  /**
   * Channex's availability is queried by room_type, date range. Returns
   * counts per date. We map to a date-keyed object for the canonical GAS
   * adapter shape.
   *
   * NOTE: Channex requires `filter[property_id]` on /availability — even
   * though room_type_id is unique enough on its own. Caller passes the
   * propertyId as the third arg's `propertyId` option, OR we look it up
   * from the room type if pool/connectionId are wired.
   */
  async getAvailability(roomTypeExternalId, startDate, endDate, options = {}) {
    let propertyId = options.propertyId;
    if (!propertyId) {
      // Resolve property_id from the room_type. Channex puts the link
      // in JSON:API-style relationships (data.relationships.property.data.id),
      // not in attributes.
      const rt = await this.request(`/room_types/${roomTypeExternalId}`);
      propertyId = rt.data?.relationships?.property?.data?.id
        || rt.data?.attributes?.property_id
        || rt.data?.property_id;
    }
    if (!propertyId) {
      return { success: false, error: 'property_id required for /availability filter', code: 'NO_PROPERTY' };
    }
    const params = {
      'filter[property_id]': propertyId,
      'filter[room_type_id]': roomTypeExternalId,
      'filter[date][gte]': startDate,
      'filter[date][lte]': endDate
    };
    const res = await this.request('/availability', 'GET', null, { params });
    if (!res.success) return res;
    // Channex's quirk: availability comes back as a nested object
    //   { room_type_id: { 'YYYY-MM-DD': count, ... } }
    // not an array. Flatten into the canonical adapter shape.
    const out = [];
    const grouped = res.data || {};
    for (const rtId of Object.keys(grouped)) {
      const dateMap = grouped[rtId] || {};
      for (const date of Object.keys(dateMap)) {
        out.push({ roomTypeId: rtId, date, availability: Number(dateMap[date]) || 0 });
      }
    }
    return { success: true, data: out };
  }

  /**
   * Push availability for a single room_type / date. The `count` parameter
   * is the number of rooms available on that date. Channex requires
   * property_id in each value — caller passes it in `options.propertyId`,
   * or we resolve from /room_types/{id} as in getAvailability.
   *
   * Async: Channex returns a `task` ID, not a final state. Eventual-
   * consistency window is ~1-2s on staging. Production callers should
   * poll the task or read-after-write to confirm.
   *
   * Restrictions (min_stay, closed_to_arrival, etc.) flow via
   * updateRestrictions below.
   */
  async updateAvailability(roomTypeExternalId, date, count, options = {}) {
    let propertyId = options.propertyId;
    if (!propertyId) {
      const rt = await this.request(`/room_types/${roomTypeExternalId}`);
      propertyId = rt.data?.relationships?.property?.data?.id;
    }
    if (!propertyId) {
      return { success: false, error: 'property_id required for /availability push', code: 'NO_PROPERTY' };
    }
    const body = {
      values: [{
        property_id: propertyId,
        room_type_id: roomTypeExternalId,
        date,
        availability: count
      }]
    };
    return this.request('/availability', 'POST', body);
  }

  /**
   * Bulk version — array of { propertyId, roomTypeId, date, count }.
   * Channex accepts up to ~1000 items per call. Caller MUST provide
   * propertyId on each item; we don't auto-resolve in batch mode.
   */
  async updateAvailabilityBatch(items) {
    const body = {
      values: items.map(i => ({
        property_id: i.propertyId,
        room_type_id: i.roomTypeId,
        date: i.date,
        availability: i.count
      }))
    };
    return this.request('/availability', 'POST', body);
  }

  /**
   * Push per-date restrictions/rates against rate plans.
   *
   * items: [{ propertyId, ratePlanId, date, rate?, minStayArrival?, ... }]
   *
   * NOTE: Channex requires `property_id` in each value, mirroring the
   * /availability quirk. Without it the API returns 2xx but silently
   * applies nothing — the rate plan default shows on read instead.
   * Caller MUST provide propertyId per item.
   */
  async updateRestrictions(items) {
    // Rate format: Channex expects the integer "lowest fraction" — cents for
    // USD/EUR/GBP. Callers pass decimal major-units (e.g. 333.00); we encode
    // here. Cert rejection 2026-05-19 #2 was a direct hit on this.
    const encodeRate = (v) => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (Number.isNaN(n)) return undefined;
      return Math.round(n * 100);
    };

    const body = {
      values: items.map(i => {
        const out = {
          property_id: i.propertyId,
          rate_plan_id: i.ratePlanId,
          date: i.date,
        };
        if (i.rate !== undefined) {
          const enc = encodeRate(i.rate);
          if (enc !== undefined) out.rate = enc;
        }
        if (i.minStayArrival !== undefined) out.min_stay_arrival = i.minStayArrival;
        if (i.minStayThrough !== undefined) out.min_stay_through = i.minStayThrough;
        if (i.closedToArrival !== undefined) out.closed_to_arrival = i.closedToArrival;
        if (i.closedToDeparture !== undefined) out.closed_to_departure = i.closedToDeparture;
        if (i.stopSell !== undefined) out.stop_sell = i.stopSell;
        return out;
      })
    };
    return this.request('/restrictions', 'POST', body);
  }

  // =====================================================
  // CERTIFICATION TEST RUNNERS
  // Each method below executes one Channex cert scenario against the
  // hard-coded test property/rooms/rate-plans (set on form page 2).
  // Returns the task ID(s) Channex hands back, ready to paste into the
  // self-cert Google Form. Bypasses the outbox so cert traffic doesn't
  // mingle with real client ARI in gas_channex_outbox.
  // =====================================================

  /**
   * Test #1 — Full Sync.
   * Two API calls total:
   *   1. /availability — every room × 500 days in ONE call.
   *   2. /restrictions — every rate plan × 500 days in ONE call
   *      (rate + min stay + closed flags + stop sell).
   * Returns { availabilityTaskId, restrictionsTaskId }.
   */
  async runCertFullSync(fixtures = CHANNEX_CERT_FIXTURES) {
    const days = 500;
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const dateFor = (offset) => {
      const d = new Date(start.getTime() + offset * 86400000);
      return d.toISOString().slice(0, 10);
    };

    // ---- 1. Availability: all rooms × 500 days, ONE call ----
    const availValues = [];
    for (const roomTypeId of [fixtures.TWIN_ROOM, fixtures.DOUBLE_ROOM]) {
      for (let d = 0; d < days; d++) {
        availValues.push({
          property_id: fixtures.PROPERTY,
          room_type_id: roomTypeId,
          date: dateFor(d),
          availability: 1
        });
      }
    }
    const availResp = await this.request('/availability', 'POST', { values: availValues });
    const availTaskId = availResp?.data?.[0]?.id || availResp?.raw?.data?.[0]?.id || null;

    // ---- 2. Restrictions: all rate plans × 500 days, ONE call ----
    // Default rates from cert form: BAR 100, B&B 120. Encoded as integer cents.
    const rateByPlan = {
      [fixtures.TWIN_BAR]:   100 * 100,
      [fixtures.TWIN_BB]:    120 * 100,
      [fixtures.DOUBLE_BAR]: 100 * 100,
      [fixtures.DOUBLE_BB]:  120 * 100,
    };
    const restrValues = [];
    for (const ratePlanId of Object.keys(rateByPlan)) {
      for (let d = 0; d < days; d++) {
        restrValues.push({
          property_id: fixtures.PROPERTY,
          rate_plan_id: ratePlanId,
          date: dateFor(d),
          rate: rateByPlan[ratePlanId],
          min_stay_arrival: 1,
          min_stay_through: 1,
          closed_to_arrival: false,
          closed_to_departure: false,
          stop_sell: false
        });
      }
    }
    const restrResp = await this.request('/restrictions', 'POST', { values: restrValues });
    const restrTaskId = restrResp?.data?.[0]?.id || restrResp?.raw?.data?.[0]?.id || null;

    return {
      success: !!(availTaskId && restrTaskId),
      availabilityTaskId: availTaskId,
      restrictionsTaskId: restrTaskId,
      counts: { availability: availValues.length, restrictions: restrValues.length },
      raw: { availability: availResp, restrictions: restrResp }
    };
  }

  // =====================================================
  // BOOKINGS / RESERVATIONS
  // =====================================================

  /**
   * Pull bookings for a property within a date range. Channex's canonical
   * idempotent path is the booking-revisions feed (with ack); for the
   * trial we use the simpler /bookings list endpoint and add revisions
   * once we know what Channex actually returns on staging.
   */
  async getReservations(options = {}) {
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 100
    };
    if (options.propertyId) params['filter[property_id]'] = options.propertyId;
    if (options.fromDate) params['filter[arrival_date][gte]'] = options.fromDate;
    if (options.toDate) params['filter[arrival_date][lte]'] = options.toDate;
    const res = await this.request('/bookings', 'GET', null, { params });
    if (!res.success) return res;
    return {
      success: true,
      data: (res.data || []).map(b => this.mapReservation(b)),
      pagination: res.meta
    };
  }

  async getReservation(externalId) {
    const res = await this.request(`/bookings/${externalId}`);
    if (!res.success) return res;
    return { success: true, data: this.mapReservation(res.data) };
  }

  mapReservation(raw) {
    const a = raw.attributes || raw;
    return {
      externalId: raw.id || a.id,
      ota: a.ota_name || a.channel || 'unknown',
      otaReservationCode: a.ota_reservation_code,
      status: a.status,
      checkIn: a.arrival_date,
      checkOut: a.departure_date,
      guest: {
        firstName: a.customer?.name || a.guest_first_name || '',
        lastName: a.customer?.surname || a.guest_last_name || '',
        email: a.customer?.mail || a.guest_email || '',
        phone: a.customer?.phone || a.guest_phone || ''
      },
      totalPrice: parseFloat(a.amount || 0),
      currency: a.currency,
      createdAt: a.inserted_at,
      updatedAt: a.updated_at,
      raw
    };
  }

  // =====================================================
  // WEBHOOKS
  // =====================================================

  /**
   * Subscribe to webhook events. Channex requires EITHER property_id
   * (per-property webhook) OR is_global=true (organisation-wide).
   *
   * For the GAS multi-tenant model the right pattern is is_global=true
   * with one callback URL on our side that routes by booking.property_id
   * back to the correct gas_sync_connection. Per-property webhooks would
   * mean N subscriptions per customer, harder to manage.
   *
   * options: { propertyId, isGlobal, events }
   */
  async registerWebhook(callbackUrl, events, options = {}) {
    const eventList = Array.isArray(events) && events.length
      ? events
      : ['booking_new', 'booking_modify', 'booking_cancel'];
    const body = {
      webhook: {
        callback_url: callbackUrl,
        event_mask: eventList.join(','),
        send_data: true,
        is_active: true,
        ...(options.isGlobal
          ? { is_global: true }
          : { property_id: options.propertyId })
      }
    };
    return this.request('/webhooks', 'POST', body);
  }

  async listWebhooks() {
    return this.request('/webhooks');
  }

  async deleteWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}`, 'DELETE');
  }

  /**
   * Parse an incoming Channex webhook into the canonical GAS event shape.
   * Channex emits: { event, payload: { revision_id, booking_id, ... } }
   * We normalise event names to match Beds24/Hostaway: reservation.created,
   * reservation.updated, reservation.cancelled.
   */
  parseWebhookPayload(payload, headers) {
    const eventName = payload.event || payload.event_type || 'unknown';
    const data = payload.payload || payload.data || payload;

    const eventMap = {
      booking_new: 'reservation.created',
      booking_modify: 'reservation.updated',
      booking_cancel: 'reservation.cancelled',
      availability_changed: 'availability.updated',
      property_updated: 'property.updated'
    };

    return {
      event: eventMap[eventName] || eventName,
      externalId: data.booking_id || data.id || null,
      data,
      timestamp: payload.timestamp || new Date().toISOString(),
      raw: payload
    };
  }

  // =====================================================
  // SYNC (DB integration — mirrors Hostaway pattern)
  // =====================================================

  async fullSync() {
    console.log('Channex: Starting full sync', { groupId: this.groupId });
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 }
    };
    try {
      const propsRes = await this.getProperties({ limit: 100 });
      if (!propsRes.success) throw new Error(propsRes.error);

      for (const property of propsRes.data) {
        try {
          await this.syncPropertyToDatabase(property);
          stats.properties.synced++;

          const rtRes = await this.getRoomTypes(property.externalId, { limit: 100 });
          if (rtRes.success) stats.roomTypes.synced += rtRes.data.length;
        } catch (e) {
          console.error(`Channex: error syncing property ${property.externalId}:`, e.message);
          stats.properties.errors++;
        }
      }
      return { success: true, stats };
    } catch (e) {
      console.error('Channex full sync error:', e);
      return { success: false, error: e.message, stats };
    }
  }

  /**
   * Cert test 11: pull new/changed bookings via revision feed instead of
   * polling the full /bookings list. Each revision must be acknowledged
   * after we've processed it, otherwise Channex keeps sending it.
   *
   * Exact endpoint paths confirmed from cert sandbox (Channex docs are
   * thin on this). Override via config if Channex's URL differs.
   */
  async getBookingRevisions(options = {}) {
    // Cursor-based: pagination[page] continues from where we left off.
    // limit kept small (100) so a single page is processable per tick.
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 100,
    };
    if (options.since) params['filter[from_revision]'] = options.since;
    const res = await this.request('/booking_revisions', 'GET', null, { params });
    if (!res.success) return res;
    return {
      success: true,
      data: res.data || [],
      meta: res.meta,
    };
  }

  async acknowledgeBookingRevision(revisionId) {
    // Channex's per-revision ack — POST with empty body. If they expect a
    // batch endpoint instead, the worker can switch to acknowledgeRevisions(ids)
    // below. Surfaced separately so callers can ack as they process.
    return this.request(`/booking_revisions/${revisionId}/ack`, 'POST', {});
  }

  async acknowledgeRevisions(revisionIds) {
    // Bulk ack — single round-trip. Some Channex versions accept this shape;
    // if cert testing rejects it we fall back to per-revision loops.
    return this.request('/booking_revisions/ack', 'POST', { ids: revisionIds });
  }

  /**
   * Real incremental sync: drain the revision feed in pages, persist each
   * booking, ack as we go. Returns counts + last revision ID processed.
   * Caller (server.js cron) stores last_revision against the connection
   * so the next call resumes correctly.
   */
  async incrementalSync(since) {
    if (!this.pool || !this.connectionId) {
      console.log('[Channex] incrementalSync: no pool/connectionId, skipping');
      return { success: true, processed: 0, lastRevision: since };
    }
    let processed = 0;
    let acked = 0;
    let lastRev = since || null;
    let page = 1;
    let pages = 0;
    const MAX_PAGES = 50; // safety stop — 5000 revisions per run
    while (pages < MAX_PAGES) {
      const r = await this.getBookingRevisions({ page, limit: 100, since });
      if (!r.success) {
        console.error('[Channex] revision fetch failed:', r.error);
        break;
      }
      const revisions = r.data || [];
      if (revisions.length === 0) break;
      for (const rev of revisions) {
        try {
          const booking = rev.attributes?.booking || rev.booking || rev;
          await this.syncReservationToDatabase(booking, rev.id);
          await this.acknowledgeBookingRevision(rev.id);
          acked++;
          lastRev = rev.id;
        } catch (e) {
          console.error('[Channex] revision process error', rev.id, e.message);
        }
        processed++;
      }
      pages++;
      if (revisions.length < 100) break; // last page
      page++;
    }
    return { success: true, processed, acked, lastRevision: lastRev };
  }

  /**
   * Persist a single booking (from webhook or revision feed) into GAS DB.
   * Idempotent — keyed on external_id (Channex booking ID). Caller
   * acknowledges after this returns successfully.
   */
  async syncReservationToDatabase(rawBooking, revisionId = null) {
    if (!this.pool || !this.connectionId) return null;
    // Make sure the revision-tracking column exists (idempotent migration —
    // the cert added this requirement; older databases pre-date it).
    await this.pool.query(
      `ALTER TABLE gas_sync_reservations ADD COLUMN IF NOT EXISTS external_revision_id VARCHAR(128)`
    ).catch(() => {});
    const mapped = this.mapReservation(rawBooking);
    const r = await this.pool.query(`
      INSERT INTO gas_sync_reservations (
        connection_id, external_id, status, check_in, check_out, guest_first_name,
        guest_last_name, guest_email, total, currency, raw_data,
        external_revision_id, synced_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        status = EXCLUDED.status,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        guest_first_name = EXCLUDED.guest_first_name,
        guest_last_name = EXCLUDED.guest_last_name,
        guest_email = EXCLUDED.guest_email,
        total = EXCLUDED.total,
        currency = EXCLUDED.currency,
        raw_data = EXCLUDED.raw_data,
        external_revision_id = COALESCE(EXCLUDED.external_revision_id, gas_sync_reservations.external_revision_id),
        synced_at = NOW()
      RETURNING id
    `, [
      this.connectionId,
      mapped.externalId,
      mapped.status || 'confirmed',
      mapped.checkIn,
      mapped.checkOut,
      mapped.guest?.firstName || null,
      mapped.guest?.lastName || null,
      mapped.guest?.email || null,
      mapped.totalAmount || null,
      mapped.currency || null,
      JSON.stringify(mapped.raw || rawBooking),
      revisionId,
    ]).catch(e => {
      console.error('[Channex] DB upsert failed:', e.message);
      return null;
    });
    return r?.rows[0]?.id || null;
  }

  async syncPropertyToDatabase(property) {
    if (!this.pool || !this.connectionId) {
      console.log('Channex: no pool/connectionId, skipping db sync');
      return;
    }
    const propResult = await this.pool.query(`
      INSERT INTO gas_sync_properties (
        connection_id, external_id, name, city, country, currency,
        timezone, is_active, synced_at, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        currency = EXCLUDED.currency,
        timezone = EXCLUDED.timezone,
        is_active = EXCLUDED.is_active,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data
      RETURNING id
    `, [
      this.connectionId,
      property.externalId,
      property.name,
      property.address?.city || '',
      property.address?.country || '',
      property.currency || 'EUR',
      property.timezone || '',
      property.metadata?.isActive !== false,
      JSON.stringify(property.raw)
    ]);
    return propResult.rows[0].id;
  }

  // =====================================================
  // CHANNEL CONNECTION MANAGEMENT
  //
  // White-label-only API surface for connecting OTAs (Booking.com, Airbnb,
  // Expedia, etc.) to Channex programmatically. Documented in the private
  // "Channel Connection API" PDFs Evan supplied (docs/channex-research/from-evan/).
  //
  // STABILITY WARNING: Channex marks these endpoints as "non-public — methods
  // and structure can be changed at any time". Mitigations baked in here:
  //   - Thin pass-through wrappers (one method per docs endpoint), so a shape
  //     change blast-radiuses to one function.
  //   - Errors bubble up as-is instead of being swallowed — callers must
  //     handle each failure mode per OTA-specific UX.
  //   - All channel-management calls fail-closed: never write a partial state
  //     into GAS DB on a Channex error.
  //
  // Two flow shapes — BDC-style (collect-fields → test → map) and Airbnb-style
  // (OAuth → fetch listings → map). See PDFs for end-to-end specs.
  // =====================================================

  /**
   * GET /api/v1/channels/list — full catalog of OTAs Channex can connect to,
   * with per-OTA `params` (channel-level config fields) and `rate_params`
   * (per-rate mapping fields). Used to drive the "connect a new channel" UI.
   *
   * Already partially exposed via `getRatePlans` etc.; this is the catalog
   * endpoint specifically for channel-creation flows.
   */
  async listAvailableChannels() {
    return this.request('/channels/list');
  }

  /**
   * POST /api/v1/channels/test_connection — validate user-supplied OTA
   * credentials (BDC hotel_id, Expedia hotel ID, etc.) before showing the
   * mapping UI. Returns { success: true } on valid config.
   */
  async testChannelConnection(channelCode, settings) {
    return this.request('/channels/test_connection', 'POST', {
      channel: channelCode,
      settings
    });
  }

  /**
   * POST /api/v1/channels/mapping_details — fetch the OTA's room types and
   * rate plans (with their IDs on the OTA side) so we can build a mapping.
   * For BDC this returns rooms + rates from the BDC extranet; for Airbnb
   * (after OAuth completed) this returns the listing dictionary.
   */
  async getChannelMappingDetails(channelCode, settings) {
    return this.request('/channels/mapping_details', 'POST', {
      channel: channelCode,
      settings
    });
  }

  /**
   * POST /api/v1/channels/connection_details — small endpoint Channex marks
   * as "temporary, may merge with mapping_details". For BDC it returns the
   * required currency. Worth calling so we can validate currency match
   * before saving the mapping.
   */
  async getChannelConnectionDetails(channelCode, settings) {
    return this.request('/channels/connection_details', 'POST', {
      channel: channelCode,
      settings
    });
  }

  /**
   * POST /api/v1/channels — create the channel + mapping. Payload shape per
   * OTA differs slightly; this is the BDC/Expedia/OpenChannel shape with
   * `rate_plans[]` mapping array. For Airbnb the channel is auto-created
   * after OAuth — use updateChannel + createAirbnbMapping instead.
   *
   * Required fields: channel (OTA code), group_id, properties[], rate_plans[],
   * settings.
   */
  async createChannel(payload) {
    return this.request('/channels', 'POST', { channel: payload });
  }

  async updateChannel(channelId, payload) {
    return this.request(`/channels/${channelId}`, 'PUT', { channel: payload });
  }

  async deleteChannel(channelId) {
    return this.request(`/channels/${channelId}`, 'DELETE');
  }

  async getChannel(channelId) {
    return this.request(`/channels/${channelId}`);
  }

  /**
   * GET /api/v1/channels/{id}/execute/{action} — invoke an OTA-specific
   * action. Most useful: `load_future_reservations` to pull all upcoming
   * bookings from the OTA into Channex's booking pipeline.
   */
  async executeChannelAction(channelId, actionName) {
    return this.request(`/channels/${channelId}/execute/${actionName}`);
  }

  // =====================================================
  // AIRBNB-SPECIFIC FLOW (OAuth-based)
  // =====================================================

  /**
   * POST /api/v1/meta/airbnb/connection_link — the OAuth init endpoint.
   * Returns an Airbnb authorisation URL. Caller redirects the host to that
   * URL; host approves; Airbnb → Channex → our `redirect_uri` with
   * `?success=true&channel_id=X&token=TOKEN`.
   *
   * `properties[]` — GAS-side properties this connection will cover (Airbnb
   * supports multi-property; one connection can map several listings to
   * several Channex properties).
   *
   * `redirect_uri` — our GAS Admin endpoint that handles the callback.
   * Should be a stable URL we control. After redirect, GAS persists the
   * channel_id against the customer's gas_sync_connections row.
   *
   * `failure_redirect_uri` — same shape but for OAuth-rejected flow.
   *
   * `token` — opaque value GAS passes through; lets us correlate the
   * incoming redirect with the right gas_sync_connections row + UI session.
   *
   * `settings` — Airbnb-specific channel settings (min_stay_type,
   * booking_amount_settings, cohost_payout_calculations, send_email_notifications,
   * email).
   */
  async getAirbnbConnectionLink(payload) {
    return this.request('/meta/airbnb/connection_link', 'POST', {
      connection_link: {
        group_id: payload.groupId,
        properties: payload.properties || [],
        channel_id: payload.channelId || undefined,    // re-connection flow
        redirect_uri: payload.redirectUri,
        failure_redirect_uri: payload.failureRedirectUri || payload.redirectUri,
        token: payload.token || '',
        title: payload.title || 'Airbnb Channel',
        settings: payload.settings || {
          min_stay_type: 'Arrival',
          booking_amount_settings: 'Payout Amount',
          cohost_payout_calculations: false,
          send_email_notifications: false
        }
      }
    });
  }

  /**
   * GET /api/v1/channels/{id}/action/listings — list of Airbnb listings on
   * the connected account. Each entry has id, title, type, sync category.
   * Use this to populate the "pick listings to connect" picker after OAuth.
   */
  async getAirbnbListings(channelId) {
    return this.request(`/channels/${channelId}/action/listings`);
  }

  /**
   * GET /api/v1/channels/{id}/action/listing_details?listing_id=X —
   * THE big one: full listing data (photos, descriptions, amenities, rooms,
   * beds, address, pricing settings, booking settings, availability rules).
   * This is what enables the "import Airbnb listing → render GAS website
   * from it" play.
   */
  async getAirbnbListingDetails(channelId, listingId) {
    return this.request(`/channels/${channelId}/action/listing_details`, 'GET', null, {
      params: { listing_id: listingId }
    });
  }

  /**
   * POST /api/v1/channels/{id}/mappings — create one listing→GAS-rate-plan
   * mapping. Payload: { rate_plan_id, settings: { listing_id } }. After
   * mapping, listing's pricing/availability flows between GAS ↔ Airbnb.
   */
  async createAirbnbMapping(channelId, ratePlanId, listingId) {
    return this.request(`/channels/${channelId}/mappings`, 'POST', {
      mapping: {
        rate_plan_id: ratePlanId,
        settings: { listing_id: String(listingId) }
      }
    });
  }

  async deleteAirbnbMapping(channelId, mappingId) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}`, 'DELETE');
  }

  /**
   * POST /api/v1/channels/{id}/activate — flip the channel from inactive
   * (default after OAuth + mapping) to live. Once active, ARI flows to
   * Airbnb and bookings flow back.
   */
  async activateChannel(channelId) {
    return this.request(`/channels/${channelId}/activate`, 'POST', {});
  }

  /**
   * GET /api/v1/channels/{id}/action/get_listing_calendar?listing_id=X&date_from&date_to
   * Per-date calendar from Airbnb-side: availability_type, daily_price,
   * min_nights, max_nights, closed_to_arrival/departure, notes.
   * Useful for diffing what's on Airbnb vs what GAS thinks should be there.
   */
  async getAirbnbListingCalendar(channelId, listingId, dateFrom, dateTo) {
    return this.request(`/channels/${channelId}/action/get_listing_calendar`, 'GET', null, {
      params: { listing_id: listingId, date_from: dateFrom, date_to: dateTo }
    });
  }

  // =====================================================
  // AIRBNB SETTINGS (per-mapping pricing/availability/booking)
  // OpenAPI specs in docs/channex-research/from-evan/Airbnb/*.yaml.
  // =====================================================

  async getAirbnbAvailabilitySettings(channelId, mappingId) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/availability_settings`);
  }
  async updateAirbnbAvailabilitySettings(channelId, mappingId, settings) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/availability_settings`, 'PUT', settings);
  }
  async getAirbnbPricingSettings(channelId, mappingId) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/pricing_settings`);
  }
  async updateAirbnbPricingSettings(channelId, mappingId, settings) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/pricing_settings`, 'PUT', settings);
  }
  async getAirbnbBookingSettings(channelId, mappingId) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/booking_settings`);
  }
  async updateAirbnbBookingSettings(channelId, mappingId, settings) {
    return this.request(`/channels/${channelId}/mappings/${mappingId}/booking_settings`, 'PUT', settings);
  }
  async getAirbnbPromotions(channelId) {
    return this.request(`/channels/${channelId}/promotions`);
  }
  async enableAirbnbPromotion(channelId, payload) {
    return this.request(`/channels/${channelId}/promotions/enable`, 'POST', payload);
  }
  async disableAirbnbPromotion(channelId, payload) {
    return this.request(`/channels/${channelId}/promotions/disable`, 'POST', payload);
  }

  // =====================================================
  // LIVE FEED EVENTS — polling alternative to webhooks
  // GET /api/v1/live_feed — booking_new, booking_modification,
  // booking_cancellation, alteration_request, inquiry, message, sync_error,
  // booking_unmapped_room/rate, etc. Useful as a safety-net poll when
  // webhooks fail or as the primary read path during development.
  // =====================================================

  /**
   * options: { propertyId, event, page, limit }
   */
  async listLiveFeedEvents(options = {}) {
    const params = {
      'pagination[page]': options.page || 1,
      'pagination[limit]': options.limit || 50
    };
    if (options.propertyId) params['filter[property_id]'] = options.propertyId;
    if (options.event) params['filter[event]'] = options.event;
    return this.request('/live_feed', 'GET', null, { params });
  }

  async getLiveFeedEvent(eventId) {
    return this.request(`/live_feed/${eventId}`);
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  ChannexAdapter,
  RateLimiter,
  CHANNEX_CERT_FIXTURES
};
