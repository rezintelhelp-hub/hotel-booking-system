# Rezintel ↔ Beds24 Channel Partner — Reference

Compiled 2026-05-01. **Source of truth for how Pedro's old Rezintel booking
system authenticated with Beds24, what propKey format the V1 channel-partner
endpoint requires, and the mapping between old and new infrastructure.**

The old server (app3 — `139.162.234.112`) will eventually be decommissioned.
This document captures everything we extracted from it before that happens.

---

## ⚠️ IP / ownership

**The connectivity layer documented here is Steve Driver / Rezintel IP** —
the Beds24 channel-partnership credentials, the V1 `rezintel.net/*` endpoint
patterns, the auth scheme, the integration architecture, the property-keying
conventions, and the GAS bridge code that consumes them. Captured here so it
survives the old-server decommissioning.

**The core SetSeed CMS software is NOT included and will not be reproduced.**
The PHP application source on the old server (`/var/www/html/app/classes/`,
`/var/www/html/app/functions/`, the Smarty templating layer, the SetSeed
admin UI, the database schemas owned by the SetSeed Hub) belongs to SetSeed
Limited (the original CMS vendor) and is out of scope for this repo. The
ionCube-encrypted PHP source is intentionally untouched.

This document only references SetSeed paths/files where they are the
**location of Rezintel-owned code or configuration** (e.g. the
`function.beds24.php` plugin Steve wrote that lives inside the SetSeed
plugin folder, or the per-site `propkey` values stored in the SetSeed DB
schema). Nothing in this document constitutes copying SetSeed's
proprietary code.

---

## TL;DR

The Beds24 V1 **channel-partner endpoint** (`api.beds24.com/rezintel.net/setBooking`)
is what stamps `apiSourceId` and triggers Pedro's outbound webhooks (Hostvana etc.).
It authenticates with **Pedro's Rezintel master credentials** and accepts a
**numeric `propKey`** (the integer Beds24 property ID), NOT the V2 UUID
`PK_<xxx>` we store in `gas_sync_properties.prop_key`.

GAS supports this via `createBeds24BookingV1()` and `getBeds24PropKeyForRoom()`
in `server.js`. The fallback gate `accountHasBeds24Marketplace()` previously
blocked per-account-OAuth accounts (e.g. Atlantis Realty) from the V1 path,
but those accounts ARE enrolled at Beds24's side as Rezintel partners — the
gate is too restrictive.

---

## 1. Old Rezintel system: server / paths / credentials

| Item | Value |
|---|---|
| **Server** | `139.162.234.112` (Linode/Akamai, "app3") |
| **SSH** | `ssh -i ~/.ssh/id_ed25519 root@139.162.234.112` |
| **App config** | `/var/www/html/app/configuration.php` |
| **Beds24 plugin** | `/var/www/html/libraries/Smarty/custom_plugins/function.beds24.php` |
| **Per-client site folder** | `/var/www/html/sites/{slug}{invisible_key}/` |
| **MySQL master** | `mysql -u setseed_master -p'hrDpymeXhGjcBgvT8GTZ' setseed_master` |
| **Atlantis booking site** | `/var/www/html/sites/bookingatlantisrealtyrentalshk43zwhpy2c/` |
| **Atlantis www site** | `/var/www/html/sites/wwwatlantisrealtyrentalsr5e3bsggfrq/` |
| **Atlantis booking DB** | `setseed_bookingatlantisrealtyrentalshk43zwhpy2c` |
| **Atlantis www DB** | `setseed_wwwatlantisrealtyrentalsr5e3bsggfrq` |

App PHP source files are **ionCube-encrypted** — only the Beds24 plugin source
is readable directly. Database schemas are queryable via MySQL.

---

## 2. Beds24 V1 channel-partner endpoint — auth + propKey format

From `function.beds24.php` line 239-264 (the `beds24curl()` helper):

```php
function beds24curl ($host,$data) {
  $ch = curl_init("".$host);
  curl_setopt($ch, CURLOPT_USERPWD,  "Rezintel:kJjkguyGYUuyggtRDhkTU663g6Fyfy");
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, "json=".urlencode($data));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
  // ... POST to https://api.beds24.com/rezintel.net/<action>
}
```

| Credential | Value |
|---|---|
| **Basic Auth username** | `Rezintel` |
| **Basic Auth password** | `kJjkguyGYUuyggtRDhkTU663g6Fyfy` |
| **apiKey** (in JSON body) | `Rezintel_jd6zZzL8GaCqLm8HXhKkWqJl6TvBsSeiUh` |

