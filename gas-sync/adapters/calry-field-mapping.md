# Calry Field Mapping to GAS

## Overview
This document maps Calry's unified API fields to GAS database fields. Calry normalizes data from 40+ PMSs, so field names and availability vary by source PMS.

---

## Property Level

### GAS `properties` Table

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `name` | `name` | Always available |
| `address` | `address.line1`, `address.street` | |
| `city` | `address.city` | |
| `country` | `address.country`, `address.countryCode` | |
| `postal_code` | `address.postalCode`, `address.postal_code`, `address.zipCode` | |
| `latitude` | `geoLocation.latitude`, `coordinates.lat`, `latitude` | |
| `longitude` | `geoLocation.longitude`, `coordinates.lng`, `longitude` | |
| `currency` | `currency` | Default: EUR |
| `description` | `description`, `summary` | May be empty for some PMSs |
| `cm_property_id` | `id` (as string) | Calry's property ID |
| `cm_source` | `'calry'` | Hardcoded |

### GAS `properties.settings` JSON

| JSON Key | Calry Field(s) | Notes |
|----------|---------------|-------|
| `calry_id` | `id` | Original Calry ID |
| `calry_external_id` | `externalId` | PMS's original ID |
| `check_in_time` | `checkInTime`, `checkinTime` | |
| `check_out_time` | `checkOutTime`, `checkoutTime` | |
| `timezone` | `timezone` | |
| `house_rules` | `houseRules`, `rules` | |
| `cancellation_policy` | `cancellationPolicy` | |
| `min_nights` | `minNights`, `minimumStay` | |
| `max_nights` | `maxNights`, `maximumStay` | |
| `property_type` | `propertyType`, `type` | e.g., "apartment", "house" |
| `amenities` | `amenities[]` | Array of amenity names |
| `thumbnail_url` | `thumbnailUrl`, `thumbnail` | |
| `website_url` | `websiteUrl`, `website` | |
| `contact_email` | `email`, `contactEmail` | |
| `contact_phone` | `phone`, `contactPhone` | |

---

## Room Level

### GAS `bookable_units` Table

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `name` | `name` | Falls back to property name |
| `description` | `description`, `summary` | |
| `max_guests` | `maxOccupancy`, `maxGuests`, `capacity` | Default: 2 |
| `num_bedrooms` | `bedRoom.count`, `bedrooms`, `numberOfBedrooms` | Default: 1 |
| `num_bathrooms` | `bathRoom.count`, `bathrooms`, `numberOfBathrooms` | Default: 1 |
| `base_price` | `startPrice`, `basePrice`, `price` | |
| `currency` | Inherited from property | |
| `cm_room_id` | `id` (as string) | Calry's room ID |
| `cm_source` | `'calry'` | Hardcoded |

### GAS `bookable_units.amenities` JSON

| JSON Key | Calry Field(s) | Notes |
|----------|---------------|-------|
| `amenities` | `amenities[]` | Array of amenity names |
| `calry_id` | `id` | Original Calry room ID |
| `calry_external_id` | `externalId` | PMS's original room ID |
| `bed_types` | `beds`, `bedTypes`, `bedConfiguration` | Array of bed info |
| `room_type` | `roomType`, `type` | |
| `floor` | `floor` | |
| `size_sqm` | `size`, `area`, `squareMeters` | |
| `view` | `view` | |

---

## Images

### GAS `property_images` Table

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `property_id` | Linked via import | |
| `room_id` | Linked via import | NULL for property-level images |
| `image_key` | Generated | `calry_prop_{id}_{index}` or `calry_room_{id}_{index}` |
| `image_url` | `pictures[].url`, `images[].url`, `photos[].url` | Also: `.original`, `.large`, `.medium` |
| `url` | Same as `image_url` | Duplicate for compatibility |
| `caption` | `pictures[].caption`, `.description`, `.title` | |
| `display_order` | Array index | |
| `is_primary` | `index === 0` | First image is primary |
| `is_active` | `true` | |

### Image Sources by PMS

| PMS | Property Images | Room Images | Notes |
|-----|----------------|-------------|-------|
| Smoobu | ❓ Limited | ❓ Limited | May not expose via API |
| Guesty | ✅ Yes | ✅ Yes | Full image support |
| Hostaway | ✅ Yes | ✅ Yes | Full image support |
| Lodgify | ✅ Yes | ✅ Yes | |
| Beds24 | ✅ Yes | ✅ Yes | Via direct API |
| Cloudbeds | ✅ Yes | ✅ Yes | |
| OwnerRez | ✅ Yes | ❓ | |

---

## Availability by PMS

Not all PMSs expose all fields. Here's what we typically get:

