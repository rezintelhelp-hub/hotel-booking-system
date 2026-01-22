/**
 * Calry Adapter for GasSync
 * 
 * Meta-adapter that connects to Calry's Unified API
 * Provides access to 40+ PMS systems through a single interface
 * 
 * Based on Calry v2 API specification
 * https://docs.calry.app/docs/vacation-rental-api/v2/
 */

const axios = require('axios');
const crypto = require('crypto');

// =====================================================
// CONFIGURATION
// =====================================================

const CALRY_PROD_BASE = 'https://prod.calry.app/api/v2';
const CALRY_DEV_BASE = 'https://dev.calry.app/api/v2';

// Supported PMS systems through Calry
const CALRY_SUPPORTED_PMS = [
  'guesty', 'hostfully', 'hospitable', 'bookingsync', 'smily',
  'apaleo', 'cloudbeds', 'lodgify', 'ownerrez', 'tokeet',
  'streamline', 'track', 'escapia', 'liverez', 'barefoot',
  'resly', 'elina', 'uplisting', 'fantasticstay', 'avantio',
  'rentlio', 'ciirus', 'myvr', 'hostify', 'bookeye',
  'stayntouch', 'webrezpro', 'roomracoon', 'little_hotelier',
  'newbook', 'sirvoy', 'clock_pms', 'mews', 'hotelogix'
  // ... and more
];

// =====================================================
// CALRY ADAPTER CLASS
// =====================================================