These three are the only ingredients required for any `rezintel.net/*` call.

### Endpoints in active use

From the old plugin source — all `https://api.beds24.com/rezintel.net/<x>`:

| Endpoint | Purpose |
|---|---|
| `setBooking` | Create new booking OR modify existing (via `bookId`) |
| `createStripeSession` | Stripe Checkout via Beds24 |
| `getCalendar` | Read availability calendar |
| `getRoomDates` | Detailed room availability |
| `getDailyPriceSetup` | Daily prices |
| `getPropertyContent` | Property + room content |
| `getAccounts` | Account list (when called without propKey) |
| `getAvailabilities` | Real-time availability + pricing |

### setBooking payload format

```php
$data = json_encode(array(
  'authentication' => array(
    'apiKey' => $apikey,                     // Rezintel_...
    'propKey' => $params['cookies']['propkey_1']  // INTEGER property ID
  ),
  "groupArray" => $booking
));
$response = json_decode(beds24curl(
  "https://api.beds24.com/rezintel.net/setBooking", $data
));
// $response[0]->bookId = the new Beds24 booking ID
```

### propKey format — THE BUG

The `propKey` here is **always an integer** — the Beds24 property ID
(e.g. `44429`, `104809`, `108750`, `110504`, `158899`, `131203`).

Sample data from the Atlantis booking-site DB:

```sql
INSERT INTO `page_child_data_values` VALUES ('750852', '19274', 'propkey', '44429');
INSERT INTO `page_child_data_values` VALUES ('751039', '19279', 'propkey', '104809');
INSERT INTO `page_child_data_values` VALUES ('751094', '19281', 'propkey', '108750');
INSERT INTO `page_child_data_values` VALUES ('751149', '19283', 'propkey', '110504');
```

GAS-side equivalent: `properties.beds24_property_id` (or
`gas_sync_properties.external_id`). NOT `gas_sync_properties.prop_key` —
that column stores the UUID `PK_<xxx>` format used by Beds24 V2 API and
is **rejected** by the V1 channel-partner endpoint with
`errorCode 2000 "no access to property"`.

### Verified live (2026-05-01)

| propKey sent | propKey type | Result |
|---|---|---|
| `PK_060b3628-9b91-4d2a-afd7-fc00250a6326` | UUID (V2 format) | ❌ `errorCode 2000` |
| `PK_37997a9f-0dbf-4b64-8286-696154704d63` | UUID | ❌ `errorCode 2000` |
| `PK_5d221b69-b1a2-4537-aaf2-75cebbb7729a` | UUID | ❌ `errorCode 2000` |
| `PK_1424c76d-a52f-40f3-be5f-cb7330921003` | UUID | ❌ `errorCode 2000` |
| `158899` | integer (Atlantis Bryan) | ✅ `bookId: 86164174` |
| `131203` | integer (Atlantis Avocado) | ✅ `bookId: 86164197` |

---

## 3. Beds24 channel-mapping — apiSourceId outcomes

The `apiSourceId` and `apiSource` fields stamped on a booking are determined
by **Beds24's per-property primary channel mapping**, not by what we send.
Even with explicit `apiSourceId: 70`, `apiSource: "Rezintel"`, and
`referer: "RezIntel-MyStayMessaging"` in the V1 payload, Beds24 ignores them
and stamps the property's mapped channel.

### Observed today (Atlantis Bryan + Avocado)

```
After V1 channel-partner setBooking succeeds:
  status: "confirmed"     (auto-confirmed, even when status: 0/inquiry sent)
  apiSource: "Airbnb"
  apiSourceId: 46
  referer: "Airbnb"
  refererEditable: "Airbnb"
```

**This contradicts the April 4 commit message** (`9787108`) which claimed
`apiSourceId: 70` would result. Likely explanations:
- The April 4 fix was verified on a property that was Beds24-mapped to
  Rezintel as primary channel at the time; Pedro has since re-mapped
  Atlantis properties to Airbnb.
- Or the commit was speculative — never end-to-end-verified that
  `apiSourceId: 70` actually appeared on Atlantis bookings.

### What this means for Hostvana

If Pedro's Hostvana inbound webhook is configured to fire on
`apiSourceId: 70` (Rezintel channel partner) only, **it will not fire on
Atlantis bookings today** — they stamp as Airbnb regardless of how we
push them.

