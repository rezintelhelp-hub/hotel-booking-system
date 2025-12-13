# GasSync Integration Buffer

## Executive Summary

**GasSync** is an integration buffer layer that sits between external systems (Channel Managers, Partners, APIs) and the GAS core database. 

**Core Principle:** All external integrations MUST flow through GasSync. No external system ever touches GAS core tables directly.

This protects:
- GAS intellectual property and architecture
- Database integrity from third-party corruption
- Independence from any single partner or integration
- Ability to add/remove integrations without core changes

---

## The Problem GasSync Solves

### Without GasSync:
```
Beds24 fields → core tables
Smoobu fields → core tables  
Partner X fields → core tables
Partner Y fields → core tables
...
= Database bloat, corruption risk, vendor lock-in
```

### With GasSync:
```
Any External System → GasSync Buffer → Mapping → GAS Core
                           ↓
                    Standardised Schema
                    (Calry-compatible)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL WORLD                           │
│                                                              │
│   Partners    Beds24    Smoobu    Calry    Future CMs       │
│      │          │         │         │          │            │
└──────┴──────────┴─────────┴─────────┴──────────┴────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                      ★ GASSYNC ★                            │
│                   Integration Buffer                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              STANDARDISED ENDPOINTS                     │ │
│  │                                                         │ │
│  │   POST /integration/v1/properties                       │ │
│  │   POST /integration/v1/room-types                       │ │
│  │   POST /integration/v1/reservations                     │ │
│  │   POST /integration/v1/availability                     │ │
│  │   POST /integration/v1/guests                           │ │
│  │   GET  /integration/v1/properties                       │ │
│  │   GET  /integration/v1/reservations                     │ │
│  │   ...                                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              BUFFER TABLES (int_*)                      │ │
│  │                                                         │ │
│  │   int_sources         - Connected systems               │ │
│  │   int_properties      - External properties             │ │
│  │   int_room_types      - External units                  │ │
│  │   int_reservations    - External bookings               │ │
│  │   int_availability    - External calendar               │ │
│  │   int_guests          - External customers              │ │
│  │   int_mappings        - External ↔ Core links          │ │
│  │   int_webhooks        - Outbound subscribers            │ │
│  │   int_sync_log        - Audit trail                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              MAPPING ENGINE                             │ │
│  │                                                         │ │
│  │   Validates incoming data                               │ │
│  │   Stores in buffer tables with raw_data                 │ │
│  │   Maps to GAS core entities                             │ │
│  │   Triggers outbound webhooks                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     CLEAN MAPPING
                     (one-way sync)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                      GAS CORE                                │
│                   (Protected)                                │
│                                                              │
│   accounts    properties    bookable_units    bookings       │
│   guests      websites      website_units     payments       │
│                                                              │
│   ★ NO external system fields here                          │
│   ★ NO CM-specific columns                                  │
│   ★ NO vendor lock-in                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Inbound (External → GAS)

1. External system calls `/integration/v1/properties`
2. GasSync validates against standard schema
3. Data stored in `int_properties` with `raw_data` JSON
4. Mapping engine links or creates GAS core entity
5. Mapping recorded in `int_mappings`
6. Sync logged in `int_sync_log`

### Outbound (GAS → External)

1. GAS core entity changes
2. GasSync detects change
3. Looks up subscribers in `int_webhooks`
4. Converts to standard schema
5. POSTs to subscriber endpoints
6. Logged in `int_sync_log`

---

## GasSync Tables

### int_sources
```sql
id SERIAL PRIMARY KEY,
source_type VARCHAR(50),      -- 'calry', 'beds24', 'smoobu', 'partner'
source_name VARCHAR(255),
api_key_hash VARCHAR(255),
workspace_id VARCHAR(100),    -- Their identifier
gas_account_id INTEGER,       -- Links to GAS account
config JSONB,                 -- Source-specific settings
status VARCHAR(20),           -- 'active', 'paused', 'disabled'
last_sync_at TIMESTAMP,
created_at TIMESTAMP
```

### int_properties
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
external_id VARCHAR(255),     -- Their property ID
name VARCHAR(255),
description TEXT,
address TEXT,
city VARCHAR(100),
country VARCHAR(100),
thumbnail_url TEXT,
gas_property_id INTEGER,      -- Linked GAS property (nullable until mapped)
raw_data JSONB,               -- Original payload preserved
synced_at TIMESTAMP,
UNIQUE(source_id, external_id)
```

