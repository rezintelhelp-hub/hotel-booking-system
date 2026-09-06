# Beds24 Outbound Push Adapter — Spec

**Owner:** Steve
**Status:** Queued — not started
**Estimate:** 3-5 days focused work
**Goal:** GAS becomes the source of truth for Beds24-connected clients. Beds24 becomes a passive channel manager, same posture as Channex. Anything set in GAS (availability, restrictions, rates, min-stay) lands reliably in Beds24 within seconds, with detectable failures — no silent divergence.

---

## Why now

Current state:
- `gas-sync/beds24-outbox.js` `enqueueAvailabilityForRoom` returns `false` — kill-switched 2026-06-30
- Reason: POST to `/inventory/rooms/calendar` returned `{success: true}` but Beds24 didn't apply the block. `numAvail` stayed at 1. Silent failure risked double-bookings
- Kill switch was a stop-gap; policy `CHANNEL_WRITEBACK.md` formalised "Beds24 stays read-only" as an interim posture
- Steve's goal: clients manage everything in GAS. Beds24 present only as OTA plumbing. Same UX as Channex clients

This spec is the path to that goal.

---

## Non-goals

- Not changing Beds24 as PMS for existing clients who prefer managing there. Read-side (Slice B) already pulls their changes into GAS
- Not touching Channex adapter (already works)
- Not building a "who owns this room" account-level toggle. Source tracking per-row (already added for CTA/CTD) is the right layer
- Not migrating existing clients wholesale — this ships the capability; migration is per-client with sign-off

---

## Success criteria

1. Operator toggles anything in GAS calendar → change visible in Beds24 within 60s
2. If push fails, operator sees a red X on that cell within 90s (not next day)
3. No double-booking incidents attributable to GAS↔Beds24 desync in 60 days post-launch
4. GAS-set overrides survive Beds24 sync tick (already true for CTA/CTD via source tracking; extend estate-wide)
5. `beds24-outbox` shape mirrors `channex-outbox`: worker, batching, retry with backoff, dead-letter, admin diag endpoints

---

## Phase 1 — Systematic API probe (1 day)

**Deliverable:** `docs/beds24-write-endpoints.md` — definitive map of every V2 write endpoint, what it actually does, request/response shape, side effects.

Test matrix (probe against a known throwaway Beds24 property):

| Concern | Candidate endpoint | Test |
|---|---|---|
| Set availability (numAvail=0) | POST /inventory/rooms/calendar | Set → re-fetch → confirm numAvail=0 |
| Set availability (numAvail=1) | Same | Reverse — confirm numAvail=1 |
| Set noCheckIn override | POST /inventory/rooms/calendar with override:"noCheckIn" | Re-fetch → confirm override string |
| Clear override | Same, override:"" or null | Confirm cleared |
| Set price per date | ? | ? |
| Set min-stay | ? | ? |
| Set stop-sell (channel-level) | Different endpoint likely | Investigate |

**For each endpoint:**
- What does Beds24 return on success?
- Does the change actually persist? (re-fetch and compare — the trap that killed us in June)
- What does Beds24 return on failure? Error codes?
- Rate limits (headers, per-endpoint limits)
- Idempotency — safe to re-send same payload?
- Batch semantics — one call for many dates or one call per date?

**Also probe:** does Beds24 have webhooks for calendar changes (not bookings)? If yes, we could subscribe and avoid polling on the read side too.

Diag endpoint: `POST /api/admin/diag/beds24-probe` — takes a room + date + action, executes against Beds24, dumps full request/response cycle. Master-admin only, throwaway.

---

## Phase 2 — Adapter build (2 days)

**Model:** copy `gas-sync/channex-outbox.js` structure. Same table shape, same worker loop, same retry semantics.