Open question for Pedro:
1. What apiSource/apiSourceId does his Hostvana ingest filter on?
2. Are Atlantis properties intentionally mapped to Airbnb at Beds24, or
   should they be mapped to Rezintel/Direct?

---

## 4. GAS-side mapping (current)

| Concept | Old (Rezintel SetSeed) | New (GAS) |
|---|---|---|
| Property identifier (V1) | integer cookie `propkey_N` | `properties.beds24_property_id` (integer) |
| Property identifier (V2) | n/a | `gas_sync_properties.prop_key` (UUID `PK_<xxx>`) |
| Master apiKey | hardcoded `Rezintel_jd6zZz...` | `BEDS24_MASTER_API_KEY` env var |
| Basic Auth user/pass | hardcoded `Rezintel:kJjkguy...` | `BEDS24_MARKETPLACE_USER` / `BEDS24_MARKETPLACE_PASS` env |
| V1 channel-partner endpoint | `rezintel.net/setBooking` | same — wrapped by `createBeds24BookingV1()` |
| V2 per-account OAuth | n/a | `gas_sync_connections.access_token` |

### GAS adapter types in use

| `adapter_code` | What it means | Live accounts |
|---|---|---|
| `beds24` | Per-account OAuth, V2 calls use account's own token | 41+ accounts (Atlantis, Vo Rental, Hotel Balduin, Cotswolds, San Sebastian, Lehmann, rent4natu, all Hebden Bridge, etc.) |
| `beds24-marketplace` | GAS calls use Pedro's master credentials (V1 + V2 both via marketplace identity) | 1 (Villa Lounge — account 238) |

**Critical distinction from Beds24-side enrolment:**
The GAS adapter type is independent of whether Pedro has the property
enrolled in his Rezintel partner property list at Beds24. Atlantis is on
`beds24` (per-account OAuth) in GAS but **IS enrolled** with Pedro's
Rezintel marketplace at Beds24's side — confirmed by V1 setBooking
succeeding when called with the correct (numeric) propKey.

The `accountHasBeds24Marketplace(roomId)` gate in `server.js` only
checks `adapter_code='beds24-marketplace'`, so it returns `false` for
Atlantis even though Pedro CAN actually push V1 calls for it. That gate
is too restrictive — fix it by adding a separate flag (e.g.
`accounts.beds24_rezintel_partner BOOLEAN`) or by trying V1 and
gracefully handling errorCode 2000 when it fails.

---

## 5. Atlantis Realty (account 86) reference data

| Field | Value |
|---|---|
| Account ID | 86 |
| Owner | Pedro · pedro@atlantisrealty.rentals |
| Currency | GBP |
| Site | https://atlantisrealty.rentals/ |
| GAS adapter | `beds24` (per-account OAuth) |
| Beds24 V2 token | stored in `gas_sync_connections.access_token` (172 chars) |
| Beds24-side Rezintel enrolment | ✅ confirmed (V1 setBooking succeeds with numeric propKey) |
| Hostvana flag (`accounts.hostvana_connected`) | `false` (as of 2026-05-01 — needs flipping for tests) |
| Stripe configured | ❌ none at any layer |
| Authorize.net | planned, blocked on Pedro's sandbox creds |

### Atlantis property → Beds24 propId mapping (samples)

| GAS property | Beds24 propId (numeric — use as V1 propKey) | gas_sync_properties.prop_key (UUID — V2 only) |
|---|---|---|
| 128 Atlantic | 251254 | PK_37997a9f-0dbf-4b64-8286-696154704d63 |
| 129 Atlas | 256220 | PK_5d221b69-b1a2-4537-aaf2-75cebbb7729a |
| 130 Avocado | 131203 | PK_060b3628-9b91-4d2a-afd7-fc00250a6326 |
| (Bryan) | 158899 | PK_1424c76d-a52f-40f3-be5f-cb7330921003 |

40 properties total under account 86 — these four were verified on the V1 path today.

---

## 6. Hostvana integration — current state

