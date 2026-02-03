/**
 * Calry Adapter for GasSync
 * 
 * Meta-adapter that connects to Calry's Unified API
 * Provides access to 40+ PMS systems through a single interface
 * 
 * Based on Calry v2 API specification
 * https://docs.calry.app/docs/vacation-rental-api/v2/
 * 
 * KEY v2 CHANGES:
 * - Room types are now the bookable entity (not properties)
 * - Availability endpoint: /vrs/availability/{propertyId}?roomTypeId={roomTypeId}
 * - For PMSs without room types (Hostfully, Hostaway, Guesty), 
 *   roomTypeId = propertyId
 */

const axios = require('axios');
const crypto = require('crypto');

// =====================================================
// CONFIGURATION
// =====================================================

const CALRY_PROD_BASE = 'https://prod.calry.app/api/v2';
const CALRY_V1_BASE = 'https://prod.calry.app/api/v1'; // Some endpoints still on v1
const CALRY_DEV_BASE = 'https://dev.calry.app/api/v2';

// Supported PMS systems through Calry
const CALRY_SUPPORTED_PMS = [
  'guesty', 'hostfully', 'hospitable', 'bookingsync', 'smily',
  'apaleo', 'cloudbeds', 'lodgify', 'ownerrez', 'tokeet',
  'streamline', 'track', 'escapia', 'liverez', 'barefoot',
  'resly', 'elina', 'uplisting', 'fantasticstay', 'avantio',
  'rentlio', 'ciirus', 'myvr', 'hostify', 'bookeye',
  'stayntouch', 'webrezpro', 'roomracoon', 'little_hotelier',
  'newbook', 'sirvoy', 'clock_pms', 'mews', 'hotelogix', 'smoobu'
];

// =====================================================
// CALRY ADAPTER CLASS
// =====================================================

class CalryAdapter {
  constructor(config) {
    this.name = 'calry';
    this.version = '2.2.0'; // Updated version for availability fix
    this.capabilities = [
      'properties',
      'room_types',
      'availability',
      'rates',
      'reservations',
      'conversations',
      'quotes',
      'reviews'
    ];
    
    // Calry credentials
    this.token = config.token;
    this.workspaceId = config.workspaceId;
    this.integrationAccountId = config.integrationAccountId;
    
    // Which PMS this connection is for
    this.pmsType = config.pmsType; // e.g., 'guesty', 'hostfully', 'smoobu'
    
    // Environment
    this.baseUrl = config.useDev ? CALRY_DEV_BASE : CALRY_PROD_BASE;
    this.v1BaseUrl = config.useDev ? 'https://dev.calry.app/api/v1' : CALRY_V1_BASE;
    
    // Rate limiting
    this.rateLimiter = new RateLimiter(100); // Calry allows 100 rpm
    
    // Database pool
    this.pool = config.pool;
    this.connectionId = config.connectionId;
  }
  
  // =====================================================
  // HTTP HELPERS
  // =====================================================
  
  async request(endpoint, method = 'GET', data = null, options = {}) {
    await this.rateLimiter.throttle();
    
    // Determine base URL - use v1 for specific endpoints
    const useV1 = options.useV1 || false;
    const baseUrl = useV1 ? this.v1BaseUrl : this.baseUrl;
    
    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'workspaceId': this.workspaceId,
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 30000
      };
      
      // Add integrationAccountId if specified
      if (this.integrationAccountId) {
        config.headers['integrationAccountId'] = this.integrationAccountId;
      }
      
      if (data) {
        config.data = data;
      }
      
