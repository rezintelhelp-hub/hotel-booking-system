/**
 * Hostfully Adapter for GasSync
 * 
 * Direct integration with Hostfully V3 API
 * Bypasses Calry middleware for full control over property hierarchy,
 * including parent/child (multi-unit) properties and seasonal variants.
 * 
 * Hostfully V3 API: https://dev.hostfully.com/v3.0/reference
 * 
 * KEY FEATURES:
 * - Direct API access (no Calry middleware)
 * - Full parent/child property support via businessType field
 * - Seasonal variant handling (Summer/Winter listings)
 * - Cursor-based pagination
 * - Property calendar (availability + pricing in one call)
 * - Leads (bookings/reservations) management
 * - Photos, amenities, fees, descriptions
 * - Webhook support for real-time updates
 * 
 * Rate Limit: 10,000 calls/hour (default), monitor via x-ratelimit headers
 */

const axios = require('axios');

// =====================================================
// CONFIGURATION
// =====================================================

const HOSTFULLY_PROD_BASE = 'https://platform.hostfully.com/api/v3';
const HOSTFULLY_SANDBOX_BASE = 'https://sandbox.hostfully.com/api/v3';

// Business types in Hostfully
const BUSINESS_TYPES = {
  STANDALONE: 'STANDALONE_PROPERTY',   // Parent/container - not directly bookable
  SUB_UNIT: 'SUB_UNIT',               // Bookable child listing
  MULTI_UNIT: 'MULTI_UNIT'            // Multi-unit parent (hotel-style)
};

// Property types
const PROPERTY_TYPES = [
  'APARTMENT', 'HOUSE', 'CONDO', 'LOFT', 'TOWNHOUSE', 'VILLA',
  'CABIN', 'COTTAGE', 'BUNGALOW', 'CHALET', 'TINY_HOUSE',
  'CASTLE', 'BOAT', 'CAMPER_RV', 'TREEHOUSE', 'FARM',
  'SERVICED_APARTMENT', 'OTHER'
];

// =====================================================
// HOSTFULLY ADAPTER CLASS
// =====================================================