| Layer | What's there |
|---|---|
| DB columns | `accounts.hostvana_api_key VARCHAR`, `accounts.hostvana_connected BOOLEAN DEFAULT false` |
| Server endpoints | `POST /api/partner/hostvana/connect` (saves key, sets connected=true), `GET /api/partner/hostvana/status`, `POST /api/admin/hostvana/activate|deactivate|update-settings` |
| Public proxy | `POST /api/hostvana/chat` (server.js:89487) — actions: createBooking, sendMessage, getMessages |
| Booking-creation hook (V1 stamp) | `stampBookingForHostvanaWebhook(bookingId)` helper — fires V1 `rezintel.net/setBooking` modify call to trigger Beds24 webhook |
| One-off admin endpoint | `POST /api/admin/hostvana/stamp/:bookingId` (X-API-Key gated) — manual webhook trigger for retroactive bookings |
| WP plugin | `gas-hostvana` v1.1.0 — chat widget UI + AJAX proxy, license key field |
| Referer stamping | `01b9d47` (2026-04-30): when `hostvana_connected=true`, set referer/refererEditable to `'RezIntel-MyStayMessaging'` instead of `'GAS Direct - GAS-N'` |

### Webhook-firing path
1. Booking is created in Beds24 via V1 channel-partner endpoint (correct numeric propKey)
2. Beds24 fires the configured outbound webhook based on the booking's `apiSourceId`/`apiSource` after channel-routing
3. **Currently UNCONFIRMED whether this fires Hostvana for Atlantis** — Beds24 stamps Airbnb (apiSourceId 46), and Pedro's Hostvana filter config is unverified

### Decisions still pending

1. **Pedro:** what does his Hostvana ingest filter on? apiSourceId 70? Specific apiSource string? Anything tagged Rezintel?
2. **Pedro:** can/should Atlantis properties be re-mapped at Beds24 from Airbnb-as-primary to Rezintel/Direct?
3. **Steve:** new flag `accounts.beds24_rezintel_partner BOOLEAN` to loosen the V1-fallback gate, vs. always-try-V1-and-tolerate-2000?
4. **Architecture:** if Beds24 webhook routing can't be made reliable, fall back to Option 3 — GAS POSTs directly to Hostvana's ingest URL (still requires Pedro's URL + auth scheme).

---

## 7. Code locations (for grep)

```
server.js
  41144  getBeds24BookingHeaders()           V2 header builder
  41177  getBeds24PropKeyForRoom()           Returns numeric beds24_property_id
  41211  accountHasBeds24Marketplace()       V1 fallback gate (currently too restrictive)
  41232  createBeds24BookingV1()             V1 setBooking new-booking call
  41274  toV1BookingFields()                 V2 → V1 field name conversion
  88452  /api/test/beds24-v1-booking         Isolated test endpoint
  88500  stampBookingForHostvanaWebhook()    V1 modify call for webhook trigger
  88565  /api/admin/hostvana/stamp/:bookingId  Manual stamp trigger

plugins/gas-hostvana/gas-hostvana.php       WP plugin (chat widget + ajax proxy)
```

---

## 8. Verification commands (when needed)

### Test V1 channel-partner from local with verified credentials

```bash
curl -sL "https://api.beds24.com/rezintel.net/setBooking" \
  -u "Rezintel:kJjkguyGYUuyggtRDhkTU663g6Fyfy" \
  -d "json=$(node -e 'console.log(encodeURIComponent(JSON.stringify({
    authentication: {
      apiKey: "Rezintel_jd6zZzL8GaCqLm8HXhKkWqJl6TvBsSeiUh",
      propKey: "131203"  // INTEGER beds24_property_id, NOT UUID
    },
    groupArray: [{
      roomId: 293160, status: 0, numAdult: 1,
      firstNight: "2028-09-15", lastNight: "2028-09-16",
      guestFirstName: "TEST", guestName: "VerifyV1",
      guestEmail: "test@gas.travel",
      notes: "TEST AUTO-CANCEL"
    }]
  })))')"
```

Success → `[{"success":"new booking created","bookId":<id>}]`.
Cancel via V2 immediately:

```bash
curl -X POST "https://beds24.com/api/v2/bookings" \
  -H "Content-Type: application/json" \
  -H "token: <V2_TOKEN_FROM_gas_sync_connections>" \
  -d '[{"id": <bookId>, "status": "cancelled"}]'
```

### Find numeric propKey for any GAS room

```sql
SELECT p.beds24_property_id
FROM bookable_units bu
JOIN properties p ON bu.property_id = p.id
WHERE bu.id = <gas_room_id>;
```

NOT `gas_sync_properties.prop_key` — that's the UUID format for V2 only.
