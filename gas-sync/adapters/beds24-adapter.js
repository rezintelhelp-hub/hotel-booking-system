/**
 * Beds24 Adapter for GasSync
 * 
 * Supports both V1 and V2 APIs:
 * - V2: Properties, Rooms, Availability, Rates, Reservations (primary)
 * - V1: Images, legacy endpoints (supplementary)
 * 
 * Based on Calry v2 schema for compatibility
 */

const axios = require('axios');
const crypto = require('crypto');

// =====================================================
// CONFIGURATION
// =====================================================

const BEDS24_V2_BASE = 'https://beds24.com/api/v2';
const BEDS24_V1_BASE = 'https://beds24.com/api/json';

// =====================================================
// BEDS24 ADAPTER CLASS
// =====================================================

class Beds24Adapter {
  constructor(config) {
    this.name = 'beds24';
    this.version = '2.0.0';
    this.capabilities = [
      'properties',
      'room_types',
      'availability',
      'rates',
      'reservations',
      'images',        // Via V1 API
      'conversations'
    ];
    
    // Credentials
    this.token = config.token;           // V2 access token
    this.refreshToken = config.refreshToken;
    this.apiKey = config.apiKey;         // V1 API key (optional)
    this.propKey = config.propKey;       // V1 property key (optional)
    
    // Rate limiting
    this.rateLimiter = new RateLimiter(60); // 60 requests per minute
    
    // Pool for database operations
    this.pool = config.pool;
    this.connectionId = config.connectionId;
  }
  
  // =====================================================
  // HTTP HELPERS
  // =====================================================
  
  async v2Request(endpoint, method = 'GET', data = null, options = {}) {
    await this.rateLimiter.throttle();
    
    try {
      const config = {
        method,
        url: `${BEDS24_V2_BASE}${endpoint}`,
        headers: {
          'token': this.token,
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 30000
      };
      
      if (data) {
        config.data = data;
      }
      
      if (options.params) {
        config.params = options.params;
      }
      
      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'v2', endpoint);
    }
  }
  