      if (options.params) {
        config.params = options.params;
      }
      
      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, endpoint);
    }
  }
  
  handleError(error, endpoint) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    
    let code = 'UNKNOWN';
    let message = error.message;
    
    if (statusCode === 401 || statusCode === 403) {
      code = 'AUTH_FAILED';
      message = 'Calry authentication failed. Token may be expired.';
    } else if (statusCode === 429) {
      code = 'RATE_LIMIT';
      message = 'Calry rate limit exceeded.';
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
      message = `Resource not found: ${endpoint}`;
    } else if (error.code === 'ECONNABORTED') {
      code = 'TIMEOUT';
      message = 'Request timed out';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      code = 'NETWORK';
      message = 'Network connection failed';
    }
    
    console.error(`Calry API Error [${endpoint}]:`, {
      code,
      status: statusCode,
      message,
      details: errorData
    });
    
    return {
      success: false,
      error: message,
      code,
      details: errorData,
      retryable: ['RATE_LIMIT', 'TIMEOUT', 'NETWORK'].includes(code)
    };
  }
  
  // =====================================================
  // AUTHENTICATION
  // =====================================================
  
  async authenticate(credentials) {
    this.token = credentials.token;
    this.workspaceId = credentials.workspaceId;
    return this.testConnection();
  }
  
  async testConnection() {
    const response = await this.request('/vrs/properties', 'GET', null, {
      params: { limit: 1 }
    });
    
    if (response.success) {
      return { success: true, message: 'Calry connection successful' };
    }
    
    return { success: false, error: response.error };
  }
  
  // =====================================================
  // INTEGRATION ACCOUNTS
  // =====================================================
  
  async getIntegrationAccounts() {
    // This endpoint is on v1
    const response = await this.request('/integration-accounts', 'GET', null, { useV1: true });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: (response.data || []).map(acc => ({
        id: acc.id,
        pmsType: acc.integrationType || acc.integrationDefinitionKey,
        name: acc.name,
        status: acc.status,
        createdAt: acc.createdAt
      }))
    };
  }
  
  async setIntegrationAccount(accountId) {
    this.integrationAccountId = accountId;
  }
  
  // =====================================================
  // PROPERTIES (Calry v2)
  // =====================================================
  
  async getProperties(options = {}) {
    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    
    const response = await this.request('/vrs/properties', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const properties = (response.data?.data || response.data || []).map(prop => this.mapProperty(prop));
    
    return {
      success: true,
      data: properties,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 100,
        total: response.data?.total || properties.length,
        hasMore: response.data?.hasMore || false
      }
    };
  }
  
  async getProperty(externalId) {
    const response = await this.request(`/vrs/properties/${externalId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapProperty(response.data)
    };
  }
  
  mapProperty(raw) {
    // Extract amenities - Calry can return various formats
    let amenities = [];
    if (raw.amenities && Array.isArray(raw.amenities)) {
      raw.amenities.forEach(a => {
        if (typeof a === 'string') amenities.push(a);
        else if (a.name) amenities.push(a.name);
        else if (a.amenity) amenities.push(a.amenity);
      });
    }
    
    // Extract images - handle multiple formats
    let images = [];
    const rawImages = raw.pictures || raw.images || raw.photos || [];
    rawImages.forEach((pic, idx) => {
      const url = typeof pic === 'string' ? pic : (pic.url || pic.original || pic.large);
      if (url) {
        images.push({
          url,
          caption: typeof pic === 'object' ? (pic.caption || pic.description || '') : '',
          order: idx,
          isPrimary: idx === 0
        });
      }
    });
    
    // Handle location/coordinates
    const coords = raw.coordinates || raw.location || raw.geoLocation || {};
    const lat = coords.latitude || coords.lat || raw.latitude;
    const lng = coords.longitude || coords.lng || coords.lon || raw.longitude;
    
    return {
      externalId: String(raw.id),
      name: raw.name,
      description: raw.description || raw.summary || '',
      shortDescription: raw.shortDescription || raw.summary || '',
      propertyType: raw.type || raw.propertyType || 'vacation_rental',
      status: raw.status || 'active',
      address: {
        street: raw.address?.address1 || raw.address?.street || raw.street || '',
        street2: raw.address?.address2 || '',
        city: raw.address?.city || raw.city || '',
        state: raw.address?.state || raw.state || raw.region || '',
        postalCode: raw.address?.postalCode || raw.address?.zipCode || raw.postalCode || '',
        country: raw.address?.country || raw.country || '',
        countryCode: raw.address?.countryCode || raw.countryCode || ''
      },
      coordinates: (lat && lng) ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null,
      timezone: raw.timezone || raw.timeZone || null,
      currency: raw.currency || 'EUR',
      defaultCheckIn: raw.checkInTime || raw.checkinTime || raw.defaultCheckIn || '15:00',
      defaultCheckOut: raw.checkOutTime || raw.checkoutTime || raw.defaultCheckOut || '11:00',
      houseRules: raw.houseRules || raw.rules || '',
      cancellationPolicy: raw.cancellationPolicy || '',
      minNights: raw.minNights || raw.minimumStay || null,
      maxNights: raw.maxNights || raw.maximumStay || null,
      amenities: amenities,
      images: images,
      thumbnailUrl: raw.thumbnailUrl || raw.thumbnail || (images[0]?.url || null),
      contactEmail: raw.email || raw.contactEmail || null,
      contactPhone: raw.phone || raw.contactPhone || null,
      website: raw.websiteUrl || raw.website || null,
      // v2: Properties now contain roomTypes array
      roomTypes: (raw.roomTypes || []).map(rt => this.mapRoomType(rt, raw.id)),
      metadata: {
        calryId: raw.id,
        pmsType: this.pmsType,
        externalPropertyId: raw.externalId
      },
      raw: raw
    };
  }
  
  // =====================================================
  // ROOM TYPES (Calry v2 - bookable entity)
  // =====================================================
  
  async getRoomTypes(propertyExternalId) {
    // Correct URL is /vrs/room-types/{propertyId}, NOT /vrs/properties/{id}/room-types
    const response = await this.request(`/vrs/room-types/${propertyExternalId}`);
    
    if (!response.success) {
      return response;
    }
    
    const roomTypes = (response.data?.data || response.data || []).map(rt => 
      this.mapRoomType(rt, propertyExternalId)
    );
    
    return {
      success: true,
      data: roomTypes
    };
  }
  
  mapRoomType(raw, propertyId = null) {
    // Extract amenities - handle different formats
    let amenities = [];
    if (raw.amenities && Array.isArray(raw.amenities)) {
      raw.amenities.forEach(a => {
        if (typeof a === 'string') amenities.push(a);
        else if (a.name) amenities.push(a.name);
        else if (a.amenity) amenities.push(a.amenity);
      });
    }
    
    // Extract images
    let images = [];
    const rawImages = raw.pictures || raw.images || raw.photos || [];
    rawImages.forEach((pic, idx) => {
      const url = typeof pic === 'string' ? pic : (pic.url || pic.original || pic.large);
      if (url) {
        images.push({
          url,
          caption: typeof pic === 'object' ? (pic.caption || pic.description || '') : '',
          order: idx,
          isPrimary: idx === 0
        });
      }
    });
    
    // Extract bed configuration
    let beds = raw.beds || raw.bedTypes || raw.bedConfiguration || [];
    if (!Array.isArray(beds)) beds = [];
    
    return {
      externalId: String(raw.id),
      propertyExternalId: propertyId || String(raw.propertyId),
      name: raw.name,
      description: raw.description || raw.summary || '',
      maxGuests: raw.maxOccupancy || raw.maxGuests || raw.capacity || 2,
      maxAdults: raw.maxAdults || raw.maxOccupancy || null,
      maxChildren: raw.maxChildren || 0,
      bedrooms: raw.bedRoom?.count || raw.bedrooms || raw.numberOfBedrooms || 1,
      beds: beds.length || raw.beds || 1,
      bedTypes: beds,
      bathrooms: raw.bathRoom?.count || raw.bathrooms || raw.numberOfBathrooms || 1,
      size: raw.size || raw.area || raw.squareMeters || raw.squareFeet || null,
      sizeUnit: raw.sizeUnit || (raw.squareMeters ? 'sqm' : 'sqft'),
      floor: raw.floor || null,
      view: raw.view || null,
      roomType: raw.roomType || raw.type || null,
      basePrice: parseFloat(raw.startPrice || raw.basePrice || raw.price) || 0,
      currency: raw.currency || 'EUR',
      amenities: amenities,
      images: images,
      unitCount: Array.isArray(raw.units) ? raw.units.length : (raw.units?.count || raw.quantity || 1),
      units: Array.isArray(raw.units) ? raw.units.map(u => ({
        externalId: String(u.id),
        name: u.name,
        status: u.status || 'available'
      })) : [],
      metadata: {
        calryRoomTypeId: raw.id,
        externalRoomTypeId: raw.externalId
      },
      raw: raw
    };
  }
  
  // =====================================================
  // AVAILABILITY (Calry v2 - FIXED endpoint format)
  // Correct: /vrs/availability/{propertyId}?roomTypeId={roomTypeId}
  // =====================================================
  
  /**
   * Get availability for a room type
   * IMPORTANT: Calry v2 availability endpoint format is:
   *   /vrs/availability/{propertyId}?roomTypeId={roomTypeId}&startDate=X&endDate=Y&rates=true
   * 
   * @param {string} propertyExternalId - The Calry property ID (goes in URL path)
   * @param {string} roomTypeExternalId - The Calry room type ID (goes in query param)
   * @param {string} startDate - Start date YYYY-MM-DD
   * @param {string} endDate - End date YYYY-MM-DD
   */
  async getAvailability(propertyExternalId, roomTypeExternalId, startDate, endDate) {
    // Correct v2 endpoint: /vrs/availability/{propertyId}?roomTypeId={roomTypeId}
    console.log(`[Calry Availability] Fetching: property=${propertyExternalId}, roomType=${roomTypeExternalId}, ${startDate} to ${endDate}`);
    
    let response = await this.request(`/vrs/availability/${propertyExternalId}`, 'GET', null, {
      params: { 
        startDate, 
        endDate, 
        roomTypeId: roomTypeExternalId, 
        rates: true 
      }
    });
    
    // If prod fails, try dev environment
    if (!response.success && (response.code === 'NOT_FOUND' || response.details?.status === 404)) {
      console.log(`[Calry Availability] Prod 404, trying dev environment`);
      
      const originalBaseUrl = this.baseUrl;
      this.baseUrl = 'https://dev.calry.app/api/v2';
      
      response = await this.request(`/vrs/availability/${propertyExternalId}`, 'GET', null, {
        params: { 
          startDate, 
          endDate, 
          roomTypeId: roomTypeExternalId, 
          rates: true 
        }
      });
      
      if (response.success) {
        this._useDevEnvironment = true;
        console.log(`[Calry Availability] Dev environment works, using dev going forward`);
      } else {
        this.baseUrl = originalBaseUrl;
      }
    }
    
    // Fall back to alternative endpoints if still failing
    if (!response.success) {
      console.log(`[Calry Availability] Primary endpoint failed, trying /vrs/room-types/{roomTypeId}/availability`);
      response = await this.request(`/vrs/room-types/${roomTypeExternalId}/availability`, 'GET', null, {
        params: { startDate, endDate }
      });
    }
    
    if (!response.success) {
      console.log(`[Calry Availability] v2 endpoints failed, trying v1`);
      response = await this.request(`/vrs/availability/${roomTypeExternalId}`, 'GET', null, {
        useV1: true,
        params: { startDate, endDate }
      });
    }
    
    if (!response.success) {
      return response;
    }
    
    // Response structure: { success: true, data: { propertyId, roomTypeId, dateWiseAvailability: [...] } }
    // or older format: { data: [...] } or just [...]
    const responseData = response.data?.data || response.data || {};
    const availabilityArray = responseData.dateWiseAvailability || responseData.data || responseData || [];
    
    const availability = (Array.isArray(availabilityArray) ? availabilityArray : []).map(day => this.mapAvailabilityDay(day, roomTypeExternalId));
    
    console.log(`[Calry Availability] Success: ${availability.length} days fetched for roomType ${roomTypeExternalId}`);
    
    return {
      success: true,
      data: availability
    };
  }
  
  /**
   * Legacy method signature for backward compatibility
   * If called with 3 params, assumes roomTypeId = propertyId (PMSs without room types)
   */
  async getAvailabilityLegacy(roomTypeExternalId, startDate, endDate) {
    // For PMSs without room types, roomTypeId = propertyId
    return this.getAvailability(roomTypeExternalId, roomTypeExternalId, startDate, endDate);
  }
  
  /**
   * Get availability for a property (fetches all room types)
   * This is the main method called by GAS sync
   */
  async getPropertyAvailability(propertyExternalId, startDate, endDate) {
    // First get room types for this property
    const roomTypesResult = await this.getRoomTypes(propertyExternalId);
    
    if (!roomTypesResult.success) {
      // If no room types endpoint, property itself might be the room type
      // (common for PMSs without native room type support)
      console.log(`[Calry Availability] No room types found, treating property ${propertyExternalId} as room type`);
      const avail = await this.getAvailability(propertyExternalId, propertyExternalId, startDate, endDate);
      if (avail.success) {
        return {
          success: true,
          data: { [propertyExternalId]: avail.data }
        };
      }
      return roomTypesResult;
    }
    
    console.log(`[Calry Availability] Found ${roomTypesResult.data.length} room types for property ${propertyExternalId}`);
    
    const results = {};
    for (const roomType of roomTypesResult.data) {
      // Pass both propertyId and roomTypeId to the corrected getAvailability
      const avail = await this.getAvailability(propertyExternalId, roomType.externalId, startDate, endDate);
      if (avail.success) {
        results[roomType.externalId] = avail.data;
      } else {
        console.log(`[Calry Availability] Failed for roomType ${roomType.externalId}: ${avail.error}`);
      }
    }
    
    return {
      success: true,
      data: results
    };
  }
  
  mapAvailabilityDay(day, roomTypeId) {
    // Handle the Calry response format from your successful curl:
    // {"date":"2026-02-04","status":"AVAILABLE","unitsAvailable":1,"reservationIds":[],"price":{"amount":857},"minimumNights":4,"maximumNights":6}
    
    const isAvailable = day.status === 'AVAILABLE' || 
                        (day.available !== false && day.status !== 'blocked' && day.status !== 'booked' && day.status !== 'BLOCKED' && day.status !== 'BOOKED');
    
    // Price can be in different formats
    let price = null;
    if (day.price) {
      if (typeof day.price === 'object' && day.price.amount !== undefined) {
        price = parseFloat(day.price.amount);
      } else if (typeof day.price === 'number' || typeof day.price === 'string') {
        price = parseFloat(day.price);
      }
    }
    
    return {
      roomTypeId: roomTypeId,
      date: day.date,
      isAvailable: isAvailable,
      unitsAvailable: day.unitsAvailable || day.availableUnits || (isAvailable ? 1 : 0),
      totalUnits: day.totalUnits || 1,
      status: day.status || (isAvailable ? 'available' : 'blocked'),
      blockedReason: day.blockedReason || day.blockReason || null,
      minStay: day.minimumNights || day.minStay || day.minimumStay || day.minNights || 1,
      maxStay: day.maximumNights || day.maxStay || day.maximumStay || day.maxNights || null,
      checkInAllowed: day.checkInAllowed !== false && day.closedToArrival !== true,
      checkOutAllowed: day.checkOutAllowed !== false && day.closedToDeparture !== true,
      price: price,
      currency: day.currency || (day.price?.currency) || null,
      reservationIds: day.reservationIds || []
    };
  }
  
  async updateAvailability(propertyExternalId, roomTypeExternalId, availabilityData) {
    const updates = availabilityData.map(day => ({
      date: day.date,
      available: day.isAvailable,
      unitsAvailable: day.unitsAvailable,
      minStay: day.minStay,
      maxStay: day.maxStay,
      checkInAllowed: day.checkInAllowed,
      checkOutAllowed: day.checkOutAllowed
    }));
    
    // Try v2 first with correct endpoint
    let response = await this.request(
      `/vrs/availability/${propertyExternalId}`,
      'PUT',
      { roomTypeId: roomTypeExternalId, availability: updates }
    );
    
    // Fall back to room-types endpoint
    if (!response.success) {
      response = await this.request(
        `/vrs/room-types/${roomTypeExternalId}/availability`,
        'PUT',
        { availability: updates }
      );
    }
    
    // Fall back to v1
    if (!response.success) {
      response = await this.request(
        `/vrs/availability/${roomTypeExternalId}`,
        'PUT',
        { availability: updates },
        { useV1: true }
      );
    }
    
    return response;
  }
  
  // =====================================================
  // RATES (Calry v2 - by roomTypeId)
  // =====================================================
  
  async getRates(propertyExternalId, roomTypeExternalId, startDate, endDate) {
    // Rates endpoint likely follows same pattern as availability
    let response = await this.request(`/vrs/rates/${propertyExternalId}`, 'GET', null, {
      params: { 
        startDate, 
        endDate, 
        roomTypeId: roomTypeExternalId 
      }
    });
    
    // Fall back to alternative endpoints
    if (!response.success) {
      response = await this.request(`/vrs/room-types/${roomTypeExternalId}/rates`, 'GET', null, {
        params: { startDate, endDate }
      });
    }
    
    if (!response.success) {
      response = await this.request(`/vrs/rates/${roomTypeExternalId}`, 'GET', null, {
        useV1: true,
        params: { startDate, endDate }
      });
    }
    
    if (!response.success) {
      return response;
    }
    
    const rates = (response.data?.data || response.data || []).map(day => this.mapRateDay(day, roomTypeExternalId));
    
    return {
      success: true,
      data: rates
    };
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async getRatesLegacy(roomTypeExternalId, startDate, endDate) {
    return this.getRates(roomTypeExternalId, roomTypeExternalId, startDate, endDate);
  }
  
  async getPropertyRates(propertyExternalId, startDate, endDate) {
    const roomTypesResult = await this.getRoomTypes(propertyExternalId);
    
    if (!roomTypesResult.success) {
      const rates = await this.getRates(propertyExternalId, propertyExternalId, startDate, endDate);
      if (rates.success) {
        return {
          success: true,
          data: { [propertyExternalId]: rates.data }
        };
      }
      return roomTypesResult;
    }
    
    const results = {};
    for (const roomType of roomTypesResult.data) {
      const rates = await this.getRates(propertyExternalId, roomType.externalId, startDate, endDate);
      if (rates.success) {
        results[roomType.externalId] = rates.data;
      }
    }
    
    return {
      success: true,
      data: results
    };
  }
  
  mapRateDay(day, roomTypeId) {
    // Handle price in different formats
    let price = null;
    if (day.price) {
      if (typeof day.price === 'object' && day.price.amount !== undefined) {
        price = parseFloat(day.price.amount);
      } else {
        price = parseFloat(day.price);
      }
    } else if (day.rate) {
      price = parseFloat(day.rate);
    } else if (day.amount) {
      price = parseFloat(day.amount);
    }
    
    return {
      roomTypeId: roomTypeId,
      date: day.date,
      price: price,
      currency: day.currency || (day.price?.currency) || 'EUR',
      extraGuestFee: day.extraGuestFee || day.additionalGuestFee || null,
      weeklyDiscountPercent: day.weeklyDiscount || day.weeklyDiscountPercent || null,
      monthlyDiscountPercent: day.monthlyDiscount || day.monthlyDiscountPercent || null,
      minStay: day.minimumNights || day.minStay || null,
      maxStay: day.maximumNights || day.maxStay || null
    };
  }
  
  async updateRates(propertyExternalId, roomTypeExternalId, ratesData) {
    const updates = ratesData.map(day => ({
      date: day.date,
      price: day.price,
      currency: day.currency || 'EUR',
      extraGuestFee: day.extraGuestFee,
      minStay: day.minStay,
      maxStay: day.maxStay
    }));
    
    // Try v2 first
    let response = await this.request(
      `/vrs/rates/${propertyExternalId}`,
      'PUT',
      { roomTypeId: roomTypeExternalId, rates: updates }
    );
    
    // Fall back to room-types endpoint
    if (!response.success) {
      response = await this.request(
        `/vrs/room-types/${roomTypeExternalId}/rates`,
        'PUT',
        { rates: updates }
      );
    }
    
    // Fall back to v1
    if (!response.success) {
      response = await this.request(
        `/vrs/rates/${roomTypeExternalId}`,
        'PUT',
        { rates: updates },
        { useV1: true }
      );
    }
    
    return response;
  }
  
  // =====================================================
  // RESERVATIONS
  // =====================================================
  
  async getReservations(options = {}) {
    const params = {};
    if (options.startDate) params.startDate = options.startDate;
    if (options.endDate) params.endDate = options.endDate;
    if (options.status) params.status = options.status;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    if (options.modifiedSince) params.modifiedSince = options.modifiedSince;
    
    const response = await this.request('/vrs/reservations', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const reservations = (response.data?.data || response.data || []).map(r => this.mapReservation(r));
    
    return {
      success: true,
      data: reservations,
      pagination: {
        page: options.page || 1,
        total: response.data?.total || reservations.length,
        hasMore: response.data?.hasMore || false
      }
    };
  }
  
  async getReservation(reservationId) {
    const response = await this.request(`/vrs/reservations/${reservationId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  async getPropertyReservations(propertyExternalId, options = {}) {
    return this.getReservations({
      ...options,
      propertyId: propertyExternalId
    });
  }
  
  mapReservation(raw) {
    const guest = raw.guest || raw.guestDetails || {};
    const pricing = raw.pricing || raw.price || raw.financials || {};
    
    return {
      externalId: String(raw.id),
      propertyId: String(raw.propertyId),
      roomTypeId: String(raw.roomTypeId || raw.unitId),
      channel: raw.channel || raw.source || 'DIRECT',
      channelReservationId: raw.channelReservationId || raw.externalId,
      checkIn: raw.checkIn || raw.arrivalDate,
      checkOut: raw.checkOut || raw.departureDate,
      status: this.mapReservationStatus(raw.status),
      guest: {
        firstName: guest.firstName || guest.name?.split(' ')[0] || '',
        lastName: guest.lastName || guest.name?.split(' ').slice(1).join(' ') || '',
        email: guest.email,
        phone: guest.phone || guest.phoneNumber,
        address: guest.address
      },
      guests: {
        adults: raw.adults || raw.numberOfAdults || 1,
        children: raw.children || raw.numberOfChildren || 0,
        infants: raw.infants || raw.numberOfInfants || 0,
        total: raw.guests || (raw.adults || 1) + (raw.children || 0)
      },
      pricing: {
        total: parseFloat(pricing.total || pricing.totalPrice || pricing.amount) || 0,
        subtotal: parseFloat(pricing.subtotal || pricing.accommodationFare) || null,
        taxes: parseFloat(pricing.taxes || pricing.taxAmount) || null,
        fees: parseFloat(pricing.fees || pricing.feeAmount) || null,
        currency: pricing.currency || raw.currency || 'EUR',
        paid: parseFloat(pricing.paid || pricing.amountPaid) || 0,
        balance: parseFloat(pricing.balance || pricing.amountDue) || null
      },
      notes: raw.notes || raw.guestNotes || raw.specialRequests || '',
      source: raw.source || 'calry',
      createdAt: raw.createdAt || raw.created,
      updatedAt: raw.updatedAt || raw.modified,
      raw: raw
    };
  }
  
  mapReservationStatus(status) {
    if (!status) return 'confirmed';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('confirm')) return 'confirmed';
    if (statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('cancel')) return 'cancelled';
    if (statusLower.includes('check') && statusLower.includes('in')) return 'checked_in';
    if (statusLower.includes('check') && statusLower.includes('out')) return 'checked_out';
    if (statusLower.includes('no') && statusLower.includes('show')) return 'no_show';
    
    return status;
  }
  
  async createReservation(reservationData) {
    const payload = {
      propertyId: reservationData.propertyId,
      roomTypeId: reservationData.roomTypeId,
      checkIn: reservationData.checkIn,
      checkOut: reservationData.checkOut,
      guest: {
        firstName: reservationData.guest?.firstName,
        lastName: reservationData.guest?.lastName,
        email: reservationData.guest?.email,
        phone: reservationData.guest?.phone
      },
      adults: reservationData.guests?.adults || 1,
      children: reservationData.guests?.children || 0,
      infants: reservationData.guests?.infants || 0,
      notes: reservationData.notes
    };
    
    // Try v2 first
    let response = await this.request('/vrs/reservations', 'POST', payload);
    
    // Fall back to v1
    if (!response.success) {
      response = await this.request('/vrs/reservations', 'POST', payload, { useV1: true });
    }
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  async updateReservation(reservationId, updates) {
    const payload = {};
    
    if (updates.checkIn) payload.checkIn = updates.checkIn;
    if (updates.checkOut) payload.checkOut = updates.checkOut;
    if (updates.status) payload.status = updates.status;
    if (updates.guest) payload.guest = updates.guest;
    if (updates.guests) {
      payload.adults = updates.guests.adults;
      payload.children = updates.guests.children;
      payload.infants = updates.guests.infants;
    }
    if (updates.notes) payload.notes = updates.notes;
    
    let response = await this.request(`/vrs/reservations/${reservationId}`, 'PUT', payload);
    
    if (!response.success) {
      response = await this.request(`/vrs/reservations/${reservationId}`, 'PATCH', payload);
    }
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  async cancelReservation(reservationId, reason = '') {
    return this.updateReservation(reservationId, {
      status: 'cancelled',
      notes: reason
    });
  }
  
  // =====================================================
  // CONVERSATIONS/MESSAGING
  // =====================================================
  
  async getConversations(options = {}) {
    const params = {};
    if (options.reservationId) params.reservationId = options.reservationId;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    
    const response = await this.request('/vrs/conversations', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: response.data?.data || response.data || []
    };
  }
  
  async getConversation(conversationId) {
    const response = await this.request(`/vrs/conversations/${conversationId}`);
    return response;
  }
  
  async sendMessage(conversationId, message) {
    const response = await this.request(
      `/vrs/conversations/${conversationId}/messages`,
      'POST',
      { body: message }
    );
    return response;
  }
  
  // =====================================================
  // QUOTES
  // =====================================================
  
  async getQuote(propertyExternalId, roomTypeExternalId, params) {
    const response = await this.request('/vrs/quotes', 'POST', {
      propertyId: propertyExternalId,
      roomTypeId: roomTypeExternalId,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults || 1,
      children: params.children || 0,
      infants: params.infants || 0,
      couponCode: params.couponCode
    });
    
    if (!response.success) {
      return response;
    }
    
    const quote = response.data;
    
    return {
      success: true,
      data: {
        propertyId: propertyExternalId,
        roomTypeId: roomTypeExternalId,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights: quote.nights || this.calculateNights(params.checkIn, params.checkOut),
        pricing: {
          accommodation: parseFloat(quote.accommodationFare || quote.subtotal) || 0,
          cleaning: parseFloat(quote.cleaningFee) || 0,
          taxes: parseFloat(quote.taxes || quote.taxAmount) || 0,
          fees: parseFloat(quote.fees || quote.serviceFee) || 0,
          discount: parseFloat(quote.discount) || 0,
          total: parseFloat(quote.total || quote.totalPrice) || 0,
          currency: quote.currency || 'EUR'
        },
        available: quote.available !== false,
        minStay: quote.minStay || quote.minimumStay,
        maxStay: quote.maxStay || quote.maximumStay
      }
    };
  }
  
  calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
  
  // =====================================================
  // REVIEWS
  // =====================================================
  
  async getReviews(propertyExternalId, options = {}) {
    const params = { propertyId: propertyExternalId };
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    
    const response = await this.request('/vrs/reviews', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: (response.data?.data || response.data || []).map(r => ({
        externalId: String(r.id),
        propertyId: propertyExternalId,
        guestName: r.guestName || r.author || 'Guest',
        rating: r.rating || r.overallRating,
        comment: r.comment || r.text || r.review,
        response: r.response || r.ownerResponse,
        createdAt: r.createdAt || r.date
      }))
    };
  }
  
  // =====================================================
  // DATABASE SYNC METHODS
  // =====================================================
  
  /**
   * Sync a property to GAS database tables
   * Maps to: gas_sync_properties, properties
   */
  async syncPropertyToDatabase(propertyData, accountId) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // First, upsert to gas_sync_properties (staging)
      const stagingResult = await this.pool.query(`
        INSERT INTO gas_sync_properties (
          connection_id, external_id, name, raw_data, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (connection_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        this.connectionId,
        propertyData.externalId,
        propertyData.name,
        JSON.stringify(propertyData.raw || propertyData)
      ]);
      
      const syncPropertyId = stagingResult.rows[0]?.id;
      
      // Then upsert to main properties table
      const coords = propertyData.coordinates || {};
      const address = propertyData.address || {};
      
      const propResult = await this.pool.query(`
        INSERT INTO properties (
          account_id, user_id, name, description, property_type, status,
          address, city, state, postcode, country,
          latitude, longitude, timezone, currency,
          check_in_from, check_out_by,
          contact_email, contact_phone,
          cm_property_id, cm_source,
          created_at
        ) VALUES (
          $1, 1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16,
          $17, $18,
          $19, 'calry',
          NOW()
        )
        ON CONFLICT (account_id, cm_property_id) WHERE cm_property_id IS NOT NULL
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          postcode = EXCLUDED.postcode,
          country = EXCLUDED.country,
          latitude = COALESCE(EXCLUDED.latitude, properties.latitude),
          longitude = COALESCE(EXCLUDED.longitude, properties.longitude),
          updated_at = NOW()
        RETURNING id
      `, [
        accountId,
        propertyData.name,
        propertyData.description ? JSON.stringify({ en: propertyData.description }) : JSON.stringify({ en: '' }),
        propertyData.propertyType || 'vacation_rental',
        propertyData.status || 'active',
        address.street || '',
        address.city || '',
        address.state || '',
        address.postalCode || '',
        address.country || '',
        coords.latitude || null,
        coords.longitude || null,
        propertyData.timezone || null,
        propertyData.currency || 'EUR',
        propertyData.defaultCheckIn || '15:00',
        propertyData.defaultCheckOut || '11:00',
        propertyData.contactEmail || null,
        propertyData.contactPhone || null,
        propertyData.externalId
      ]);
      
      const gasPropertyId = propResult.rows[0]?.id;
      
      // Link staging to main property
      if (syncPropertyId && gasPropertyId) {
        await this.pool.query(`
          UPDATE gas_sync_properties 
          SET gas_property_id = $1 
          WHERE id = $2
        `, [gasPropertyId, syncPropertyId]);
      }
      
      return gasPropertyId;
    } catch (error) {
      console.error('Calry syncPropertyToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync room type to GAS database
   * Maps to: gas_sync_room_types, bookable_units
   */
  async syncRoomTypeToDatabase(roomTypeData, gasPropertyId, syncPropertyId) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // Upsert to gas_sync_room_types (staging)
      const stagingResult = await this.pool.query(`
        INSERT INTO gas_sync_room_types (
          sync_property_id, external_id, name, raw_data, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (sync_property_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        syncPropertyId,
        roomTypeData.externalId,
        roomTypeData.name,
        JSON.stringify(roomTypeData.raw || roomTypeData)
      ]);
      
      const syncRoomTypeId = stagingResult.rows[0]?.id;
      
      // Upsert to bookable_units (main rooms table)
      const roomResult = await this.pool.query(`
        INSERT INTO bookable_units (
          property_id, name, description, room_type,
          max_guests, max_adults, max_children,
          bedrooms, bathrooms,
          base_price, currency,
          cm_room_id, cm_source,
          created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9,
          $10, $11,
          $12, $13,
          NOW()
        )
        ON CONFLICT (property_id, cm_room_id) WHERE cm_room_id IS NOT NULL
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          max_guests = EXCLUDED.max_guests,
          max_adults = EXCLUDED.max_adults,
          max_children = EXCLUDED.max_children,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          base_price = EXCLUDED.base_price,
          updated_at = NOW()
        RETURNING id
      `, [
        gasPropertyId,
        roomTypeData.name,
        roomTypeData.description || '',
        roomTypeData.roomType || 'standard',
        roomTypeData.maxGuests || 2,
        roomTypeData.maxAdults || null,
        roomTypeData.maxChildren || 0,
        roomTypeData.bedrooms || 1,
        roomTypeData.bathrooms || 1,
        roomTypeData.basePrice || 0,
        roomTypeData.currency || 'EUR',
        roomTypeData.externalId,
        'calry'
      ]);
      
      const gasRoomId = roomResult.rows[0]?.id;
      
      // Link staging to main room
      if (syncRoomTypeId && gasRoomId) {
        await this.pool.query(`
          UPDATE gas_sync_room_types 
          SET gas_room_id = $1 
          WHERE id = $2
        `, [gasRoomId, syncRoomTypeId]);
      }
      
      return gasRoomId;
    } catch (error) {
      console.error('Calry syncRoomTypeToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync reservation to GAS database
   */
  async syncReservationToDatabase(reservation) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const guestName = [reservation.guest?.firstName, reservation.guest?.lastName]
        .filter(Boolean).join(' ') || 'Guest';
      
      const result = await this.pool.query(`
        INSERT INTO gas_sync_reservations (
          connection_id, external_id,
          property_external_id, room_type_external_id,
          channel, channel_reservation_id,
          check_in, check_out, status,
          guest_name, guest_email, guest_phone,
          adults, children, infants,
          total_price, currency,
          source, notes,
          raw_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        ON CONFLICT (connection_id, external_id) DO UPDATE SET
          status = EXCLUDED.status,
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          guest_name = EXCLUDED.guest_name,
          guest_email = EXCLUDED.guest_email,
          guest_phone = EXCLUDED.guest_phone,
          adults = EXCLUDED.adults,
          children = EXCLUDED.children,
          infants = EXCLUDED.infants,
          total_price = EXCLUDED.total_price,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        this.connectionId,
        reservation.externalId,
        reservation.propertyId,
        reservation.roomTypeId,
        reservation.channel || 'DIRECT',
        reservation.channelReservationId,
        reservation.checkIn,
        reservation.checkOut,
        reservation.status || 'confirmed',
        guestName,
        reservation.guest?.email || null,
        reservation.guest?.phone || null,
        reservation.guests?.adults || 1,
        reservation.guests?.children || 0,
        reservation.guests?.infants || 0,
        reservation.pricing?.total || 0,
        reservation.pricing?.currency || 'EUR',
        reservation.source || 'calry',
        reservation.notes || null,
        JSON.stringify(reservation.raw || reservation)
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Calry syncReservationToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync availability data to room_calendar table
   * Links via gas_sync_room_types -> bookable_units
   */
  async syncAvailabilityToDatabase(roomTypeExternalId, availabilityData) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // Find the GAS room ID through the sync tables
      const roomResult = await this.pool.query(`
        SELECT bu.id as gas_room_id
        FROM gas_sync_room_types srt
        JOIN gas_sync_properties sp ON srt.sync_property_id = sp.id
        JOIN bookable_units bu ON bu.cm_room_id = srt.external_id AND bu.property_id = sp.gas_property_id
        WHERE sp.connection_id = $1 AND srt.external_id = $2
      `, [this.connectionId, roomTypeExternalId]);
      
      if (roomResult.rows.length === 0) {
        // Try direct lookup by cm_room_id
        const directResult = await this.pool.query(`
          SELECT bu.id as gas_room_id
          FROM bookable_units bu
          JOIN properties p ON bu.property_id = p.id
          JOIN gas_sync_connections c ON c.account_id = p.account_id
          WHERE c.id = $1 AND bu.cm_room_id = $2
        `, [this.connectionId, roomTypeExternalId]);
        
        if (directResult.rows.length === 0) {
          console.log('Room not linked to GAS for availability sync:', roomTypeExternalId);
          return 0;
        }
        
        var gasRoomId = directResult.rows[0].gas_room_id;
      } else {
        var gasRoomId = roomResult.rows[0].gas_room_id;
      }
      
      let syncedCount = 0;
      
      for (const day of availabilityData) {
        try {
          await this.pool.query(`
            INSERT INTO room_calendar (
              room_id, date, price, currency,
              available, min_stay, max_stay,
              closed_to_arrival, closed_to_departure,
              status, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (room_id, date) DO UPDATE SET
              price = COALESCE(EXCLUDED.price, room_calendar.price),
              available = EXCLUDED.available,
              min_stay = COALESCE(EXCLUDED.min_stay, room_calendar.min_stay),
              max_stay = COALESCE(EXCLUDED.max_stay, room_calendar.max_stay),
              closed_to_arrival = EXCLUDED.closed_to_arrival,
              closed_to_departure = EXCLUDED.closed_to_departure,
              status = EXCLUDED.status,
              updated_at = NOW()
          `, [
            gasRoomId,
            day.date,
            day.price || null,
            day.currency || 'EUR',
            day.isAvailable !== false,
            day.minStay || 1,
            day.maxStay || null,
            day.checkInAllowed === false,
            day.checkOutAllowed === false,
            day.status || (day.isAvailable ? 'available' : 'blocked')
          ]);
          syncedCount++;
        } catch (dayErr) {
          console.error(`Error syncing availability for ${day.date}:`, dayErr.message);
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error('Calry syncAvailabilityToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync rates data to room_calendar table
   */
  async syncRatesToDatabase(roomTypeExternalId, ratesData) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // Find the GAS room ID
      const roomResult = await this.pool.query(`
        SELECT bu.id as gas_room_id
        FROM gas_sync_room_types srt
        JOIN gas_sync_properties sp ON srt.sync_property_id = sp.id
        JOIN bookable_units bu ON bu.cm_room_id = srt.external_id AND bu.property_id = sp.gas_property_id
        WHERE sp.connection_id = $1 AND srt.external_id = $2
      `, [this.connectionId, roomTypeExternalId]);
      
      if (roomResult.rows.length === 0) {
        // Try direct lookup
        const directResult = await this.pool.query(`
          SELECT bu.id as gas_room_id
          FROM bookable_units bu
          JOIN properties p ON bu.property_id = p.id
          JOIN gas_sync_connections c ON c.account_id = p.account_id
          WHERE c.id = $1 AND bu.cm_room_id = $2
        `, [this.connectionId, roomTypeExternalId]);
        
        if (directResult.rows.length === 0) {
          console.log('Room not linked to GAS for rates sync:', roomTypeExternalId);
          return 0;
        }
        
        var gasRoomId = directResult.rows[0].gas_room_id;
      } else {
        var gasRoomId = roomResult.rows[0].gas_room_id;
      }
      
      let syncedCount = 0;
      
      for (const day of ratesData) {
        try {
          await this.pool.query(`
            INSERT INTO room_calendar (
              room_id, date, price, currency,
              extra_guest_fee, weekly_discount, monthly_discount,
              min_stay, max_stay,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (room_id, date) DO UPDATE SET
              price = EXCLUDED.price,
              currency = EXCLUDED.currency,
              extra_guest_fee = COALESCE(EXCLUDED.extra_guest_fee, room_calendar.extra_guest_fee),
              weekly_discount = COALESCE(EXCLUDED.weekly_discount, room_calendar.weekly_discount),
              monthly_discount = COALESCE(EXCLUDED.monthly_discount, room_calendar.monthly_discount),
              min_stay = COALESCE(EXCLUDED.min_stay, room_calendar.min_stay),
              max_stay = COALESCE(EXCLUDED.max_stay, room_calendar.max_stay),
              updated_at = NOW()
          `, [
            gasRoomId,
            day.date,
            day.price,
            day.currency || 'EUR',
            day.extraGuestFee || null,
            day.weeklyDiscountPercent || null,
            day.monthlyDiscountPercent || null,
            day.minStay || null,
            day.maxStay || null
          ]);
          syncedCount++;
        } catch (dayErr) {
          console.error(`Error syncing rate for ${day.date}:`, dayErr.message);
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error('Calry syncRatesToDatabase error:', error.message);
      throw error;
    }
  }
}

// =====================================================
// RATE LIMITER
// =====================================================

class RateLimiter {
  constructor(requestsPerMinute = 100) {
    this.rpm = requestsPerMinute;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60000);
    
    if (this.requests.length >= this.rpm) {
      const waitTime = 60000 - (now - this.requests[0]);
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  CalryAdapter,
  CALRY_SUPPORTED_PMS
};
