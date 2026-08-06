# Beds24 Payment Sync — Issues, Root Causes, and Fixes (2026-08-06)

Reference document capturing the full picture of Beds24 payment-sync
issues investigated and fixed on 2026-08-06 after a week of silent
billing incidents (Rosa Emery, Amy Harding, Janet Emery, Diane Crawford).

---

## Symptoms observed over the preceding week

- Rosa Emery B319178 (2026-07-31): £622.75 pushed instead of £498.20
- Amy Harding B564245 (2026-08-04): £791 balance never reached Beds24
- Janet Emery B552760 (2026-08-02): £581 charged twice on Cotswolds
- Rebecca Dean B531014 (2026-07-31): triple-charged £438
- Diane Crawford B243181 (2026-08-05): balance £468.80 charged in GAS,
  invisible on Beds24 for 24+ hours

Common thread: GAS shows the booking as paid, Beds24 shows the balance
still outstanding, and no error trace exists in the DB — only in Railway
console logs that rotate after 24 hours.

---

## Root causes found (2026-08-06 audit)

### 1. Silent failure surface

`syncBeds24PaymentItem` (server.js:64458) only logged failures to
`console.error`. All 11 call sites used `setImmediate(...).catch(e =>
console.warn(...))` — fire-and-forget with no DB persistence, no
notification, no retry bucket. When Railway rotated the log tail,
the failure was gone forever. Operators saw "paid" in GAS and "due"
in Beds24 with no diagnosable cause.

### 2. Auth router bypassed per-account credentials

`getBeds24BookingHeaders` (server.js:64430) was gated only on
`process.env.BEDS24_MASTER_TOKEN` being set. Because it IS set,
every account with a `beds24_property_id` on any property was
silently pushed via the master token — even the 38 accounts
configured in GAS with their own per-account OAuth tokens sitting
unused in `gas_sync_connections` / `accounts.beds24_refresh_token`.

