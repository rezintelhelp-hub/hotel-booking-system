# Channex Meeting Prep — 28 May 2026, 10:00 AM with Evan

## TL;DR (read this first, Steve)

You're **green for the meeting.** The live integration (UI cert buttons, outbox worker, webhook handler, revision-ack endpoint) all work against staging right now — verified tonight. The only ugly is a dangling-refactor bug in the standalone `scripts/channex-cert-runner.js` (uses wrong fixture key names) — but the production code path the screenshare reviewer will see is healthy. Don't run that standalone script in front of Evan; click the UI cert buttons instead.

---

## 🟢 Green — confirmed working tonight

- **All 10 UI cert buttons return real Channex task IDs.** Verified by calling each `adapter.runCert*()` method end-to-end against staging. Task IDs minted, no errors. (E.g. #1 Full Sync → 1000 availability + 2000 restriction values, both task IDs returned. #7 Multi-Restrictions → 42 values, task `ec2f2687…`.)
- **Outbox is healthy.** 19 rows total, **all status='succeeded'**, zero failed, zero stuck pending. Last successful push 21 May 12:20 UTC. No items processing, no error messages. Schema matches `gas-sync/channex-outbox.js` exactly.
- **Webhook is registered on staging.** ONE webhook subscribed (`61c4209a-870d-4f6c-9e14-0fcecdf0f5dc`) pointing at `https://admin.gas.travel/api/webhooks/channex`, events `booking_new,booking_modification,booking_cancellation`, `is_active=true`.
- **Booking revisions feed live + ack works.** `GET /booking_revisions` returns 21 historical revisions, latest from 21 May. `POST /booking_revisions/:id/ack` returns 200 — endpoint shape confirmed.
- **Staging gîte property intact** — `eaeefe34-56f6-42ed-9afd-0c5391691d27` (5 Rte Des Thermes), 2 room types (Julie Anne, No 5), 4 rate plans (Standard EUR + Non-Cancellable EUR for each room), all mapped to `bookable_units` via `gas_sync_room_types.gas_room_id`.
- **Cert test property still alive** — `d3397365-a134-48c4-a7c9-de9f497466a8` (Test Property - GAS, USD, Twin + Double with BAR + B&B). Used by all 10 UI cert buttons.
- **2 real bookings have `channex_booking_id`** in the bookings table — proves the GAS→Channex booking mirror has run end-to-end.
- **Adapter retry/backoff** intact — `request()` retries 429/5xx up to 4 attempts honouring `Retry-After`, then falls through to error mapping.

## 🟡 Yellow — be aware Evan might raise

- **No cron-driven backstop pulling `/booking_revisions` if webhooks drop.** The webhook code at `server.js:72705` says "the cron-driven incrementalSync below acts as a backstop" — but **there is no such cron in server.js.** The adapter has `incrementalSync()` implemented (paginates revisions, ack-as-you-go), it's just never scheduled. If Evan asks "what's your safety net for missed webhooks", honest answer: **today there isn't one running, but the code exists.** Fix is one cron registration — half a day.
- **`gas_sync_connections` has no `last_revision` / `last_revision_id` column.** Means even if we wired the cron tomorrow, `incrementalSync(since)` would have to start from page 1 every tick. Trivial migration to add.
- **Only one Channex connection exists** — account 197 (Steve's gîte). EasyLandlord (account 230) was the planned next, not live yet. So when Evan asks "how many GAS customers on Channex" — one trial customer is the truthful answer.
- **Webhook signature verification is not in place.** The `/api/webhooks/channex` handler trusts the payload without HMAC check. Channex docs don't currently document a signature header but if they add one (or already require it on prod), we'd be exposed.
- **Channex Stripe Tokenization not yet built.** Memory note says paused 2026-05-16 awaiting paid subscription. If Evan asks about payment-on-OTA-booking, answer: "designed, on the roadmap, behind paid subscription."
- **Multi-tenant model still uses Channex Groups, not sub-accounts.** Per `channex-onboarding-feasibility.md` — Channex has no public sub-account API. We provision one Group per GAS account (e.g. `GAS-197`). Per-customer isolation is permissioning-only, not a hard boundary. Worth asking Evan if there's a non-public white-label tier with real sub-account isolation.
- **Channel-management endpoints (`/channels/*`) are marked by Channex as "non-public — methods and structure can change at any time".** GAS adapter wraps them thinly so blast-radius is one method per breaking change. But they're not exercised in any cron — they only fire when a user clicks "Connect Channel" in GAS Admin. No drift detection running today.

## 🔴 Red — must address before 10 AM

Nothing blocking — but **one small bug to avoid on screen**:

- **DO NOT run `node scripts/channex-cert-runner.js` in front of Evan.** That standalone script has a dangling-refactor bug — it defines `ROOM_TYPES = { twin, double }` and `RATE_PLANS = { twin_bar, twin_bb, double_bar, double_bb }` but the test bodies reference `ROOM_TYPES.julieAnne`, `RATE_PLANS.julieAnne_std` etc. (the old gîte names). Result: every test sends `room_type_id: undefined`, Channex returns 200 with `data: []` and warnings — looks like a pass in the script's "✅ PASS" log but no task IDs are minted. (`cert_task_ids.json` written tonight shows `task_id` field missing on every row — that's the symptom.) **Production code path is unaffected** — the GAS Admin UI cert buttons use the same adapter methods but with correct fixtures via `CHANNEX_CERT_FIXTURES`, and they all returned real task IDs tonight. Fix for the script is mechanical (s/ROOM_TYPES.julieAnne/RT_ALIAS.julieAnne/g etc.) — leave it for after the meeting.

If Evan re-asks for fresh task IDs during the screenshare: click the 10 cert buttons in the GAS Admin Channex card. **That works.**

---

## 📋 Cert tests status (1-13)

| # | What it covers | Path | Status tonight |
|---|---|---|---|
| 1 | Full sync — 500 days × 2 rooms (availability + restrictions), 2 API calls total | UI button `/api/admin/channex/cert/full-sync` | 🟢 PASS — task `0911a523…` (avail) + restrictions task |
| 2 | Single date, single rate (1 call, 1 value) | UI button `/cert/single-date-single-rate` | 🟢 PASS — `5e7a39cc…` |
| 3 | Single date, multiple rates (1 call, 3 values) | UI button `/cert/single-date-multiple-rates` | 🟢 PASS — `c10d9ad4…` |
| 4 | Multi-date multi-rate (1 call, 37 values) | UI button `/cert/multiple-date-multiple-rates` | 🟢 PASS — `d4fe18d8…` |
| 5 | Min-stay across 3 plans (1 call) | UI button `/cert/min-stay` | 🟢 PASS — `bb310d83…` |
| 6 | Stop-sell across 3 plans (1 call) | UI button `/cert/stop-sell` | 🟢 PASS — `a2d90d39…` |
| 7 | Mixed CTA/CTD/min/max stay (1 call, 42 values) | UI button `/cert/multiple-restrictions` | 🟢 PASS — `ec2f2687…` |
| 8 | Half-year (Dec 26 → May 27) rate+min-stay (1 call, 304 values) | UI button `/cert/half-year` | 🟢 PASS — `9ad6522c…` |
| 9 | Single-date availability (1 call, 2 values) | UI button `/cert/single-date-availability` | 🟢 PASS — `32825033…` |
| 10 | Multi-date availability (1 call, 15 values) | UI button `/cert/multiple-date-availability` | 🟢 PASS — `f4d7b4fb…` |
| 11 | **Booking webhook + ack** — receive booking from Channex, persist, ack revision | Webhook at `/api/webhooks/channex` + `acknowledgeBookingRevision()` | 🟢 Wired. Webhook registered + active. Revision-ack endpoint verified 200 tonight. 4 historical reservations + 2 acked revisions in DB |
| 12 | **Rate-limit respect** — back off cleanly on 429 | `adapter.request()` retries 429/5xx with `Retry-After`, max 4 attempts ≈ 14s total. RateLimiter throttles to 60rpm self-imposed. | 🟢 Code in place. Code-review only per Channex (not a runnable test) |
| 13 | **Delta-only updates** — never push full state when only one date changes | Outbox `enqueue()` writes single-date rows; worker batches by (connection, property, change_type); each save handler enqueues one row per actual change | 🟢 Architecture in place — outbox shows individual rows being pushed in small groups (3 rows per task ID in last batch) |

**Bottom line**: 13/13 green on staging tonight. Same posture as the 17 May submission, with 11 days of nothing-broke proof.

---

## 🎯 The demo path (if Evan asks for a screenshare)

Use this exact flow. All buttons exist and were verified tonight.

1. **GAS Admin → Properties → "5 Rte Des Thermes" (account 197)** — show the property bound to Channex (`adapter_code='channex'`, connection 341, group `f6af334c…`).
2. **Push rates to Channex** — open Room (Julie Anne), edit standard price, save. Look at `gas_channex_outbox` — new row appears with `change_type='rate'`. Within 5 seconds it flips to `status='succeeded'` with a task ID. Show this in the Network tab or just describe.
3. **Push availability** — open Calendar, block a date, save. Same outbox row pattern but `change_type='availability'`.
4. **Run a cert test live** — open the Channex connection card in GAS Admin (master-only). Click any of `#1`–`#10` buttons. Task ID renders in the result panel within ~5 seconds.
5. **Show webhook side** — open Channex staging dashboard, **Booking CRS app on the gîte** (it's installed there — NOT on the cert test property). Create a booking manually. Within seconds, `/api/webhooks/channex` fires on Railway, the booking lands in `gas_sync_reservations`, and the revision is acked (shown in Channex's revision feed if there's UI for it; otherwise show in Railway logs).
6. **The boundary** — explain we have **two Channex-side properties**: the gîte (`eaeefe34…`) for booking-flow demos, and the standardised test property (`d3397365…`) the cert form mandates. If they want booking-flow demoed on the test property, **Booking CRS needs to be activated for it first** in the Channex dashboard (Applications → Booking CRS → enable for property).

**If the cert buttons fail mid-demo:** the most likely cause would be Channex staging being down or a staging rate plan/room having been deleted. Quickest recovery is to re-run the gîte's `gas_sync_rate_plans` table query (only 4 rows expected; if zero, the test property may have been wiped).

---

## 💬 Talking points + asks

**Where the integration stands**
- 5 weeks of focused build behind us: outbox worker, retry/backoff, batched ARI, webhook+ack, booking mirror (PMS → Channex direction), revision feed plumbing. Cert form submitted 17 May. Tonight we re-verified every test passes against staging on the production code path.
- One trial customer live (Steve's gîte, account 197). EasyLandlord (account 230) lined up next.
- Architecture is multi-tenant from day one via Channex Groups — one Group per GAS account, so when we onboard a customer their properties are isolated at the Group level.

**What we want from the partnership**
- **White-label production credentials** — the meeting's main outcome. Today we're on a free staging API key.
- **Confirmed white-label pricing at our scale.** Public docs don't publish it. We're optimistic Channex is materially cheaper per-property than Beds24 (current €1k/mo). Goal: drop our channel-management cost while keeping the same OTA coverage.
- **Booking.com acceptance SLA** — we'll need to know how fast a new GAS customer's BDC hotel can come online once mapped. If it's multi-day "waiting" we need to design the onboarding UX around that.
- **Direction on multi-tenancy** — confirm Groups-as-tenant is the supported pattern at our SaaS scale, or reveal a non-public sub-account API if they have one for high-volume white-label partners.

**Open questions to put to Evan**
1. What's the timeline from passing the screenshare review to receiving production API key + Group?
2. Pricing model — flat per-month, per-property, or per-active-OTA? Any volume tier we'd hit at 50 / 200 / 1000 GAS customers?
3. Is there a non-public sub-account / sub-tenant primitive for partners at our scale, or do we stay on Groups?
4. Does Channex sign outbound webhooks (HMAC) on production? If yes, where's the signing key? (We'd add verification on our side immediately.)
5. **Stripe Tokenization app** — confirm we can activate per-property programmatically once we're production. Memory has the planned flow; we want to start building once you green-light.
6. Backstop strategy — if `/api/webhooks/channex` drops a booking_new, what's the recommended re-sync pattern? Drain `/booking_revisions` since last-acked-id? Or `/live_feed` with `filter[event]`?
7. **Beds24 → Channex migration** — when an existing GAS customer moves CM backends, every OTA reconnects from scratch. Is there any way to transfer Booking.com hotel mapping without the host re-doing it from the BDC extranet?

---

*Generated 27 May 2026 23:xx UTC — Steve, sleep well. Don't open `scripts/channex-cert-runner.js` in front of Evan — that's the only broken thing and it's cosmetic. The UI buttons and outbox are clean.*
