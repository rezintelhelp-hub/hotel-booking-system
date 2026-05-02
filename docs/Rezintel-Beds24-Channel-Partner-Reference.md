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

### Verified live (2026-05-01) — propKey format

| propKey sent | propKey type | Result |
|---|---|---|
| `PK_060b3628-9b91-4d2a-afd7-fc00250a6326` | UUID (V2 format) | ❌ `errorCode 2000` |
| `PK_37997a9f-0dbf-4b64-8286-696154704d63` | UUID | ❌ `errorCode 2000` |
| `PK_5d221b69-b1a2-4537-aaf2-75cebbb7729a` | UUID | ❌ `errorCode 2000` |
| `PK_1424c76d-a52f-40f3-be5f-cb7330921003` | UUID | ❌ `errorCode 2000` |
| `158899` | integer (Atlantis Bryan) | ✅ `bookId: 86164174` |
| `131203` | integer (Atlantis Avocado) | ✅ `bookId: 86164197` |

### Verified live (2026-05-02) — operation matrix

| Operation | V1 result | apiSourceId stamped |
|---|---|---|
| V1 channel-partner **create** new booking (numeric propKey, payload nested as `{authentication:{apiKey,propKey},groupArray:[…]}` POSTed as `json=<urlencoded>`) | ✅ booking created | ✅ `apiSourceId: 70` / `apiSource: "Rezintel"` / `referer: "Rezintel.net"` / `refererEditable: "RezIntel-MyStayMessaging"` / `channel: ""` — confirmed on Bryan (158899), Avocado (131203), Atlantic (251254), Atlas (256220) |
| V1 channel-partner **modify** V2-created booking (e.g. `bookId: 86163183`) | ❌ `errorCode 6001 "no access to bookId"` | n/a — master key can't touch bookings the channel partner didn't create |
| V2 per-account OAuth (existing prod path for Atlantis) | ✅ booking created with full invoice | `apiSourceId: 0 (Direct)`, `apiSource: "Direct"` |

### Correction to 2026-05-01 finding

The 2026-05-01 doc previously claimed V1 channel-partner create stamped
`apiSourceId: 46 (Airbnb)` on Atlantis bookings. **That was wrong** — most
likely caused by a malformed V1 payload (flat `{apiKey,propKey,…}` instead
of the required nested `{authentication:{…}, groupArray:[…]}` shape) and/or
misreading of a Beds24 error response.

2026-05-02 re-verified all four Atlantis test properties with the correct
nested payload, posted as `application/x-www-form-urlencoded` body
`json=<urlencoded JSON>` with Basic Auth `Rezintel:kJjkguy…`. Every property
stamped `Rezintel.net` / `apiSourceId: 70` exactly as expected. No Airbnb
routing observed on any property — `channel` field is empty.

### V1 status code semantics (channel-partner namespace)

| V1 `status` sent | V2 `status` after create | Inventory impact |
|---|---|---|
| `0` | `cancelled` | none (cancelled on creation) |
| `1` | `confirmed` | blocks inventory for the booking dates |
| `2` (in modify call) | `cancelled` | releases inventory |

V1 channel-partner does NOT have a dedicated "request"/"inquiry" state on
this namespace — only confirmed or cancelled. A "ghost" booking for webhook
triggering must therefore choose between:
- `status: 0` create → stamped Rezintel/70 but in cancelled state at creation
- `status: 1` create followed by `status: 2` modify → stamped Rezintel/70,
  briefly blocks inventory (~1s), fires both create+cancel webhook events

---

## 3. Beds24 channel-mapping — apiSourceId outcomes

V1 channel-partner `setBooking` calls under the `rezintel.net` namespace
stamp `apiSourceId: 70` / `apiSource: "Rezintel"` / `referer: "Rezintel.net"`
on Atlantis properties. These are the values Pedro's Hostvana ingest webhook
filter expects.

This **matches the April 4 commit message** (`9787108`). It does NOT match
the (now-corrected) 2026-05-01 doc claim that Atlantis stamped Airbnb — that
finding was the result of a malformed V1 payload. See "Correction" note in
section 2 above.

### Observed 2026-05-02 (Atlantis Bryan, Avocado, Atlantic, Atlas)

```
After V1 channel-partner setBooking with status: 1 succeeds:
  status: "confirmed"
  apiSource: "Rezintel"
  apiSourceId: 70
  referer: "Rezintel.net"
  refererEditable: "RezIntel-MyStayMessaging"
  channel: ""             (empty — no channel routing)
```

### Open questions for Pedro

1. Does his Hostvana inbound webhook filter on `apiSourceId: 70` only, or
   also require a specific `apiSource` string match?
2. Does Hostvana ingest only the `BOOKING_CREATED` event, or also `BOOKING_CANCELLED`
   / `BOOKING_MODIFIED`? (Decides ghost-write strategy — see section 6.)

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

### Conclusion (as of 2026-05-02 evening — paused, awaiting Pedro)

V1 channel-partner setBooking on Atlantis properties **does** stamp
`apiSourceId: 70` / `referer: "Rezintel.net"` — exactly what Pedro's
Hostvana webhook filter expects. The 2026-05-01 doc was wrong about this.

The dual-write/ghost strategy was discarded — a cancelled ghost gives
Hostvana's AI a dead booking record with the wrong `bookId` and no real
guest to converse about. AI breaks immediately.

#### Why we need V1 at all