Estate survey (`scripts/_beds24_auth_survey.js`, read-only) on
2026-08-06 showed:
- 57 accounts with any Beds24 setup
- 41 misrouted (code path ≠ recommended by DB state)
- 38 valid Style B accounts silently using master token
- 3 dead-token accounts (Steve's own #1, non-clients #117 and #155)
- 16 correctly-routed on master

This meant the master token was quietly acting as a safety net for
the entire estate. Any master-token issue would take out all 38
Style B accounts at once, and GAS couldn't tell you which was
affected because its model said they were Style B.

### 3. Double-charge protection was NEW but working

The auto-charge cron (server.js:155648-155742) has three sequential
idempotency checks that were added over July/August 2026:
1. Prior auto-charge exists (Rebecca Dean fix, 2026-07-31)
2. Ledger sum ≥ grand_total (Janet Emery fix, 2026-08-02)
3. Any Stripe charge in last 24h (belt-and-braces)

Plus Stripe idempotency keys at the gateway. Verified working —
these do NOT need further changes.

---

## Fixes shipped on 2026-08-06

### Commit `6d236fba` — sync failure persistence

- Every failed push from `syncBeds24PaymentItem` writes to
  `bookings.sync_errors` with timestamp, tx id, pi_id, and the
  Beds24 error body
- Outer helper crashes also persist to `sync_errors`
- Auto-charge cron changed from `setImmediate(...).catch(console.warn)`
  to `await syncBeds24PaymentItem(...)` — a failed push does NOT fail
  the successful Stripe charge, but the failure is now visible
  immediately

### Commit `bffc013e` — router uses account connection state

- New `resolveBeds24AuthStyle(accountId)` helper — inspects
  `gas_sync_connections.adapter_code` to decide `'master'` vs
  `'per_account'` vs `'auto'`
- `getBeds24BookingHeaders` gains an optional third arg
  `{ forceStyle: 'master' | 'per_account' }`. When set, routing is
  explicit; when omitted, the legacy env-var gate fires unchanged
- `syncBeds24PaymentItem` is the ONE call site that opts in — every
  other call site (30+) keeps its exact current behaviour
- Dry-run tested against every account before deploy
  (`scripts/_beds24_router_dryrun.js`) — resolver matches survey
  recommendations 1:1
- Spot-check on Cotswolds B553030 post-deploy: HTTP 200, `pushed=[]`,
  existing Beds24 line correctly matched by legacy amount+description
  regex, no duplicate created

### Earlier same day — bike storage CRM trigger (94d9c82c) and
test-fire recipient bug (e8bdc7b1) — unrelated but shipped in the
same session.

---

## Fixes NOT applied (Steve's instruction: no backward sweep)

- **No historical healer.** Bookings that failed sync before 2026-08-06
  and have never been re-triggered stay as they are. Only new pushes
  benefit from the visibility fix.
- **No auto-retry cron.** If a push fails today, it stamps
  `sync_errors` and stops. Operators re-fire manually via the admin
  endpoint or Push to Beds24 button. Adding an auto-retry cron is
  deferred.
- **Only `syncBeds24PaymentItem` opts into the new router.** Other
  code paths (booking creation, refund push, add-to-stay webhook,
  etc.) still route via the legacy env-var gate. Migrate one caller
  at a time as needed rather than sweeping all 30+ at once.

---

## Known open items (2026-08-06)

### 3 accounts need reconnecting to Beds24 (Style B tokens dead)

Post-router-flip, their pushes will now fail loudly with `sync_errors`
entries instead of silently working via master:

- **#1 Steve Driver (master_admin)** — his own account, 0 properties
  with `beds24_property_id`, token 401. Trivial fix (reconnect the
  invite code) or just clear the stale token from `accounts.beds24_refresh_token`.
- **#117 MyBoracayGuide (submaster_admin)** — NOT an existing client,
  11 properties with `beds24_property_id`, token 401 "Token not valid",
  `beds24_connected` flag already false.
- **#155 NewFo.rest Holiday Let Management (agency_admin)** — NOT an
  existing client, 2 properties, `http-429 "Credit limit exceeded"`
  (Beds24 API quota problem, not a bad token). If they were a client,
  fix would be for them to upgrade Beds24 plan or reduce API usage.

None are live-client incidents.

### 9 orphaned `beds24-marketplace` accounts

Accounts with `beds24-marketplace` adapter connections but
`props=0` (no properties with `beds24_property_id` set). Current
code path resolves to "NONE (no path resolves)". Pushes fail
silently. Investigate separately — likely orphaned onboarding data
or properties stored differently:

209 Holiday Homes in York, 230 EasyLandlord, 238 Villa Lounge,
256 Aran Cottages, 257 Bookin Riga, 258 Brighton Break, 259 Das
Friedrich, 260 Book Liverpool, 263 Riverside Linz, 264 The Ship
Inn, 270 GoSlopeSide, 274 Pumice Tiny House, 275 Espais Roca

### Not shipped: expand router coverage to other call sites

`syncBeds24PaymentItem` was the priority. The 30+ other
`getBeds24BookingHeaders` call sites (booking creation, refund push,
availability sync, rate push, add-to-stay, cancel push, etc.) still
route via the legacy env-var gate. If similar routing bugs surface
in those paths, migrate one caller at a time. The dry-run
(`scripts/_beds24_router_dryrun.js`) can be extended per-path to
validate before flipping.

---

## Diagnostic tooling added

- **`scripts/_beds24_auth_survey.js`** — read-only survey. Enumerates
  every account with Beds24 setup, tests their per-account refresh
  token against `https://beds24.com/api/v2/authentication/token`,
  reports current code path vs recommended. Safe to re-run any time.
- **`scripts/_beds24_router_dryrun.js`** — offline dry-run of the
  resolver logic against every account. Confirms the router picks
  the expected style. Compare-point for any future router change.
- **`scripts/_check_gas_243181.js`** — per-booking diagnostic
  template. Shows booking + payment_transactions + sync_errors +
  diagnosis line. Adapt for any future single-booking incident.

Pre-fix state snapshot preserved in
`~/.claude/projects/-Users-stevedriver/memory/project_beds24_router_state_20260806.md`
as a rollback compare-point.

---

## Key file/function references

| Piece | Location |
|---|---|
| `syncBeds24PaymentItem` | server.js:64458–64650 |
| `resolveBeds24AuthStyle` (new) | server.js:64430–64470 |
| `getBeds24BookingHeaders` | server.js:64490–64525 |
| `getBeds24AccessTokenForAccount` | server.js:78239–78279 |
| Auto-charge cron | server.js:155648–155742 |
| Admin re-fire endpoint | POST `/api/admin/bookings/:id/sync-beds24-payment` (server.js:9840) |
| `beds24_sync_failures` table | server.js:8366 (exists but unused for payment sync failures — could be re-purposed as an aggregate view over `bookings.sync_errors LIKE '%beds24_sync%'`) |

---

## Decision log — why we did what we did

- **Why no historical healer?** Steve explicit instruction: "do not
  sweep backwards, but we must make sure that the booking info is
  updated properly in beds24, the pricing is not double etc". Any
  automatic re-fire of old failures risked triggering the same bugs
  we just fixed on bookings that had been quiet for months.
- **Why keep the legacy env-var gate for other callers?** Blast
  radius. 30+ call sites, each with its own context and error
  handling. Fixing them all at once means one regression takes down
  everything. Migrating one caller at a time keeps changes reviewable.
- **Why persist to `bookings.sync_errors` instead of a dedicated
  table?** The column already exists, the booking view already
  displays it, the estate-wide search already indexes it. Adding a
  new `beds24_sync_failures` table would duplicate infrastructure and
  fragment the operator's view.

---

*Written 2026-08-06 during a single session that shipped 4 commits*
*(94d9c82c, e8bdc7b1, 6d236fba, bffc013e) after a week of debugging*
*silent billing failures. Steve authored the "read the code, no*
*guessing" instruction that forced the audit that found the router*
*bug — a single line change (env-var gate → connection-state gate)*
*that had been silently affecting 38 accounts.*
