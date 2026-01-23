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
 * - Availability uses roomTypeId (not propertyId/roomId)
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
    this.version = '2.1.0';
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
    // Extract amenities - handle different formats
    let amenities = [];
    if (raw.amenities && Array.isArray(raw.amenities)) {
      raw.amenities.forEach(a => {
        if (typeof a === 'string') amenities.push(a);
        else if (a.name) amenities.push(a.name);
        else if (a.amenity) amenities.push(a.amenity);
      });
    }
    
    // Extract images - handle different formats
    let images = [];
    const rawImages = raw.pictures || raw.images || raw.photos || [];
    rawImages.forEach((pic, idx) => {
      const url = typeof pic === 'string' ? pic : (pic.url || pic.original || pic.large || pic.medium);
      if (url) {
        images.push({
          url,
          caption: typeof pic === 'object' ? (pic.caption || pic.description || pic.title || '') : '',
          order: idx,
          isPrimary: idx === 0
        });
      }
    });
    
    return {
      externalId: String(raw.id),
      name: raw.name,
      description: raw.description || raw.summary || '',
      shortDescription: raw.shortDescription || raw.summary || '',
      propertyType: raw.propertyType || raw.type || 'vacation_rental',
      address: {
        street: raw.address?.line1 || raw.address?.street || '',
        city: raw.address?.city || '',
        state: raw.address?.state || raw.address?.region || '',
        country: raw.address?.country || raw.address?.countryCode || '',
        postalCode: raw.address?.postalCode || raw.address?.postal_code || raw.address?.zipCode || '',
        coordinates: {
          lat: parseFloat(raw.geoLocation?.latitude || raw.coordinates?.lat || raw.latitude) || null,
          lng: parseFloat(raw.geoLocation?.longitude || raw.coordinates?.lng || raw.longitude) || null
        }
      },
      timezone: raw.timezone || 'UTC',
      currency: raw.currency || 'EUR',
      checkInTime: raw.checkInTime || raw.checkinTime || raw.defaultCheckIn || '15:00',
      checkOutTime: raw.checkOutTime || raw.checkoutTime || raw.defaultCheckOut || '11:00',
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
  // AVAILABILITY (Calry v2 - by roomTypeId)
  // =====================================================
  
  /**
   * Get availability for a room type
   * In v2, availability is per roomTypeId (the bookable entity)
   */
  async getAvailability(roomTypeExternalId, startDate, endDate) {
    // Try v2 endpoint first
    let response = await this.request(`/vrs/room-types/${roomTypeExternalId}/availability`, 'GET', null, {
      params: { startDate, endDate }
    });
    
    // Fall back to v1 if v2 fails
    if (!response.success) {
      console.log(`Calry: v2 availability failed, trying v1 for roomType ${roomTypeExternalId}`);
      response = await this.request(`/vrs/availability/${roomTypeExternalId}`, 'GET', null, {
        useV1: true,
        params: { startDate, endDate }
      });
    }
    
    if (!response.success) {
      return response;
    }
    
    const availability = (response.data?.data || response.data || []).map(day => this.mapAvailabilityDay(day, roomTypeExternalId));
    
    return {
      success: true,
      data: availability
    };
  }
  
  /**
   * Get availability for a property (fetches all room types)
   */
  async getPropertyAvailability(propertyExternalId, startDate, endDate) {
    // First get room types for this property
    const roomTypesResult = await this.getRoomTypes(propertyExternalId);
    
    if (!roomTypesResult.success) {
      // If no room types endpoint, property itself might be the room type
      // (common for PMSs without native room type support)
      const avail = await this.getAvailability(propertyExternalId, startDate, endDate);
      if (avail.success) {
        return {
          success: true,
          data: { [propertyExternalId]: avail.data }
        };
      }
      return roomTypesResult;
    }
    
    const results = {};
    for (const roomType of roomTypesResult.data) {
      const avail = await this.getAvailability(roomType.externalId, startDate, endDate);
      if (avail.success) {
        results[roomType.externalId] = avail.data;
      }
    }
    
    return {
      success: true,
      data: results
    };
  }
  
  mapAvailabilityDay(day, roomTypeId) {
    return {
      roomTypeId: roomTypeId,
      date: day.date,
      isAvailable: day.available !== false && day.status !== 'blocked' && day.status !== 'booked',
      unitsAvailable: day.unitsAvailable || day.availableUnits || (day.available ? 1 : 0),
      totalUnits: day.totalUnits || 1,
      status: day.status || (day.available ? 'available' : 'blocked'),
      blockedReason: day.blockedReason || day.blockReason || null,
      minStay: day.minStay || day.minimumStay || day.minNights || 1,
      maxStay: day.maxStay || day.maximumStay || day.maxNights || null,
      checkInAllowed: day.checkInAllowed !== false && day.closedToArrival !== true,
      checkOutAllowed: day.checkOutAllowed !== false && day.closedToDeparture !== true,
      // Price may be included in availability response
      price: day.price ? parseFloat(day.price) : null,
      currency: day.currency || null
    };
  }
  
  async updateAvailability(roomTypeExternalId, availabilityData) {
    const updates = availabilityData.map(day => ({
      date: day.date,
      available: day.isAvailable,
      unitsAvailable: day.unitsAvailable,
      minStay: day.minStay,
      maxStay: day.maxStay,
      checkInAllowed: day.checkInAllowed,
      checkOutAllowed: day.checkOutAllowed
    }));
    
    // Try v2 first
    let response = await this.request(
      `/vrs/room-types/${roomTypeExternalId}/availability`,
      'PUT',
      { availability: updates }
    );
    
    // Fall back to v1
    if (!response.success) {
      response = await this.request(
        `/vrs/availability/${roomTypeExternalId}`,
        'PUT',
        { availability: updates },
        { useV1: true }
      );
    }
    
    return {
      success: response.success,
      updated: response.success ? updates.length : 0,
      errors: response.success ? [] : [response.error]
    };
  }
  
  async batchAvailability(roomTypeIds, startDate, endDate) {
    // Calry v2 batch availability endpoint
    const response = await this.request('/vrs/availability/batch', 'POST', {
      roomTypeIds,
      startDate,
      endDate
    });
    
    if (!response.success) {
      // Fall back to individual calls
      const results = {};
      for (const roomTypeId of roomTypeIds) {
        const avail = await this.getAvailability(roomTypeId, startDate, endDate);
        if (avail.success) {
          results[roomTypeId] = avail.data;
        }
      }
      return { success: true, data: results };
    }
    
    return {
      success: true,
      data: response.data
    };
  }
  
  // =====================================================
  // RATES / PRICING
  // =====================================================
  
  /**
   * Get rates for a room type
   */
  async getRates(roomTypeExternalId, startDate, endDate) {
    // Try v2 endpoint
    let response = await this.request(`/vrs/room-types/${roomTypeExternalId}/rates`, 'GET', null, {
      params: { startDate, endDate }
    });
    
    // Fall back to v1
    if (!response.success) {
      console.log(`Calry: v2 rates failed, trying v1 for roomType ${roomTypeExternalId}`);
      response = await this.request(`/vrs/rates`, 'GET', null, {
        useV1: true,
        params: { 
          roomTypeId: roomTypeExternalId,
          startDate, 
          endDate 
        }
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
   * Get rates for a property (all room types)
   */
  async getPropertyRates(propertyExternalId, startDate, endDate) {
    const roomTypesResult = await this.getRoomTypes(propertyExternalId);
    
    if (!roomTypesResult.success) {
      // Property might be the room type
      const rates = await this.getRates(propertyExternalId, startDate, endDate);
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
      const rates = await this.getRates(roomType.externalId, startDate, endDate);
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
    return {
      roomTypeId: roomTypeId,
      date: day.date,
      price: parseFloat(day.price || day.rate || day.baseRate) || 0,
      currency: day.currency || 'EUR',
      extraGuestFee: parseFloat(day.extraGuestFee || day.additionalGuestFee) || 0,
      weeklyDiscountPercent: parseFloat(day.weeklyDiscount || day.weeklyDiscountPercent) || 0,
      monthlyDiscountPercent: parseFloat(day.monthlyDiscount || day.monthlyDiscountPercent) || 0,
      minStay: day.minStay || day.minimumStay || null,
      maxStay: day.maxStay || day.maximumStay || null,
      ratePlanId: day.ratePlanId || null,
      ratePlanName: day.ratePlanName || null,
      // Some PMSs include fees breakdown
      cleaningFee: parseFloat(day.cleaningFee) || null,
      serviceFee: parseFloat(day.serviceFee) || null,
      taxes: day.taxes || null
    };
  }
  
  async updateRates(roomTypeExternalId, ratesData) {
    const updates = ratesData.map(rate => ({
      date: rate.date,
      price: rate.price,
      extraGuestFee: rate.extraGuestFee,
      weeklyDiscount: rate.weeklyDiscountPercent,
      monthlyDiscount: rate.monthlyDiscountPercent,
      minStay: rate.minStay,
      maxStay: rate.maxStay
    }));
    
    let response = await this.request(
      `/vrs/room-types/${roomTypeExternalId}/rates`,
      'PUT',
      { rates: updates }
    );
    
    if (!response.success) {
      response = await this.request(
        `/vrs/rates/${roomTypeExternalId}`,
        'PUT',
        { rates: updates },
        { useV1: true }
      );
    }
    
    return {
      success: response.success,
      updated: response.success ? updates.length : 0,
      errors: response.success ? [] : [response.error]
    };
  }
  
  // =====================================================
  // RESERVATIONS (Calry v2)
  // =====================================================
  
  async getReservations(options = {}) {
    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    if (options.propertyId) params.propertyId = options.propertyId;
    if (options.startDate) params.arrivalStartDate = options.startDate;
    if (options.endDate) params.arrivalEndDate = options.endDate;
    if (options.updatedSince) params.modifiedSince = options.updatedSince;
    
    const response = await this.request('/vrs/reservations', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const reservations = (response.data?.data || response.data || []).map(res => 
      this.mapReservation(res)
    );
    
    return {
      success: true,
      data: reservations,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 100,
        total: response.data?.total || reservations.length,
        hasMore: response.data?.hasMore || false
      }
    };
  }
  
  async getReservation(externalId) {
    const response = await this.request(`/vrs/reservations/${externalId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  mapReservation(raw) {
    // Handle guest info - v2 uses primaryGuest object
    const guest = raw.primaryGuest || raw.guest || {};
    const guestName = guest.name || `${guest.nameFirst || guest.firstName || ''} ${guest.nameLast || guest.lastName || ''}`.trim() || 'Guest';
    const guestEmail = (guest.emails && guest.emails[0]) || guest.email || null;
    const guestPhone = (guest.mobileNumbers && guest.mobileNumbers[0]) || guest.phone || null;
    
    return {
      externalId: String(raw.id),
      propertyId: String(raw.propertyId),
      // v2 adds roomTypeIds array
      roomTypeId: raw.roomTypeIds?.[0] || raw.roomTypeId || raw.propertyId,
      roomTypeIds: raw.roomTypeIds || [raw.roomTypeId || raw.propertyId],
      unitIds: raw.unitIds || [],
      channel: raw.source || raw.channel || 'DIRECT',
      channelReservationId: raw.channelReservationId || raw.externalId,
      status: raw.status || 'confirmed',
      checkIn: raw.arrivalDate || raw.checkIn,
      checkOut: raw.departureDate || raw.checkOut,
      nights: raw.nights || this.calculateNights(raw.arrivalDate, raw.departureDate),
      guest: {
        name: guestName,
        firstName: guest.nameFirst || guest.firstName,
        lastName: guest.nameLast || guest.lastName,
        email: guestEmail,
        phone: guestPhone,
        address: guest.addresses || null,
        language: guest.preferredLanguage?.code || null
      },
      guests: {
        total: raw.numberOfGuests || 1,
        adults: raw.numberOfAdults || 1,
        children: raw.numberOfChildren || 0,
        infants: raw.numberOfInfants || 0,
        pets: raw.numberOfPets || 0
      },
      pricing: {
        total: parseFloat(raw.totalPrice || raw.total) || 0,
        currency: raw.currency || 'EUR',
        accommodation: raw.finances?.accommodation || null,
        cleaning: raw.finances?.cleaning || null,
        fees: raw.finances?.fees || null,
        taxes: raw.finances?.taxes || null,
        paid: raw.finances?.paid || 0,
        due: raw.finances?.due || null
      },
      arrivalTime: raw.arrivalEstimatedTime || null,
      departureTime: raw.departureEstimatedTime || null,
      notes: raw.notes || '',
      source: raw.source || 'direct',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      cancelledAt: raw.cancelledAt || null,
      metadata: {
        calryId: raw.id,
        pmsType: this.pmsType
      },
      raw: raw
    };
  }
  
  calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }
  
  async createReservation(reservationData) {
    const payload = {
      propertyId: reservationData.propertyId,
      roomTypeId: reservationData.roomTypeId,
      arrivalDate: reservationData.checkIn,
      departureDate: reservationData.checkOut,
      numberOfGuests: reservationData.guests?.total || 1,
      numberOfAdults: reservationData.guests?.adults || 1,
      numberOfChildren: reservationData.guests?.children || 0,
      totalPrice: reservationData.pricing?.total,
      currency: reservationData.pricing?.currency || 'EUR',
      primaryGuest: {
        nameFirst: reservationData.guest?.firstName,
        nameLast: reservationData.guest?.lastName,
        emails: reservationData.guest?.email ? [reservationData.guest.email] : [],
        mobileNumbers: reservationData.guest?.phone ? [reservationData.guest.phone] : []
      },
      notes: reservationData.notes,
      source: 'direct'
    };
    
    const response = await this.request('/vrs/reservations', 'POST', payload);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data?.data || response.data)
    };
  }
  
  async updateReservation(externalId, updates) {
    const response = await this.request(`/vrs/reservations/${externalId}`, 'PATCH', updates);
    
    return {
      success: response.success,
      data: response.success ? this.mapReservation(response.data) : null,
      error: response.error
    };
  }
  
  async cancelReservation(externalId, reason = null) {
    const response = await this.request(`/vrs/reservations/${externalId}/cancel`, 'POST', {
      reason
    });
    
    return {
      success: response.success,
      error: response.error
    };
  }
  
  // =====================================================
  // QUOTES
  // =====================================================
  
  async getQuote(params) {
    const response = await this.request('/vrs/quotes', 'POST', {
      propertyId: params.propertyId,
      roomTypeId: params.roomTypeId,
      arrivalDate: params.checkIn,
      departureDate: params.checkOut,
      numberOfGuests: params.guests || 1,
      numberOfAdults: params.adults || params.guests || 1,
      numberOfChildren: params.children || 0
    });
    
    if (!response.success) {
      return response;
    }
    
    const quote = response.data?.data || response.data;
    
    return {
      success: true,
      data: {
        available: quote.available !== false,
        price: parseFloat(quote.totalPrice || quote.total) || 0,
        currency: quote.currency || 'EUR',
        breakdown: {
          accommodation: quote.accommodation || quote.basePrice,
          cleaning: quote.cleaningFee,
          fees: quote.fees,
          taxes: quote.taxes,
          discount: quote.discount
        },
        ratePlans: quote.ratePlans || [],
        minStay: quote.minStay,
        maxStay: quote.maxStay
      }
    };
  }
  
  // =====================================================
  // CONVERSATIONS / MESSAGING
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
      data: (response.data?.data || response.data || []).map(conv => ({
        id: conv.id,
        reservationId: conv.reservationId,
        roomTypeId: conv.roomTypeId,
        guestName: conv.guestName,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0,
        externalThreadId: conv.externalThreadId
      }))
    };
  }
  
  async getConversation(conversationId) {
    const response = await this.request(`/vrs/conversations/${conversationId}`);
    
    if (!response.success) {
      return response;
    }
    
    const conv = response.data?.data || response.data;
    
    return {
      success: true,
      data: {
        id: conv.id,
        reservationId: conv.reservationId,
        roomTypeId: conv.roomTypeId,
        guestName: conv.guestName,
        externalThreadId: conv.externalThreadId,
        messages: (conv.messages || []).map(msg => ({
          id: msg.id,
          content: msg.content || msg.body,
          sender: msg.sender || msg.from,
          sentAt: msg.sentAt || msg.createdAt,
          type: msg.type,
          status: msg.status,
          seenStatus: msg.seenStatus,
          isAutomatic: msg.is_automatic,
          attachments: msg.attachments || []
        }))
      }
    };
  }
  
  async sendMessage(conversationId, message) {
    const response = await this.request(`/vrs/conversations/${conversationId}/messages`, 'POST', {
      content: message.content,
      channel: message.channel
    });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: {
        id: response.data?.id,
        content: message.content,
        sender: 'host',
        sentAt: new Date().toISOString()
      }
    };
  }
  
  // =====================================================
  // REVIEWS
  // =====================================================
  
  async getReviews(propertyExternalId, options = {}) {
    const params = { propertyId: propertyExternalId };
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;
    
    // Reviews endpoint is on v1
    const response = await this.request(`/vrs/reviews/property/${propertyExternalId}`, 'GET', null, { 
      useV1: true 
    });
    
    if (!response.success) {
      return response;
    }
    
    const reviews = (response.data?.data || response.data || []).map(review => ({
      externalId: review.id,
      propertyId: propertyExternalId,
      reservationId: review.reservationId,
      rating: review.rating,
      title: review.title,
      content: review.description || review.content || review.review,
      feedback: review.feedback,
      guestName: review.guestName,
      guestId: review.guestId,
      source: review.source || review.channel,
      createdAt: review.createdAt,
      response: review.response,
      respondedAt: review.respondedAt,
      categoryRatings: review.categoryRatings || []
    }));
    
    return {
      success: true,
      data: reviews
    };
  }
  
  // =====================================================
  // WEBHOOKS
  // =====================================================
  
  async registerWebhook(url, events) {
    const response = await this.request('/webhooks', 'POST', {
      url,
      events
    }, { useV1: true });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      webhookId: response.data?.id,
      listenerUrl: response.data?.listenerUrl
    };
  }
  
  async unregisterWebhook(webhookId) {
    const response = await this.request(`/webhooks/${webhookId}`, 'DELETE', null, { useV1: true });
    return { success: response.success };
  }
  
  parseWebhookPayload(payload, headers) {
    return {
      event: payload.event || payload.type,
      data: payload.data || payload.payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      integrationAccountId: payload.integrationAccountId,
      externalId: payload.data?.id || payload.resourceId
    };
  }
  
  // =====================================================
  // FULL SYNC (includes pricing & availability)
  // =====================================================
  
  async fullSync(options = {}) {
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      availability: { synced: 0, errors: 0 },
      rates: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 }
    };
    
    const syncDays = options.days || 90;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + syncDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
      // 1. Sync properties
      const propertiesResult = await this.getProperties({ limit: 100 });
      if (propertiesResult.success) {
        for (const property of propertiesResult.data) {
          try {
            await this.syncPropertyToDatabase(property);
            stats.properties.synced++;
            
            // 2. Sync room types
            const roomTypesResult = await this.getRoomTypes(property.externalId);
            if (roomTypesResult.success) {
              for (const roomType of roomTypesResult.data) {
                try {
                  await this.syncRoomTypeToDatabase(roomType, property.externalId);
                  stats.roomTypes.synced++;
                  
                  // 3. Sync availability for this room type
                  if (options.syncAvailability !== false) {
                    try {
                      const availResult = await this.getAvailability(roomType.externalId, startDate, endDate);
                      if (availResult.success && availResult.data.length > 0) {
                        await this.syncAvailabilityToDatabase(roomType.externalId, availResult.data);
                        stats.availability.synced += availResult.data.length;
                      }
                    } catch (availErr) {
                      stats.availability.errors++;
                      console.error(`Availability sync error for ${roomType.externalId}:`, availErr.message);
                    }
                  }
                  
                  // 4. Sync rates for this room type
                  if (options.syncRates !== false) {
                    try {
                      const ratesResult = await this.getRates(roomType.externalId, startDate, endDate);
                      if (ratesResult.success && ratesResult.data.length > 0) {
                        await this.syncRatesToDatabase(roomType.externalId, ratesResult.data);
                        stats.rates.synced += ratesResult.data.length;
                      }
                    } catch (ratesErr) {
                      stats.rates.errors++;
                      console.error(`Rates sync error for ${roomType.externalId}:`, ratesErr.message);
                    }
                  }
                  
                } catch (e) {
                  stats.roomTypes.errors++;
                  console.error('Room type sync error:', e.message);
                }
              }
            }
          } catch (e) {
            stats.properties.errors++;
            console.error('Property sync error:', e.message);
          }
        }
      }
      
      // 5. Sync reservations
      const reservationsResult = await this.getReservations({ limit: 100 });
      if (reservationsResult.success) {
        for (const reservation of reservationsResult.data) {
          try {
            await this.syncReservationToDatabase(reservation);
            stats.reservations.synced++;
          } catch (e) {
            stats.reservations.errors++;
            console.error('Reservation sync error:', e.message);
          }
        }
      }
      
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message, stats };
    }
  }
  
  // Incremental sync - only sync changes since last sync
  async incrementalSync(lastSyncTime, options = {}) {
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      availability: { synced: 0, errors: 0 },
      rates: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 }
    };
    
    try {
      // For incremental, mainly sync reservations and upcoming availability
      const reservationsResult = await this.getReservations({ 
        modifiedSince: lastSyncTime,
        limit: 100 
      });
      
      if (reservationsResult.success) {
        for (const reservation of reservationsResult.data) {
          try {
            await this.syncReservationToDatabase(reservation);
            stats.reservations.synced++;
          } catch (e) {
            stats.reservations.errors++;
          }
        }
      }
      
      // Also sync availability/rates for next 30 days
      if (options.syncAvailability !== false) {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Get all linked room types
        if (this.pool && this.connectionId) {
          const roomsResult = await this.pool.query(`
            SELECT srt.external_id 
            FROM gas_sync_room_types srt
            JOIN gas_sync_properties sp ON srt.sync_property_id = sp.id
            WHERE sp.connection_id = $1
          `, [this.connectionId]);
          
          for (const row of roomsResult.rows) {
            try {
              const availResult = await this.getAvailability(row.external_id, startDate, endDate);
              if (availResult.success) {
                await this.syncAvailabilityToDatabase(row.external_id, availResult.data);
                stats.availability.synced += availResult.data.length;
              }
              
              const ratesResult = await this.getRates(row.external_id, startDate, endDate);
              if (ratesResult.success) {
                await this.syncRatesToDatabase(row.external_id, ratesResult.data);
                stats.rates.synced += ratesResult.data.length;
              }
            } catch (e) {
              stats.availability.errors++;
              stats.rates.errors++;
            }
          }
        }
      }
      
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message, stats };
    }
  }
  
  // =====================================================
  // DATABASE SYNC METHODS
  // =====================================================
  
  async syncPropertyToDatabase(property) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const address = property.address || {};
      const street = address.street || '';
      const city = address.city || '';
      const country = address.country || '';
      const postalCode = address.postalCode || '';
      const lat = address.coordinates?.lat || null;
      const lng = address.coordinates?.lng || null;
      
      const settings = {
        calry_id: property.metadata?.calryId || property.externalId,
        calry_external_id: property.metadata?.externalPropertyId,
        pms_type: this.pmsType,
        check_in_time: property.checkInTime || null,
        check_out_time: property.checkOutTime || null,
        timezone: property.timezone || null,
        property_type: property.propertyType || null,
        amenities: property.amenities || []
      };
      
      const result = await this.pool.query(`
        INSERT INTO gas_sync_properties (
          connection_id, external_id, name, 
          address, city, country, postal_code,
          latitude, longitude, currency, description,
          raw_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (connection_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          postal_code = EXCLUDED.postal_code,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          currency = EXCLUDED.currency,
          description = EXCLUDED.description,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        this.connectionId,
        property.externalId,
        property.name,
        street,
        city,
        country,
        postalCode,
        lat,
        lng,
        property.currency || 'EUR',
        property.description || '',
        JSON.stringify({ ...property.raw, _settings: settings })
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Calry syncPropertyToDatabase error:', error.message);
      throw error;
    }
  }
  
  async syncRoomTypeToDatabase(roomType, propertyExternalId) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const propResult = await this.pool.query(
        'SELECT id FROM gas_sync_properties WHERE connection_id = $1 AND external_id = $2',
        [this.connectionId, propertyExternalId]
      );
      
      if (propResult.rows.length === 0) {
        console.log('Property not found for room type:', propertyExternalId);
        return;
      }
      
      const syncPropertyId = propResult.rows[0].id;
      
      const amenitiesData = {
        amenities: roomType.amenities || [],
        calry_id: roomType.metadata?.calryRoomTypeId || roomType.externalId,
        calry_external_id: roomType.metadata?.externalRoomTypeId,
        bed_types: roomType.bedTypes || [],
        room_type: roomType.roomType || null,
        floor: roomType.floor || null,
        size: roomType.size || null,
        size_unit: roomType.sizeUnit || 'sqm',
        unit_count: roomType.unitCount || 1
      };
      
      const result = await this.pool.query(`
        INSERT INTO gas_sync_room_types (
          sync_property_id, external_id, name,
          max_guests, base_price, currency,
          bedrooms, bathrooms,
          raw_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (sync_property_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          max_guests = EXCLUDED.max_guests,
          base_price = EXCLUDED.base_price,
          currency = EXCLUDED.currency,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        syncPropertyId,
        roomType.externalId,
        roomType.name,
        roomType.maxGuests || 2,
        roomType.basePrice || 0,
        roomType.currency || 'EUR',
        roomType.bedrooms || 1,
        roomType.bathrooms || 1,
        JSON.stringify({ ...roomType.raw, _amenities: amenitiesData })
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Calry syncRoomTypeToDatabase error:', error.message);
      throw error;
    }
  }
  
  async syncReservationToDatabase(reservation) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const guestName = reservation.guest?.name || 'Guest';
      
      const result = await this.pool.query(`
        INSERT INTO gas_sync_reservations (
          connection_id, external_id, property_external_id, room_type_external_id,
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
