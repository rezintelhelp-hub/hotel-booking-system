# GAS Sync Development Summary
## December 18, 2025

---

## Overview

Today's session focused on debugging and completing the Beds24 webhook integration for real-time availability synchronization. The key achievement was getting live webhooks working from Beds24 to GAS, enabling instant availability updates when bookings are created or cancelled.

---

## Key Accomplishments

### 1. beds24_room_id Migration Fix

**Problem:** The `beds24_room_id` column in the `bookable_units` table was INTEGER type, but the code was trying to cast values to VARCHAR, causing room lookups to fail.

**Solution:** Updated three locations in the code:
- `fix-room-ids` endpoint: Cast `external_id::integer`
- `link-to-gas` INSERT: Use `parseInt(room.external_id)`
- `link-to-gas` UPDATE: Use `parseInt(room.external_id)`

**Result:** All 9 Boston Lodge rooms now have `beds24_room_id` populated:
- Room IDs: 401-409
- Beds24 Room IDs: 10919, 10921-10925, 474977, 474979, 474981

### 2. Webhook Endpoint Testing & Validation

**Endpoint:** `POST /api/webhooks/beds24?connectionId={id}`

**Manual Testing Results:**
```bash
# Create booking - blocks dates
curl -X POST "https://www.gas.travel/api/webhooks/beds24?connectionId=10" \
  -H "Content-Type: application/json" \
  -d '{"roomId": 10919, "arrival": "2025-12-30", "departure": "2025-12-31", "status": "confirmed"}'
# Result: Dec 30 blocked, source: beds24_webhook

# Cancel booking - unblocks dates  
curl -X POST "https://www.gas.travel/api/webhooks/beds24?connectionId=10" \
  -d '{"roomId": 10919, "arrival": "2025-12-30", "departure": "2025-12-31", "status": "cancelled"}'
# Result: Dec 30 available, source: beds24_webhook_cancel
```

### 3. Beds24 Webhook Configuration

**Webhook URL Format:**
```
https://www.gas.travel/api/webhooks/beds24?connectionId=10
```

**Beds24 Setup Path:**
Settings → Properties → Access → Booking Webhook → Version 2

**Key Settings:**
- Version: 2 (includes personal data)
- URL: Must include `connectionId` parameter

### 4. Live Webhook Test - SUCCESS ✅

Real booking created in Beds24 triggered webhook successfully:
```
Query: {"connectionId":"10"}
Webhook parsed - event: unknown, bookingId: 79731945, roomId: 10919, status: confirmed
Found our room 401, arrival: 2025-12-30, departure: 2025-12-31, cancelled: false
✅ Webhook processed: BLOCKED room 401 from 2025-12-30 to 2025-12-31
```

### 5. Wizard v7 - Webhook Setup Step Added

Updated the Beds24 setup wizard to include a new Step 4 for webhook configuration:

**New 5-Step Flow:**
1. Login/Register
2. V2 Invite Code
3. V1 API Key + PropKeys
4. **NEW: Webhook Setup** - Shows URL with copy button, instructions, property list
5. Success

---

## Technical Details

### Database Schema - Key Tables

```sql
-- Room mapping
bookable_units.beds24_room_id (INTEGER) -- Maps to Beds24 roomId

-- Availability tracking  
room_availability (
  room_id,
  date,
  is_available,
  source,  -- 'beds24', 'beds24_webhook', 'beds24_webhook_cancel'
  cm_price,
  ...
)

-- Connections
gas_sync_connections (
  id,
  channel_manager,  -- 'beds24'
  account_id,
  credentials,  -- JSON with api_key, prop_key, v2_token
  ...
)
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/beds24` | POST | Receive Beds24 booking webhooks |
| `/api/gas-sync/connections/:id/sync-availability` | POST | Manual sync prices + availability |
| `/api/gas-sync/connections/:id/fix-room-ids` | POST | Migrate beds24_room_id values |
| `/api/availability/:roomId` | GET | Check synced availability |

### Beds24 Webhook Payload Structure

```json
{
  "timeStamp": "2025-12-18T16:11:22Z",
  "booking": {
    "id": 79731945,
    "propertyId": 4790,
    "roomId": 10919,
    "status": "confirmed",  // or "cancelled"
    "arrival": "2025-12-30",
    "departure": "2025-12-31",
    "firstName": "Steve",
    "lastName": "Test",
    ...
  }
}
```

### Beds24 Pricing Models

| Model | Properties | Sync Endpoint | Notes |
|-------|------------|---------------|-------|
| Daily Prices | Lehmann | `/inventory/rooms/calendar` | Price per date, up to 16 price levels |
| Fixed Prices | Boston Lodge | `/fixedPrices` | Base rates only |

---

## Sync Strategy (Agreed)

| Sync Type | Trigger | Frequency | Date Range | Endpoint |
|-----------|---------|-----------|------------|----------|
| Bulk Data (images, rooms) | Manual | Initial + on-demand | N/A | V1 images, V2 properties |
| Initial Setup (prices + avail) | Manual | One-time | 18 months | calendar/fixedPrices + availability |
| Availability | Webhook + scheduled | Real-time + every 2 days | 18 months | Webhook + availability |
| Pricing - Long term (30+ days) | Scheduled | Once per day | 18 months | calendar/fixedPrices |
| Pricing - Short term (next 30 days) | Scheduled | Every 15 mins | 30 days | calendar/fixedPrices |
| Booking check | On booking | Real-time | Booking dates | offers endpoint |

---

## Connection Details

### Boston Lodge (Test Property)
- **Connection ID:** 10
- **Channel Manager:** Beds24
- **Account ID:** 66
- **Property ID:** 102
- **Beds24 Property ID:** 4790
- **Rooms:** 9 (IDs 401-409)
- **Pricing Model:** Fixed Prices
- **Webhook:** ✅ Configured and working

---

## Files Modified/Created

1. **server.js** - Integer type fixes for beds24_room_id
2. **beds24-wizard.html** (v7) - Added webhook setup step

---

## Pending Items

1. ~~Update webhook URL in Beds24~~ ✅ DONE
2. ~~Test with real booking~~ ✅ DONE
3. Build scheduled sync jobs:
   - Daily long-term pricing sync
   - 15-min short-term pricing sync
   - 2-day availability backup sync
4. Implement real-time booking check using offers endpoint
5. Extend availability sync to 18 months (currently 90 days)
6. Test cancellation webhook (may need to verify Beds24 sends these)

---

## Useful Commands

```bash
# Check availability for a room
curl "https://www.gas.travel/api/availability/401?from=2025-12-29&to=2025-12-31"

# Manual sync availability
curl -X POST "https://www.gas.travel/api/gas-sync/connections/10/sync-availability"

# Fix room ID mappings
curl -X POST "https://www.gas.travel/api/gas-sync/connections/10/fix-room-ids"

# Test webhook manually
curl -X POST "https://www.gas.travel/api/webhooks/beds24?connectionId=10" \
  -H "Content-Type: application/json" \
  -d '{"roomId": 10919, "arrival": "2025-12-30", "departure": "2025-12-31", "status": "confirmed"}'
```

---

## Notes

- Beds24 uses `roomId` in webhooks which maps to `beds24_room_id` in our database
- The `[PROPERTYID]` template variable in webhook URL is auto-filled by Beds24 when webhook fires
- Version 2 webhooks include personal guest data; Version 1 does not
- Webhook fires on booking create/modify; cancellation webhook behavior needs verification
