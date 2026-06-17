# Hotel View + Multi-User Plan

**Status:** Scoped 2026-06-17. Builds on existing multi-user decisions (see memory `project_multi_user_app_subdomain.md` from 2026-06-02).

---

## The two intertwined problems

### Problem A — "Hotel view" loses bookings

Hotel Caracas (account 224, Lorenzo) is an `agency_admin` role wrapping **67 properties × 73 bookable_units × 2057 bookings**. When Steve views as Hotel Caracas, the calendar / dashboard surfaces don't render the bookings correctly because they treat the 67 properties as separate calendar instances rather than one aggregate view of the hotel.

The current model has only two scoping levels:
1. **Account-level** — show everything under `account_id`. Works but renders 67 properties as a flat list, which is unusable for a hotel-of-many-properties operator.
2. **Per-property filter** — operator picks one of 67 in a dropdown. Misses the cross-property reality (a guest moves between units, payments roll up to one revenue line).

There's no concept of "this account represents ONE hotel even though it's stored as N properties."

### Problem B — Multi-user access (Lorenzo + future users)

Lorenzo's hotel will have a reception manager, accountants, cleaners, maintenance — each needing scoped access. The unified `users` + `user_assignments` model was decided 2026-06-02 (memory file referenced above) but not yet built. Without it, only Lorenzo can log in. New staff = no way in.

The two problems share a substrate: **scoping read queries through a user → role → properties graph.** Solve one without the other and you'll redo the work.

---

## Proposed architecture

### 1. New optional level: "hotel_group" on accounts

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS hotel_group BOOLEAN DEFAULT false;
```

When `hotel_group = true`:
- The account represents ONE logical hotel
- All `properties` rows under it are "sections" of that hotel (rooms by category / floor / building)
- Calendar, dashboard, reports aggregate across all properties by default
- Per-property filter remains available as a drill-in

When `hotel_group = false` (default): existing behaviour — multi-property = multi-business (e.g. Atlantis Realty with 3 unrelated rental properties).

Hotel Caracas sets it true. Atlantis Realty leaves it false.

### 2. Multi-user — ship the schema decided 2026-06-02

Already designed. Phase 1 of the existing plan:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL,   -- owner / manager / accountant / staff / readonly / cleaner / maintenance / concierge / cohost
  property_ids INT[],          -- NULL = all properties under the account
  unit_ids INT[],              -- NULL = all units under the assigned properties
  permissions JSONB,           -- optional fine-grained add-ons / exclusions
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, account_id, role)
);
```

Lorenzo gets `user_assignments` row: `account_id=224, role='owner', property_ids=NULL` (everything).
Reception staff: `account_id=224, role='manager', property_ids=NULL`.
Single-property cleaner: `account_id=224, role='cleaner', property_ids=[637]`.

### 3. Query-scoping helper

Every read endpoint that returns business data needs to go through one helper:

```js
function scopeQueryToUser(user, baseQuery, params) {
  // returns { sql, params } with the right WHERE clauses appended
  // - master_admin: no scoping (current behaviour)
  // - account-level role on hotel_group account: aggregate across all account's properties
  // - account-level role on non-hotel_group: same — just include all properties under account
  // - property-scoped role: AND property_id = ANY($N)
  // - unit-scoped role: AND bookable_unit_id = ANY($N)
}
```

Without this helper, scoping gets duplicated and leaked.

### 4. UI changes

- **Account switcher** stays. When switching INTO a hotel_group account, the calendar/dashboard default switches to "aggregate" mode.
- **Property filter dropdown** stays as drill-in within a hotel_group account.
- **User profile menu** shows the user's role + (if owner) "Manage Users" link to add/remove user_assignments rows.
- **app.gas.travel PWA** unchanged from existing plan — same user model.

---

## Phase order

Shipping this in the right order matters because the multi-user schema is the foundation for both problems.

| Phase | What ships | Effort | Unlocks |
|---|---|---|---|
| **1** | `users` + `user_assignments` schema, login path, `scopeQueryToUser()` helper, internal-role gating on existing admin endpoints (audit pass) | 3-4d | Lorenzo's reception manager can log in. Property/unit scoping starts working everywhere. |
| **2** | `accounts.hotel_group` column + aggregate-by-default rendering on calendar / dashboard / reports when set true. Flip Hotel Caracas on. | 1d | Lorenzo + Steve can view Hotel Caracas as ONE hotel, see all 67 properties' bookings in one calendar. |
| **3** | `app.gas.travel` subdomain + PWA + Today view skeleton | 3-4d | Mobile cleaner / maintenance access path. (Existing plan Phase 2.) |
| **4** | Cleaner workflow on PWA — check-off, photo, notes, access codes | 2-3d | Real-world cleaner usage at Hebden + Hotel Caracas. |
| **5** | Property/unit-scoped query injection on every read endpoint + smoke-test suite | 2d | Multi-user safe for production. Critical, easy to leak data. |
| **6** | Push notifications (web push) — bookings → owner, cleaning → cleaner | 2d | Real-time ops. |
| **7** | Capacitor wrap (App Store + Play Store) | 3-5d | Native shells for stores. |

**To "fix Hotel Caracas view"** (problem A only): Phase 1 + Phase 2 = **~4-5 days**.
**To "fix view + new staff users"** (problem A + B owner-level): Phase 1 + Phase 2 = same window.
**Full PWA + cleaner support**: ~16-21d total (existing plan estimate +1d for hotel_group).

---

## Quickest unblock for today's complaint

If Lorenzo specifically needs to see Hotel Caracas's bookings NOW without waiting for Phase 1:

- **Temporary view fix** (~half a day): patch `/api/admin/bookings` and `/api/availability` to detect `account_id` is a hotel_group and aggregate across all properties when a property filter isn't set.
- No schema change, no user model changes.
- Throwaway code — replaced cleanly by Phase 2's proper implementation.
- Risk: any data-shape mismatch between properties (currencies, time zones, etc.) shows up here first.

Worth doing if waiting 5 days isn't acceptable, otherwise skip and go straight to Phase 1+2.

---

## Connections to other plans

- **`project_multi_user_app_subdomain.md`** (memory, 2026-06-02) — this plan reuses Phases 1, 4, 5, 6, 7 verbatim. Adds Phase 2 (hotel_group) which wasn't on the original plan.
- **`project_client_operations_ux_research.md`** (memory) — Today-screen scope, same surface as PWA Phase 3.
- **`project_seo_agency_access_todo.md`** (memory) — agency cross-account access uses the same `user_assignments` table.
- **Hebden (Joanne accountant)** + **Cotswold (per-property owner)** remain canonical use cases. Hotel Caracas joins them as the canonical hotel-group use case.

---

## Open questions

1. When a hotel_group user views aggregate calendar, do we render 73 rooms vertically (one row per bookable_unit) or group by property first? For 73 rooms it's fine vertically; for 250+ we'd need property-grouped collapsible rendering.
2. Reports for hotel_group accounts — by property breakdown or aggregate-only? Probably both, switchable.
3. Per-property currency: Hotel Caracas's 67 properties might span Panama (USD) + Miami (USD) + Venice (EUR). Aggregate display needs a currency mix indicator.
4. The reception manager role for Lorenzo — does it match the existing `manager` definition (full read/write minus billing) or do we need a new `front_desk` role? Probably manager is fine.
5. When a user has assignments to multiple accounts (agency case), the UI needs an account switcher. We have one for master_admin already — generalise it.
