/**
 * Hostaway Adapter for GasSync
 * 
 * Hostaway uses OAuth 2.0 Client Credentials flow
 * Single API (v1) - simpler than Beds24
 * 
 * Each listing IS the bookable unit (no separate room types)
 */

const axios = require('axios');

// =====================================================
// CONFIGURATION
// =====================================================

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

// =====================================================
// RATE LIMITER (shared pattern with Beds24)
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
      const waitTime = 60000 - (now - this.requests[0]);
      console.log(`Hostaway rate limit reached, waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// =====================================================
// HOSTAWAY ADAPTER CLASS
// =====================================================

class HostawayAdapter {
  constructor(config) {
    this.name = 'hostaway';
    this.version = '1.0.0';
    this.capabilities = [
      'properties',
      'availability',
      'rates',
      'reservations',
      'images'
    ];
    
    // Credentials - Hostaway uses accountId + apiKey to get access token
    this.accountId = config.accountId || config.clientId;
    this.apiKey = config.apiKey || config.clientSecret;
    this.token = config.token;  // Access token (if already obtained)
    
    // Debug logging
    console.log('HostawayAdapter constructor:', {
      hasAccountId: !!this.accountId,
      hasApiKey: !!this.apiKey,
      hasToken: !!this.token,
      connectionId: config.connectionId
    });
    
    // Rate limiting - Hostaway allows ~120 requests per minute
    this.rateLimiter = new RateLimiter(100);
    
    // Pool for database operations
    this.pool = config.pool;
    this.connectionId = config.connectionId;
  }
  
  // =====================================================
  // HTTP HELPERS
  // =====================================================
  
  async request(endpoint, method = 'GET', data = null, options = {}) {
    await this.rateLimiter.throttle();
    
    // Ensure we have a token
    if (!this.token) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return authResult;
      }
    }
    
    try {
      const config = {
        method,
        url: `${HOSTAWAY_BASE}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Cache-control': 'no-cache',
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
      
      // Hostaway wraps responses in { status: 'success', result: ... }
      if (response.data?.status === 'success') {
        return { success: true, data: response.data.result };
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, endpoint);
    }
  }
  
  handleError(error, endpoint) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    console.error(`Hostaway API error [${endpoint}]:`, {
      status,
      message,
      data: error.response?.data
    });
    
    // Token expired - clear it so next request re-authenticates
    if (status === 401) {
      this.token = null;
      return { success: false, error: 'Authentication failed - token expired', code: 'AUTH_EXPIRED' };
    }
    
    if (status === 429) {
      return { success: false, error: 'Rate limit exceeded', code: 'RATE_LIMIT' };
    }
    
    return { success: false, error: message, code: status || 'UNKNOWN' };
  }
  
  // =====================================================
  // AUTHENTICATION
  // =====================================================
  
  async authenticate() {
    if (!this.accountId || !this.apiKey) {
      return { success: false, error: 'Account ID and API Key required' };
    }
    
    try {
      console.log('Hostaway: Authenticating with accountId:', this.accountId);
      
      const response = await axios.post(
        `${HOSTAWAY_BASE}/accessTokens`,
        `grant_type=client_credentials&client_id=${this.accountId}&client_secret=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-control': 'no-cache'
          },
          timeout: 30000
        }
      );
      
      if (response.data?.access_token) {
        this.token = response.data.access_token;
        console.log('Hostaway: Got access token');
        
        return {
          success: true,
          token: this.token,
          expiresIn: response.data.expires_in
        };
      }
      
      return { success: false, error: 'No access token in response' };
    } catch (error) {
      console.error('Hostaway auth error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
  
  async testConnection() {
    // Try to authenticate first
    if (!this.token) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return authResult;
      }
    }
    
    // Then test by fetching listings
    const response = await this.request('/listings', 'GET', null, {
      params: { limit: 1 }
    });
    
    if (response.success) {
      return { success: true, message: 'Connection successful' };
    }
    
    return { success: false, error: response.error };
  }
  
  // =====================================================
  // PROPERTIES (Listings)
  // =====================================================
  
  async getProperties(options = {}) {
    const params = {
      limit: options.limit || 100,
      offset: options.offset || 0
    };
    
    const response = await this.request('/listings', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    // Response.data is the result array
    const listings = Array.isArray(response.data) ? response.data : [];
    
    console.log('Hostaway getProperties count:', listings.length);
    
    const properties = listings.map(listing => this.mapProperty(listing));
    
    return {
      success: true,
      data: properties,
      pagination: {
        offset: params.offset,
        limit: params.limit,
        total: listings.length,
        hasMore: listings.length >= params.limit
      }
    };
  }
  
  async getProperty(listingId) {
    const response = await this.request(`/listings/${listingId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapProperty(response.data)
    };
  }
  
  mapProperty(raw) {
    // Extract images - Hostaway has listingImages array with url, caption, sortOrder
    const images = (raw.listingImages || []).map((img, idx) => ({
      id: img.id,
      url: img.url,
      // Use airbnbCaption or caption, whichever has content
      caption: img.airbnbCaption || img.caption || img.vrboCaption || '',
      sortOrder: img.sortOrder || idx + 1,
      isPrimary: img.sortOrder === 1 || idx === 0
    }));
    
    // If no listingImages but has thumbnailUrl, use that
    if (images.length === 0 && raw.thumbnailUrl) {
      images.push({
        id: null,
        url: raw.thumbnailUrl,
        caption: 'Thumbnail',
        sortOrder: 1,
        isPrimary: true
      });
    }
    
    return {
      externalId: String(raw.id),
      name: raw.name || raw.internalListingName || `Listing ${raw.id}`,
      description: raw.description || '',
      shortDescription: raw.externalListingName || '',
      houseRules: raw.houseRules || '',
      propertyType: raw.propertyTypeId ? this.mapPropertyType(raw.propertyTypeId) : 'vacation_rental',
      address: {
        street: raw.street || raw.address || '',
        city: raw.city || '',
        state: raw.state || '',
        country: raw.countryCode || raw.country || '',
        postalCode: raw.zipcode || '',
        coordinates: {
          lat: parseFloat(raw.lat) || null,
          lng: parseFloat(raw.lng) || null
        }
      },
      contact: {
        email: raw.contactEmail || '',
        phone: raw.contactPhone || ''
      },
      timezone: raw.timezoneName || 'UTC',
      currency: raw.currencyCode || 'USD',
      checkInTime: raw.checkInTimeStart ? `${raw.checkInTimeStart}:00` : '15:00',
      checkOutTime: raw.checkOutTime ? `${raw.checkOutTime}:00` : '11:00',
      
      // Capacity - Hostaway listing IS the unit
      maxGuests: raw.personCapacity || raw.guestsIncluded || 2,
      bedrooms: raw.bedroomsNumber || 1,
      bathrooms: raw.bathroomsNumber || 1,
      beds: raw.bedsNumber || 1,
      
      // Pricing
      basePrice: raw.price || 100,
      cleaningFee: raw.cleaningFee || 0,
      minNights: raw.minNights || 1,
      maxNights: raw.maxNights || 365,
      
      // Images
      images: images,
      
      // Amenities (if available)
      amenities: raw.amenities || [],
      
      // Raw data for reference
      metadata: {
        hostawayId: raw.id,
        propertyTypeId: raw.propertyTypeId,
        status: raw.isActive ? 'active' : 'inactive',
        externalListingName: raw.externalListingName,
        internalListingName: raw.internalListingName
      },
      raw: raw
    };
  }
  
  mapPropertyType(typeId) {
    // Hostaway property type IDs
    const types = {
      1: 'apartment',
      2: 'house',
      3: 'secondary_unit',
      4: 'unique_space',
      5: 'bed_and_breakfast',
      6: 'boutique_hotel'
    };
    return types[typeId] || 'vacation_rental';
  }
  
  // =====================================================
  // ROOM TYPES - For Hostaway, listing = unit
  // =====================================================
  
  async getRoomTypes(propertyId) {
    // Hostaway doesn't have separate room types
    // Each listing IS the bookable unit
    // Return the listing as a single "room type"
    const property = await this.getProperty(propertyId);
    
    if (!property.success) {
      return property;
    }
    
    const listing = property.data;
    
    return {
      success: true,
      data: [{
        externalId: listing.externalId,
        propertyId: listing.externalId,
        name: listing.name,
        description: listing.description,
        maxGuests: listing.maxGuests,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        beds: listing.beds,
        basePrice: listing.basePrice,
        images: listing.images,
        amenities: listing.amenities,
        raw: listing.raw
      }]
    };
  }
  
  // =====================================================
  // AVAILABILITY
  // =====================================================
  
  async getAvailability(listingId, startDate, endDate) {
    const response = await this.request(`/listings/${listingId}/calendar`, 'GET', null, {
      params: {
        startDate,
        endDate
      }
    });
    
    if (!response.success) {
      return response;
    }
    
    // Map calendar data
    const calendar = Array.isArray(response.data) ? response.data : [];
    
    const availability = calendar.map(day => ({
      date: day.date,
      available: day.status === 'available',
      status: day.status, // available, booked, blocked
      price: day.price || null,
      minNights: day.minimumStay || null
    }));
    
    return {
      success: true,
      data: availability
    };
  }
  
  // =====================================================
  // RESERVATIONS
  // =====================================================
  
  async getReservations(options = {}) {
    const params = {
      limit: options.limit || 100,
      offset: options.offset || 0
    };
    
    if (options.listingId) {
      params.listingId = options.listingId;
    }
    
    if (options.startDate) {
      params.arrivalStartDate = options.startDate;
    }
    
    if (options.endDate) {
      params.arrivalEndDate = options.endDate;
    }
    
    const response = await this.request('/reservations', 'GET', null, { params });
    
    if (!response.success) {
      return response;
    }
    
    const reservations = Array.isArray(response.data) ? response.data : [];
    
    return {
      success: true,
      data: reservations.map(res => this.mapReservation(res))
    };
  }
  
  async getReservation(reservationId) {
    const response = await this.request(`/reservations/${reservationId}`);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  async createReservation(data) {
    const payload = {
      listingMapId: data.listingId,
      channelId: 2000, // Direct booking channel
      guestFirstName: data.guestFirstName,
      guestLastName: data.guestLastName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone || '',
      numberOfGuests: data.guests || 1,
      arrivalDate: data.checkIn,
      departureDate: data.checkOut,
      totalPrice: data.totalPrice,
      status: 'new'
    };
    
    const response = await this.request('/reservations', 'POST', payload);
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapReservation(response.data)
    };
  }
  
  mapReservation(raw) {
    return {
      externalId: String(raw.id),
      listingId: String(raw.listingMapId),
      channelId: raw.channelId,
      channelName: raw.channelName || 'Direct',
      status: raw.status,
      
      // Dates
      checkIn: raw.arrivalDate,
      checkOut: raw.departureDate,
      nights: raw.nights,
      
      // Guest
      guest: {
        firstName: raw.guestFirstName,
        lastName: raw.guestLastName,
        email: raw.guestEmail,
        phone: raw.guestPhone,
        numberOfGuests: raw.numberOfGuests
      },
      
      // Pricing
      totalPrice: raw.totalPrice,
      basePrice: raw.basePrice,
      cleaningFee: raw.cleaningFee,
      currency: raw.currency,
      
      // Timestamps
      createdAt: raw.insertedOn,
      updatedAt: raw.updatedOn,
      
      raw: raw
    };
  }
  
  // =====================================================
  // SYNC METHODS (for GasSync integration)
  // =====================================================
  
  async fullSync() {
    console.log('Hostaway: Starting full sync');
    
    const stats = {
      properties: { synced: 0, errors: 0 },
      roomTypes: { synced: 0, errors: 0 },
      images: { synced: 0, errors: 0 }
    };
    
    try {
      // Get all listings
      const propertiesResult = await this.getProperties({ limit: 100 });
      
      if (!propertiesResult.success) {
        throw new Error(propertiesResult.error);
      }
      
      const properties = propertiesResult.data;
      console.log(`Hostaway: Found ${properties.length} listings to sync`);
      
      // Sync each property to gas_sync_properties
      for (const property of properties) {
        try {
          await this.syncPropertyToDatabase(property);
          stats.properties.synced++;
          
          // For Hostaway, listing = room type
          stats.roomTypes.synced++;
          
          // Count images
          stats.images.synced += (property.images?.length || 0);
        } catch (error) {
          console.error(`Error syncing property ${property.externalId}:`, error.message);
          stats.properties.errors++;
        }
      }
      
      console.log('Hostaway: Full sync complete', stats);
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Hostaway full sync error:', error);
      return {
        success: false,
        error: error.message,
        stats
      };
    }
  }
  
  async incrementalSync(since) {
    // For now, just do a full sync
    // Later we can optimize to only fetch changed data
    return this.fullSync();
  }
  
  async syncPropertyToDatabase(property) {
    if (!this.pool || !this.connectionId) {
      console.log('Hostaway: No pool/connectionId, skipping database sync');
      return;
    }
    
    // Upsert to gas_sync_properties
    await this.pool.query(`
      INSERT INTO gas_sync_properties (
        connection_id, external_id, name, city, country, currency,
        is_active, synced_at, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        currency = EXCLUDED.currency,
        is_active = EXCLUDED.is_active,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data
    `, [
      this.connectionId,
      property.externalId,
      property.name,
      property.address?.city || '',
      property.address?.country || '',
      property.currency || 'USD',
      property.metadata?.status === 'active',
      JSON.stringify(property.raw)
    ]);
    
    // Upsert room type (same as property for Hostaway)
    await this.pool.query(`
      INSERT INTO gas_sync_room_types (
        connection_id, property_external_id, external_id, name,
        max_guests, base_price, synced_at, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      ON CONFLICT (connection_id, external_id) DO UPDATE SET
        name = EXCLUDED.name,
        max_guests = EXCLUDED.max_guests,
        base_price = EXCLUDED.base_price,
        synced_at = NOW(),
        raw_data = EXCLUDED.raw_data
    `, [
      this.connectionId,
      property.externalId,
      property.externalId, // Same ID for Hostaway
      property.name,
      property.maxGuests || 2,
      property.basePrice || 100,
      JSON.stringify(property.raw)
    ]);
    
    // Sync images
    if (property.images && property.images.length > 0) {
      for (const image of property.images) {
        await this.pool.query(`
          INSERT INTO gas_sync_images (
            connection_id, property_external_id, room_type_external_id,
            url, caption, sort_order, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (connection_id, url) DO UPDATE SET
            caption = EXCLUDED.caption,
            sort_order = EXCLUDED.sort_order,
            synced_at = NOW()
        `, [
          this.connectionId,
          property.externalId,
          property.externalId,
          image.url,
          image.caption || '',
          image.sortOrder || 0
        ]);
      }
    }
  }
  
  // =====================================================
  // WEBHOOK PARSING
  // =====================================================
  
  parseWebhookPayload(payload, headers) {
    // Hostaway unified webhook format
    const eventType = payload.event || 'unknown';
    
    return {
      event: eventType,
      externalId: payload.data?.id || payload.id,
      data: payload.data || payload,
      timestamp: payload.timestamp || new Date().toISOString()
    };
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  HostawayAdapter,
  RateLimiter
};