class HostfullyAdapter {
  constructor(config) {
    this.name = 'hostfully';
    this.version = '1.0.0';
    this.capabilities = [
      'properties',
      'availability',
      'rates',
      'calendar',
      'reservations',
      'photos',
      'amenities',
      'fees',
      'descriptions',
      'webhooks',
      'multi_unit'
    ];
    
    // Hostfully credentials
    this.apiKey = config.apiKey;
    this.agencyUid = config.agencyUid;
    
    // Environment
    this.baseUrl = config.useSandbox ? HOSTFULLY_SANDBOX_BASE : HOSTFULLY_PROD_BASE;
    
    // Rate limiting - 10,000/hour = ~166/min
    this.rateLimiter = new RateLimiter(150);
    
    // Database pool
    this.pool = config.pool;
    this.connectionId = config.connectionId;
    
    // Track rate limit headers
    this.rateLimitRemaining = null;
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
          'X-HOSTFULLY-APIKEY': this.apiKey,
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
      
      // Track rate limit headers
      if (response.headers) {
        this.rateLimitRemaining = response.headers['x-ratelimit-remaining'] || null;
        if (this.rateLimitRemaining && parseInt(this.rateLimitRemaining) < 100) {
          console.warn(`Hostfully rate limit warning: ${this.rateLimitRemaining} calls remaining`);
        }
      }
      
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
    
    if (statusCode === 401) {
      code = 'AUTH_FAILED';
      message = 'Hostfully authentication failed. API key may be invalid.';
    } else if (statusCode === 403) {
      code = 'FORBIDDEN';
      message = 'Access denied. Check agencyUid or API permissions.';
    } else if (statusCode === 429) {
      code = 'RATE_LIMIT';
      message = 'Hostfully rate limit exceeded. Wait 1 hour.';
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
      message = `Resource not found: ${endpoint}`;
    } else if (statusCode === 409) {
      code = 'CONFLICT';
      message = errorData?.message || 'Data conflict';
    } else if (error.code === 'ECONNABORTED') {
      code = 'TIMEOUT';
      message = 'Request timed out';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      code = 'NETWORK';
      message = 'Network connection failed';
    }
    
    console.error(`Hostfully API Error [${endpoint}]:`, {
      code,
      status: statusCode,
      message,
      details: typeof errorData === 'string' ? errorData : JSON.stringify(errorData)?.substring(0, 500)
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
    this.apiKey = credentials.apiKey;
    if (credentials.agencyUid) this.agencyUid = credentials.agencyUid;
    return this.testConnection();
  }
  
  async testConnection() {
    // Try to fetch agencies to validate the API key
    const response = await this.request('/agencies');
    
    if (response.success) {
      const agencies = Array.isArray(response.data) ? response.data : [response.data];
      return { 
        success: true, 
        message: 'Hostfully connection successful',
        agencies: agencies.map(a => ({ uid: a.uid, name: a.name }))
      };
    }
    
    return { success: false, error: response.error };
  }
  
  // =====================================================
  // AGENCY
  // =====================================================
  
  async getAgency() {
    if (!this.agencyUid) {
      // Auto-discover agency
      const response = await this.request('/agencies');
      if (response.success) {
        const agencies = Array.isArray(response.data) ? response.data : [response.data];
        if (agencies.length > 0) {
          this.agencyUid = agencies[0].uid;
          return { success: true, data: agencies[0] };
        }
      }
      return { success: false, error: 'No agency found for this API key' };
    }
    
    return await this.request(`/agencies/${this.agencyUid}`);
  }
  
  // =====================================================
  // PROPERTIES
  // =====================================================
  
  /**
   * Get all properties with auto-pagination
   * Returns ALL properties including parents and sub-units
   * Use options.businessType to filter (SUB_UNIT for bookable only)
   */
  async getProperties(options = {}) {
    const allProperties = [];
    let cursor = null;
    let pageCount = 0;
    const limit = options.limit || 50;
    
    while (true) {
      const params = { 
        agencyUid: this.agencyUid,
        limit 
      };
      if (cursor) params.cursor = cursor;
      
      const response = await this.request('/properties', 'GET', null, { params });
      
      if (!response.success) {
        if (pageCount === 0) return response;
        console.log(`Hostfully pagination stopped at page ${pageCount + 1}: ${response.error}`);
        break;
      }
      
      // Hostfully returns array directly or wrapped
      const properties = Array.isArray(response.data) ? response.data : 
                         response.data?.properties || response.data?.content || [response.data];
      
      pageCount++;
      
      if (pageCount === 1) {
        console.log(`Hostfully getProperties page 1: ${properties.length} properties`);
      }
      
      // Map and optionally filter by businessType
      for (const prop of properties) {
        const mapped = this.mapProperty(prop);
        
        if (options.businessType && prop.businessType !== options.businessType) {
          continue; // Skip non-matching business types
        }
        if (options.activeOnly && !prop.isActive) {
          continue; // Skip inactive
        }
        
        allProperties.push(mapped);
      }
      
      // Check for more pages (cursor-based pagination)
      // Hostfully uses cursor in response headers or last item's UID
      if (properties.length < limit) {
        break; // Last page
      }
      
      // Use last property UID as cursor
      const lastProp = properties[properties.length - 1];
      const nextCursor = lastProp?.uid || lastProp?.cursor;
      
      if (!nextCursor || nextCursor === cursor) {
        break; // No more pages
      }
      cursor = nextCursor;
      
      if (pageCount > 20) {
        console.log('Hostfully pagination safety limit reached (20 pages)');
        break;
      }
    }
    
    console.log(`Hostfully getProperties total: ${allProperties.length} properties across ${pageCount} page(s)`);
    
    return {
      success: true,
      data: allProperties,
      pagination: {
        pages_fetched: pageCount,
        limit,
        total: allProperties.length
      }
    };
  }
  
  /**
   * Get bookable properties only (SUB_UNIT)
   */
  async getBookableProperties(options = {}) {
    return this.getProperties({ ...options, businessType: BUSINESS_TYPES.SUB_UNIT });
  }
  
  /**
   * Get parent/standalone properties only
   */
  async getParentProperties(options = {}) {
    return this.getProperties({ ...options, businessType: BUSINESS_TYPES.STANDALONE });
  }
  
  /**
   * Get all properties organized by parent/child hierarchy
   */
  async getPropertyHierarchy() {
    const allResult = await this.getProperties();
    if (!allResult.success) return allResult;
    
    const parents = {};
    const orphans = [];
    
    for (const prop of allResult.data) {
      if (prop.businessType === BUSINESS_TYPES.STANDALONE || prop.businessType === BUSINESS_TYPES.MULTI_UNIT) {
        parents[prop.externalId] = { ...prop, children: [] };
      }
    }
    
    for (const prop of allResult.data) {
      if (prop.businessType === BUSINESS_TYPES.SUB_UNIT) {
        // Try to find parent by address match or parentUid
        const parentUid = prop.raw?.parentUid;
        if (parentUid && parents[parentUid]) {
          parents[parentUid].children.push(prop);
        } else {
          // Match by address
          const matchingParent = Object.values(parents).find(p => 
            p.address?.street === prop.address?.street && 
            p.address?.city === prop.address?.city
          );
          if (matchingParent) {
            matchingParent.children.push(prop);
          } else {
            orphans.push(prop);
          }
        }
      }
    }
    
    return {
      success: true,
      data: {
        hierarchy: Object.values(parents),
        orphans,
        total: allResult.data.length,
        parents: Object.keys(parents).length,
        subUnits: allResult.data.filter(p => p.businessType === BUSINESS_TYPES.SUB_UNIT).length
      }
    };
  }
  
  /**
   * Get single property by UID
   */
  async getProperty(uid) {
    const response = await this.request(`/properties/${uid}`);
    
    if (!response.success) return response;
    
    return {
      success: true,
      data: this.mapProperty(response.data)
    };
  }
  
  /**
   * Map Hostfully property to GAS standard format
   */
  mapProperty(raw) {
    const addr = raw.address || {};
    
    return {
      externalId: raw.uid,
      name: raw.name || '',
      description: '', // Fetched separately via descriptions endpoint
      propertyType: (raw.propertyType || 'OTHER').toLowerCase(),
      listingType: raw.listingType || 'ENTIREHOME',
      roomType: raw.roomType || '',
      businessType: raw.businessType || BUSINESS_TYPES.SUB_UNIT,
      status: raw.isActive ? 'active' : 'inactive',
      isActive: raw.isActive !== false,
      
      // Address
      address: {
        street: addr.address || '',
        street2: addr.address2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.zipCode || '',
        country: addr.countryCode || '',
        countryCode: addr.countryCode || ''
      },
      coordinates: (addr.latitude && addr.longitude) ? {
        latitude: parseFloat(addr.latitude),
        longitude: parseFloat(addr.longitude)
      } : null,
      
      // Capacity
      bedrooms: raw.bedrooms || 0,
      beds: raw.beds || 0,
      bathrooms: parseFloat(raw.bathrooms) || 0,
      maxGuests: raw.availability?.maxGuests || 0,
      baseGuests: raw.availability?.baseGuests || 0,
      floors: raw.numberOfFloors || 0,
      area: raw.area?.size || null,
      areaUnit: raw.area?.unitType || 'SQUARE_METERS',
      
      // Pricing defaults
      currency: raw.pricing?.currency || 'EUR',
      dailyRate: raw.pricing?.dailyRate || 0,
      weekendAdjustmentRate: raw.pricing?.weekendAdjustmentRate || 0,
      taxRate: raw.pricing?.taxRate || 0,
      cleaningFee: raw.pricing?.cleaningFee || 0,
      extraGuestFee: raw.pricing?.extraGuestFee || 0,
      securityDeposit: raw.pricing?.securityDeposit || 0,
      
      // Availability defaults
      minimumStay: raw.availability?.minimumStay || 1,
      maximumStay: raw.availability?.maximumStay || 0,
      bookingWindow: raw.availability?.bookingWindow || 365,
      turnOverDays: raw.availability?.turnOverDays || 0,
      bookingLeadTime: raw.availability?.bookingLeadTime || 0,
      checkInTimeStart: raw.availability?.checkInTimeStart || 15,
      checkInTimeEnd: raw.availability?.checkInTimeEnd || 21,
      checkOutTime: raw.availability?.checkOutTime || 11,
      bookingStrategy: raw.availability?.hostfullyBookingStrategy || 'INSTANT_BOOKING',
      
      // Channel connections
      airbnbId: raw.airbnbData?.airbnbId || null,
      bookingComActive: raw.bookingDotComData?.active || false,
      vrboActive: raw.vrboData?.active || false,
      
      // Other
      thumbnailUrl: raw.pictureLink || null,
      webLink: raw.webLink || null,
      rentalLicense: raw.rentalLicenseNumber || null,
      wifiNetwork: raw.wifiNetwork || null,
      wifiPassword: raw.wifiPassword || null,
      cancellationPolicy: raw.cancellationPolicy || '',
      
      // Images/amenities fetched separately
      images: [],
      amenities: [],
      
      // Metadata
      metadata: {
        hostfullyUid: raw.uid,
        agencyUid: raw.agencyUid,
        businessType: raw.businessType,
        parentUid: raw.parentUid || null,
        externalId: raw.externalId || null,
        updatedAt: raw.updatedUtcDateTime || null
      },
      raw: raw
    };
  }
  
  // =====================================================
  // PHOTOS
  // =====================================================
  
  async getPhotos(propertyUid) {
    const response = await this.request('/photos', 'GET', null, {
      params: { propertyUid }
    });
    
    if (!response.success) return response;
    
    const photos = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: photos.map((photo, idx) => ({
        externalId: photo.uid,
        url: photo.url || photo.original || photo.large || '',
        thumbnailUrl: photo.thumbnail || photo.small || '',
        caption: photo.description || photo.caption || '',
        order: photo.ordinal || photo.order || idx,
        isPrimary: idx === 0,
        tags: photo.tags || [],
        raw: photo
      }))
    };
  }
  
  // =====================================================
  // AMENITIES
  // =====================================================
  
  async getAmenities(propertyUid) {
    const response = await this.request('/amenities', 'GET', null, {
      params: { propertyUid }
    });
    
    if (!response.success) return response;
    
    const amenities = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: amenities.map(a => ({
        externalId: a.uid || a.amenityCode,
        name: a.amenityName || a.name || a.description || '',
        code: a.amenityCode || '',
        category: a.category || '',
        description: a.description || '',
        raw: a
      }))
    };
  }
  