### int_room_types
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
int_property_id INTEGER REFERENCES int_properties(id),
external_id VARCHAR(255),
name VARCHAR(255),
description TEXT,
max_occupancy INTEGER,
amenities JSONB,
gas_unit_id INTEGER,          -- Linked GAS bookable_unit
raw_data JSONB,
synced_at TIMESTAMP,
UNIQUE(source_id, external_id)
```

### int_reservations
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
int_room_type_id INTEGER REFERENCES int_room_types(id),
external_id VARCHAR(255),
check_in DATE,
check_out DATE,
status VARCHAR(50),           -- 'confirmed', 'cancelled', 'pending'
source_channel VARCHAR(100),  -- 'airbnb', 'booking.com', 'direct'
guest_first_name VARCHAR(100),
guest_last_name VARCHAR(100),
guest_email VARCHAR(255),
guest_phone VARCHAR(50),
adults INTEGER,
children INTEGER,
total_price DECIMAL(10,2),
currency VARCHAR(3),
gas_booking_id INTEGER,       -- Linked GAS booking
raw_data JSONB,
synced_at TIMESTAMP,
UNIQUE(source_id, external_id)
```

### int_availability
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
int_room_type_id INTEGER REFERENCES int_room_types(id),
date DATE,
available BOOLEAN,
price DECIMAL(10,2),
currency VARCHAR(3),
min_stay INTEGER,
max_stay INTEGER,
synced_at TIMESTAMP,
UNIQUE(int_room_type_id, date)
```

### int_mappings
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
external_entity_type VARCHAR(50),  -- 'property', 'room_type', 'reservation'
external_entity_id VARCHAR(255),
gas_entity_type VARCHAR(50),       -- 'property', 'bookable_unit', 'booking'
gas_entity_id INTEGER,
auto_sync BOOLEAN DEFAULT true,
created_at TIMESTAMP
```

### int_webhooks
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
event_type VARCHAR(100),      -- 'reservation.created', 'availability.updated'
endpoint_url TEXT,
secret_hash VARCHAR(255),
status VARCHAR(20),
last_triggered_at TIMESTAMP,
created_at TIMESTAMP
```

### int_sync_log
```sql
id SERIAL PRIMARY KEY,
source_id INTEGER REFERENCES int_sources(id),
direction VARCHAR(10),        -- 'inbound', 'outbound'
entity_type VARCHAR(50),
entity_id VARCHAR(255),
action VARCHAR(50),           -- 'create', 'update', 'delete', 'map'
status VARCHAR(20),           -- 'success', 'failed', 'pending'
error_message TEXT,
request_data JSONB,
response_data JSONB,
created_at TIMESTAMP
```

---

## Standard Schema (Calry-Compatible)

Using Calry v2 as the standard ensures compatibility with 40+ PMS systems.

### Property
```json
{
  "id": "external-123",
  "name": "Beach House Villa",
  "description": "Beautiful beachfront property...",
  "address": {
    "street": "123 Ocean Drive",
    "city": "Miami",
    "country": "US"
  },
  "thumbnail": "https://...",
  "roomTypes": ["room-1", "room-2"]
}
```

### RoomType
```json
{
  "id": "room-1",
  "propertyId": "external-123",
  "name": "Ocean View Suite",
  "description": "Stunning ocean views...",
  "maxOccupancy": 4,
  "amenities": ["wifi", "ac", "kitchen"]
}
```

### Reservation
```json
{
  "id": "res-456",
  "roomTypeId": "room-1",
  "checkIn": "2025-01-15",
  "checkOut": "2025-01-20",
  "status": "confirmed",
  "source": "airbnb",
  "guest": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@email.com",
    "phone": "+1234567890"
  },
  "adults": 2,
  "children": 0,
  "totalPrice": 1500.00,
  "currency": "USD"
}
```

---

## What This Protects

### GAS Independence
- Any partner/investor integrates via GasSync, not core
- Partner relationship ends → disable adapter → core untouched
- No vendor lock-in ever

### Database Integrity
- Core tables never get CM-specific fields
- `raw_data` JSONB captures anything unusual
- Mapping is separate from data

### Scalability
- New CM? Same endpoints, new source record
- One schema to maintain
- Partners adapt to YOUR standard

### Business Value
- Clean separation for due diligence
- Clear IP ownership
- Platform architecture, not point integrations

---

## Existing Integration Migration

Current Beds24/Smoobu integrations become "internal adapters":

```
Beds24 API → Beds24 Adapter (our code) → GasSync → GAS Core
Smoobu API → Smoobu Adapter (our code) → GasSync → GAS Core
```

Over time, if Beds24/Smoobu support Calry directly, they connect straight to GasSync.

---

## Next Steps

1. **Get Calry v2 full API docs** from partner
2. **Design int_* tables** with exact fields
3. **Build GasSync endpoints** - standardised integration API
4. **Create first adapter** - likely Calry/partner
5. **Retrofit Beds24/Smoobu** as adapters to GasSync
6. **Publish integration docs** - one spec for all partners

---

## Summary

**GasSync = Integration Buffer = Protection Layer**

- All integrations flow through GasSync
- Standardised on Calry-compatible schema
- Core database never touched by external systems
- GAS remains independent, scalable, protected

*"GAS is a facilitator. Data flows in, GAS does its magic, data flows out. Clean, protected, independent."*
