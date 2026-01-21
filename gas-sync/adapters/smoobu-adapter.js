/**
 * Smoobu Adapter for GasSync
 * 
 * Direct integration with Smoobu API
 * https://docs.smoobu.com/
 * 
 * Authentication: API Key in header
 * Base URL: https://login.smoobu.com/api/
 */

const axios = require('axios');

// =====================================================
// CONFIGURATION
// =====================================================

const SMOOBU_BASE_URL = 'https://login.smoobu.com/api';
const SMOOBU_BOOKING_URL = 'https://login.smoobu.com/booking';

// =====================================================
// RATE LIMITER
// =====================================================

class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
  }

  async throttle() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = (timePassed / 60000) * this.requestsPerMinute;
    
    this.tokens = Math.min(this.requestsPerMinute, this.tokens + refillAmount);
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.requestsPerMinute) * 60000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}

// =====================================================
// SMOOBU ADAPTER CLASS
// =====================================================

class SmoobuAdapter {
  constructor(config) {
    this.name = 'smoobu';
    this.version = '1.0.0';
    this.capabilities = [
      'properties',
      'availability',
      'rates',
      'reservations'
    ];
    
    // Smoobu API Key
    this.apiKey = config.apiKey;
    
    // Rate limiting (Smoobu allows ~60 requests per minute)
    this.rateLimiter = new RateLimiter(60);
    
    // Database pool (optional)
    this.pool = config.pool;
    this.connectionId = config.connectionId;
  }

  // =====================================================
  // HTTP HELPERS
  // =====================================================

  async request(endpoint, method = 'GET', data = null, options = {}) {
    await this.rateLimiter.throttle();

    const baseUrl = options.useBookingUrl ? SMOOBU_BOOKING_URL : SMOOBU_BASE_URL;

    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
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
      message = 'Smoobu authentication failed. Check your API key.';
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
      message = `Resource not found: ${endpoint}`;
    } else if (statusCode === 429) {
      code = 'RATE_LIMITED';
      message = 'Smoobu rate limit exceeded. Try again later.';
    } else if (statusCode >= 500) {
      code = 'SERVER_ERROR';
      message = 'Smoobu server error. Try again later.';
    } else if (error.code === 'ECONNABORTED') {
      code = 'TIMEOUT';
      message = 'Request timed out';
    }

    console.error(`[SmoobuAdapter] Error on ${endpoint}:`, {
      code,
      statusCode,
      message,
      errorData
    });