The fundamental problem: V2 OAuth bookings stamp `apiSourceId: 0 (Direct)`
because that's what Pedro's own API integration looks like to Beds24. Only
V1 channel-partner bookings stamp Rezintel/70, because that endpoint *is*
the Rezintel channel partner. Beds24's webhook routing is by channel
identity, and Pedro's Hostvana webhook is filtered on the Rezintel channel.

#### Three real options (in order of who does the work)

| # | Path | Who changes | Needs V1 in code? |
|---|---|---|---|
| 1 | Pedro widens his Beds24 webhook to fire on Direct (or all channels), not just Rezintel | Pedro (Beds24 config — ~30s if Beds24 allows multi-channel webhook filters) | No — current V2 OAuth path keeps working |
| 2 | Pedro provides Hostvana's ingest URL + auth + payload schema; GAS POSTs directly to Hostvana, bypassing Beds24 webhook routing | Pedro + GAS | No — pure HTTP call from GAS |
| 3a | V1+V2 hybrid in `/api/public/book` — when `accounts.hostvana_connected=true`, V1 master key creates the booking, V2 OAuth POST adds invoiceItems to the V1-created booking | GAS only | Yes — V1 is what stamps Rezintel/70 |
| 3b | Migrate Pedro from `adapter_code='beds24'` to `adapter_code='beds24-marketplace'`. All bookings then write through V1 channel-partner naturally; stamp comes for free; no `hostvana_connected` branch | GAS + Pedro re-syncs | V1 only (which is what marketplace adapter uses anyway) |

3a is the workaround. 3b is the architecturally clean equivalent.

#### Hybrid (3a) verified end-to-end on 2026-05-02

Single booking, full Beds24 invoice detail, Rezintel webhook stamp:

```
1. POST api.beds24.com/rezintel.net/setBooking
   {authentication:{apiKey,propKey:"158899"}, groupArray:[{roomId:350260, status:1, ...}]}
   → bookId: 86183582
   → status: confirmed, referer: "Rezintel.net", apiSourceId: 70

2. POST beds24.com/api/v2/bookings  (Pedro's V2 OAuth token)
   [{id: 86183582, invoiceItems: [
     {description:"Accommodation", qty:1, amount:160},
     {description:"Cleaning fee", qty:1, amount:25},
     {description:"City tax", qty:2, amount:7.5},
     {type:"payment", description:"Payment via Stripe", amount:200}
   ]}]
   → HTTP 201, all 4 items inserted with real Beds24 invoiceItem IDs

3. V2 GET → confirms 4 items present + Rezintel/70 stamp preserved
```

Key V2 quirk: it's `POST /api/v2/bookings`, not PATCH. PATCH returns HTTP 500.

Cancellation path (V2 OAuth cancelling a V1-created booking) was NOT tested
yet — flagged as the only remaining verification needed before shipping 3a.

#### Migration de-risk approach for 3b — parallel connection (chosen)

Don't replace Pedro's connection in place. Stand up a SECOND
`gas_sync_connections` row alongside the existing OAuth one:

- `account_id = 86` (same)
- `adapter_code = 'beds24-marketplace'` (new — uses master key)
- `status = 'shadow'` or similar — not the active connection for booking writes
- Sync runs against this row populate parallel/staging tables OR into a
  filtered namespace so it doesn't collide with the live OAuth-fed data

Then compare the two setups side-by-side in the GAS admin UI:
- Property list parity (same 40 properties? same names/addresses/IDs?)
- Room list parity (same rooms per property? same prices/configs?)
- Calendar parity (same blocks, same availability windows?)
- Content parity (descriptions, images, amenities, rates)
- Booking-write parity (test create on shadow, see what stamps + invoiceItems behave)

When we're satisfied the marketplace setup matches reality, flip Pedro's
active connection over. Until then, the OAuth row stays primary and Pedro
loses nothing.

Schema/code prerequisites to figure out when we resume:
- Does `gas_sync_connections` have a unique constraint on `account_id`? If
  yes, we need a `is_primary` flag or similar to permit two rows
- Which sync code paths look up by `account_id` vs by `connection_id`?
  Anything that picks "the" connection for an account needs to skip shadow
  rows
- Does the marketplace adapter today run against the same property/room/rate
  tables, or has it been writing to anything different on Villa Lounge?

Marketplace adapter is currently only used by Villa Lounge (account 238) so
it'll get battle-tested in this exercise — making EasyLandlord (account 230,
planned for marketplace) safer to launch later.

#### Pending — to resume later

1. **Wait for Pedro's response** on options 1 and 2 (the zero-code-on-our-side
   options). Send him this question:
   > Why is your Beds24 → Hostvana webhook filtered specifically on the
   > Rezintel channel? Two questions:
   > (a) Can you widen it to also fire on Direct bookings — that's how the
   >     GAS widget sends them in via your V2 API integration?
   > (b) Failing that, can you give us your Hostvana ingest URL + auth scheme
   >     so GAS can POST directly to Hostvana, bypassing the Beds24 webhook?
   > If neither works, we ship a verified V1+V2 hybrid on our side — you
   > change nothing.

2. If Pedro says "ship the hybrid," verify cancellation path (V2 OAuth
   cancelling a V1-created booking) before merging.

3. If you decide to do the marketplace migration (3b) instead of the hybrid:
   - Run the lite-diff script first
   - Then flip `gas_sync_connections.adapter_code` to `beds24-marketplace`
   - Re-sync via V1 path

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
