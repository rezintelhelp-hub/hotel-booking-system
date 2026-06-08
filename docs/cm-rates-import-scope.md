# R5 — CM Rates Import (price rules + offers + extra-guest charges)

*Research + scope. Not a build commitment. Per-account opt-in only — Steve has flagged this will NOT be rolled out across all 30 sites.*

---

## Why this matters

EasyLandlord (account 230) on Beds24-marketplace has 4 daily-price rules per room (Flexible / Non-Refundable / Weekly / Monthly), each with extra-person charges (£9 per person on "Marsaskala Andrew" room), per-channel enable flags, refund-policy linkage, and chained -10% offsets.

Today operators **re-key all of this into GAS by hand** through:
- `offers` table (Cotswolds-style operator-typed discount codes)
- `rate_plans` table (chained markups / offsets)
- Manual config per room

That's hours of work per portfolio onboarding, and **every change Beds24-side has to be repeated in GAS**. Every operator with extra-guest pricing has the same gap.

---

## What the Beds24 V2 API exposes

Confirmed against live data (Riviera Keys account 220, mirrors Andrew's screenshot 1:1).

### Property level
- `GET /properties?includeOffers=true&includePropertyExtras=true`
- `property.offers[]` — offer definitions (label, refund policy, type)
- `property.propertyExtras[]` — cleaning fee, late check-in, etc.

### Room level
- `GET /properties?includePriceRules=true&includeAllRooms=true`
- OR `GET /inventory/rooms?id=X&includePriceRules=true`
- `roomType.priceRules[]` — each row in Beds24's "Daily Price Rules" table

### priceRules[i] shape

| Field | Andrew example | Maps to |
|-------|---------------|---------|
| `name` | "Flexible: 21 Days" | rate plan name |
| `priceFor.type` | "maxCapacity" / "fixed" | who the price covers |
| `extraPerson` | 9.00 | per-person upcharge |
| `extraChild` | 0.00 | per-child upcharge |
| `minimumStay` | 1 | min nights |
| `maximumStay` | 365 | max nights |
| `offer` | 1 | references property.offers[].id |
| `minDaysUntilCheckin` | 1 | advance lead time |
| `maxDaysUntilCheckin` | 999 | advance lead time |
| `priceLinking.priceId` | null or 1 | chains to another rule |
| `priceLinking.offsetMultiplier` | 0.9 | -10% chained offset |
| `priceLinking.offsetAmount` | 0 | fixed-£ chained offset |
| `agentCodes[]` | [] | B2B rate gating |
| `channels.{direct,airbnb,booking,expedia,agoda,...}.enable` | true/false | per-channel toggle |
| `bookingPage.{direct,agent}` | true/true | site visibility |

This is everything you'd want to know about a rate plan. Beds24 IS the source of truth here.

---

## What GAS already has vs the gap

| Concept | GAS table / column | Imported? |
|---------|---------------------|-----------|
| Room basic info | `bookable_units` | Yes (gas_sync_room_types) |
| Daily price | `room_availability.cm_price` | Yes (15-min calendar sync) |
| Min stay | `room_availability.cm_min_stay` | Yes |
| Offer / discount code | `offers` | No — operator-typed |
| Refund policy per offer | `offers.refund_policy` | No — manual |
| Rate plan (chained markup) | `rate_plans` | No — manual |
| **Extra person charge** | **none** | **No — gap** |
| **Extra child charge** | **none** | **No — gap** |
| Per-channel rate enable | `gas_sync_room_types` (some) | Partial — channel mapping but not per-rate |
| Agent code gating | `offers.applies_to` (partial) | Partial |
| Property extras (cleaning etc.) | `upsells` | No — manual |

The two biggest immediate gaps are **extra-person charges** and **rate-plan chaining** — operators today have no way to express "Andrew's room costs £9 per extra person" through GAS, so the booking widget under-prices for >base-occupancy bookings, and the operator either eats the loss or has to manually invoice.

---

## Proposed scope (per-account opt-in)

### Schema

```sql
ALTER TABLE rate_plans
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'gas',  -- 'gas' | 'cm-import'
  ADD COLUMN IF NOT EXISTS cm_price_rule_id VARCHAR(50),       -- foreign key to Beds24 priceRule id
  ADD COLUMN IF NOT EXISTS cm_adapter VARCHAR(30),
  ADD COLUMN IF NOT EXISTS extra_person_amount NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS extra_child_amount NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS min_days_until_checkin INTEGER,
  ADD COLUMN IF NOT EXISTS max_days_until_checkin INTEGER,
  ADD COLUMN IF NOT EXISTS parent_rate_plan_id INTEGER REFERENCES rate_plans(id),
  ADD COLUMN IF NOT EXISTS offset_multiplier NUMERIC(6,4),     -- 0.9 = -10% from parent
  ADD COLUMN IF NOT EXISTS offset_amount NUMERIC(8,2),         -- flat £ offset
  ADD COLUMN IF NOT EXISTS channel_enable JSONB,               -- {direct:true, airbnb:false, ...}
  ADD COLUMN IF NOT EXISTS last_cm_synced_at TIMESTAMPTZ;

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'gas',
  ADD COLUMN IF NOT EXISTS cm_offer_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cm_adapter VARCHAR(30);

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS cm_rates_import_enabled BOOLEAN DEFAULT false;  -- opt-in
```

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/units/:id/import-cm-rates` | One-shot pull for one room |
| `POST /api/admin/properties/:id/import-cm-rates` | Pulls every room in the property |
| `POST /api/admin/accounts/:id/import-cm-rates` | Whole portfolio |
| `GET /api/admin/units/:id/cm-rates-preview` | Dry-run: shows what would be imported without writing |

### Daily sync cron (optional, gated)

If the per-account flag is on, a daily cron pulls priceRules + offers per room and upserts. Operator-edited rows (where `source='gas'`) are never touched. Imported rows (`source='cm-import'`) are overwritten with fresh CM state. Conflict policy: CM wins.

### Admin UI

- **Room edit modal** — new "Rate Plans (CM-managed)" panel below existing rate-plan UI, read-only, with a "Refresh from CM" button per row. Edits warn that they'll be overwritten on next sync unless the operator clicks "Detach from CM" first.
- **Account settings** — toggle "Import rate plans + extras from channel manager". Off by default.

### Per-CM extension

Same shape works for the other major CMs once their adapters mature:

- **Hostfully** — `GET /properties/{id}/rates` (their rate plans), `GET /properties/{id}/fees` (extras). Same data shape under different names.
- **Hostaway** — `GET /listings/{id}/customFields/pricing` — has extra-guest charges and discounts in similar structure.
- **Smoobu** — `GET /api/rates/{apartmentId}` — less rich, no per-channel toggle. Importable but flatter.
- **Lodgify** — `GET /rates/{property_id}` — has rate plans + extra-guest but no offer chaining.

R5 should be Beds24-first; the others get parity in R5.1 / R5.2 phases.

---

## Acceptance criteria for "ready to ship to one client"

1. Steve opens **EasyLandlord → unit 1880 → Edit Room** and sees existing manually-typed rate plans unchanged
2. Hits **"Refresh from CM"** → all 4 of "Andrew" room's price rules appear in GAS as `rate_plans` rows, marked `source='cm-import'`, including the £9 extra-person charge
3. Books a 4-guest stay through the booking widget — sees the extra-person charge applied at checkout
4. Edits an imported rate plan in GAS → warned "this will be overwritten on next CM sync"
5. Clicks "Detach from CM" → row flips to `source='gas'`, no more CM overwrites
6. Daily cron runs against opted-in account only — other 29 accounts untouched

---

## Risks + gotchas

### Pricing double-application

If GAS already calculates extra-person charges through `offers` + `rate_plans` AND imports Beds24's `extraPerson`, we double-charge. Need a pre-import audit: any account with existing manually-typed extra-person rules has to confirm before enabling import.

### Channel-enable mismatch

Beds24's `channels.{name}.enable` toggles whether a rate plan shows on each OTA. GAS only knows about direct + agent channels. Imported rules where `channels.direct.enable = false` should be skipped or hidden from the booking widget. Maps cleanly but needs a per-channel switch in the import logic.

### Offer chaining recursion

`priceRules[i].priceLinking.priceId` references another rule. Imports need to happen in dependency order (parent first), and the GAS side needs to resolve `parent_rate_plan_id` after both rows exist. Two-pass import.

### Marketplace token scoping

EasyLandlord is on Beds24-marketplace via the Rezintel master key. The V2 API call shape is slightly different from per-account OAuth (auth via master refresh token, scoped to a propKey). Adapter needs to detect and switch. Existing `getBeds24AccessTokenForProperty` covers per-account; need a marketplace branch.

### Operator confusion

"Why did my £100/night rate suddenly become £130 with extra-person?" — operators who didn't realise Beds24 had the extra-person charge will see prices jump after import. Onboarding step needs to surface the imported `extraPerson` values clearly with an "apply" / "skip" choice per row.

---

## Build estimate

- Schema + per-room import endpoint (Beds24 V2 + marketplace): **1 day**
- Property + account import endpoints + UI: **0.5 day**
- Daily sync cron + edit-warning + Detach button: **0.5 day**
- Mirror for Hostfully (R5.1): **0.5 day**
- Mirror for Hostaway (R5.2): **0.5 day**
- Mirror for Smoobu / Lodgify (R5.3): **0.5 day**

Beds24 only (R5 ship-able to EasyLandlord) = **~2 days**.

---

## Rollout plan

1. **Phase 1**: ship behind `accounts.cm_rates_import_enabled = false` default. Steve enables for one test account.
2. **Phase 2**: Steve enables on EasyLandlord (or whichever account asks first). Dogfood for a week.
3. **Phase 3**: Mirror for Hostfully / Hostaway when next client asks.
4. **No mass rollout** — per Steve's instruction, only enabled when an operator explicitly requests it.

---

## Decisions still open

1. **Per-channel rate import**: do we import `channels.airbnb.enable` etc. and let GAS gate per-channel, OR ignore (GAS only handles direct + agent today)?
2. **Property extras (cleaning, late CI)**: map them into the `upsells` table or a new `property_extras` table?
3. **Conflict policy when operator edits a CM-imported row**: silent overwrite on next sync, OR detach-first (current proposal)?
4. **OTA-only rate plans**: priceRules where `channels.direct.enable = false` — import as hidden, or skip entirely?

---

*Captured 2026-06-08. Awaits Steve's green light to start R5 build.*
