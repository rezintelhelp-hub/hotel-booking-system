# GAS Travel Agent — Unified Inventory Model

*Designed 2026-06-14 after the Hotelbeds parallel-track build exposed the
architecture mismatch. This is the canonical spec for the TA build.*

---

## Problem the model solves

We have two inventory sources fighting for the same TA-facing UI:

1. **Operator-owned** — Cotswold Retreats, Lehmann, Hebden, Casa Magnolia,
   Riviera Keys etc. Operator hand-curates content. Rates synced via Beds24 /
   Hostaway / Smoobu. Distribution to TAs is opt-in per property
   (`distribution_access` workflow already shipped: request → negotiate →
   approve → live).

2. **Wholesale (Hotelbeds + future WebBeds + TBO Holidays)** — third-party
   bedbank inventory. Thin content (no per-room descriptions). Live rates
   fetched on every search. Booking commits to the wholesale supplier.

The TA-facing experience must show **both as one list**. Different sources,
identical UX. The TA shouldn't know or care whether a result is
operator-owned or wholesale.

---

## Source-of-truth fields

### `properties.source_kind`

| Value | Meaning |
|---|---|
| `operator` (default) | Operator-owned, content in our DB, rates in `room_availability` |
| `hotelbeds` | Sourced from Hotelbeds Connect API |
| `webbeds` | Sourced from WebBeds (future) |
| `tbo` | Sourced from TBO Holidays (future) |

Backfilled from existing `external_source` column on migration.

### `accounts.agent_markup_pct` (default 15)

The selling agent's markup on top of the source rate. Resort Breaks at 15%
turns a £100 wholesale rate into a £115 sell rate. Per-property override
lives at `properties.agent_markup_pct_override` (operator-owned can set their
own override; wholesale always uses the agent default unless the agent
overrides).

### `accounts.agent_commission_pct` (default 10)

When this agent SELLS another operator's property (operator-owned only —
wholesale doesn't pay commission), this is the cut they earn. Logged against
each booking for the dashboard.

---

## Unified search architecture

```
POST /api/agent/search
{
  agent_id,
  destination | hotelCodes[] | geoBox,
  checkIn, checkOut,
  occupancies: [{ adults, children, childAges }]
}

  →  parallel fan-out:
       1. operator-search(): query properties where source_kind='operator'
          AND approved-for-this-agent (via distribution_access.status='approved'),
          fetch availability from room_availability, return rates
       2. hotelbeds-search(): call adapter.searchAvailability() against
          account 272's stored creds, return rates
       3. (future) webbeds-search(), tbo-search()

  →  merge:
       - same hotel from multiple sources? operator-direct wins
       - dedupe by (property_name, city, country) fuzzy match
       - apply agent's markup_pct to wholesale rates
       - apply agent's markup_pct to operator-owned rates (unless property
         has its own override)
       - log expected commission per result for the dashboard

  →  return: unified list, each result tagged source_kind + bookable_unit_id
       (for operator results) or rateKey (for wholesale results)
```

### Unified booking dispatch

```
POST /api/agent/book
{
  agent_id,
  search_result: { source_kind, ... }   // the chosen row from /search
  holder, paxes, payment
}

  source_kind === 'operator'
    →  existing /api/public/book path with travel_agent_id stamped on the
       booking row + commission row computed
  source_kind === 'hotelbeds'
    →  existing /api/admin/hotelbeds/book path, persist hotelbeds_bookings
       row + a mirror in bookings (travel_agent_id stamped, source_kind=
       'hotelbeds', external_ref=hotelbeds_reference)
```

---

## What to keep vs delete from the parallel work

### Keep (TA model uses it)
- `gas-sync/adapters/hotelbeds-adapter.js` — adapter, all methods
- `accounts.hotelbeds_*` columns — credentials per account
- `hotelbeds_hotel_content` cache table
- `hotelbeds_bookings` ledger
- `/api/admin/hotelbeds/search-availability` (used by TA.2 fan-out)
- `/api/admin/hotelbeds/check-rates`, `/book`, `/destinations`, `/hotel-content/:code`
- `/api/admin/hotelbeds/import-hotel` (renamed `/cache-hotel`)

### Drop (the misdirection)
- The `/import-hotel` writes to `properties` + `bookable_units` + `room_images`.
  Wholesale inventory doesn't belong in `properties`. The same endpoint should
  ONLY populate `hotelbeds_hotel_content` going forward.
- Demo property 1111 + its 22 `bookable_units` + 7+ `room_images`. Drop after
  TA.2 verifies the new flow works (don't drop blind — verify first).
- The `/api/public/property/:id/live-availability` endpoint — TA.2's search
  endpoint replaces it.
- Apps → Hotelbeds (Wholesale) panel as the customer-facing surface. It stays
  as a diagnostic for master-admin (test connection, run searches, peek raw
  responses), nothing more.

---

## Build phases

| Phase | Output | Days |
|---|---|---|
| **TA.1** | Schema migrations (source_kind, agent_markup_pct, agent_commission_pct, property markup override). Backfill. Doc. NO endpoint changes. | 0.5 |
| **TA.2** | `POST /api/agent/search` unified endpoint + adapter rewiring. Returns merged results from operator + Hotelbeds. Markup applied. Test via curl/Postman. | 1 |
| **TA.3** | Agent search UI — render results, filter, sort, expand to live availability + content. Hosted at `agents.gas.travel/search` (subdomain) or inside admin under Travel Agents → Search. | 1 |
| **TA.4** | `POST /api/agent/book` unified booking. Dispatches to operator or Hotelbeds backend. Commission row + voucher PDF (operator and wholesale both need vouchers per Hotelbeds cert section 4). | 1 |
| **TA.5** | Agent dashboard — own bookings, commission earned per source, refunds, voucher download. | 1 |

Total: ~4.5 dev-days.

---

## Open questions to lock down before TA.2

1. **agents.gas.travel subdomain.** Stand it up now (Nginx + cert + 'Hello
   world') so the public-facing UI has a home? Or stay in admin for now?
2. **Same-property dedupe.** If Cotswold Retreats has a property AND it's
   also somehow on Hotelbeds, do we show one or both rows? Operator-direct
   wins, but the matching key needs to be defined (lat/lng tolerance? name
   match?).
3. **Payment terms for wholesale.** Hotelbeds settles weekly in EUR; the
   agent paid in GBP at sell time. Who carries the FX risk — agent or GAS?
4. **Voucher generation.** Hotelbeds cert mandates a specific voucher format
   (section 4 of certification doc). Build a voucher generator first or
   defer to TA.5?
5. **Resort Breaks pitch surface.** Do they want a TA login + a search page,
   or a downloadable inventory CSV they pre-load to their own retail site?
   The technical shape is very different per answer.

---

## What this displaces

- Task #91 ("Regional partner network") becomes a layer on top of TA — same
  schema, just adds `regional_partner_territory` for booking-routing logic.
- The current "Travel Agents" admin nav stays — just gets a "Search"
  sub-item that points at TA.3.
- `distribution_access` (already shipped for operator→agent approval) is
  used as-is for the operator-owned half of the unified search.

---

*Author: Steve Driver + Claude, 2026-06-14. Updates land in this file as
the build progresses.*