**Schema — `gas_beds24_outbox`:**
```sql
CREATE TABLE gas_beds24_outbox (
  id BIGSERIAL PRIMARY KEY,
  account_id INTEGER,
  gas_room_id INTEGER NOT NULL,
  beds24_room_id INTEGER NOT NULL,
  change_type VARCHAR(32) NOT NULL,  -- 'availability' | 'restriction' | 'rate'
  payload JSONB NOT NULL,             -- { date, count?, override?, rate?, minStay? }
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_try_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  beds24_response JSONB,              -- full API response for audit
  verify_read_response JSONB,         -- what we read back after the push
  verified_ok BOOLEAN,                -- did the read-back match what we sent?
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

Note the two new columns vs Channex: `verify_read_response` + `verified_ok`. This is the anti-June-2026 machinery. Every push writes → re-reads → compares. Divergence flips `verified_ok=false` and the row goes to dead-letter, not silent-success.

**Enqueue helpers:**
- `enqueueAvailabilityForRoom(pool, gasRoomId, date, count)` — mirrors Channex signature
- `enqueueRestrictionForRoom(pool, gasRoomId, payload)` — CTA/CTD/minStay
- `enqueueRateForRoom(pool, gasRoomId, date, price)` — per-date rate push

**Worker loop:**
- Poll every 5s (like channex-outbox)
- Batch by (account, beds24_room_id, change_type) — one Beds24 call per batch when the endpoint supports batching, otherwise per-row
- Refresh token per-account per-tick (cache in a Map with TTL)
- On success: read back → compare → set `verified_ok` → status='succeeded'
- On failure or divergence: exponential backoff, MAX_ATTEMPTS=6, then dead-letter (status='failed')

**Rate limiting:** honour Beds24's per-account limit (~1000/hr). Adaptive throttle based on `X-RateLimit-*` headers. Circuit-break if we hit 429 → back off entire account for 5 min.

---

## Phase 3 — Wire into GAS admin flows (1 day)

Same call sites that already enqueue Channex pushes (mostly `/api/admin/availability`, cancellation paths, booking-modify paths) also enqueue Beds24 pushes when the room is Beds24-connected.

- Reuse the `channexEvents[]` pattern in `/api/admin/availability`, add parallel `beds24Events[]`
- Fire enqueues post-commit (already the pattern for Channex — copy)
- No-op for rooms without a Beds24 mapping
- Source tracking (already live for CTA/CTD) extends estate-wide: any operator write stamps `<concern>_source='operator'`, Beds24 pulls check the guard before overwriting

---

## Phase 4 — Verify-after-push + admin visibility (0.5 day)

- Every succeeded outbox row triggers a targeted re-fetch of that (room, date, concern)
- If Beds24 response ≠ what we pushed, mark `verified_ok=false`, alert (operator + Steve)
- Admin diag endpoint `GET /api/admin/beds24/writeback-health?account_id=X&hours=N` — mirrors `/api/admin/channex/writeback-traffic`
- Calendar cell shows subtle red border if any outbox row for that (room, date) is in status='failed' or verified_ok=false — operator sees at-a-glance

---

## Phase 5 — Rollout (0.5 day)

- Feature flag `beds24_outbound_enabled` per-account (defaults off)
- Enable on Steve's own gites (account 197) first — testbed pattern per `feedback_use_steves_gites_as_testbed.md`
- Run for 48h under observation
- Enable per-client with sign-off + a short "GAS is now source of truth — please manage restrictions in GAS not Beds24" note to operator
- Once 5 clients live and stable for 30 days, flip default to on for new Beds24 signups

---

## Risks

1. **Beds24 API silently accepts writes it doesn't apply** — the exact trap from June 2026. Verify-after-push in Phase 2 is the mitigation. If we find endpoints where this still happens, they're dead-lettered not "succeeded"
2. **Rate limits** — bulk operations (extend a whole property's calendar for 90 days) could burn Beds24 quota. Adaptive throttle + circuit breaker mitigates
3. **Beds24 has no webhook for calendar changes** — we still poll for inbound. That's fine; write side is what this project fixes
4. **Two-way ping-pong** — operator sets X in GAS → GAS pushes to Beds24 → next Beds24 pull comes back with X → guard prevents overwrite (source='operator'). Already handled per CTA/CTD; extend the pattern to any concern this adapter pushes
5. **Migration surprises** — a client with 100 rooms and 12 months of overrides might see a huge outbox flush on flag-flip. Rollout paces this per-account

---

## Testing strategy

- **Unit tests** on the extractor helpers (like `_extractBeds24CheckinFlags`) — feed synthetic Beds24 responses, assert output
- **Integration test** against Steve's own gites (account 197): set → verify → clear → verify cycle on availability, CTA, CTD, min-stay, rate
- **Load test** — enqueue 1000 rows for one account, verify the worker drains without hitting Beds24 rate limits
- **Failure injection** — force Beds24 to return 500 / 429 / silent success; assert retry, dead-letter, and verify-fail branches all fire correctly

---

## Explicit non-decisions (defer)

- Whether to also push booking-create to Beds24 (currently Beds24-connected clients let Beds24 handle bookings). Out of scope; different concern
- Migration of existing manual GAS overrides — when the flag flips on, the outbox flushes them. If that's too aggressive, add a "warm start" mode that only pushes new writes
- Beds24 webhook for calendar changes — Phase 1 will confirm if it exists; if yes, separate mini-project to subscribe

---

## Related work

- `docs/beds24-client-offboarding.md` — existing pattern for taking a client off Beds24 entirely
- `gas-sync/channex-outbox.js` — the reference implementation this adapter mirrors
- `feedback_verify_full_send_path_before_claiming_safe.md` — the workflow-test-fire incident. Same instinct: don't ship "it looks like it worked" as "it worked"
- Slice A + B (2026-09-06) — CTA/CTD per-date override + Beds24 inbound sync + source tracking. This adapter is the outbound half
