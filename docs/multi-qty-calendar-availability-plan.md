# Multi-Qty Calendar Availability — Build Plan

**Status:** Scoped 2026-06-17, not yet started
**Driver:** Multi-qty rooms (Penmar Rooms 3+6 qty=2, Chester Deluxe Exec qty=5, Hotel Caracas Queen Bed qty=50, etc.) cascade-block every sub-unit when a single booking exists, hiding genuine inventory. Affects 90 rooms across 11 accounts after today's qty backfill.

---

## Problem

When `bookable_units.quantity > 1` and a booking exists on a date, the calendar paints **every** sub-unit row red on that date — even though most are genuinely available.

Example (Hotel Caracas Queen Bed Room, qty=50, 23 Jun):
- 23 bookings span the night → 27 sub-units genuinely free
- Calendar paints **all 50** sub-rows as cascade-blocked → operator can't book the 27 free units

Same issue on Chester (qty=2-5 rooms), Penmar (qty=2 Rooms 3+6 / 4+5), and ~90 rooms across all multi-qty clients we backfilled today.

---

## Root cause

Two pieces of working infrastructure exist already, but only fire for pool-model rooms (Hebden):

1. **`is_available=false` on `room_availability`** is a single boolean per (room_id, date). With no per-sub-unit storage, every sub-unit reads the same row → all paint blocked.

