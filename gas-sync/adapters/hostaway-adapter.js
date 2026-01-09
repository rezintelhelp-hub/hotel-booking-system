/**
 * Hostaway Adapter for GasSync
 * 
 * Hostaway uses OAuth 2.0 Client Credentials flow
 * Single API (v1) - simpler than Beds24
 * 
 * Each listing IS the bookable unit (no separate room types)
 * 
 * v1.1.2: Fixed database schema - uses sync_property_id FK, delete-then-insert for room_types
 */

const axios = require('axios');

// =====================================================
// CONFIGURATION
// =====================================================

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

// Hostaway amenity ID to name mapping (common amenities)
// This maps Hostaway's amenity IDs to human-readable names
const HOSTAWAY_AMENITY_MAP = {
  // General
  1: { name: 'Air Conditioning', category: 'climate' },
  2: { name: 'Heating', category: 'climate' },
  3: { name: 'WiFi', category: 'technology' },
  4: { name: 'TV', category: 'entertainment' },
  5: { name: 'Cable TV', category: 'entertainment' },
  6: { name: 'Fireplace', category: 'climate' },
  7: { name: 'Intercom', category: 'safety' },
  8: { name: 'Buzzer/Wireless Intercom', category: 'safety' },
  9: { name: 'Doorman', category: 'safety' },
  10: { name: 'Private Entrance', category: 'property' },
  11: { name: 'Elevator', category: 'property' },
  12: { name: 'Wheelchair Accessible', category: 'accessibility' },
  
  // Kitchen
  13: { name: 'Kitchen', category: 'kitchen' },
  14: { name: 'Coffee Maker', category: 'kitchen' },
  15: { name: 'Refrigerator', category: 'kitchen' },
  16: { name: 'Microwave', category: 'kitchen' },
  17: { name: 'Dishwasher', category: 'kitchen' },
  18: { name: 'Oven', category: 'kitchen' },
  19: { name: 'Stove', category: 'kitchen' },
  20: { name: 'Toaster', category: 'kitchen' },
  21: { name: 'Dishes & Utensils', category: 'kitchen' },
  22: { name: 'Cooking Basics', category: 'kitchen' },
  
  // Bathroom
  23: { name: 'Shampoo', category: 'bathroom' },
  24: { name: 'Hair Dryer', category: 'bathroom' },
  25: { name: 'Iron', category: 'bathroom' },
  26: { name: 'Washer', category: 'laundry' },
  27: { name: 'Dryer', category: 'laundry' },
  28: { name: 'Hot Tub', category: 'outdoor' },
  
  // Outdoor
  29: { name: 'Pool', category: 'outdoor' },
  30: { name: 'Free Parking', category: 'parking' },
  31: { name: 'Street Parking', category: 'parking' },
  32: { name: 'Paid Parking', category: 'parking' },
  33: { name: 'Garage', category: 'parking' },
  34: { name: 'EV Charger', category: 'parking' },
  35: { name: 'Gym', category: 'outdoor' },
  36: { name: 'BBQ Grill', category: 'outdoor' },
  37: { name: 'Patio/Balcony', category: 'outdoor' },
  38: { name: 'Garden', category: 'outdoor' },
  
  // Safety
  39: { name: 'Smoke Detector', category: 'safety' },
  40: { name: 'Carbon Monoxide Detector', category: 'safety' },
  41: { name: 'First Aid Kit', category: 'safety' },
  42: { name: 'Fire Extinguisher', category: 'safety' },
  43: { name: 'Lock on Bedroom Door', category: 'safety' },
  
  // Family
  44: { name: 'Suitable for Children', category: 'family' },
  45: { name: 'Suitable for Infants', category: 'family' },
  46: { name: 'Pets Allowed', category: 'policy' },
  47: { name: 'Smoking Allowed', category: 'policy' },
  48: { name: 'Events Allowed', category: 'policy' },
  
  // Bedroom
  49: { name: 'Hangers', category: 'bedroom' },
  50: { name: 'Bed Linens', category: 'bedroom' },
  51: { name: 'Extra Pillows & Blankets', category: 'bedroom' },
  52: { name: 'Laptop Workspace', category: 'workspace' },
  
  // Location/Views
  53: { name: 'Waterfront', category: 'views' },
  54: { name: 'Beachfront', category: 'views' },
  55: { name: 'Ski-in/Ski-out', category: 'views' },
  56: { name: 'Mountain View', category: 'views' },
  57: { name: 'Lake View', category: 'views' },
  58: { name: 'Ocean View', category: 'views' },
  59: { name: 'City View', category: 'views' },
  60: { name: 'Garden View', category: 'views' },
  
  // Entertainment
  61: { name: 'Game Console', category: 'entertainment' },
  62: { name: 'Books and Reading Material', category: 'entertainment' },
  63: { name: 'Sound System', category: 'entertainment' },
  64: { name: 'Board Games', category: 'entertainment' },
  65: { name: 'Streaming Services', category: 'entertainment' },
  
  // Common for vacation rentals
  100: { name: 'Katy Trail Access', category: 'outdoor' },
  101: { name: 'Game Room', category: 'entertainment' },
  102: { name: 'Basketball Court', category: 'outdoor' },
  103: { name: 'Fire Pit', category: 'outdoor' },
  104: { name: 'Outdoor Dining Area', category: 'outdoor' },
  105: { name: 'Private Deck', category: 'outdoor' },
  106: { name: 'Kayaks', category: 'outdoor' },
  107: { name: 'Fishing Gear', category: 'outdoor' },
  108: { name: 'Bikes', category: 'outdoor' }
};

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
    this.version = '1.1.4';  // Added connection_id to room_types
    this.capabilities = [
      'properties',
      'availability',
      'rates',
      'reservations',
      'images',
      'amenities'
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
      offset: options.offset || 0,
      includeResources: 1  // Request all resources including amenities
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
    const response = await this.request(`/listings/${listingId}`, 'GET', null, {
      params: { includeResources: 1 }
    });
    
    if (!response.success) {
      return response;
    }
    
    return {
      success: true,
      data: this.mapProperty(response.data)
    };
  }
  
  // =====================================================
  // AMENITIES EXTRACTION
  // =====================================================
  
  /**
   * Extract amenities from Hostaway listing data
   * Hostaway stores amenities in multiple possible locations:
   * - listingAmenities: array of amenity IDs
   * - amenities: sometimes used
   * - amenityIds: sometimes used
   * Also check the description for amenity keywords if structured data is missing
   */
  extractAmenities(raw) {
    const amenities = [];
    const seenNames = new Set();
    
    // Method 1: Check listingAmenities array (most common)
    if (raw.listingAmenities && Array.isArray(raw.listingAmenities)) {
      console.log(`Hostaway: Found ${raw.listingAmenities.length} listingAmenities`);
      for (const amenityData of raw.listingAmenities) {
        const amenityId = typeof amenityData === 'object' ? amenityData.amenityId || amenityData.id : amenityData;
        const mapped = HOSTAWAY_AMENITY_MAP[amenityId];
        if (mapped && !seenNames.has(mapped.name)) {
          amenities.push({
            id: amenityId,
            name: mapped.name,
            category: mapped.category,
            source: 'hostaway_id'
          });
          seenNames.add(mapped.name);
        } else if (typeof amenityData === 'object' && amenityData.name && !seenNames.has(amenityData.name)) {
          // If Hostaway provides name directly
          amenities.push({
            id: amenityId,
            name: amenityData.name,
            category: amenityData.category || 'general',
            source: 'hostaway_direct'
          });
          seenNames.add(amenityData.name);
        }
      }
    }
    
    // Method 2: Check amenities array
    if (raw.amenities && Array.isArray(raw.amenities)) {
      console.log(`Hostaway: Found ${raw.amenities.length} in amenities array`);
      for (const amenity of raw.amenities) {
        const name = typeof amenity === 'string' ? amenity : amenity.name;
        if (name && !seenNames.has(name)) {
          amenities.push({
            id: null,
            name: name,
            category: amenity.category || 'general',
            source: 'hostaway_amenities'
          });
          seenNames.add(name);
        }
      }
    }
    
    // Method 3: Check amenityIds if present
    if (raw.amenityIds && Array.isArray(raw.amenityIds)) {
      console.log(`Hostaway: Found ${raw.amenityIds.length} amenityIds`);
      for (const amenityId of raw.amenityIds) {
        const mapped = HOSTAWAY_AMENITY_MAP[amenityId];
        if (mapped && !seenNames.has(mapped.name)) {
          amenities.push({
            id: amenityId,
            name: mapped.name,
            category: mapped.category,
            source: 'hostaway_id'
          });
          seenNames.add(mapped.name);
        }
      }
    }
    
    // Method 4: Parse amenities from description if no structured data found
    if (amenities.length === 0 && raw.description) {
      console.log('Hostaway: No structured amenities, parsing from description');
      const parsedAmenities = this.parseAmenitiesFromDescription(raw.description);
      for (const amenity of parsedAmenities) {
        if (!seenNames.has(amenity.name)) {
          amenities.push(amenity);
          seenNames.add(amenity.name);
        }
      }
    }
    
    console.log(`Hostaway: Total amenities extracted: ${amenities.length}`);
    return amenities;
  }
  
  /**
   * Parse amenities from description text
   * This is a fallback when structured amenity data is not available
   */
  parseAmenitiesFromDescription(description) {
    const amenities = [];
    if (!description) return amenities;
    
    // Common amenity keywords to look for
    const amenityPatterns = [
      { pattern: /katy trail/i, name: 'Katy Trail Access', category: 'outdoor' },
      { pattern: /game room/i, name: 'Game Room', category: 'entertainment' },
      { pattern: /basketball court/i, name: 'Basketball Court', category: 'outdoor' },
      { pattern: /fire pit/i, name: 'Fire Pit', category: 'outdoor' },
      { pattern: /hot tub|jacuzzi/i, name: 'Hot Tub', category: 'outdoor' },
      { pattern: /pool(?!\s+table)/i, name: 'Pool', category: 'outdoor' },
      { pattern: /pool table|billiards/i, name: 'Pool Table', category: 'entertainment' },
      { pattern: /wifi|wi-fi|internet/i, name: 'WiFi', category: 'technology' },
      { pattern: /air conditioning|a\/c|ac\b/i, name: 'Air Conditioning', category: 'climate' },
      { pattern: /heating|heater/i, name: 'Heating', category: 'climate' },
      { pattern: /washer|laundry/i, name: 'Washer', category: 'laundry' },
      { pattern: /dryer/i, name: 'Dryer', category: 'laundry' },
      { pattern: /dishwasher/i, name: 'Dishwasher', category: 'kitchen' },
      { pattern: /full kitchen|fully equipped kitchen/i, name: 'Full Kitchen', category: 'kitchen' },
      { pattern: /grill|bbq|barbecue/i, name: 'BBQ Grill', category: 'outdoor' },
      { pattern: /patio|deck|balcony/i, name: 'Patio/Deck', category: 'outdoor' },
      { pattern: /parking|garage/i, name: 'Parking', category: 'parking' },
      { pattern: /pet friendly|pets allowed/i, name: 'Pet Friendly', category: 'policy' },
      { pattern: /fireplace/i, name: 'Fireplace', category: 'climate' },
      { pattern: /smart tv|streaming/i, name: 'Smart TV', category: 'entertainment' },
      { pattern: /kayak/i, name: 'Kayaks', category: 'outdoor' },
      { pattern: /bikes|bicycles/i, name: 'Bikes', category: 'outdoor' },
      { pattern: /fishing/i, name: 'Fishing Gear', category: 'outdoor' },
      { pattern: /outdoor dining/i, name: 'Outdoor Dining Area', category: 'outdoor' },
      { pattern: /coffee maker|keurig/i, name: 'Coffee Maker', category: 'kitchen' },
      { pattern: /river view|riverfront/i, name: 'River View', category: 'views' },
      { pattern: /lake view|lakefront/i, name: 'Lake View', category: 'views' },
      { pattern: /mountain view/i, name: 'Mountain View', category: 'views' },
      { pattern: /ev charger|electric vehicle/i, name: 'EV Charger', category: 'parking' },
      { pattern: /gym|fitness/i, name: 'Gym', category: 'outdoor' },
      { pattern: /private entrance/i, name: 'Private Entrance', category: 'property' }
    ];
    
    for (const { pattern, name, category } of amenityPatterns) {
      if (pattern.test(description)) {
        amenities.push({
          id: null,
          name,
          category,
          source: 'parsed_description'
        });
      }
    }
    
    return amenities;
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
    
    // Extract amenities using our enhanced method
    const amenities = this.extractAmenities(raw);
    
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
      
      // Amenities - now properly extracted
      amenities: amenities,
      
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
      images: { synced: 0, errors: 0 },
      amenities: { synced: 0, errors: 0 }
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
          
          // Count amenities
          stats.amenities.synced += (property.amenities?.length || 0);
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
    
    // Upsert to gas_sync_properties and get the ID back
    const propResult = await this.pool.query(`
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
      RETURNING id
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
    
    const syncPropertyId = propResult.rows[0].id;
    
    // Delete existing room type for this property, then insert fresh
    // (avoids ON CONFLICT issues since there's no unique constraint)
    await this.pool.query(`
      DELETE FROM gas_sync_room_types WHERE sync_property_id = $1
    `, [syncPropertyId]);
    
    await this.pool.query(`
      INSERT INTO gas_sync_room_types (
        connection_id, sync_property_id, external_id, name, max_guests, synced_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      this.connectionId,
      syncPropertyId,
      property.externalId,
      property.name,
      property.maxGuests || 2
    ]);
    
    // Sync amenities to room_amenity_selections (if bookable_unit exists)
    if (property.amenities && property.amenities.length > 0) {
      await this.syncAmenitiesToDatabase(property.externalId, property.amenities);
    }
  }
  
  /**
   * Sync amenities to the room_amenity_selections table
   * This links rooms to master_amenities for display in WordPress
   */
  async syncAmenitiesToDatabase(externalId, amenities) {
    if (!this.pool || !amenities || amenities.length === 0) return;
    
    try {
      // First, get the bookable_unit_id for this external listing
      const unitResult = await this.pool.query(`
        SELECT id FROM bookable_units WHERE hostaway_listing_id = $1
      `, [externalId]);
      
      if (unitResult.rows.length === 0) {
        console.log(`Hostaway: No bookable_unit found for listing ${externalId}, skipping amenities sync`);
        return;
      }
      
      const roomId = unitResult.rows[0].id;
      
      // Clear existing amenity selections for this room
      await this.pool.query(`
        DELETE FROM room_amenity_selections WHERE room_id = $1
      `, [roomId]);
      
      // Also try bookable_unit_amenities table if it exists
      try {
        await this.pool.query(`
          DELETE FROM bookable_unit_amenities WHERE bookable_unit_id = $1
        `, [roomId]);
      } catch (e) {
        // Table might not exist, that's fine
      }
      
      let order = 1;
      let matched = 0;
      let unmatched = [];
      
      for (const amenity of amenities) {
        // Generate multiple search variations for flexible matching
        const name = amenity.name;
        const nameLower = name.toLowerCase();
        const codeWithUnderscore = nameLower.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const codeNoSpace = nameLower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const codeWithHyphen = nameLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Try flexible matching:
        // 1. Exact code match (case insensitive)
        // 2. Code with underscores
        // 3. Code without spaces
        // 4. Code with hyphens
        // 5. JSON amenity_name contains the name
        const masterResult = await this.pool.query(`
          SELECT id, amenity_code FROM master_amenities 
          WHERE LOWER(amenity_code) = $1
             OR LOWER(amenity_code) = $2
             OR LOWER(amenity_code) = $3
             OR LOWER(amenity_code) = $4
             OR LOWER(amenity_name::text) LIKE $5
             OR LOWER(amenity_name::text) LIKE $6
          LIMIT 1
        `, [
          nameLower,
          codeWithUnderscore,
          codeNoSpace,
          codeWithHyphen,
          `%"${nameLower}"%`,
          `%"${nameLower.replace(/\s+/g, '')}"%`
        ]);
        
        if (masterResult.rows.length > 0) {
          // Found matching master amenity, create selection
          const masterId = masterResult.rows[0].id;
          await this.pool.query(`
            INSERT INTO room_amenity_selections (room_id, amenity_id, display_order)
            VALUES ($1, $2, $3)
            ON CONFLICT (room_id, amenity_id) DO UPDATE SET display_order = EXCLUDED.display_order
          `, [roomId, masterId, order]);
          order++;
          matched++;
        } else {
          unmatched.push(amenity.name);
          // No matching master amenity, insert into bookable_unit_amenities directly
          try {
            await this.pool.query(`
              INSERT INTO bookable_unit_amenities (
                bookable_unit_id, amenity_name, amenity_code, category, display_order
              ) VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT DO NOTHING
            `, [
              roomId,
              JSON.stringify({ en: amenity.name }),
              codeWithUnderscore,
              amenity.category || 'general',
              order
            ]);
            order++;
          } catch (e) {
            // Table might not exist or other error, skip
          }
        }
      }
      
      console.log(`Hostaway: Synced ${matched} amenities to master_amenities for room ${roomId}`);
      if (unmatched.length > 0) {
        console.log(`Hostaway: ${unmatched.length} unmatched amenities: ${unmatched.slice(0, 5).join(', ')}${unmatched.length > 5 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.error(`Hostaway: Error syncing amenities for ${externalId}:`, error.message);
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
  RateLimiter,
  HOSTAWAY_AMENITY_MAP
};