  async v1Request(endpoint, data = {}) {
    await this.rateLimiter.throttle();
    
    if (!this.apiKey) {
      return { success: false, error: 'V1 API key not configured' };
    }
    
    try {
      // V1 uses POST with JSON body containing authentication
      const payload = {
        authentication: {
          apiKey: this.apiKey,
          propKey: this.propKey
        },
        ...data
      };
      
      const response = await axios.post(
        `${BEDS24_V1_BASE}${endpoint}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'v1', endpoint);
    }
  }
  
  handleError(error, api, endpoint) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    
    let code = 'UNKNOWN';
    let message = error.message;
    
    if (statusCode === 401 || statusCode === 403) {
      code = 'AUTH_FAILED';
      message = 'Authentication failed. Token may be expired.';
    } else if (statusCode === 429) {
      code = 'RATE_LIMIT';
      message = 'Rate limit exceeded. Please slow down.';
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
    
    console.error(`Beds24 ${api} API Error [${endpoint}]:`, {
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
    // Beds24 uses invite code flow for initial authentication
    // The token is obtained after the user accepts the invite
    
    if (credentials.inviteCode) {
      // Exchange invite code for token
      const response = await this.v2Request('/authentication/setup', 'POST', {
        inviteCode: credentials.inviteCode
      });
      
      if (response.success && response.data?.token) {
        this.token = response.data.token;
        this.refreshToken = response.data.refreshToken;
        
        return {
          success: true,
          token: this.token,
          refreshToken: this.refreshToken,
          expiresAt: response.data.expiresAt
        };
      }
      
      return { success: false, error: response.error || 'Failed to exchange invite code' };
    }
    
    // If we already have a token, test it
    return this.testConnection();
  }
  
  async refreshAccessToken() {
    if (!this.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }
    
    const response = await this.v2Request('/authentication/token', 'POST', {
      refreshToken: this.refreshToken
    });
    
    if (response.success && response.data?.token) {
      this.token = response.data.token;
      this.refreshToken = response.data.refreshToken || this.refreshToken;
      
      return {
        success: true,
        token: this.token,
        refreshToken: this.refreshToken,
        expiresAt: response.data.expiresAt
      };
    }
    
    return { success: false, error: response.error || 'Failed to refresh token' };
  }
  
  async testConnection() {
    const response = await this.v2Request('/properties', 'GET', null, {
      params: { limit: 1 }
    });
    
    if (response.success) {
      return { success: true, message: 'Connection successful' };
    }
    
    return { success: false, error: response.error };
  }
  
  // =====================================================
  // PROPERTIES
  // =====================================================
  
  async getProperties(options = {}) {
    const params = {
      limit: options.limit || 100,
      page: options.page || 1
    };
    
    const response = await this.v2Request('/properties', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const properties = (response.data || []).map(prop => this.mapProperty(prop));
    
    return {
      success: true,
      data: properties,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: response.data?.length || 0,
        hasMore: (response.data?.length || 0) >= params.limit
      }
    };
  }
  
  async getProperty(externalId) {
    const response = await this.v2Request(`/properties/${externalId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapProperty(response.data)
    };
  }
  
  mapProperty(raw) {
    return {
      externalId: String(raw.id),
      name: raw.name,
      description: raw.description || '',
      propertyType: raw.type || 'vacation_rental',
      address: {
        street: raw.address || '',
        city: raw.city || '',
        state: raw.region || '',
        country: raw.country || '',
        postalCode: raw.postcode || '',
        coordinates: {
          lat: parseFloat(raw.latitude) || null,
          lng: parseFloat(raw.longitude) || null
        }
      },
      timezone: raw.timezone || 'UTC',
      currency: raw.currency || 'GBP',
      checkInTime: raw.checkInStart || '15:00',
      checkOutTime: raw.checkOutEnd || '11:00',
      amenities: raw.amenities || [],
      roomTypes: [], // Populated separately
      metadata: {
        beds24Id: raw.id,
        status: raw.status,
        url: raw.url
      },
      raw: raw
    };
  }
  
  // =====================================================
  // ROOM TYPES
  // =====================================================
  
  async getRoomTypes(propertyExternalId, options = {}) {
    const response = await this.v2Request(`/properties/${propertyExternalId}/rooms`);
    
    if (!response.success) {
      return response;
    }
    
    const roomTypes = (response.data || []).map(room => this.mapRoomType(room, propertyExternalId));
    
    return {
      success: true,
      data: roomTypes
    };
  }
  
  async getRoomType(externalId) {
    const response = await this.v2Request(`/rooms/${externalId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapRoomType(response.data)
    };
  }
  
  mapRoomType(raw, propertyId = null) {
    return {
      externalId: String(raw.id),
      propertyExternalId: propertyId || String(raw.propertyId),
      name: raw.name,
      description: raw.description || '',
      maxGuests: raw.maxPeople || raw.maxGuests || 2,
      bedrooms: raw.bedrooms || 1,
      beds: raw.beds || 1,
      bathrooms: raw.bathrooms || 1,
      size: raw.size || null,
      sizeUnit: 'sqm',
      basePrice: parseFloat(raw.price) || 0,
      currency: raw.currency || 'GBP',
      amenities: raw.amenities || [],
      unitCount: raw.qty || raw.units || 1,
      metadata: {
        beds24RoomId: raw.id,
        roomType: raw.roomType
      },
      raw: raw
    };
  }
  
  // =====================================================
  // AVAILABILITY
  // =====================================================
  
  async getAvailability(roomTypeExternalId, startDate, endDate) {
    const response = await this.v2Request('/availability', 'GET', null, {
      params: {
        roomId: roomTypeExternalId,
        startDate: startDate,
        endDate: endDate
      }
    });
    
    if (!response.success) {
      return response;
    }
    
    const availability = (response.data || []).map(day => ({
      roomTypeId: roomTypeExternalId,
      date: day.date,
      isAvailable: day.available > 0,
      unitsAvailable: day.available || 0,
      minStay: day.minStay || 1,
      maxStay: day.maxStay || null,
      checkInAllowed: day.allowCheckIn !== false,
      checkOutAllowed: day.allowCheckOut !== false,
      price: parseFloat(day.price) || null,
      currency: day.currency || 'GBP'
    }));
    
    return {
      success: true,
      data: availability
    };
  }
  
  async updateAvailability(roomTypeExternalId, availabilityData) {
    // Beds24 expects array of availability updates
    const updates = availabilityData.map(day => ({
      roomId: roomTypeExternalId,
      date: day.date,
      available: day.isAvailable ? (day.unitsAvailable || 1) : 0,
      minStay: day.minStay,
      maxStay: day.maxStay,
      allowCheckIn: day.checkInAllowed,
      allowCheckOut: day.checkOutAllowed
    }));
    
    const response = await this.v2Request('/availability', 'POST', updates);
    
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
    const results = {};
    
    for (const roomTypeId of roomTypeIds) {
      const response = await this.getAvailability(roomTypeId, startDate, endDate);
      if (response.success) {
        results[roomTypeId] = response.data;
      } else {
        results[roomTypeId] = { error: response.error };
      }
    }
    
    return {
      success: true,
      data: results
    };
  }
  
  // =====================================================
  // RATES
  // =====================================================
  
  async getRates(roomTypeExternalId, startDate, endDate) {
    const response = await this.v2Request('/rates', 'GET', null, {
      params: {
        roomId: roomTypeExternalId,
        startDate: startDate,
        endDate: endDate
      }
    });
    
    if (!response.success) {
      return response;
    }
    
    const rates = (response.data || []).map(day => ({
      roomTypeId: roomTypeExternalId,
      date: day.date,
      price: parseFloat(day.price) || 0,
      currency: day.currency || 'GBP',
      extraGuestFee: parseFloat(day.extraGuest) || 0,
      weeklyDiscountPercent: parseFloat(day.weeklyDiscount) || 0,
      monthlyDiscountPercent: parseFloat(day.monthlyDiscount) || 0,
      ratePlanId: day.ratePlanId || null,
      ratePlanName: day.ratePlanName || null
    }));
    
    return {
      success: true,
      data: rates
    };
  }
  
  async updateRates(roomTypeExternalId, ratesData) {
    const updates = ratesData.map(rate => ({
      roomId: roomTypeExternalId,
      date: rate.date,
      price: rate.price,
      extraGuest: rate.extraGuestFee,
      weeklyDiscount: rate.weeklyDiscountPercent,
      monthlyDiscount: rate.monthlyDiscountPercent
    }));
    
    const response = await this.v2Request('/rates', 'POST', updates);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      updated: updates.length,
      errors: []
    };
  }
  
  // =====================================================
  // RESERVATIONS
  // =====================================================
  
  async getReservations(options = {}) {
    const params = {
      limit: options.limit || 100,
      page: options.page || 1
    };
    
    if (options.propertyId) params.propertyId = options.propertyId;
    if (options.roomTypeId) params.roomId = options.roomTypeId;
    if (options.startDate) params.arrivalFrom = options.startDate;
    if (options.endDate) params.arrivalTo = options.endDate;
    if (options.status) params.status = options.status;
    if (options.updatedSince) params.modifiedSince = options.updatedSince;
    
    const response = await this.v2Request('/bookings', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const reservations = (response.data || []).map(booking => this.mapReservation(booking));
    
    return {
      success: true,
      data: reservations,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: response.data?.length || 0,
        hasMore: (response.data?.length || 0) >= params.limit
      }
    };
  }
  
  async getReservation(externalId) {
    const response = await this.v2Request(`/bookings/${externalId}`);
    
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
      roomId: reservation.roomTypeId,
      arrival: reservation.checkIn,
      departure: reservation.checkOut,
      numAdult: reservation.guests?.adults || 1,
      numChild: reservation.guests?.children || 0,
      firstName: reservation.guest?.firstName,
      lastName: reservation.guest?.lastName,
      email: reservation.guest?.email,
      phone: reservation.guest?.phone,
      price: reservation.pricing?.total,
      status: this.mapStatusToExternal(reservation.status),
      notes: reservation.notes,
      arrivalTime: reservation.arrivalTime
    };
    
    const response = await this.v2Request('/bookings', 'POST', [bookingData]);
    
    if (!response.success) {
      return response;
    }
    
    const result = response.data?.[0];
    
    if (result?.success) {
      return {
        success: true,
        data: this.mapReservation(result.new || result),
        externalId: String(result.new?.id || result.id)
      };
    }
    
    return {
      success: false,
      error: result?.error || 'Failed to create reservation'
    };
  }
  
  async updateReservation(externalId, updates) {
    const bookingData = {
      id: externalId,
      ...updates
    };
    
    const response = await this.v2Request('/bookings', 'POST', [bookingData]);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data?.[0]?.new || response.data?.[0])
    };
  }
  
  async cancelReservation(externalId, reason = '') {
    const response = await this.v2Request('/bookings', 'POST', [{
      id: externalId,
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : undefined
    }]);
    
    return {
      success: response.success,
      error: response.error
    };
  }
  
  mapReservation(raw) {
    return {
      externalId: String(raw.id),
      source: 'beds24',
      channel: this.mapChannel(raw.referer || raw.source),
      channelReservationId: raw.refererBookingId || raw.channelBookingId,
      propertyId: String(raw.propertyId),
      roomTypeId: String(raw.roomId),
      unitIds: raw.unitIds || [],
      checkIn: raw.arrival || raw.firstNight,
      checkOut: raw.departure || raw.lastNight,
      guests: {
        adults: raw.numAdult || 1,
        children: raw.numChild || 0,
        infants: raw.numInfant || 0
      },
      guest: {
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        phone: raw.phone || raw.mobile,
        language: raw.language,
        address: {
          street: raw.address,
          city: raw.city,
          country: raw.country,
          postalCode: raw.postcode
        }
      },
      pricing: {
        subtotal: parseFloat(raw.price) || 0,
        cleaning: parseFloat(raw.cleaningFee) || 0,
        taxes: parseFloat(raw.tax) || 0,
        fees: parseFloat(raw.fees) || 0,
        discount: parseFloat(raw.discount) || 0,
        total: parseFloat(raw.totalPrice) || parseFloat(raw.price) || 0,
        currency: raw.currency || 'GBP',
        paid: parseFloat(raw.deposit) || 0,
        balance: parseFloat(raw.balance) || 0
      },
      status: this.mapStatusFromExternal(raw.status),
      notes: raw.notes || raw.infoItems?.join('\n'),
      specialRequests: raw.guestComments,
      arrivalTime: raw.arrivalTime,
      metadata: {
        beds24Id: raw.id,
        invoiceId: raw.invoiceId
      },
      createdAt: raw.bookingTime,
      updatedAt: raw.modifiedTime,
      raw: raw
    };
  }
  
  mapChannel(source) {
    const channelMap = {
      'airbnb': 'AIRBNB',
      'booking': 'BOOKING_COM',
      'booking.com': 'BOOKING_COM',
      'expedia': 'EXPEDIA',
      'vrbo': 'VRBO',
      'homeaway': 'HOMEAWAY',
      'direct': 'DIRECT',
      'website': 'WEBSITE'
    };
    
    const key = (source || '').toLowerCase();
    return channelMap[key] || source || 'DIRECT';
  }
  
  mapStatusFromExternal(status) {
    const statusMap = {
      'confirmed': 'confirmed',
      'new': 'pending',
      'request': 'pending',
      'cancelled': 'cancelled',
      'checkedin': 'checked_in',
      'checkedout': 'checked_out',
      'noshow': 'no_show'
    };
    
    return statusMap[(status || '').toLowerCase()] || status || 'confirmed';
  }
  
  mapStatusToExternal(status) {
    const statusMap = {
      'confirmed': 'confirmed',
      'pending': 'new',
      'cancelled': 'cancelled',
      'checked_in': 'checkedin',
      'checked_out': 'checkedout',
      'no_show': 'noshow'
    };
    
    return statusMap[status] || status || 'confirmed';
  }
  
  // =====================================================
  // IMAGES (V1 API - Not available in V2 or Calry!)
  // =====================================================
  
  async getImages(propertyExternalId) {
    if (!this.apiKey) {
      return { success: false, error: 'V1 API key required for images' };
    }
    
    // V1 uses /getPropertyContent with images: true
    const response = await this.v1Request('/getPropertyContent', {
      images: true
    });
    
    if (!response.success) {
      return response;
    }
    
    // Parse the getPropertyContent response structure
    const content = response.data?.getPropertyContent?.[0];
    if (!content?.images?.hosted) {
      return { success: true, data: [] };
    }
    
    const images = [];
    const hosted = content.images.hosted;
    
    // Extract all hosted images
    for (const [key, img] of Object.entries(hosted)) {
      if (img.url) {
        // Determine if this is a property or room image based on mapping
        const mapping = img.map?.[0] || {};
        const roomId = mapping.roomId || null;
        const position = parseInt(mapping.position) || parseInt(key);
        
        images.push({
          externalId: `${propertyExternalId}-img-${key}`,
          originalUrl: img.url,
          thumbnailUrl: img.url, // Beds24 doesn't provide separate thumbnails
          caption: '',
          sortOrder: position,
          imageType: roomId ? 'room' : 'property',
          roomId: roomId,
          width: null,
          height: null,
          metadata: img
        });
      }
    }
    
    // Sort by position
    images.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return {
      success: true,
      data: images,
      roomIds: content.roomIds || {}
    };
  }
  
  async getRoomImages(roomExternalId) {
    // Get all images and filter by room
    const allImages = await this.getImages(null);
    
    if (!allImages.success) {
      return allImages;
    }
    
    const roomImages = allImages.data.filter(img => img.roomId === roomExternalId);
    
    return {
      success: true,
      data: roomImages
    };
  }
  
  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      
      return {
        success: true,
        data: Buffer.from(response.data),
        contentType: response.headers['content-type']
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // =====================================================
  // CONVERSATIONS
  // =====================================================
  
  async getConversations(reservationExternalId) {
    const response = await this.v2Request(`/bookings/${reservationExternalId}/messages`);
    
    if (!response.success) {
      return response;
    }
    
    // Transform to standard format
    const messages = (response.data || []).map(msg => ({
      id: msg.id,
      sender: msg.direction === 'incoming' ? 'guest' : 'host',
      content: msg.message || msg.text,
      sentAt: msg.time || msg.timestamp,
      readAt: msg.readAt
    }));
    
    return {
      success: true,
      data: [{
        externalId: reservationExternalId,
        reservationId: reservationExternalId,
        messages: messages,
        status: 'open'
      }]
    };
  }
  
  async sendMessage(reservationExternalId, message) {
    const response = await this.v2Request(`/bookings/${reservationExternalId}/messages`, 'POST', {
      message: message.content,
      channel: message.channel || 'email'
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
  // WEBHOOKS
  // =====================================================
  
  async registerWebhook(url, events) {
    // Beds24 webhook registration is done via the UI or API
    const response = await this.v2Request('/webhooks', 'POST', {
      url: url,
      events: events
    });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      webhookId: response.data?.id
    };
  }
  
  async unregisterWebhook(webhookId) {
    const response = await this.v2Request(`/webhooks/${webhookId}`, 'DELETE');
    return { success: response.success };
  }
  
  parseWebhookPayload(payload, headers) {
    // Map Beds24 webhook events to standard format
    const eventMap = {
      'BOOKING_NEW': 'reservation.created',
      'BOOKING_MODIFY': 'reservation.updated',
      'BOOKING_CANCEL': 'reservation.cancelled',
      'AVAILABILITY_UPDATE': 'availability.updated',
      'MESSAGE_NEW': 'message.received'
    };
    
    const beds24Event = payload.event || payload.action;
    const event = eventMap[beds24Event] || beds24Event;
    
    return {
      event,
      data: payload.data || payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      externalId: payload.bookingId || payload.id
    };
  }
  
  // =====================================================
  // FULL SYNC
  // =====================================================
  
  async fullSync(options = {}) {
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      reservations: { synced: 0, errors: 0 },
      images: { synced: 0, errors: 0 }
    };
    
    try {
      // 1. Sync properties
      const propertiesResult = await this.getProperties({ limit: 100 });
      if (propertiesResult.success) {
        for (const property of propertiesResult.data) {
          try {
            await this.syncPropertyToDatabase(property);
            stats.properties.synced++;
            
            // 2. Sync room types for each property
            const roomTypesResult = await this.getRoomTypes(property.externalId);
            if (roomTypesResult.success) {
              for (const roomType of roomTypesResult.data) {
                try {
                  await this.syncRoomTypeToDatabase(roomType, property.externalId);
                  stats.roomTypes.synced++;
                } catch (e) {
                  stats.roomTypes.errors++;
                }
              }
            }
            
            // 3. Sync images (V1 API)
            if (this.apiKey) {
              const imagesResult = await this.getImages(property.externalId);
              if (imagesResult.success) {
                for (const image of imagesResult.data) {
                  try {
                    await this.syncImageToDatabase(image, property.externalId);
                    stats.images.synced++;
                  } catch (e) {
                    stats.images.errors++;
                  }
                }
              }
            }
          } catch (e) {
            stats.properties.errors++;
          }
        }
      }
      
      // 4. Sync reservations
      const reservationsResult = await this.getReservations({ limit: 100 });
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
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stats
      };
    }
  }
  
  // Database sync helpers (to be implemented with actual pool)
  async syncPropertyToDatabase(property) {
    if (!this.pool) return;
    
    const hash = this.hashData(property);
    
    await this.pool.query(`
      INSERT INTO gas_sync_properties (
        connection_id, external_id, name, description, property_type,
        street, city, state, country, postal_code, latitude, longitude,
        timezone, currency, check_in_time, check_out_time,
        amenities, raw_data, sync_hash, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        street = EXCLUDED.street,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        postal_code = EXCLUDED.postal_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        timezone = EXCLUDED.timezone,
        currency = EXCLUDED.currency,
        amenities = EXCLUDED.amenities,
        raw_data = EXCLUDED.raw_data,
        sync_hash = EXCLUDED.sync_hash,
        synced_at = NOW(),
        updated_at = NOW()
    `, [
      this.connectionId,
      property.externalId,
      property.name,
      property.description,
      property.propertyType,
      property.address?.street,
      property.address?.city,
      property.address?.state,
      property.address?.country,
      property.address?.postalCode,
      property.address?.coordinates?.lat,
      property.address?.coordinates?.lng,
      property.timezone,
      property.currency,
      property.checkInTime,
      property.checkOutTime,
      JSON.stringify(property.amenities),
      JSON.stringify(property.raw),
      hash
    ]);
  }
  
  async syncRoomTypeToDatabase(roomType, propertyExternalId) {
    if (!this.pool) return;
    
    // Get sync property ID
    const propResult = await this.pool.query(
      'SELECT id FROM gas_sync_properties WHERE connection_id = $1 AND external_id = $2',
      [this.connectionId, propertyExternalId]
    );
    
    if (propResult.rows.length === 0) return;
    
    const syncPropertyId = propResult.rows[0].id;
    const hash = this.hashData(roomType);
    
    await this.pool.query(`
      INSERT INTO gas_sync_room_types (
        connection_id, sync_property_id, external_id, name, description,
        max_guests, bedrooms, beds, bathrooms, size_value, size_unit,
        base_price, currency, amenities, unit_count, raw_data, sync_hash, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        max_guests = EXCLUDED.max_guests,
        bedrooms = EXCLUDED.bedrooms,
        beds = EXCLUDED.beds,
        bathrooms = EXCLUDED.bathrooms,
        base_price = EXCLUDED.base_price,
        amenities = EXCLUDED.amenities,
        raw_data = EXCLUDED.raw_data,
        sync_hash = EXCLUDED.sync_hash,
        synced_at = NOW(),
        updated_at = NOW()
    `, [
      this.connectionId,
      syncPropertyId,
      roomType.externalId,
      roomType.name,
      roomType.description,
      roomType.maxGuests,
      roomType.bedrooms,
      roomType.beds,
      roomType.bathrooms,
      roomType.size,
      roomType.sizeUnit,
      roomType.basePrice,
      roomType.currency,
      JSON.stringify(roomType.amenities),
      roomType.unitCount,
      JSON.stringify(roomType.raw),
      hash
    ]);
  }
  
  async syncReservationToDatabase(reservation) {
    if (!this.pool) return;
    
    await this.pool.query(`
      INSERT INTO gas_sync_reservations (
        connection_id, external_id, channel, channel_reservation_id,
        check_in, check_out, adults, children, infants,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        subtotal, cleaning_fee, taxes, fees, discount, total, currency, paid, balance,
        status, notes, special_requests, arrival_time,
        raw_data, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW())
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        channel = EXCLUDED.channel,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        adults = EXCLUDED.adults,
        children = EXCLUDED.children,
        guest_first_name = EXCLUDED.guest_first_name,
        guest_last_name = EXCLUDED.guest_last_name,
        guest_email = EXCLUDED.guest_email,
        guest_phone = EXCLUDED.guest_phone,
        total = EXCLUDED.total,
        paid = EXCLUDED.paid,
        balance = EXCLUDED.balance,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        raw_data = EXCLUDED.raw_data,
        synced_at = NOW(),
        updated_at = NOW()
    `, [
      this.connectionId,
      reservation.externalId,
      reservation.channel,
      reservation.channelReservationId,
      reservation.checkIn,
      reservation.checkOut,
      reservation.guests?.adults || 1,
      reservation.guests?.children || 0,
      reservation.guests?.infants || 0,
      reservation.guest?.firstName,
      reservation.guest?.lastName,
      reservation.guest?.email,
      reservation.guest?.phone,
      reservation.pricing?.subtotal,
      reservation.pricing?.cleaning,
      reservation.pricing?.taxes,
      reservation.pricing?.fees,
      reservation.pricing?.discount,
      reservation.pricing?.total,
      reservation.pricing?.currency,
      reservation.pricing?.paid,
      reservation.pricing?.balance,
      reservation.status,
      reservation.notes,
      reservation.specialRequests,
      reservation.arrivalTime,
      JSON.stringify(reservation.raw)
    ]);
  }
  
  async syncImageToDatabase(image, propertyExternalId) {
    if (!this.pool) return;
    
    // Get sync property ID
    const propResult = await this.pool.query(
      'SELECT id FROM gas_sync_properties WHERE connection_id = $1 AND external_id = $2',
      [this.connectionId, propertyExternalId]
    );
    
    if (propResult.rows.length === 0) return;
    
    const syncPropertyId = propResult.rows[0].id;
    
    await this.pool.query(`
      INSERT INTO gas_sync_images (
        connection_id, sync_property_id, external_id, original_url, thumbnail_url,
        caption, sort_order, image_type, width, height, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (connection_id, sync_property_id, external_id) DO UPDATE SET
        original_url = EXCLUDED.original_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        caption = EXCLUDED.caption,
        sort_order = EXCLUDED.sort_order,
        synced_at = NOW()
    `, [
      this.connectionId,
      syncPropertyId,
      image.externalId,
      image.originalUrl,
      image.thumbnailUrl,
      image.caption,
      image.sortOrder,
      image.imageType,
      image.width,
      image.height
    ]);
  }
  
  hashData(data) {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
}

// =====================================================
// RATE LIMITER
// =====================================================

class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.rpm = requestsPerMinute;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60000);
    
    if (this.requests.length >= this.rpm) {
      const waitTime = 60000 - (now - this.requests[0]);
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  Beds24Adapter,
  RateLimiter
};
