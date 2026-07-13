# Channex + Airbnb Sync Architecture

Last major overhaul: **Steve / Barbara / Charles House Windsor — 2026-07-12**

This doc captures the full picture of how GAS syncs bookings + availability with Channex (which in turn syncs to Airbnb, BDC, VRBO, etc), the failure modes we've hit in production, and the recovery tools shipped for operators.

---

## The three sync paths (belt + braces + emergency)

### 1. Webhook — fast path (`db803c77`)

**Route:** `POST /api/webhooks/channex`

Channex sends notifications when reservations arrive on OTAs. We ACK with `200 OK` immediately (per Channex spec so they don't retry), then process asynchronously via `processChannexBookingNotification()`.

**Failure mode:** the async processor has multiple silent-skip paths (missing property mapping, missing room mapping, no API key, etc). Rows lost this way have historically only surfaced when the operator noticed missing bookings days later. Skip reasons now enumerated:

| Reason | Cause |
|---|---|
| `missing_property_or_booking_id` | Payload missing required fields |
| `no_connection_mapping` | Channex property_id not in `gas_sync_properties` |
| `no_gas_property_mapping` | Row exists but `gas_property_id` is NULL (self-heals — see below) |
| `no_api_key` | Connection creds missing apiKey + no `CHANNEX_API_KEY` env |
| `fetch_failed` | `adapter.getReservation()` returned !success (bad ID, deleted booking) |
| `no_room_type_mapping` | `room_type_id` not in `gas_sync_room_types` |

**Self-heal (`f3f20c79`):** When `gas_property_id` is NULL, fallback to any bookable_unit on the connection (Barbara had TWO Channex properties, one unmapped). Also `UPDATE`s the empty row so future webhooks take the fast path.

### 2. Poller — safety net (`<this commit>`)

**Cron:** every 5 min, 2 min after boot.

Iterates every active Channex connection and calls `processChannexBookingNotification()` for every reservation in the last 30 days → next 180 days. Idempotent via `ON CONFLICT (channex_booking_id) DO UPDATE`. When new bookings land, immediately runs `runAvailabilityHealForProperty()` for their property so Channex availability catches up in the same tick.

This is the answer to "the webhook silently failed and we lost Ulrich Tiedemann". The poller closes the gap within ≤5 min.

### 3. Manual pull — emergency (`4fdd6359`)

**Endpoint:** `POST /api/admin/channex/:connectionId/pull-single-booking`

**UI:** Sync Connections → Channex modal → 🎯 Pull ONE by Channex booking ID.

Operator pastes a specific Channex booking UUID (not the ABB-prefixed reservation code — the internal UUID from Channex's "Booking ID" field). Returns immediate diagnostic:

- Green: `Landed as GAS-XXXX Guest Name (arrival → departure)`
- Red: exact skip reason with room_type_id / error text

Also **Fetch last 30 days** button (`db803c77`): bulk version with per-booking breakdown grouped by skip reason.

---

## The heal — availability reconciliation

### Force Reconcile (`16347ae4`, refined in `d623ff56` + `31df0fb8`)

**Endpoint:** `POST /api/admin/properties/:id/force-reconcile-channex`

**UI:** Property modal → 🔄 OTA sync diagnostic → Force reconcile now.

For each Channex-mapped room in the property, for every date in a 90-day window from today:

```
count = isBlocked ? 0 : max(quantity − consumed_by_bookings, 0)
```

Where:
- `isBlocked` = `room_availability.is_blocked = true` OR the date is a property-cutoff-blocked day
- `consumed_by_bookings` = active `bookings` rows (excluding cancelled/declined/expired), expanded per night with `CROSS JOIN generate_series(arrival, departure - 1 day, '1 day')`

**Critical:** subtracting `consumed` is what prevents double-bookings. Before `d623ff56` the heal pushed `count=qty` for any date GAS thought was "open", which OVERRODE Channex's own OTA-booking decrement. Ulrich Tiedemann's Sept 6-7 was at risk of double-booking through Airbnb because of this.

Also pushes `stop_sell=false, closed_to_arrival=false, closed_to_departure=false` on the first 45 days as a **restriction clear** — cleans up stale restrictions from the old broken restriction pushes (`56511cdb`).

### Backfill heal — 6-hourly cron

Same function, iterates every Channex-connected property. Runs 3 min after boot + every 6h. Belt-and-braces for anything the webhook + 5-min poller missed.

---

## The old bugs and their fixes

### Silent `stop_sell` / `closed_to_arrival` failures (`56511cdb`)

Channex adapter comment (`channex-adapter.js:554-557`):
> Channex requires `property_id` in each value... Without it the API returns 2xx but silently applies nothing — the rate plan default shows on read instead.

Same behaviour with **null `rate_plan_id`**. Our old restriction pushes with null rate_plan_id returned `200 OK`, marked `succeeded` in our outbox, but never actually blocked anything on B.com / Airbnb. Barbara's manual blocks and my Phase 3 cutoff pushes both hit this trap.

**Fix:** switched cutoff + manual block paths to `/availability` with `count=0` (uses room_type_id, no rate plan needed, universally honoured).

### Availability heal ignored bookings (`d623ff56`)

Before this fix, the heal only looked at `room_availability.is_blocked`. If a booking existed but wasn't blocked in GAS (or was missing entirely because the webhook dropped it), the heal pushed `count=qty` and re-opened the room. Double-booking window.

**Fix:** subtract consumed count from active bookings when computing push count.

### Availability heal ignored property cutoffs (`31df0fb8`)

Cutoffs (`min_advance_hours`, `same_day_cutoff_time`) live in property config, not `room_availability`. The heal was overwriting cutoff blocks with `count=qty`. Barbara's 24h cutoff wasn't sticking.

**Fix:** call `computeCutoffBlockedDates()` in the heal, OR it into the blocked map so cutoff dates stay at `count=0`.

### `gas_property_id = NULL` mapping (`f3f20c79`)

Charles House had TWO Channex properties on Barbara's connection. One was mapped, one wasn't. Ulrich's booking came through the unmapped one → webhook rejected with `no_gas_property_mapping`.

**Fix:** fallback derives GAS property from any mapped room on the connection. Self-heals the empty row so subsequent webhooks take the fast path.

### Field-name bug in card-capture link (`49114aa8`)

`verifyGuestToken` / `peekGuestToken` return `.purpose`, `.guestId`, `.bookingId` — not `.p`, `.g`, `.b` (which are the internal payload short keys). My check was reading the wrong fields → every valid token rejected as "Invalid link".

### Card capture URL used `req.protocol` (`8189ffbf`)

Railway's HTTPS proxy — `req.protocol` returns `http` when Express `trust proxy` isn't set. Emailed link was `http://...`, browsers dropped the `#token` fragment on the http→https redirect, guest landed on the page with no token.

**Fix:** use `process.env.GAS_API_BASE_URL || 'https://admin.gas.travel'`.

---

## Field mappings — Airbnb via Channex

Airbnb reservation payloads land inside Channex's `attrs.raw_message` as a JSON string:

```json
{
  "action": "reservation_acceptance_confirmation",
  "reservation": {
    "guest_phone_numbers": ["4915175052663"],
    "check_in_datetime": "2026-09-06T15:00+01:00[Europe/London]",
    "thread_id": "2594822953",
    "base_price": "88.00",
    "payout_amount_before_taxes": "71.63",
    ...
  }
}
```

`processChannexBookingNotification()` (`7f297c72`, `1bc87176`):

| Field | Extraction chain |
|---|---|
| `guest_first_name` | `customer.first_name` → `customer.name` → `customer_name.split(' ')[0]` → 'Guest' |
| `guest_last_name` | `customer.last_name` → `customer.surname` → `customer_name.split(' ').slice(1).join(' ')` |
| `guest_phone` | `customer.phone` → `customer.mobile` → `airbnb.reservation.guest_phone_numbers[0]` |
| `guest_email` | `customer.mail` → `customer.email` → `customer.email_address` → `attrs.guest_email` → `attrs.customer_email` → `airbnb.reservation.guest_email` → **`airbnb-<ota_reservation_code>@guest.airbnb.com`** (Airbnb proxy fallback) |
| `special_requests` | `airbnb.reservation.guest_note` → `airbnb.reservation.special_requests` → `attrs.special_requests` → NULL |
| `notes` | Always: `'Imported via Channex webhook <ISO timestamp>' + '\n---raw---\n' + rawMsg.slice(0, 4000)` |

**Airbnb proxy email format:** `airbnb-HM2M54CJ5P@guest.airbnb.com` (where `HM2M54CJ5P` is the OTA reservation code). Airbnb's messaging system routes replies to the guest without exposing their real email. Barbara can use this in `guest_email` for the pre-arrival email flow.

---

## Property cutoffs → Channex

Steve / Barbara 2026-07-12 shipped three phases (`75d7f571` = current shape).

Semantics: `min_advance_hours` uses **day-based** counting — 24 blocks today only, 48 blocks today+tomorrow. Not strict-hours math. `floor(N/24)` days from today.

`computeCutoffBlockedDates()` is the single source of truth. Called by:

- `/api/availability/:roomId` — stamps `cutoff_blocked: true` on affected days → grid overlay + widget picker disable
- `runAvailabilityHealForProperty()` — pushes `count=0` for cutoff dates → Channex → OTAs closed
- `checkBookingCutoffs()` — server-side reject on `/api/public/book` (defence in depth)
- `/api/public/booking-cutoffs` — public summary endpoint for the WP widget's pre-picker floor

---

## Operator tools reference

| Tool | Where | What it does |
|---|---|---|
| 🔄 Force reconcile now | Property modal → OTA sync diagnostic | Push 90d availability + 45d restriction clears to Channex/Beds24 |
| 📡 Push cutoffs to Channex now | Property modal → Booking cutoffs | Push cutoff-blocked dates only (subset of Force Reconcile) |
| 🎯 Pull ONE by Channex booking ID | Sync Connections → Channex | Force one specific booking through the webhook processor |
| ⬇ Fetch last 30 days | Sync Connections → Channex | Bulk pull with per-booking skip diagnostic |
| 🚨 Seed booking manually | Sync Connections → Channex | Last-resort: fill form with booking data, insert directly (skip Channex entirely) |
| 💳 Add card / Replace card | Booking Detail → Card on File | Operator types card via Stripe Elements → SetupIntent stored |
| 📧 Send capture link to guest | Booking Detail → Card on File | Signed link emailed to guest; PREVIEW mode returns URL without sending |

---

## Known open issues + follow-ups

- **Webhook auto-registration on channel activation** — task #49 in the pending queue. Currently operator has to click "Register webhook" manually per connection. Automating this closes one class of "wait why isn't Channex sending?" incidents.
- **Airbnb Advance Notice setting** — a listing-level Airbnb rule that can independently close the first N days from today. Not visible from Channex. If a client reports "Airbnb shows closed but Channex is fine", check this in Airbnb host UI (`Availability → Trip length → Advance notice`).
- **Channex pink cell UI convention** — Channex support (2026-07-13) confirmed: pink = `stop_sell` is active on the rate plan for that cell. NOT cosmetic. If cells show pink and shouldn't, our restriction-clear window on the reconciliation heal needs to reach that far ahead. Currently 45 days; extend to 90 (matching availability window) if operators report pink cells beyond 45 days out.
- **Standard vs Standard2 rate plans** — if `_ensureStandardRatePlans` runs twice and the local INSERT fails between calls, Channex auto-suffixes the second create to "Standard2". Local mapping points at Standard2 but Airbnb may still be on Standard. Manual re-link in Channex UI, or delete the orphan and re-run the linker.

---

## Deploy trail 2026-07-12

Chronologically-ordered commits touching this system today:

```
c3346e41  Webhook UPSERT: also backfill guest_email + guest_phone on re-pull
1bc87176  Channex webhook: Airbnb proxy email fallback
7f297c72  Channex webhook: extract clean fields from Airbnb payload
49114aa8  Card capture: use verifyGuestToken's actual field names
831de241  Card capture link: PREVIEW mode returns URL instead of emailing
8189ffbf  Card capture link: use canonical https URL not req.protocol
60b5f67e  Emergency seed-manual booking endpoint
4fdd6359  Pull-single-booking escape hatch
f3f20c79  Channex webhook: widen fallback to any room on the connection
3e2e7f46  Channex webhook: fall back to rooms→property when gas_property_id is NULL
db803c77  Channex webhook: shared processor + per-booking sync diagnostic
d623ff56  URGENT: heal must subtract booked units
31df0fb8  Heal: honour property cutoffs
a6c3b8dc  Force reconcile diagnostic: true outbox counts
16347ae4  Force Reconcile button + endpoint
2d986c98  Availability heal: full-window reconcile + restriction clear
90d10f2c  Sync button: backfill existing GAS blocks
974b99e3  Cutoffs: multi-CM push + Channex worker health check
56511cdb  Cutoffs + manual blocks: availability=0 not restriction/stopSell
```

Every one of these was a real production failure or diagnostic gap that landed on Charles House Windsor or a similar live account. The doc exists so we don't rebuild the same knowledge from scratch next time.