  // =====================================================
  // DESCRIPTIONS
  // =====================================================
  
  async getDescriptions(propertyUid) {
    const response = await this.request('/descriptions', 'GET', null, {
      params: { propertyUid }
    });
    
    if (!response.success) return response;
    
    const descriptions = Array.isArray(response.data) ? response.data : [];
    
    // Return organized by type
    const result = {};
    for (const desc of descriptions) {
      result[desc.descriptionType || desc.type || 'default'] = {
        text: desc.description || desc.text || '',
        locale: desc.locale || 'en',
        raw: desc
      };
    }
    
    return { success: true, data: result };
  }
  
  // =====================================================
  // FEES
  // =====================================================
  
  async getFees(propertyUid) {
    const response = await this.request('/fees', 'GET', null, {
      params: { propertyUid }
    });
    
    if (!response.success) return response;
    
    const fees = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: fees.map(f => ({
        externalId: f.uid,
        name: f.name || f.feeName || '',
        amount: f.amount || 0,
        type: f.feeType || f.type || 'FLAT',
        taxable: f.taxable || false,
        perGuest: f.perGuest || false,
        perNight: f.perNight || false,
        raw: f
      }))
    };
  }
  
  // =====================================================
  // PROPERTY CALENDAR (Availability + Pricing combined)
  // =====================================================
  
  /**
   * Get property calendar - Hostfully's combined availability/pricing endpoint
   * This is the most efficient way to get both availability and rates
   */
  async getPropertyCalendar(propertyUid, startDate, endDate) {
    const params = { propertyUid };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await this.request(`/propertycalendar/${propertyUid}`, 'GET', null, { params });
    
    if (!response.success) return response;
    
    const calendar = response.data;
    
    // Hostfully calendar returns day-by-day data
    const days = [];
    
    if (calendar?.calendarDays || calendar?.days) {
      const rawDays = calendar.calendarDays || calendar.days || [];
      for (const day of rawDays) {
        days.push({
          date: day.date,
          price: day.price || day.nightlyRate || day.dailyRate || null,
          currency: day.currency || calendar.currency || null,
          isAvailable: day.isAvailable !== false && day.status !== 'BLOCKED' && day.status !== 'BOOKED',
          status: day.status || (day.isAvailable !== false ? 'available' : 'blocked'),
          minStay: day.minimumStay || day.minStay || null,
          maxStay: day.maximumStay || day.maxStay || null,
          checkInAllowed: day.checkInAllowed !== false,
          checkOutAllowed: day.checkOutAllowed !== false,
          leadUid: day.leadUid || null, // Booking reference if blocked
          raw: day
        });
      }
    }
    
    return {
      success: true,
      data: days,
      propertyUid,
      startDate,
      endDate,
      totalDays: days.length
    };
  }
  
  /**
   * Get availability (wrapper that extracts availability from calendar)
   */
  async getAvailability(propertyUid, startDate, endDate) {
    return this.getPropertyCalendar(propertyUid, startDate, endDate);
  }
  
  /**
   * Get rates (wrapper that extracts pricing from calendar)
   */
  async getRates(propertyUid, startDate, endDate) {
    return this.getPropertyCalendar(propertyUid, startDate, endDate);
  }
  
  /**
   * Get multiple property calendars in one go
   * Hostfully has a bulk endpoint for this
   */
  async getMultipleCalendars(propertyUids, startDate, endDate) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    // Comma-separated UIDs
    params.propertyUids = propertyUids.join(',');
    
    const response = await this.request('/propertycalendar', 'GET', null, { params });
    
    if (!response.success) {
      // Fallback: fetch individually
      const results = {};
      for (const uid of propertyUids) {
        const cal = await this.getPropertyCalendar(uid, startDate, endDate);
        if (cal.success) results[uid] = cal.data;
      }
      return { success: true, data: results };
    }
    
    return { success: true, data: response.data };
  }
  
  // =====================================================
  // PRICING PERIODS
  // =====================================================
  
  async getPricingPeriods(propertyUid) {
    const response = await this.request('/pricingperiods', 'GET', null, {
      params: { propertyUid }
    });
    
    if (!response.success) return response;
    
    const periods = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: periods.map(p => ({
        startDate: p.startDate,
        endDate: p.endDate,
        dailyRate: p.dailyRate || p.nightlyRate || 0,
        weekendRate: p.weekendRate || null,
        weeklyRate: p.weeklyRate || null,
        monthlyRate: p.monthlyRate || null,
        minimumStay: p.minimumStay || 1,
        currency: p.currency || null,
        raw: p
      }))
    };
  }
  
  // =====================================================
  // LEADS (Bookings/Reservations)
  // =====================================================
  
  /**
   * Search leads with filters
   */
  async getLeads(options = {}) {
    const params = {};
    if (this.agencyUid) params.agencyUid = this.agencyUid;
    if (options.propertyUid) params.propertyUid = options.propertyUid;
    if (options.status) params.status = options.status;
    if (options.checkInFrom) params.checkInFrom = options.checkInFrom;
    if (options.checkInTo) params.checkInTo = options.checkInTo;
    if (options.updatedSince) params.updatedSince = options.updatedSince;
    if (options.limit) params.limit = options.limit;
    if (options.cursor) params.cursor = options.cursor;
    
    const response = await this.request('/leads', 'GET', null, { params });
    
    if (!response.success) return response;
    
    const leads = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: leads.map(lead => this.mapLead(lead))
    };
  }
  
  /**
   * Get single lead by UID
   */
  async getLead(leadUid) {
    const response = await this.request(`/leads/${leadUid}`);
    
    if (!response.success) return response;
    
    return {
      success: true,
      data: this.mapLead(response.data)
    };
  }
  
  /**
   * Create a new lead/booking
   */
  async createLead(leadData) {
    const payload = {
      propertyUid: leadData.propertyUid,
      agencyUid: this.agencyUid,
      checkInDate: leadData.checkIn,
      checkOutDate: leadData.checkOut,
      adultCount: leadData.adults || 1,
      childCount: leadData.children || 0,
      petCount: leadData.pets || 0,
      source: leadData.source || 'DIRECT',
      status: leadData.status || 'BOOKING',
      guest: {
        firstName: leadData.guestFirstName || '',
        lastName: leadData.guestLastName || '',
        email: leadData.guestEmail || '',
        phone: leadData.guestPhone || ''
      }
    };
    
    if (leadData.totalPrice) {
      payload.quoteAmount = leadData.totalPrice;
    }
    
    const response = await this.request('/leads', 'POST', payload);
    
    if (!response.success) return response;
    
    return {
      success: true,
      data: this.mapLead(response.data)
    };
  }
  
  /**
   * Cancel a booking
   */
  async cancelLead(leadUid) {
    return await this.request(`/leads/${leadUid}/cancel`, 'POST');
  }
  
  /**
   * Map Hostfully lead to GAS reservation format
   */
  mapLead(raw) {
    const guest = raw.guest || {};
    
    return {
      externalId: raw.uid,
      propertyId: raw.propertyUid,
      channel: raw.source || raw.channelName || 'DIRECT',
      channelReservationId: raw.channelReservationId || raw.externalBookingId || null,
      checkIn: raw.checkInDate || raw.checkIn,
      checkOut: raw.checkOutDate || raw.checkOut,
      status: this.mapLeadStatus(raw.status),
      guest: {
        firstName: guest.firstName || raw.firstName || '',
        lastName: guest.lastName || raw.lastName || '',
        email: guest.email || raw.email || '',
        phone: guest.phone || raw.phone || ''
      },
      guests: {
        adults: raw.adultCount || raw.adults || 1,
        children: raw.childCount || raw.children || 0,
        infants: raw.infantCount || 0,
        pets: raw.petCount || 0
      },
      pricing: {
        total: raw.quoteAmount || raw.totalAmount || raw.orderTotal || 0,
        currency: raw.currency || raw.pricing?.currency || 'EUR',
        paid: raw.totalPaid || 0,
        balance: raw.balance || 0
      },
      notes: raw.notes || raw.guestMessage || '',
      source: raw.source || 'hostfully',
      metadata: {
        hostfullyUid: raw.uid,
        leadType: raw.leadType, // BOOKING, INQUIRY, BLOCK
        orderUid: raw.orderUid,
        createdAt: raw.createdDate,
        updatedAt: raw.updatedDate
      },
      raw: raw
    };
  }
  
  mapLeadStatus(hostfullyStatus) {
    const statusMap = {
      'NEW': 'pending',
      'INQUIRY': 'inquiry',
      'BOOKING_REQUEST': 'pending',
      'BOOKED': 'confirmed',
      'BOOKING': 'confirmed',
      'CHECKED_IN': 'checked_in',
      'CHECKED_OUT': 'checked_out',
      'CANCELLED': 'cancelled',
      'DECLINED': 'declined',
      'CLOSED': 'closed',
      'ON_HOLD': 'on_hold',
      'BLOCK': 'blocked'
    };
    return statusMap[hostfullyStatus] || 'unknown';
  }
  
  // =====================================================
  // WEBHOOKS
  // =====================================================
  
  async registerWebhook(eventType, callbackUrl) {
    const payload = {
      objectUid: this.apiKey,
      eventType: eventType,
      webHookType: 'POST_JSON',
      callbackUrl: callbackUrl
    };
    
    return await this.request('/webhooks', 'POST', payload);
  }
  
  /**
   * Register standard GAS webhooks
   */
  async registerGasWebhooks(baseUrl) {
    const events = [
      'UPDATED_PROPERTY',
      'NEW_LEAD',
      'UPDATED_LEAD',
      'CANCELLED_LEAD',
      'UPDATED_PRICING'
    ];
    
    const results = [];
    for (const event of events) {
      const result = await this.registerWebhook(
        event, 
        `${baseUrl}/api/hostfully/webhook/${event.toLowerCase()}`
      );
      results.push({ event, ...result });
    }
    
    return { success: true, data: results };
  }
  
  // =====================================================
  // FULL SYNC & INCREMENTAL SYNC
  // =====================================================
  
  /**
   * Full sync - fetch all properties, rooms, calendar data
   * Called by SyncManager.syncConnection()
   */
  async fullSync() {
    const stats = {
      properties: { total: 0, synced: 0, errors: 0 },
      roomTypes: { total: 0, synced: 0, errors: 0 },
      calendar: { total: 0, synced: 0 }
    };
    
    // First, auto-discover agency if not set
    if (!this.agencyUid) {
      const agencyResult = await this.getAgency();
      if (!agencyResult.success) {
        throw new Error(`Failed to get agency: ${agencyResult.error}`);
      }
    }
    
    // Get all properties
    const propertiesResult = await this.getProperties({ activeOnly: true });
    if (!propertiesResult.success) {
      throw new Error(`Failed to fetch properties: ${propertiesResult.error}`);
    }
    
    const allProperties = propertiesResult.data;
    stats.properties.total = allProperties.length;
    console.log(`[Hostfully fullSync] Found ${allProperties.length} properties`);
    
    // Separate parents and bookable units
    const parents = allProperties.filter(p => 
      p.businessType === BUSINESS_TYPES.STANDALONE || p.businessType === BUSINESS_TYPES.MULTI_UNIT
    );
    const bookable = allProperties.filter(p => 
      p.businessType === BUSINESS_TYPES.SUB_UNIT
    );
    // Treat any property without a parent as both property and room
    const standalone = allProperties.filter(p => 
      !p.businessType || (!parents.some(par => par.externalId === p.raw?.parentUid) && 
       p.businessType !== BUSINESS_TYPES.STANDALONE && 
       p.businessType !== BUSINESS_TYPES.MULTI_UNIT)
    );
    
    console.log(`[Hostfully fullSync] Parents: ${parents.length}, Bookable: ${bookable.length}, Standalone: ${standalone.length}`);
    
    // Sync parent properties first
    for (const parent of parents) {
      try {
        // Enrich with photos, amenities, descriptions
        const enriched = await this.enrichProperty(parent);
        const syncPropId = await this.syncPropertyToDatabase(enriched);
        
        if (syncPropId) {
          stats.properties.synced++;
          
          // Find child units for this parent
          const children = bookable.filter(b => b.raw?.parentUid === parent.externalId);
          for (const child of children) {
            try {
              const enrichedChild = await this.enrichProperty(child);
              await this.syncRoomTypeToDatabase(syncPropId, enrichedChild);
              stats.roomTypes.synced++;
            } catch (roomErr) {
              console.error(`[Hostfully fullSync] Room error for ${child.name}:`, roomErr.message);
              stats.roomTypes.errors++;
            }
            stats.roomTypes.total++;
          }
        }
      } catch (propErr) {
        console.error(`[Hostfully fullSync] Property error for ${parent.name}:`, propErr.message);
        stats.properties.errors++;
      }
    }
    
    // Sync standalone properties (act as both property and room)
    for (const prop of standalone) {
      try {
        const enriched = await this.enrichProperty(prop);
        const syncPropId = await this.syncPropertyToDatabase(enriched);
        
        if (syncPropId) {
          stats.properties.synced++;
          // Create a room type from the property itself
          await this.syncRoomTypeToDatabase(syncPropId, enriched);
          stats.roomTypes.synced++;
          stats.roomTypes.total++;
        }
      } catch (propErr) {
        console.error(`[Hostfully fullSync] Standalone error for ${prop.name}:`, propErr.message);
        stats.properties.errors++;
      }
    }
    
    console.log(`[Hostfully fullSync] Complete:`, stats);
    return { success: true, stats };
  }
  
  /**
   * Incremental sync - fetch only properties updated since lastSync
   */
  async incrementalSync(lastSync) {
    // Hostfully doesn't have an updatedSince filter on properties
    // Fall back to full sync but could be optimized with webhooks
    console.log(`[Hostfully incrementalSync] Falling back to full sync (last: ${lastSync})`);
    return this.fullSync();
  }
  
  /**
   * Enrich a property with photos, amenities, descriptions
   */
  async enrichProperty(property) {
    try {
      // Fetch photos
      const photosResult = await this.getPhotos(property.externalId);
      if (photosResult.success) {
        property.images = photosResult.data;
      }
      
      // Fetch amenities
      const amenitiesResult = await this.getAmenities(property.externalId);
      if (amenitiesResult.success) {
        property.amenities = amenitiesResult.data;
      }
      
      // Fetch descriptions
      const descResult = await this.getDescriptions(property.externalId);
      if (descResult.success && descResult.data) {
        // Use the main description or combine
        const desc = descResult.data.DESCRIPTION || descResult.data.SUMMARY || 
                     descResult.data.default || Object.values(descResult.data)[0];
        if (desc) property.description = desc.text || '';
      }
    } catch (enrichErr) {
      console.log(`[Hostfully] Enrichment partial failure for ${property.name}: ${enrichErr.message}`);
    }
    
    return property;
  }
  
  // =====================================================
  // WEBHOOK PARSING
  // =====================================================
  
  /**
   * Parse incoming Hostfully webhook payload
   * Returns standardized event object for SyncManager
   */
  parseWebhookPayload(payload, headers) {
    const eventType = payload.eventType || payload.event || headers['x-hostfully-event'] || 'unknown';
    
    const eventMap = {
      'NEW_LEAD': 'reservation.created',
      'UPDATED_LEAD': 'reservation.updated',
      'CANCELLED_LEAD': 'reservation.cancelled',
      'UPDATED_PROPERTY': 'property.updated',
      'UPDATED_PRICING': 'availability.updated'
    };
    
    return {
      event: eventMap[eventType] || eventType,
      externalId: payload.uid || payload.leadUid || payload.propertyUid || 'unknown',
      data: payload,
      raw: payload
    };
  }
  
  // =====================================================
  // DATABASE SYNC METHODS
  // =====================================================
  
  /**
   * Sync a property to gas_sync_properties staging table
   */
  async syncPropertyToDatabase(property) {
    if (!this.pool || !this.connectionId) {
      throw new Error('Database pool and connectionId required for sync');
    }
    
    try {
      const result = await this.pool.query(`
        INSERT INTO gas_sync_properties (
          connection_id, external_id, name, property_type,
          address, city, country, postal_code,
          latitude, longitude, currency, description,
          raw_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (connection_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          property_type = EXCLUDED.property_type,
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
        property.propertyType,
        property.address?.street || '',
        property.address?.city || '',
        property.address?.countryCode || property.address?.country || '',
        property.address?.postalCode || '',
        property.coordinates?.latitude || null,
        property.coordinates?.longitude || null,
        property.currency || 'EUR',
        property.description || '',
        JSON.stringify(property.raw || property)
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Hostfully syncPropertyToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync a room type to gas_sync_room_types staging table
   * In Hostfully, each SUB_UNIT property IS the room type
   */
  async syncRoomTypeToDatabase(syncPropertyId, property) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const result = await this.pool.query(`
        INSERT INTO gas_sync_room_types (
          connection_id, sync_property_id, external_id, name,
          max_occupancy, base_occupancy, 
          default_rate, currency,
          raw_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (connection_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          max_occupancy = EXCLUDED.max_occupancy,
          base_occupancy = EXCLUDED.base_occupancy,
          default_rate = EXCLUDED.default_rate,
          currency = EXCLUDED.currency,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        this.connectionId,
        syncPropertyId,
        property.externalId, // In Hostfully, property UID = room type ID
        property.name,
        property.maxGuests || 0,
        property.baseGuests || 0,
        property.dailyRate || 0,
        property.currency || 'EUR',
        JSON.stringify(property.raw || property)
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Hostfully syncRoomTypeToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync reservation to gas_sync_reservations
   */
  async syncReservationToDatabase(reservation) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      const guestName = [reservation.guest?.firstName, reservation.guest?.lastName]
        .filter(Boolean).join(' ') || 'Unknown Guest';
      
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
        reservation.propertyId, // In Hostfully, property = room type
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
        reservation.pricing?.currency || 'JPY',
        reservation.source || 'hostfully',
        reservation.notes || null,
        JSON.stringify(reservation.raw || reservation)
      ]);
      
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Hostfully syncReservationToDatabase error:', error.message);
      throw error;
    }
  }
  
  /**
   * Sync availability/calendar data to room_calendar table
   */
  async syncCalendarToDatabase(propertyExternalId, calendarData) {
    if (!this.pool || !this.connectionId) return;
    
    try {
      // Find the GAS room ID through sync tables
      const roomResult = await this.pool.query(`
        SELECT bu.id as gas_room_id
        FROM gas_sync_room_types srt
        JOIN gas_sync_properties sp ON srt.sync_property_id = sp.id
        JOIN bookable_units bu ON bu.cm_room_id = srt.external_id AND bu.property_id = sp.gas_property_id
        WHERE sp.connection_id = $1 AND srt.external_id = $2
      `, [this.connectionId, propertyExternalId]);
      
      let gasRoomId;
      
      if (roomResult.rows.length === 0) {
        // Try direct lookup by cm_room_id
        const directResult = await this.pool.query(`
          SELECT bu.id as gas_room_id
          FROM bookable_units bu
          JOIN properties p ON bu.property_id = p.id
          JOIN gas_sync_connections c ON c.account_id = p.account_id
          WHERE c.id = $1 AND bu.cm_room_id = $2
        `, [this.connectionId, propertyExternalId]);
        
        if (directResult.rows.length === 0) {
          console.log('Room not linked to GAS for calendar sync:', propertyExternalId);
          return 0;
        }
        gasRoomId = directResult.rows[0].gas_room_id;
      } else {
        gasRoomId = roomResult.rows[0].gas_room_id;
      }
      
      let syncedCount = 0;
      
      for (const day of calendarData) {
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
              currency = COALESCE(EXCLUDED.currency, room_calendar.currency),
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
            day.currency || 'JPY',
            day.isAvailable !== false,
            day.minStay || 1,
            day.maxStay || null,
            day.checkInAllowed === false,
            day.checkOutAllowed === false,
            day.status || (day.isAvailable ? 'available' : 'blocked')
          ]);
          syncedCount++;
        } catch (dayErr) {
          console.error(`Error syncing calendar for ${day.date}:`, dayErr.message);
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error('Hostfully syncCalendarToDatabase error:', error.message);
      throw error;
    }
  }
}

// =====================================================
// RATE LIMITER
// =====================================================

class RateLimiter {
  constructor(requestsPerMinute = 150) {
    this.rpm = requestsPerMinute;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60000);
    
    if (this.requests.length >= this.rpm) {
      const waitTime = 60000 - (now - this.requests[0]);
      console.log(`Hostfully rate limiter: waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  HostfullyAdapter,
  BUSINESS_TYPES,
  PROPERTY_TYPES
};