### Smoobu (via Calry)
- ✅ Property name, address
- ✅ Room types with occupancy
- ✅ Pricing
- ❓ Description (may be limited)
- ❌ Images (not typically exposed)
- ❓ Amenities (limited)

### Guesty (via Calry)
- ✅ Full property details
- ✅ Full room details
- ✅ Images
- ✅ Amenities
- ✅ House rules

### Hostaway (via Calry)
- ✅ Full property details
- ✅ Full room details  
- ✅ Images
- ✅ Amenities
- ✅ Check-in/out times

### Beds24 (Direct)
- ✅ Full property details
- ✅ Full room details
- ✅ Images
- ✅ Feature codes (amenities)
- ✅ All text fields

---

## API Endpoints Used

### Calry v2 VRS API

```
GET /api/v2/vrs/properties
Headers:
  - Authorization: Bearer {token}
  - workspaceId: {workspace_id}
  - integrationAccountId: {integration_account_id}

GET /api/v2/vrs/room-types/{propertyId}
Headers: (same as above)
```

### Response Structure

```json
{
  "data": [
    {
      "id": "12345",
      "externalId": "smoobu-prop-123",
      "name": "Beach House",
      "description": "Beautiful beachfront property...",
      "address": {
        "line1": "123 Beach Road",
        "city": "Miami",
        "country": "US",
        "postalCode": "33139"
      },
      "geoLocation": {
        "latitude": 25.7617,
        "longitude": -80.1918
      },
      "currency": "USD",
      "amenities": ["wifi", "pool", "parking"],
      "pictures": [
        {
          "url": "https://...",
          "caption": "Living room"
        }
      ],
      "checkInTime": "15:00",
      "checkOutTime": "11:00",
      "houseRules": "No smoking...",
      "thumbnailUrl": "https://..."
    }
  ]
}
```

---

## Adding New CMs

When adding a new CM via Calry:

1. **Check Calry docs** for PMS-specific field availability
2. **Test the API** to see actual response structure
3. **Map to existing fields** using the alternates listed above
4. **Add fallbacks** for fields that might be named differently
5. **Document gaps** - what's NOT available from this PMS

### Code Location

- **Initial import**: `importCalryPropertyHelper()` in server.js (~line 19380)
- **Resync**: `link-to-gas` endpoint in server.js (~line 2626)
- **Smoobu wizard**: `/smoobu-wizard.html`
- **Generic CM wizard**: `/connect-cm.html`, `/owners-setup.html`

---

## Future Improvements

1. **Fetch images separately** - Some PMSs have a separate images endpoint
2. **Amenity mapping** - Map PMS-specific codes to GAS master amenities
3. **Webhook support** - Real-time updates when PMS data changes
4. **Rate plans** - Import pricing tiers and seasonal rates
5. **Availability sync** - Calendar blocking from PMS

---

## Pricing

### Calry Pricing Endpoints

```
GET /api/v2/vrs/pricing/{roomTypeId}
GET /api/v2/vrs/pricing?startDate=2024-01-01&endDate=2024-12-31

Headers:
  - Authorization: Bearer {token}
  - workspaceId: {workspace_id}
  - integrationAccountId: {integration_account_id}
```

### Calry Pricing Response

```json
{
  "data": [
    {
      "date": "2024-06-15",
      "roomTypeId": "12345",
      "price": 150.00,
      "currency": "USD",
      "minStay": 2,
      "maxStay": 14,
      "available": true,
      "closedToArrival": false,
      "closedToDeparture": false
    }
  ]
}
```

### GAS `room_calendar` / `availability` Table Mapping

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `room_id` | Linked via `roomTypeId` | |
| `date` | `date` | |
| `price` | `price` | Nightly rate |
| `currency` | `currency` | |
| `min_stay` | `minStay`, `minimumStay` | |
| `max_stay` | `maxStay`, `maximumStay` | |
| `available` | `available` | Boolean |
| `closed_to_arrival` | `closedToArrival` | Can't check in this day |
| `closed_to_departure` | `closedToDeparture` | Can't check out this day |
| `status` | Derived from `available` | 'available' / 'blocked' |

---

## Availability / Calendar

### Calry Availability Endpoints

```
GET /api/v2/vrs/availability?startDate=2024-01-01&endDate=2024-01-31
GET /api/v2/vrs/availability/{roomTypeId}?startDate=2024-01-01&endDate=2024-01-31

Headers: (same as above)
```

### Calry Availability Response

```json
{
  "data": [
    {
      "date": "2024-06-15",
      "roomTypeId": "12345",
      "propertyId": "67890",
      "available": true,
      "availableUnits": 3,
      "totalUnits": 5,
      "status": "available",
      "blockedReason": null
    }
  ]
}
```

