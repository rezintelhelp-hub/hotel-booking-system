# Cleaning Fees & Upsells — How GAS Handles Them

*Last updated: 2026-04-30. Reference for per-client reviews as accounts go live.*

---

## TL;DR

There are **three** mechanisms in GAS that can put a cleaning fee on a guest's checkout. Two of them work; one is invisible. **No automatic sync from Beds24's structured upsells exists** — Beds24's own data model is inconsistent (the value shown in their Extras / Upsells panel doesn't reach their financials table), so we don't pull from it.

Going forward, **review each new client when they go live** to make sure their cleaning fee is set up via one (and only one) of the working paths.

## The three mechanisms

### 1. `bookable_units.cleaning_fee` (Beds24-synced numeric — works)

- **Source**: Beds24 `roomTypes[i].cleaningFee` (a flat number on the room)
- **Sync**: Beds24 adapter `mapRoom()` extracts it, server.js writes to `bookable_units.cleaning_fee` on each 6h sync
- **Display**: server.js around line 67953 reads `unit.cleaning_fee` and adds a "Cleaning Fee" line to checkout
- **Status today**: 521 rooms across 14 accounts use this path

### 2. Manual GAS upsell rows (works — Villa Lounge pattern)

- **Source**: owner / master admin enters them in GAS Admin → Upsells
- **Sync**: none — this is purely a GAS-side configuration
- **Display**: booking flow reads the `upsells` table at checkout. `mandatory=true` rows are auto-added. Multilingual names supported via `name_ml`. Scope via `property_ids[]` (new), `property_id` (legacy), `room_ids` (CSV legacy on upsells).
- **Status today**: 17 cleaning-related upsells exist, all `user_id=1` (entered by master admin manually). Villa Lounge (account 238) is the canonical working pattern with 6 mandatory cleaning upsells, one per room.

### 3. Beds24 `prop.upsellItems[]` (NOT synced — invisible to GAS)