    return {
      success: false,
      error: {
        code,
        message,
        statusCode,
        details: errorData
      }
    };
  }

  // =====================================================
  // CONNECTION TEST
  // =====================================================

  async testConnection() {
    console.log('[SmoobuAdapter] Testing connection...');
    
    const result = await this.request('/apartments');
    
    if (result.success) {
      const apartments = result.data.apartments || [];
      return {
        success: true,
        message: `Connected successfully. Found ${apartments.length} properties.`,
        propertyCount: apartments.length
      };
    }
    
    return {
      success: false,
      message: result.error?.message || 'Connection failed',
      error: result.error
    };
  }

  // =====================================================
  // PROPERTIES
  // =====================================================

  async getProperties() {
    console.log('[SmoobuAdapter] Fetching properties...');
    
    const result = await this.request('/apartments');
    
    if (!result.success) {
      return result;
    }

    const apartments = result.data.apartments || [];
    
    // Normalize to standard format
    const properties = apartments.map(apt => this.normalizeProperty(apt));

    return {
      success: true,
      data: properties,
      count: properties.length,
      raw: apartments
    };
  }

  async getProperty(apartmentId) {
    console.log(`[SmoobuAdapter] Fetching property ${apartmentId}...`);
    
    const result = await this.request(`/apartments/${apartmentId}`);
    
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: this.normalizeProperty(result.data),
      raw: result.data
    };
  }

  normalizeProperty(apt) {
    return {
      id: String(apt.id),
      name: apt.name,
      type: apt.type || 'apartment',
      address: {
        street: apt.location?.street || apt.street || '',
        city: apt.location?.city || apt.city || '',
        state: apt.location?.state || '',
        postalCode: apt.location?.postalCode || apt.location?.zip || '',
        country: apt.location?.country || apt.country || ''
      },
      location: {
        latitude: apt.location?.latitude || apt.latitude || null,
        longitude: apt.location?.longitude || apt.longitude || null
      },
      currency: apt.currency || 'EUR',
      timezone: apt.timeZone || apt.timezone || 'Europe/Berlin',
      maxOccupancy: apt.maxOccupancy || apt.rooms?.persons || 2,
      bedrooms: apt.rooms?.bedrooms || 1,
      bathrooms: apt.rooms?.bathrooms || 1,
      images: apt.images || [],
      amenities: apt.amenities || apt.equipments || [],
      description: apt.description || '',
      checkInTime: apt.arrivalTime || '15:00',
      checkOutTime: apt.departureTime || '11:00',
      minStay: apt.minNights || 1,
      price: {
        base: parseFloat(apt.price?.minimal) || parseFloat(apt.price) || 100,
        currency: apt.currency || 'EUR'
      }
    };
  }

  // =====================================================
  // ROOM TYPES (Smoobu treats apartments as rooms)
  // =====================================================

  async getRoomTypes(apartmentId) {
    // In Smoobu, each apartment is essentially a room type
    const property = await this.getProperty(apartmentId);
    
    if (!property.success) {
      return property;
    }

    const roomType = {
      id: property.data.id,
      name: property.data.name,
      maxOccupancy: property.data.maxOccupancy,
      bedrooms: property.data.bedrooms,
      bathrooms: property.data.bathrooms,
      basePrice: property.data.price.base,
      currency: property.data.currency
    };

    return {
      success: true,
      data: [roomType],
      count: 1
    };
  }

  // =====================================================
  // AVAILABILITY
  // =====================================================

  async getAvailability(apartmentId, startDate, endDate) {
    console.log(`[SmoobuAdapter] Fetching availability for ${apartmentId}: ${startDate} to ${endDate}`);
    
    const result = await this.request('/rates', 'GET', null, {
      params: {
        apartments: [apartmentId],
        start_date: startDate,
        end_date: endDate
      }
    });

    if (!result.success) {
      return result;
    }

    // Normalize availability data
    const availability = this.normalizeAvailability(result.data, apartmentId);

    return {
      success: true,
      data: availability,
      raw: result.data
    };
  }

  async checkAvailability(apartmentIds, arrivalDate, departureDate) {
    console.log(`[SmoobuAdapter] Checking availability for apartments: ${apartmentIds}`);
    
    const result = await this.request('/checkApartmentAvailability', 'POST', {
      arrivalDate,
      departureDate,
      apartments: Array.isArray(apartmentIds) ? apartmentIds : [apartmentIds]
    }, { useBookingUrl: true });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      availableApartments: result.data.availableApartments || [],
      prices: result.data.prices || {},
      errors: result.data.errorMessages || {}
    };
  }

  normalizeAvailability(data, apartmentId) {
    const days = [];
    const apartmentData = data[apartmentId] || data;

    if (Array.isArray(apartmentData)) {
      for (const day of apartmentData) {
        days.push({
          date: day.date,
          available: day.available !== 0 && day.available !== false,
          price: parseFloat(day.price) || null,
          minStay: day.min_length_of_stay || day.minStay || 1,
          currency: day.currency || 'EUR'
        });
      }
    }

    return days;
  }

  // =====================================================
  // RATES
  // =====================================================

  async getRates(apartmentId, startDate, endDate) {
    console.log(`[SmoobuAdapter] Fetching rates for ${apartmentId}: ${startDate} to ${endDate}`);
    
    const result = await this.request('/rates', 'GET', null, {
      params: {
        apartments: [apartmentId],
        start_date: startDate,
        end_date: endDate
      }
    });

    if (!result.success) {
      return result;
    }

    const rates = this.normalizeRates(result.data, apartmentId);

    return {
      success: true,
      data: rates,
      raw: result.data
    };
  }

  async setRates(apartmentId, rates) {
    console.log(`[SmoobuAdapter] Setting rates for ${apartmentId}`);
    
    // Smoobu expects rates in specific format
    const payload = {
      apartments: [parseInt(apartmentId)],
      ...rates
    };

    const result = await this.request('/rates', 'POST', payload);

    return result;
  }

  normalizeRates(data, apartmentId) {
    const rates = [];
    const apartmentData = data[apartmentId] || data;

    if (Array.isArray(apartmentData)) {
      for (const day of apartmentData) {
        rates.push({
          date: day.date,
          price: parseFloat(day.price) || null,
          minStay: day.min_length_of_stay || 1,
          currency: day.currency || 'EUR'
        });
      }
    }

    return rates;
  }

  // =====================================================
  // RESERVATIONS
  // =====================================================

  async getReservations(options = {}) {
    console.log('[SmoobuAdapter] Fetching reservations...', options);
    
    const params = {
      pageSize: options.limit || 100,
      page: options.page || 1
    };

    if (options.apartmentId) {
      params.apartmentId = options.apartmentId;
    }
    if (options.from) {
      params.from = options.from;
    }
    if (options.to) {
      params.to = options.to;
    }
    if (options.modifiedFrom) {
      params.modifiedFrom = options.modifiedFrom;
    }
    if (options.showCancellation !== undefined) {
      params.showCancellation = options.showCancellation;
    }

    const result = await this.request('/reservations', 'GET', null, { params });

    if (!result.success) {
      return result;
    }

    const reservations = (result.data.bookings || []).map(b => this.normalizeReservation(b));

    return {
      success: true,
      data: reservations,
      count: reservations.length,
      page: result.data.page || 1,
      pageCount: result.data.page_count || 1,
      raw: result.data
    };
  }

  async getReservation(reservationId) {
    console.log(`[SmoobuAdapter] Fetching reservation ${reservationId}...`);
    
    const result = await this.request(`/reservations/${reservationId}`);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: this.normalizeReservation(result.data),
      raw: result.data
    };
  }

  async createReservation(reservation) {
    console.log('[SmoobuAdapter] Creating reservation...');
    
    const payload = {
      apartmentId: parseInt(reservation.apartmentId),
      arrivalDate: reservation.checkIn,
      departureDate: reservation.checkOut,
      firstName: reservation.guest?.firstName || reservation.guestName?.split(' ')[0] || 'Guest',
      lastName: reservation.guest?.lastName || reservation.guestName?.split(' ').slice(1).join(' ') || '',
      email: reservation.guest?.email || reservation.email || '',
      phone: reservation.guest?.phone || reservation.phone || '',
      adults: reservation.adults || reservation.guests || 1,
      children: reservation.children || 0,
      notice: reservation.notes || reservation.specialRequests || '',
      price: reservation.totalPrice || reservation.price || 0,
      priceStatus: reservation.priceStatus || 1, // 1 = open, 2 = paid
      deposit: reservation.deposit || 0,
      depositStatus: reservation.depositStatus || 1,
      language: reservation.language || 'en',
      channelId: reservation.channelId || 0, // 0 = direct booking
      channel: reservation.channel || { id: 0, name: 'Direct' }
    };

    const result = await this.request('/reservations', 'POST', payload);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: this.normalizeReservation(result.data),
      reservationId: result.data.id,
      raw: result.data
    };
  }

  async updateReservation(reservationId, updates) {
    console.log(`[SmoobuAdapter] Updating reservation ${reservationId}...`);
    
    const result = await this.request(`/reservations/${reservationId}`, 'PUT', updates);

    return result;
  }

  async cancelReservation(reservationId) {
    console.log(`[SmoobuAdapter] Cancelling reservation ${reservationId}...`);
    
    const result = await this.request(`/reservations/${reservationId}`, 'DELETE');

    return result;
  }

  normalizeReservation(booking) {
    return {
      id: String(booking.id),
      apartmentId: String(booking.apartment?.id || booking.apartmentId),
      propertyName: booking.apartment?.name || '',
      status: this.mapBookingStatus(booking),
      checkIn: booking.arrival || booking.arrivalDate,
      checkOut: booking.departure || booking.departureDate,
      guest: {
        firstName: booking.firstname || booking.firstName || '',
        lastName: booking.lastname || booking.lastName || '',
        email: booking.email || '',
        phone: booking.phone || ''
      },
      adults: booking.adults || 1,
      children: booking.children || 0,
      totalPrice: parseFloat(booking.price) || 0,
      currency: booking.apartment?.currency || 'EUR',
      channel: booking.channel?.name || 'Direct',
      channelId: booking.channel?.id || 0,
      notes: booking.notice || booking.guestNote || '',
      createdAt: booking['created-at'] || booking.createdAt,
      modifiedAt: booking['modifiedAt'] || booking.modifiedAt
    };
  }

  mapBookingStatus(booking) {
    if (booking.type === 'cancellation') return 'cancelled';
    if (booking.type === 'reservation') return 'confirmed';
    if (booking.type === 'blocked') return 'blocked';
    return 'confirmed';
  }

  // =====================================================
  // SYNC HELPERS
  // =====================================================

  async fullSync(options = {}) {
    console.log('[SmoobuAdapter] Starting full sync...');
    
    const results = {
      properties: { success: false, count: 0 },
      reservations: { success: false, count: 0 },
      errors: []
    };

    // Sync properties
    try {
      const propertiesResult = await this.getProperties();
      if (propertiesResult.success) {
        results.properties = {
          success: true,
          count: propertiesResult.count,
          data: propertiesResult.data
        };
      } else {
        results.errors.push({ type: 'properties', error: propertiesResult.error });
      }
    } catch (error) {
      results.errors.push({ type: 'properties', error: error.message });
    }

    // Sync reservations
    try {
      const reservationsResult = await this.getReservations({
        from: options.reservationsFrom || new Date().toISOString().split('T')[0],
        showCancellation: true
      });
      if (reservationsResult.success) {
        results.reservations = {
          success: true,
          count: reservationsResult.count,
          data: reservationsResult.data
        };
      } else {
        results.errors.push({ type: 'reservations', error: reservationsResult.error });
      }
    } catch (error) {
      results.errors.push({ type: 'reservations', error: error.message });
    }

    results.success = results.errors.length === 0;
    return results;
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  SmoobuAdapter,
  SMOOBU_BASE_URL,
  SMOOBU_BOOKING_URL
};