2. **`gas-admin.html:52595` cascade-block branch** correctly handles "another listing on the same pool consumed the capacity" (Hebden's intended behaviour). For non-pool multi-qty rooms it mis-fires — there is no pool, so cascade-blocking is wrong; the booking only takes one unit.

3. **Server's round-robin allocator** at `server.js:67566-67649` already assigns NULL-`individual_unit_id` bookings to free sub-units at response time — but **gated on `listing_pool_consumption` rows existing**. Non-pool rooms get zero `poolBookings`, so no allocation runs.

---

## Approach

Reuse the existing pool-model allocator. Drop the gate. Compute capacity from `bookable_units.quantity` instead of `inventory_pools.default_capacity`. Compute `units_available` per-date from direct booking count.

### Server.js changes

**Scope:** the endpoint that builds the calendar grid response (around `server.js:67500-67700`).

| Step | Change |
|---|---|
| 1 | Fetch `bookable_units.quantity` for the room alongside existing fields. |
| 2 | If `quantity > 1` AND no `listing_pool_consumption` rows: fetch bookings via `SELECT … FROM bookings WHERE bookable_unit_id = $1 AND status IN ('confirmed', 'inquiry', 'pending') AND arrival_date < $endDate AND departure_date > $startDate`. Treat each booking as `units_consumed = 1`. |
| 3 | Reuse the existing `bookingsByDate` shape (line 67607) — keyed by date, array of `{ booking_id, guest_name, individual_unit_id, booking_source }`. |
| 4 | Round-robin allocator at line 67628-67649 fires unchanged — assigns NULL-iu bookings to `orderedBedIds`. |
| 5 | Compute `dayData.units_available = max(0, quantity - bookingsByDate[date].length)` and return it in the response. |
| 6 | Adjust `is_available` semantic in the response: `effective_available = units_available > 0` for multi-qty rooms. This is what the client reads. |

**No migration required.** Schema as-is is sufficient. `individual_units` already populated by today's backfill.

### gas-admin.html changes

| Step | Change |
|---|---|
| 1 | The cascade-block branch at `52595` already keys on `dayData.is_available === false`. With the server-side `effective_available` fix, it stops cascading when units are free. No client change needed here. |
| 2 | Type-header row: render a small `"{units_available} / {quantity} free"` badge per date in the date cells (replace the current `colspan` empty cell). Gives the operator the at-a-glance summary they're missing today. |
| 3 | Sub-unit row's "free" cell rendering already exists — will start painting correctly once server returns per-unit `_bookings` entries. |

### Data integrity follow-ups (separate from this plan)

- **Beds24 booking sync mismatched `individual_unit_id`** — same class of bug as today's Hebden 3-booking fix (Mills/Heike/Bryony). Sync at `server.js:56873-56877` resolves `individual_units.id` by `bookable_unit_id + unit_number` but the wrong `bookable_unit_id` gets written. Worth a separate audit across all clients now that the qty backfill is in.
- **`individual_units.unit_name VARCHAR(100)` too short** for some RocketStay unit names — widen to `VARCHAR(255)` so qty-fix can complete on conn 39 prop 237094.

---

## Edge cases to cover in implementation

| Case | Behaviour |
|---|---|
| Booking with `individual_unit_id` pinned by sync | Keep its pin. Round-robin only fills NULL-iu bookings. |
| Cancellation / declined / no-show | Exclude from `bookingsByDate` (status filter). |
| Bookings spanning multiple days | Already handled by the expansion loop at line 67614-67625. |
| qty changes after bookings exist | Round-robin re-allocates per request. Pinned bookings retain their `individual_unit_id` even if it now exceeds the new qty (display anomaly possible; warn-log it). |
| Pool model (Hebden) | Detect `listing_pool_consumption` rows first — use existing pool path. Only fall through to direct path when no pool. |
| Pre-existing pool-model conflicts | Hebden's existing behaviour unchanged. Non-pool multi-qty get the new path. |
| Two-sided check-in/check-out same date | Arrival counts that night; departure does not. Existing date math at line 67614 already does this — verify. |

---

## Test plan

| Scenario | Expected |
|---|---|
| Hebden Mixed 6 Bed Dorm (pool, qty=6) on a date with 4 bookings | 4 booked sub-rows + 2 free sub-rows — no regression. |
| Penmar Rooms 3+6 (no pool, qty=2) on 23 Jun (3 bookings, but 2 staying that night) | 2 booked sub-rows with guest names, 0 free. |
| Penmar Rooms 3+6 on 22 Jun (1 booking only) | 1 booked, 1 free. |
| Chester Deluxe Executive (qty=5) on 23 Jun (4 confirmed bookings) | 4 booked, 1 free. |
| Caracas Queen Bed Room (qty=50) on 23 Jun (23 active bookings) | 23 booked, 27 free. Type-header badge reads "27 / 50 free". |
| qty=1 single-unit room | Unchanged from today — one row, booked or free. No regression. |

---

## Rollout

1. Server change behind no flag — pure render-time computation, no DB writes, easy revert via commit revert.
2. Hard-refresh after deploy. Multi-qty rooms will start showing per-unit availability immediately.
3. Spot-check Penmar 956, Chester 1135-1140, Caracas 1484, Hebden 1255 (pool — should be unchanged).
4. If a regression shows on Hebden's pool rendering, revert and split the change.

---

## Estimate

- Server changes: 2-3 hours (read+write the calendar endpoint, run existing tests).
- UI changes (type-header badge): 30 min.
- Verification across Hebden + 3-4 multi-qty clients: 30 min.

**Total: half a day.** No schema migration, no client communication, no data backfill (data is already correct).

---

## Risk

- **Low.** All changes are in the calendar render path only. Bookings table, availability table, sync code, and pool model are untouched. Rollback = one revert commit.
- **Medium-low concern:** Hebden's existing pool rendering must keep working. Detection must check `listing_pool_consumption` before falling through to the new direct path. Tested by the first row of the test plan above.

---

## Not in scope

- Beds24 sync writing the wrong `bookable_unit_id` on booking creation (separate audit — see today's Hebden fix for Mills/Heike/Bryony as canonical example).
- `individual_units.unit_name` column width (separate small migration).
- Showing per-sub-unit pricing (Beds24 doesn't expose per-unit price; all sub-units share the room-type rate. No change planned.)
- Pool model creation for non-pool clients (different problem — would let operators sell e.g. whole-room + dorm-bed listings backed by the same physical inventory).