class CalryAdapter {
  constructor(config) {
    this.name = 'calry';
    this.version = '2.0.0';
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
    this.pmsType = config.pmsType; // e.g., 'guesty', 'hostfully'
    
    // Environment
    this.baseUrl = config.useDev ? CALRY_DEV_BASE : CALRY_PROD_BASE;
    
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
    
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
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
    // Calry uses workspace-level authentication
    // Token is generated from Calry dashboard
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
    const response = await this.request('/integration-accounts');
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: (response.data || []).map(acc => ({
        id: acc.id,
        pmsType: acc.integrationType,
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
    // Add thumbnail as image if no other images
    if (images.length === 0 && raw.thumbnailUrl) {
      images.push({ url: raw.thumbnailUrl, caption: '', order: 0, isPrimary: true });
    }
    
    return {
      externalId: String(raw.id),
      name: raw.name,
      description: raw.description || raw.summary || '',
      shortDescription: raw.shortDescription || '',
      propertyType: raw.type || raw.propertyType || 'vacation_rental',
      address: {
        street: raw.address?.street || raw.address?.line1 || raw.street || '',
        city: raw.address?.city || raw.city || '',
        state: raw.address?.state || raw.address?.region || raw.region || '',
        country: raw.address?.country || raw.address?.countryCode || raw.country || '',
        postalCode: raw.address?.postalCode || raw.address?.postal_code || raw.address?.zipCode || raw.zipCode || '',
        coordinates: {
          lat: parseFloat(raw.latitude || raw.geoLocation?.latitude || raw.address?.latitude || raw.coordinates?.lat) || null,
          lng: parseFloat(raw.longitude || raw.geoLocation?.longitude || raw.address?.longitude || raw.coordinates?.lng) || null
        }
      },
      timezone: raw.timezone || 'UTC',
      currency: raw.currency || 'USD',
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
      roomTypes: (raw.roomTypes || []).map(rt => this.mapRoomType(rt)),
      metadata: {
        calryId: raw.id,
        pmsType: this.pmsType,
        externalPropertyId: raw.externalId
      },
      raw: raw
    };
  }
  
  // =====================================================
  // ROOM TYPES (Calry v2 - Primary bookable entity)
  // =====================================================
  
  async getRoomTypes(propertyExternalId, options = {}) {
    const response = await this.request(`/vrs/properties/${propertyExternalId}/room-types`);
    
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
  
  async getRoomType(externalId) {
    const response = await this.request(`/vrs/room-types/${externalId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapRoomType(response.data)
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
      currency: raw.currency || 'USD',
      amenities: amenities,
      images: images,
      unitCount: raw.units?.length || raw.quantity || 1,
      units: (raw.units || []).map(u => ({
        externalId: String(u.id),
        name: u.name,
        status: u.status || 'available'
      })),
      metadata: {
        calryRoomTypeId: raw.id,
        externalRoomTypeId: raw.externalId
      },
      raw: raw
    };
  }
  
  // =====================================================
  // AVAILABILITY (Calry v2)
  // =====================================================
  
  async getAvailability(roomTypeExternalId, startDate, endDate) {
    const response = await this.request(`/vrs/room-types/${roomTypeExternalId}/availability`, 'GET', null, {
      params: { startDate, endDate }
    });
    
    if (!response.success) {
      return response;
    }
    
    const availability = (response.data?.data || response.data || []).map(day => ({
      roomTypeId: roomTypeExternalId,
      date: day.date,
      isAvailable: day.available !== false && (day.unitsAvailable > 0 || day.available === true),
      unitsAvailable: day.unitsAvailable || (day.available ? 1 : 0),
      minStay: day.minStay || day.minimumStay || 1,
      maxStay: day.maxStay || day.maximumStay || null,
      checkInAllowed: day.checkInAllowed !== false,
      checkOutAllowed: day.checkOutAllowed !== false,
      price: parseFloat(day.price) || null,
      currency: day.currency || 'USD'
    }));
    
    return {
      success: true,
      data: availability
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
    
    const response = await this.request(
      `/vrs/room-types/${roomTypeExternalId}/availability`,
      'PUT',
      { availability: updates }
    );
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      updated: updates.length,
      errors: []
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
  // RATES
  // =====================================================
  
  async getRates(roomTypeExternalId, startDate, endDate) {
    const response = await this.request(`/vrs/room-types/${roomTypeExternalId}/rates`, 'GET', null, {
      params: { startDate, endDate }
    });
    
    if (!response.success) {
      return response;
    }
    
    const rates = (response.data?.data || response.data || []).map(day => ({
      roomTypeId: roomTypeExternalId,
      date: day.date,
      price: parseFloat(day.price || day.rate) || 0,
      currency: day.currency || 'USD',
      extraGuestFee: parseFloat(day.extraGuestFee) || 0,
      weeklyDiscountPercent: parseFloat(day.weeklyDiscount) || 0,
      monthlyDiscountPercent: parseFloat(day.monthlyDiscount) || 0,
      ratePlanId: day.ratePlanId,
      ratePlanName: day.ratePlanName
    }));
    
    return {
      success: true,
      data: rates
    };
  }
  
  async updateRates(roomTypeExternalId, ratesData) {
    const updates = ratesData.map(rate => ({
      date: rate.date,
      price: rate.price,
      extraGuestFee: rate.extraGuestFee,
      weeklyDiscount: rate.weeklyDiscountPercent,
      monthlyDiscount: rate.monthlyDiscountPercent
    }));
    
    const response = await this.request(
      `/vrs/room-types/${roomTypeExternalId}/rates`,
      'PUT',
      { rates: updates }
    );
    
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
  
  async createReservation(reservation) {
    const bookingData = {
      roomTypeId: reservation.roomTypeId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      adults: reservation.guests?.adults || 1,
      children: reservation.guests?.children || 0,
      infants: reservation.guests?.infants || 0,
      guest: {
        firstName: reservation.guest?.firstName,
        lastName: reservation.guest?.lastName,
        email: reservation.guest?.email,
        phone: reservation.guest?.phone
      },
      totalPrice: reservation.pricing?.total,
      currency: reservation.pricing?.currency || 'USD',
      source: 'GAS',
      notes: reservation.notes
    };
    
    const response = await this.request('/vrs/reservations', 'POST', bookingData);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data),
      externalId: String(response.data?.id)
    };
  }
  
  async updateReservation(externalId, updates) {
    const response = await this.request(`/vrs/reservations/${externalId}`, 'PUT', updates);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  async cancelReservation(externalId, reason = '') {
    const response = await this.request(`/vrs/reservations/${externalId}/cancel`, 'POST', {
      reason
    });
    
    return {
      success: response.success,
      error: response.error
    };
  }
  
  mapReservation(raw) {
    return {
      externalId: String(raw.id),
      source: 'calry',
      channel: raw.source || raw.channel || 'DIRECT',
      channelReservationId: raw.externalReservationId || raw.channelReservationId,
      propertyId: String(raw.propertyId),
      roomTypeId: String(raw.roomTypeId),
      roomTypeIds: raw.roomTypeIds || [String(raw.roomTypeId)],
      unitIds: raw.unitIds || [],
      checkIn: raw.checkIn || raw.arrivalDate,
      checkOut: raw.checkOut || raw.departureDate,
      guests: {
        adults: raw.adults || raw.numAdults || 1,
        children: raw.children || raw.numChildren || 0,
        infants: raw.infants || raw.numInfants || 0
      },
      guest: {
        firstName: raw.guest?.firstName || raw.guestFirstName,
        lastName: raw.guest?.lastName || raw.guestLastName,
        email: raw.guest?.email || raw.guestEmail,
        phone: raw.guest?.phone || raw.guestPhone,
        language: raw.guest?.language,
        address: raw.guest?.address || {}
      },
      pricing: {
        subtotal: parseFloat(raw.subtotal || raw.accommodationTotal) || 0,
        cleaning: parseFloat(raw.cleaningFee) || 0,
        taxes: parseFloat(raw.taxes || raw.taxAmount) || 0,
        fees: parseFloat(raw.fees || raw.additionalFees) || 0,
        discount: parseFloat(raw.discount) || 0,
        total: parseFloat(raw.totalPrice || raw.total) || 0,
        currency: raw.currency || 'USD',
        paid: parseFloat(raw.amountPaid || raw.paidAmount) || 0,
        balance: parseFloat(raw.balance || raw.amountDue) || 0
      },
      status: this.mapStatus(raw.status),
      notes: raw.notes || raw.hostNotes,
      specialRequests: raw.guestNotes || raw.specialRequests,
      arrivalTime: raw.arrivalTime || raw.checkInTime,
      metadata: {
        calryReservationId: raw.id,
        pmsType: this.pmsType,
        externalReservationId: raw.externalId
      },
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      raw: raw
    };
  }
  
  mapStatus(status) {
    const statusMap = {
      'confirmed': 'confirmed',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'checked_in': 'checked_in',
      'checked_out': 'checked_out',
      'no_show': 'no_show'
    };
    
    return statusMap[(status || '').toLowerCase()] || status || 'confirmed';
  }
  
  // =====================================================
  // QUOTES
  // =====================================================
  
  async getQuote(roomTypeExternalId, checkIn, checkOut, guests) {
    const response = await this.request('/vrs/quotes', 'POST', {
      roomTypeId: roomTypeExternalId,
      checkIn,
      checkOut,
      adults: guests.adults || 1,
      children: guests.children || 0,
      infants: guests.infants || 0
    });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: {
        roomTypeId: roomTypeExternalId,
        checkIn,
        checkOut,
        nights: response.data.nights,
        subtotal: response.data.accommodationTotal,
        cleaning: response.data.cleaningFee,
        taxes: response.data.taxes,
        fees: response.data.fees,
        total: response.data.total,
        currency: response.data.currency,
        ratePlans: response.data.ratePlans || []
      }
    };
  }
  
  // =====================================================
  // CONVERSATIONS
  // =====================================================
  
  async getConversations(reservationExternalId) {
    const response = await this.request('/vrs/conversations', 'GET', null, {
      params: { reservationId: reservationExternalId }
    });
    
    if (!response.success) {
      return response;
    }
    
    const conversations = (response.data?.data || response.data || []).map(conv => ({
      externalId: conv.id,
      reservationId: conv.reservationId,
      guestEmail: conv.guestEmail,
      roomTypeId: conv.roomTypeId,
      externalThreadId: conv.externalThreadId,
      messages: (conv.messages || []).map(msg => ({
        id: msg.id,
        sender: msg.sender || (msg.direction === 'incoming' ? 'guest' : 'host'),
        content: msg.content || msg.body,
        type: msg.type,
        status: msg.status,
        seenStatus: msg.seenStatus,
        isAutomatic: msg.is_automatic,
        attachments: msg.attachments || [],
        sentAt: msg.sentAt || msg.createdAt,
        readAt: msg.readAt
      })),
      status: conv.status || 'open',
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));
    
    return {
      success: true,
      data: conversations
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
    
    const response = await this.request('/vrs/reviews', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const reviews = (response.data?.data || response.data || []).map(review => ({
      externalId: review.id,
      propertyId: propertyExternalId,
      reservationId: review.reservationId,
      rating: review.rating,
      title: review.title,
      content: review.content || review.review,
      guestName: review.guestName,
      source: review.source || review.channel,
      createdAt: review.createdAt,
      response: review.response,
      respondedAt: review.respondedAt
    }));
    
    return {
      success: true,
      data: reviews
    };
  }
  
  // =====================================================
  // PASSTHROUGH (Direct PMS API calls)
  // =====================================================
  
  async passthrough(method, endpoint, data = null, headers = {}) {
    // Calry's passthrough allows direct API calls to the source PMS
    const response = await this.request('/passthrough', 'POST', {
      method,
      endpoint,
      data,
      headers
    });
    
    return response;
  }
  
  // =====================================================
  // WEBHOOKS
  // =====================================================
  
  async registerWebhook(url, events) {
    const response = await this.request('/webhooks', 'POST', {
      url,
      events
    });
    
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
    const response = await this.request(`/webhooks/${webhookId}`, 'DELETE');
    return { success: response.success };
  }
  
  parseWebhookPayload(payload, headers) {
    // Calry webhooks use standard event format
    return {
      event: payload.event || payload.type,
      data: payload.data || payload.payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      integrationAccountId: payload.integrationAccountId,
      externalId: payload.data?.id || payload.resourceId
    };
  }
  
  // =====================================================
  // FULL SYNC
  // =====================================================
  
  async fullSync(options = {}) {
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 }
    };
    
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
      
      // 3. Sync reservations
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
  async incrementalSync(lastSyncTime) {
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 }
    };
    
    try {
      // For incremental, mainly sync reservations
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
      
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message, stats };
    }
  }
  
  // Database sync helpers - Map Calry data to GAS tables
  async syncPropertyToDatabase(property) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // Extract address fields with fallbacks
      const address = property.address || {};
      const street = address.street || address.line1 || '';
      const city = address.city || '';
      const country = address.country || address.countryCode || '';
      const postalCode = address.postalCode || address.postal_code || address.zipCode || '';
      const lat = address.coordinates?.lat || null;
      const lng = address.coordinates?.lng || null;
      
      // Build settings JSON with all extra Calry data
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
      
      // Upsert to gas_sync_properties
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
      // Get the sync property ID
      const propResult = await this.pool.query(
        'SELECT id FROM gas_sync_properties WHERE connection_id = $1 AND external_id = $2',
        [this.connectionId, propertyExternalId]
      );
      
      if (propResult.rows.length === 0) {
        console.log('Property not found for room type:', propertyExternalId);
        return;
      }
      
      const syncPropertyId = propResult.rows[0].id;
      
      // Build amenities JSON with extra data
      const amenitiesData = {
        amenities: roomType.amenities || [],
        calry_id: roomType.metadata?.calryRoomTypeId || roomType.externalId,
        calry_external_id: roomType.metadata?.externalRoomTypeId,
        bed_types: roomType.beds || [],
        room_type: roomType.roomType || null,
        size: roomType.size || null,
        size_unit: roomType.sizeUnit || 'sqm',
        unit_count: roomType.unitCount || 1
      };
      
      // Upsert to gas_sync_room_types
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
      // Guest name handling
      const guestName = reservation.guest 
        ? `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim()
        : 'Guest';
      
      // Upsert to gas_sync_reservations
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
  
  // Sync availability to room_calendar table
  async syncAvailabilityToDatabase(roomTypeExternalId, availabilityData) {
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
        console.log('Room not linked to GAS for availability sync:', roomTypeExternalId);
        return;
      }
      
      const gasRoomId = roomResult.rows[0].gas_room_id;
      
      // Upsert each day's availability
      for (const day of availabilityData) {
        await this.pool.query(`
          INSERT INTO room_calendar (
            room_id, date, price, currency,
            available, min_stay, max_stay,
            closed_to_arrival, closed_to_departure,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (room_id, date) DO UPDATE SET
            price = COALESCE(EXCLUDED.price, room_calendar.price),
            available = EXCLUDED.available,
            min_stay = COALESCE(EXCLUDED.min_stay, room_calendar.min_stay),
            max_stay = COALESCE(EXCLUDED.max_stay, room_calendar.max_stay),
            closed_to_arrival = EXCLUDED.closed_to_arrival,
            closed_to_departure = EXCLUDED.closed_to_departure,
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
          day.checkOutAllowed === false
        ]);
      }
      
      return availabilityData.length;
    } catch (error) {
      console.error('Calry syncAvailabilityToDatabase error:', error.message);
      throw error;
    }
  }
  
  // Sync rates to room_calendar table
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
        console.log('Room not linked to GAS for rates sync:', roomTypeExternalId);
        return;
      }
      
      const gasRoomId = roomResult.rows[0].gas_room_id;
      
      // Upsert each day's rate
      for (const day of ratesData) {
        await this.pool.query(`
          INSERT INTO room_calendar (
            room_id, date, price, currency,
            extra_guest_fee, weekly_discount, monthly_discount,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (room_id, date) DO UPDATE SET
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            extra_guest_fee = COALESCE(EXCLUDED.extra_guest_fee, room_calendar.extra_guest_fee),
            weekly_discount = COALESCE(EXCLUDED.weekly_discount, room_calendar.weekly_discount),
            monthly_discount = COALESCE(EXCLUDED.monthly_discount, room_calendar.monthly_discount),
            updated_at = NOW()
        `, [
          gasRoomId,
          day.date,
          day.price,
          day.currency || 'EUR',
          day.extraGuestFee || null,
          day.weeklyDiscountPercent || null,
          day.monthlyDiscountPercent || null
        ]);
      }
      
      return ratesData.length;
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