- **Source**: Beds24's structured "Extras / Upsells" section (per-property, up to 20 indices)
- **API field**: `prop.upsellItems[]` — requires `includeUpsellItems: true` on `/api/v2/properties`
- **Schema**:
  ```json
  {"index": 1, "type": "obligatoryCleaning", "amount": 120, "per": "booking", "period": "oneTime", "vat": 0}
  ```
  Type enum (system-wide scan, 167 real items across 82 properties):
  | type | count | maps to |
  |---|---|---|
  | `obligatoryCleaning` | 70 | upsells (mandatory cleaning) |
  | `obligatoryPercentTax` | 35 | taxes ⚠️ (it's a tax, not an upsell) |
  | `obligatory` | 19 | upsells (mandatory custom) |
  | `optional` | 13 | upsells (optional add-on) |
  | `optionalQty` | 12 | upsells (quantity-pickable) |
  | `optionalPercentage` | 7 | upsells (% type) |
  | `obligatoryTax` | 6 | taxes ⚠️ |
  | `obligatoryPercent` | 5 | upsells/fees |
- **Sync**: **NONE**. No code path reads this. Zero rows in GAS sourced from here.
- **Description/translation**: NOT in the API response despite being editable in the Beds24 UI. Possibly derived from type, or behind an undocumented include. Means we'd need our own type→display-name mapping if we ever did sync.
- **Why we don't sync**: Beds24 itself doesn't propagate the value to its financials table, so the data is unreliable. Pulling from it would create double-charge support burden (some properties have BOTH `roomTypes[i].cleaningFee` AND a `obligatoryCleaning` upsellItem set, e.g. the same value entered twice or two different values).

### Consequence: GAS bookings can leak revenue vs OTA bookings

The **same room** can charge different cleaning fees depending on the booking channel:

- **Booking.com / Airbnb / Vrbo**: Beds24 pushes `upsellItems[].obligatoryCleaning` to the OTA. Guest pays the configured amount.
- **GAS direct**: nothing reads `upsellItems`. If the owner hasn't ALSO populated either `roomTypes[i].cleaningFee` or a manual GAS upsell, the GAS guest pays $0 cleaning fee.

Lorenzo Properties' Miami room (Beds24 property 209475, GAS unit 1060): Beds24 has `obligatoryCleaning $120` set but no `cleaningFee` on the room. OTA guests are charged $120; GAS guests are charged $0. Live revenue leak unless a manual GAS upsell is added.

---

## Active issues to resolve manually per-client

### Double-charge — Lorenzo Properties (account 224)

| Property | Unit | `bu.cleaning_fee` | Manual upsell | Guest currently pays |
|---|---|---|---|---|
| 801 | 1786 | $45 (Beds24-synced) | #46 "Cleaning fee" $40 (mandatory) | **$85** ❌ |
| 801 | 1787 | $45 | #46 (same) | **$85** ❌ |

Decide which value is correct, zero out the other.

### Accounts on the Beds24 path (`bookable_units.cleaning_fee > 0`, no manual upsell)

These rely on `roomTypes[i].cleaningFee` being correct in Beds24. Review each on go-live to confirm the value is right and matches what OTAs charge.

| Account | Rooms |
|---|---|
| Rocketstay | 248 |
| Cotswold Retreats Ltd | 59 |
| Mimo Stays | 54 |
| Invest jet Real estate SL | 43 |
| Atlantis Realty | 39 |
| Vo Rental | 36 |
| Riviera Keys | 12 |
| Roark Creek Resort | 9 |
| Little Italy | 6 |
| John Rast House | 5 |
| Lehmann House | 4 |
| San Sebastian Properties | 3 |
| Chateau de Pourpry | 1 |
| Atlantis Realty (overlap) | 39 |

### Accounts using the manual upsell pattern (Villa Lounge model)

| Account | Pattern |
|---|---|
| Villa Lounge (238) | 6 mandatory cleaning upsells, one per room, $65–$200 |
| Lorenzo Properties (224) | Mixed — some manual upsells (45, 46, 48, 49), some Beds24-path |

### Accounts with no cleaning fee at all (potentially leaking revenue)

Any account where:
- Beds24 `prop.upsellItems[]` has a `obligatoryCleaning` entry, AND
- `bookable_units.cleaning_fee` is NULL / 0, AND
- No manual GAS upsell exists

…is charging $0 to GAS direct guests while OTAs charge the Beds24 amount. Review the Beds24-side `upsellItems` for each new client at go-live. Lorenzo property 209475 is the known example.

---

## Per-client review checklist (go-live)

For each new client, before flipping their site live:

1. **Pull their Beds24 `upsellItems`**:
   ```bash
   curl -H "token: <oauth>" \
     "https://beds24.com/api/v2/properties?id=<beds24_property_id>&includeUpsellItems=true"
   ```
   List all entries where `type !== 'notUsed' && amount > 0`.

2. **Check what GAS will charge**:
   - `SELECT cleaning_fee FROM bookable_units WHERE id = <unit_id>` — if non-zero, this hits checkout.
   - `SELECT id, name, price, mandatory FROM upsells WHERE active = true AND (property_id = <prop> OR <prop> = ANY(property_ids))` — mandatory rows hit checkout.

3. **Reconcile**:
   - If Beds24 has an upsell value but GAS shows $0 → **add a manual GAS upsell** to match (so GAS guests are charged the same as OTA guests).
   - If both `bookable_units.cleaning_fee` AND a manual upsell exist for the same room → **double-charge**, fix one.
   - If Beds24 has both `roomTypes[i].cleaningFee` AND a `obligatoryCleaning` upsellItem → owner should pick one in Beds24 (or just trust whichever comes through; the sync only reads the simple `cleaningFee`).

4. **Also check tax-like Beds24 upsellItems**:
   - `obligatoryTax`, `obligatoryPercentTax` should be set up as **GAS taxes**, not upsells. These currently aren't synced either — manual entry into the GAS taxes table.

---

## Code references

| Concern | File:line |
|---|---|
| Beds24 simple cleaning fee → `bookable_units` | `gas-sync/adapters/beds24-adapter.js:820` (mapRoom), `server.js:5398, 5482` (sync writer) |
| Checkout reads `bookable_units.cleaning_fee` | `server.js:67953` |
| Manual upsells loaded for checkout | `server.js` `/api/public/upsells/:unitId` + booking flow |
| `v_bookings_with_payments` (broken `outstanding_balance`) | unrelated, see `payment-source-of-truth.md` |
| Beds24 V2 `upsellItems` structure | `includeUpsellItems: true` on `/api/v2/properties`. **No GAS reader exists.** |

## Why we're not building the sync

1. Beds24's own data is unreliable (financial side doesn't see the upsell amount).
2. The full sync would also need tax-vs-upsell demux logic + a type→display-name mapping table we maintain.
3. The pain we're solving is *scale of manual entry*, not lack of capability — Villa Lounge proves the manual pattern works fine. A future quick-add UX in the GAS Admin Upsells page (one click per room) addresses scale without inheriting Beds24's data-quality issues.
4. 521 rooms already work fine on the simple `cleaningFee` sync. Don't regress them by switching to a more complex path.

If a real client demand emerges (e.g., 50+ properties to onboard at once with cleaning fees only configured in Beds24's `upsellItems`), revisit this. Until then, manual upsells + per-client review is sufficient.

---

## Memory references

- [feedback_no_duplicate_beds24_rules.md](../../.claude/projects/-Users-stevedriver-hotel-booking-system/memory/feedback_no_duplicate_beds24_rules.md) — the principle that ruled out a same-day-cutoff GAS UI. **This case is the exception**: cleaning fees DO need a GAS-side admin (manual upsells) because Beds24's structured data is broken upstream.
- [beds24-master-key.md](../../.claude/projects/-Users-stevedriver-hotel-booking-system/memory/beds24-master-key.md) — needs correction; Villa Lounge (account 238) has 6 active `beds24-marketplace` connections, contradicting the earlier "0 accounts on master key" claim.