### GAS Availability Mapping

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `room_id` | Linked via `roomTypeId` | |
| `date` | `date` | |
| `available` | `available` | Boolean |
| `available_units` | `availableUnits` | For multi-unit rooms |
| `total_units` | `totalUnits` | |
| `status` | `status` | 'available', 'blocked', 'booked' |
| `blocked_reason` | `blockedReason` | e.g., 'owner_block', 'maintenance' |

---

## Reservations / Bookings

### Calry Reservations Endpoints

```
GET /api/v2/vrs/reservations
GET /api/v2/vrs/reservations/{reservationId}
POST /api/v2/vrs/reservations  (create booking)

Headers: (same as above)
```

### Calry Reservation Response

```json
{
  "data": {
    "id": "res-123",
    "externalId": "smoobu-res-456",
    "propertyId": "67890",
    "roomTypeId": "12345",
    "status": "confirmed",
    "checkIn": "2024-06-15",
    "checkOut": "2024-06-20",
    "nights": 5,
    "guests": {
      "adults": 2,
      "children": 1,
      "infants": 0
    },
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "pricing": {
      "totalPrice": 750.00,
      "currency": "USD",
      "accommodationTotal": 700.00,
      "cleaningFee": 50.00,
      "taxTotal": 0
    },
    "channel": "direct",
    "source": "booking.com",
    "createdAt": "2024-05-01T10:00:00Z",
    "updatedAt": "2024-05-01T10:00:00Z"
  }
}
```

### GAS `bookings` Table Mapping

| GAS Field | Calry Field(s) | Notes |
|-----------|---------------|-------|
| `id` | Auto-generated | |
| `property_id` | Linked via `propertyId` | |
| `room_id` | Linked via `roomTypeId` | |
| `external_id` | `id` | Calry reservation ID |
| `cm_booking_id` | `externalId` | PMS's original booking ID |
| `status` | `status` | confirmed, cancelled, pending |
| `check_in` | `checkIn` | Date |
| `check_out` | `checkOut` | Date |
| `nights` | `nights` | Calculated or provided |
| `adults` | `guests.adults` | |
| `children` | `guests.children` | |
| `infants` | `guests.infants` | |
| `guest_name` | `guest.firstName` + `guest.lastName` | |
| `guest_email` | `guest.email` | |
| `guest_phone` | `guest.phone` | |
| `total_price` | `pricing.totalPrice` | |
| `currency` | `pricing.currency` | |
| `accommodation_total` | `pricing.accommodationTotal` | |
| `cleaning_fee` | `pricing.cleaningFee` | |
| `tax_total` | `pricing.taxTotal` | |
| `channel` | `channel` | direct, airbnb, booking.com |
| `source` | `source` | Original OTA |
| `created_at` | `createdAt` | |

---

## Sync Strategy

### Initial Import
1. Properties → `properties` table
2. Room Types → `bookable_units` table
3. Images → `property_images` table
4. **Pricing (30-90 days)** → `room_calendar` table
5. **Reservations** → `bookings` table

### Ongoing Sync (via Webhooks or Polling)
1. **Availability changes** → Update `room_calendar`
2. **Price changes** → Update `room_calendar`
3. **New bookings** → Insert to `bookings`
4. **Booking updates** → Update `bookings`
5. **Cancellations** → Update booking status

### Webhook Events (Calry)

| Event | Action |
|-------|--------|
| `reservation.created` | Create booking in GAS |
| `reservation.updated` | Update booking in GAS |
| `reservation.cancelled` | Update status to cancelled |
| `availability.updated` | Refresh calendar for room |
| `pricing.updated` | Refresh pricing for room |
| `property.updated` | Refresh property details |

---

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Property import | ✅ Done | Full details |
| Room import | ✅ Done | With amenities |
| Images | ✅ Done | Where available |
| Pricing sync | ⏳ Partial | Via tiered sync for Beds24 |
| Availability sync | ⏳ Partial | Via tiered sync for Beds24 |
| Booking import | ❌ TODO | Need to add |
| Booking push | ❌ TODO | Create booking in PMS |
| Webhooks | ❌ TODO | Real-time updates |

---

## Priority for Next CMs

When connecting a new CM, implement in this order:

1. **Properties & Rooms** - Basic listing data (DONE)
2. **Pricing** - Need rates to show on booking engine
3. **Availability** - Need calendar to prevent overbooking
4. **Bookings pull** - Import existing reservations
5. **Bookings push** - Send new bookings to PMS
6. **Real-time webhooks** - Keep everything in sync
