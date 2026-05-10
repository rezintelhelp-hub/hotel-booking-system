# Phase 2 — Booking Payment Ops

> **Status:** Design doc, no code yet. Design conversation: 2026-05-10.
> **Predecessor:** `docs/phase-1-guest-entity-plan.md` (delivered, all 11 tasks live).

## TL;DR

Add a **"Booking Payment Ops"** section to the booking detail covering three administrator-driven actions that GAS doesn't standardize today:

1. **Add charge** — ad-hoc fees mid-booking or post-stay (saved-card off-session, or payment link)
2. **Refund** — full or partial against existing charges (endpoint half-built; needs UI + `payment_transactions` integration)
3. **Block on card / hold deposit** — manual-capture PaymentIntent that hosts can "block £200" with, then capture (with claim+dispute flow) or release

All three share the same `payment_transactions` ledger, the same `sendEmail` → `guest_communications` audit trail (Phase 1), and the same R2-backed evidence pipe (Phase 1).

The system **doesn't enforce one workflow** — it ships configurable rails. A budget hostel and a luxury villa run very different deposit policies on the same code.

---

## Why now

| Pain | Today |
|---|---|
| Hosts ask "how do I refund a guest?" | Endpoint exists at `server.js:48468` but no admin UI; doesn't write to `payment_transactions` |
| Hosts ask "how do I charge for damage / extra cleaning?" | Nothing built; closest is Enigma "Card Guarantee" (3rd-party manual) or Beds24 manual entry |
| Hosts ask "how do I block £200 on the card?" | Nothing built. Stripe is hardcoded to `capture_method: 'automatic'` |
| Compliance | Damage charges captured with no evidence trail or dispute window — chargeback risk + EU consumer-protection risk |

Phase 1 (Guest Entity) gave us the data plumbing: canonical guests, magic-link portal, R2 doc upload, comms log. Phase 2 builds the **operations** that act on bookings using that plumbing.

---

## Strategic decisions

### 1. Hold mechanism: Stripe manual-capture + SetupIntent

**Phase 2 ships Stripe-only.** ~95% of GAS clients are on Stripe; the path is well-understood and the rest of the architecture is forward-compatible with other gateways when we add them.

```
At booking          → SetupIntent saves the card (no money moved)
Host clicks "Block" → PaymentIntent with capture_method: 'manual' fires
                       (bank reserves funds, guest sees "pending" in bank app)
Host captures £X    → £X transfers (full or partial), rest of hold drops
Host releases       → hold drops in 1-7 days, no money moved
Auth expires (7d)   → hold drops automatically, no money moved
```

**Why both SetupIntent + manual-capture PI:** SetupIntent saves the card so we can re-auth or off-session charge later (covers the 7-day expiry problem and the "no card on file at checkout" case). Manual-capture PI is the actual visible "block" the guest sees. Together they cover every scenario.

### 1a. Other gateways: deferred to a later phase

GAS has `bookings.enigma_card_token` columns and an unused `/api/bookings/:id/charge-card` endpoint, plus plans for Authorize.net (Pedro/Atlantis). Both are explicitly **out of scope for Phase 2**:

- **Enigma**: One existing client uses it solely as a card-collection spam filter at booking — no live charge flow. Phase 2 doesn't touch this; their existing flow keeps working untouched. A future "spam filter via Stripe SetupIntent" migration could retire Enigma cleanly, or we wire owner-gateway-config UX and ship full Enigma support — separate decision, separate session.
- **Authorize.net**: Sandbox credentials still pending from Pedro. When that integration lands, the deposit pattern extends naturally.

The schema and gateway abstraction layer keep the door open for both — `bookings.deposit_hold_gateway` column accepts `stripe` today with `enigma` / `authnet` reserved values for later.

### 2. When to hold: configurable per property

Per-property `deposit_policy.hold_mode`:

| Mode | Behaviour |
|---|---|
| `at_booking` | SetupIntent + manual-capture PI fired immediately at booking |
| `at_checkin` | SetupIntent at booking, host clicks "Block £X" on or before arrival day |
| `on_demand` | SetupIntent at booking; hold fired only when a claim is filed |
| `none` | No hold, no SetupIntent |

`on_demand` is the most useful default — most stays end fine, the hold is theatre. With a saved card you can hold-and-capture in one action when actual damage occurs.

### 3. The 7-day expiry problem

Stripe auth holds expire after 7 days (extendable to 30 once, by request). For stays ≥ 7 nights this could expire mid-stay.

**Solutions baked in:**
- Auto re-auth at day 6: cancel old PI, create fresh PI for the same amount
- Fall back to saved-card off-session charge if re-auth fails (3DS / card issues)
- For stays > 30 nights: skip the hold entirely, rely on saved card at checkout

### 4. Claim flow with dispute window

Captures don't happen silently. Every capture is a **claim** the guest has a chance to respond to:

1. Host opens claim → amount + reason + evidence (photo via Phase 1 R2 pipe)
2. Status: `filed`. Guest emailed via `sendEmail` (logged to `guest_communications`)
3. Guest portal shows the claim with evidence and Accept / Dispute buttons (configurable window, default 48h)
4. **Guest accepts** → host can capture (still a separate explicit click — money never moves automatically)
5. **Guest disputes** → claim goes to `admin_review`; master/account admin resolves
6. **Timer expires** → claim auto-accepts (configurable; some jurisdictions/hosts want this off)

Why a separate accept and capture: the audit trail wants two distinct events. "Guest accepted at 14:32" + "Host captured £45 at 16:08" reads cleanly to a chargeback adjudicator. One automatic step doesn't.

### 5. Each host owns their policy

We don't encode "the law" universally — we encode the **mechanics** (disclose, evidence, notify, log) and let each account configure thresholds. That's the difference between a hospitality platform and a payment processor: we provide the rails, the host provides the policy.

Per-account `accounts.deposit_policy` + per-property `properties.deposit_policy` (overrides) — same JSONB pattern as the Phase 1 `accounts.id_policy`.

---

## Schema

```sql
-- BOOKINGS — extend with hold tracking (additive, IF NOT EXISTS)
-- deposit_hold_gateway is forward-compatible: 'stripe' is the only Phase 2
-- value, but 'enigma' and 'authnet' are reserved for later phases.
ALTER TABLE bookings ADD COLUMN deposit_hold_gateway    VARCHAR(20) DEFAULT 'stripe'; -- 'stripe' (Phase 2); 'enigma'|'authnet' reserved
ALTER TABLE bookings ADD COLUMN deposit_hold_pi_id      VARCHAR(255);  -- Stripe PaymentIntent (manual-capture)
ALTER TABLE bookings ADD COLUMN deposit_hold_setup_id   VARCHAR(255);  -- Stripe SetupIntent for the saved card
ALTER TABLE bookings ADD COLUMN deposit_hold_amount     DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN deposit_hold_currency   VARCHAR(3);
ALTER TABLE bookings ADD COLUMN deposit_hold_expires_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN deposit_hold_status     VARCHAR(20);   -- none|setup|authorised|released|captured|expired

-- ACCOUNTS — deposit policy JSONB (default off, account-wide)
ALTER TABLE accounts ADD COLUMN deposit_policy JSONB DEFAULT '{
  "hold_mode": "on_demand",
  "default_amount": 200,
  "max_amount": 1000,
  "currency_inherits_from_property": true,
  "disclosure_required": true,
  "evidence_required": true,
  "auto_accept_hours": 48,
  "notify_before_capture": true,
  "allowed_reason_categories": ["damage", "cleaning", "missing_item", "extra_guest", "noise_violation", "smoking", "other"],
  "max_per_claim": null
}'::jsonb;

-- PROPERTIES — per-property override (NULL = inherit from account)
ALTER TABLE properties ADD COLUMN deposit_policy JSONB;

-- PAYMENT_TRANSACTIONS — already has the right columns. Just expand allowed values:
--   transaction_type: 'charge' | 'refund' | 'auth' | 'capture' | 'release' | 'expired'
--   parent_transaction_id (new) — refund/capture/release reference the original auth/charge
ALTER TABLE payment_transactions ADD COLUMN parent_transaction_id INT REFERENCES payment_transactions(id);
CREATE INDEX idx_payment_tx_parent ON payment_transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;

-- BOOKING_DEPOSIT_CLAIMS — new table, claim lifecycle
CREATE TABLE booking_deposit_claims (
  id                  SERIAL PRIMARY KEY,
  booking_id          INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  filed_by_user_id    INT,                               -- the host admin who filed
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(3),
  reason_category     VARCHAR(40),                       -- whitelisted by deposit_policy.allowed_reason_categories
  reason_text         TEXT,
  evidence_doc_ids    INT[] DEFAULT '{}',                -- references guest_documents(id) — Phase 1 R2 pipe
  status              VARCHAR(20) NOT NULL,              -- draft|filed|accepted|disputed|auto_accepted|admin_review|resolved|captured|waived
  filed_at            TIMESTAMP,
  guest_responded_at  TIMESTAMP,
  guest_response      TEXT,                              -- their dispute reasoning
  auto_accept_at      TIMESTAMP,                         -- filed_at + policy.auto_accept_hours
  resolved_at         TIMESTAMP,
  resolved_by_user_id INT,
  resolved_outcome    VARCHAR(20),                       -- accept_full|accept_partial|reject
  resolved_amount     DECIMAL(10,2),                     -- final captured amount (≤ amount)
  resolved_notes      TEXT,
  capture_tx_id       INT REFERENCES payment_transactions(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_claims_booking ON booking_deposit_claims(booking_id);
CREATE INDEX idx_claims_status ON booking_deposit_claims(status, auto_accept_at) WHERE status IN ('filed', 'admin_review');
```

All ALTERs are `ADD COLUMN IF NOT EXISTS`, table create is `CREATE TABLE IF NOT EXISTS`. Same migration pattern as Phase 1 — additive, idempotent, safe on re-run.

---

## State machines

### Hold lifecycle

```
                     ┌──────┐
   no policy / none → │ none │
                     └──────┘

                     ┌──────────────┐
   booking + policy →│ setup        │  SetupIntent only — card saved, no hold
                     └──────┬───────┘
                            ↓ (host clicks Block, or auto on at_checkin date)
                     ┌──────────────┐
                     │ authorised   │  manual-capture PI live, money reserved
                     └──┬───────┬───┘
        (host releases) │       │ (host captures via claim flow)
                        ↓       ↓
                  ┌──────────┐ ┌────────────┐
                  │ released │ │ captured   │  (full or partial)
                  └──────────┘ └────────────┘

                     ┌──────────┐
   day 7 untouched → │ expired  │  auto-event from cron, or Stripe webhook
                     └──────────┘
```

### Claim lifecycle

```
              (host opens)
                    ↓
              ┌──────────┐
              │  draft   │   editable, no guest notification yet
              └────┬─────┘
                   ↓ (host clicks Submit)
              ┌──────────┐
              │  filed   │   guest emailed, auto_accept_at set
              └─┬──┬───┬─┘
  (guest accepts)│ │   │ (timer fires)
                 │ │   │
                 ↓ │   ↓
        ┌─────────┐│  ┌──────────────┐
        │ accepted││  │ auto_accepted│
        └────┬────┘│  └────────┬─────┘
             │     │           │
             │   (guest disputes)
             │     ↓           │
             │  ┌──────────────┐
             │  │  disputed    │   guest_response captured
             │  └──────┬───────┘
             │         ↓
             │  ┌──────────────┐
             │  │ admin_review │   master/account admin reviews
             │  └──────┬───────┘
             │         ↓
             │  ┌──────────────┐
             │  │  resolved    │   resolved_outcome: accept_full|accept_partial|reject
             │  └──────┬───────┘
             ↓         ↓
        ┌──────────────────────────────┐
        │  captured  (host clicks)     │   capture_tx_id populated
        └──────────────────────────────┘   OR  waived (resolved_outcome=reject)
```

A claim only moves money on the explicit `captured` step. Even after `accepted` or `auto_accepted`, the host clicks "Capture £X" — never automatic. That gives the audit trail two distinct timestamps which reads cleanly to chargeback adjudicators.

---

## Endpoints

### Refund (existing — needs hardening)
- `POST /api/admin/bookings/:id/refund` — wrap existing endpoint, add scope check, write `payment_transactions` row with `transaction_type='refund'` + `parent_transaction_id` linking to the original charge.
  - Body: `{ amount, reason }`
  - Default: full refund. Partial via amount.

### Add charge
- `POST /api/admin/bookings/:id/add-charge`
  - Body: `{ amount, label, reason, method? }`
  - If `bookings.stripe_payment_method_id` is set → off-session charge, return tx
  - Else → create Stripe Payment Link, email guest via `sendEmail` wrapper (logged automatically), return `{ payment_link_url, sent_to }`

### Hold management
- `POST /api/admin/bookings/:id/setup-deposit-card` — create a SetupIntent for the saved card; returns client_secret to be confirmed at checkout time
- `POST /api/admin/bookings/:id/block-deposit` — fire the manual-capture PI; uses saved PM
  - Body: `{ amount, currency }` (defaults from property/account policy)
  - Updates `bookings.deposit_hold_pi_id` + `_status='authorised'`
  - Inserts `payment_transactions` with `transaction_type='auth'`
- `POST /api/admin/bookings/:id/release-deposit` — cancel the PI
  - Updates status to `released`, inserts `transaction_type='release'`
- `POST /api/admin/bookings/:id/extend-deposit-auth` — Stripe extension (one-shot, +23 days)

### Claim flow
- `POST /api/admin/bookings/:id/claims` — create claim (draft or filed). Body: `{ amount, reason_category, reason_text, evidence_doc_ids, submit }`
- `GET /api/admin/bookings/:id/claims` — list
- `PATCH /api/admin/claims/:id` — update draft, attach more evidence, submit (`status='filed'`)
- `POST /api/admin/claims/:id/resolve` — admin path after dispute. Body: `{ outcome, amount, notes }`
- `POST /api/admin/claims/:id/capture` — fire the actual capture once status allows (accepted | auto_accepted | resolved). Inserts `transaction_type='capture'`, links `capture_tx_id`.

### Guest portal endpoints (extends Phase 1 Your Stay)
- `GET /api/public/your-stay/:token/claims` — list claims against this booking
- `POST /api/public/your-stay/:token/claims/:claimId/respond`
  - Body: `{ action: 'accept' | 'dispute', response_text? }`
  - Sets `guest_responded_at` + `status` accordingly

### Cron / webhook handlers
- `POST /api/webhooks/stripe-deposit` — handle `payment_intent.canceled` / `.amount_capturable_updated` / `.succeeded` / `.requires_action` events for hold-related PIs
- Cron: every 30min, scan `booking_deposit_claims WHERE status='filed' AND auto_accept_at <= NOW()` → flip to `auto_accepted`
- Cron: daily, scan `bookings WHERE deposit_hold_status='authorised' AND deposit_hold_expires_at < NOW() + interval '24 hours'` → either re-auth or expire-notify host

---

## UI changes

### Booking edit modal — new "Payment Ops" section

Below the existing payment fields. Always visible (master + account admin), gated by booking status.

```
┌─ Payment ledger ─────────────────────────────────────────┐
│ All charges, refunds, and holds for this booking:        │
│ ─────────────────────────────────────────────────────────│
│ 2026-05-10  Deposit charged  £200.00 ✓  Stripe ····4242  │
│ 2026-05-10  Card saved (SetupIntent) — for security      │
│ 2026-05-15  Hold authorised  £200.00 (releases day 7)    │
│ ─────────────────────────────────────────────────────────│
│ [+ Add charge]  [+ Refund]  [+ File claim]  [Release hold]│
└──────────────────────────────────────────────────────────┘
```

- Action buttons context-aware: "Block on card" only shown if no active hold; "Release / Capture" only if active hold exists; "+ File claim" only if hold + booking on/past arrival
- Each ledger row links to a detail modal (full Stripe transaction view if applicable)

### Claim modal (host)

- Amount input (capped by `deposit_policy.max_per_claim` if set)
- Reason category dropdown (from policy whitelist)
- Reason text (free)
- Evidence upload (reuses Phase 1 file picker → R2 → `guest_documents`)
- Save draft / Submit buttons
- Below: list of any existing claims with status badges

### Your Stay portal — claim notification (guest)

If a claim is filed against this booking:

- Top-of-page banner (red): "The host has filed a claim of £45 — please review by 12 May 14:00"
- Claim card: amount, category, host's reasoning, evidence (photos/PDFs viewable), expand for full text
- Accept (green) / Dispute (amber) buttons
- Dispute opens textarea: "Tell the host why you disagree"
- Once responded: read-only timeline of what's happened

### Master admin — Disputed Claims view

New nav item under "Bookings & Revenue", master-only:

- Table of all claims in `disputed` / `admin_review` status across all accounts
- Click → split view: claim details, host evidence, guest response side-by-side
- Resolve button: outcome (accept_full | accept_partial | reject) + amount + notes

### Property settings — Deposit Policy

New tab/section in the property edit view:

- Hold mode dropdown (none / at_booking / at_checkin / on_demand)
- Default amount + currency
- "Override account default" toggle
- Disclosure text (the line shown to guests at booking)
- Auto-accept hours slider (0 — 168)
- Notify-before-capture toggle + warning hours
- Reason categories multi-select

### Account settings — Default Deposit Policy

Same UI, account-level. Per-property settings inherit unless overridden.

---

## Compliance considerations

The system enforces mechanics; each host configures policy for their jurisdiction.

| Jurisdiction | Key rules | Policy default |
|---|---|---|
| **UK (Consumer Rights Act 2015)** | Reasonable, predictable, disclosed | `disclosure_required: true`, `evidence_required: true`, 48h notice |
| **EU general (Consumer Rights Directive)** | Same — disclosure + reasonableness | Same default |
| **Spain (LGDCU art 60, 89)** | Disclosure must be specific (not buried T&Cs); amount can't be "disproportionate" | `max_amount: 500`, 24-48h notice; SES Hospedajes export (separate feature) |
| **Germany** | Specific consent required, not general T&Cs | `disclosure_required: true` enforced even if account toggles off |
| **France** | "Caution" tradition expects bank guarantee/cash; card holds tolerated for STR | Permitted; default same as EU |
| **US (FTC + state UDAP)** | Disclose clearly, no unfair/deceptive | Permissive; default `auto_accept_hours: 0` allowed |
| **Card schemes (Visa/MC)** | Capture for goods rendered; partial OK; auth window 7d | Hard-enforced via Stripe; out of our hands |

**Key mechanic enforcement (always on, not configurable):**

- Every claim records `filed_by_user_id`, `filed_at`, immutable `payment_transactions` rows
- Capture is always a separate explicit click — no auto-money-movement
- Guest response window is non-zero by default (configurable per account but always ≥ 0)
- Evidence upload is recorded with timestamps and `verification_method`
- Email of every state change goes through `sendEmail` → `guest_communications`

---

## Migration plan

Three commits, deployable in maintenance windows. **Per the new memory rule, batch — don't burst.**

### Commit 1 — Schema + payment_transactions integration on existing flows

- All ALTER ADD COLUMN IF NOT EXISTS
- New `booking_deposit_claims` table
- Backfill `payment_transactions` rows for existing successful charges (best-effort from `bookings.deposit_paid` / `balance_paid_at`) — script in `scripts/backfill-payment-transactions.js`
- No UI, no behaviour change for existing flows
- Smoke test: existing booking creation still works, payment_transactions rows now appear

### Commit 2 — Refund + Add Charge

- New `/api/admin/bookings/:id/refund` (wraps existing) + new `/add-charge` endpoint
- "Payment Ops" section on booking modal showing ledger + the two buttons
- No hold mechanics yet
- End-to-end test: create test booking → refund → verify ledger + Stripe + email log

### Commit 3 — Hold + Claim flow (the big one)

- Gateway abstraction layer (`lib/payment-gateways/stripe-deposit.js`)
  — Enigma + Authorize.net modules deferred until those integrations are needed
- All hold + claim endpoints (call into the abstraction so additional gateways drop in cleanly later)
- Host claim modal in admin
- Guest claim notification + Accept/Dispute UI in Your Stay portal
- Master admin Disputed Claims view
- Property + account deposit policy UI
- Stripe deposit webhook handler
- Cron jobs (auto-accept timer + auth-expiry watcher)
- End-to-end test: book → block → file claim → guest accepts → host captures → ledger + emails verified

---

## Effort estimate

| Piece | Days |
|---|---|
| Schema + backfill (commit 1) | 1 |
| Refund UI + Add Charge endpoint + UI (commit 2) | 2 |
| Gateway abstraction layer (`lib/payment-gateways/`) | 0.5 |
| Stripe deposit module | 1 |
| Hold endpoints + state machine | 1 |
| Claim flow endpoints | 1 |
| Host claim modal + ledger UI | 1.5 |
| Guest portal claim view | 1 |
| Master admin Disputed Claims view | 1 |
| Property/account policy UI | 1 |
| Stripe webhook + cron | 0.5 |
| End-to-end testing in Stripe test mode | 1 |
| **Total** | **~11.5 days** |

---

## Risk assessment

| Risk | Mitigation |
|---|---|
| 7-day auth expiry mid-stay | Auto re-auth at day 6; fallback to saved-card off_session |
| 3DS friction at re-auth | If 3DS required at re-auth, send email with portal link to re-confirm; no silent failure |
| Guest disputes flood | Master admin queue with workflow; same as Stripe disputes |
| Chargeback after waived claim | Evidence chain is immutable + timestamped; defensible |
| Saved card cancelled mid-stay | `payment_intent.requires_action` webhook → email host + guest |
| Currency mismatch (property currency ≠ booking currency) | `payment_transactions.currency` tracked per-row; no aggregation in mixed currencies |
| Multi-room group bookings | Hold attaches to the **lead booking** (lowest id in group); claim references lead booking; covered by existing `group_booking_id` linkage |
| Bookings imported from channel managers (Beds24, Hostaway) without GAS-saved card | Hold mode degrades to `none` — no SetupIntent, no auth possible. Show "card not on file" warning to host. |

---

## Phase 3 hooks (post-this-build)

- **Enigma owner-onboarding** — surface `payment_configurations` entries for non-Stripe gateways (Worldpay / Adyen / etc.) so properties using Enigma vault can use the Phase 2 hold/claim flow with their own merchant gateway behind the proxy
- **Authorize.net deposit module** — drop-in `lib/payment-gateways/authnet-deposit.js` once Pedro's sandbox credentials land
- **Spam-filter via SetupIntent** — optional migration of the one Enigma-as-spam-filter client off the vault and onto Stripe SetupIntent, retiring one third-party dependency
- **Recurring claim patterns / fraud signals** — guest with N disputes across hosts → flag
- **Insurance integration (Superhog, GuardHog)** — handoff at claim file time as alternative to direct hold
- **Smart-lock damage events** — IoT integration auto-files draft claims with sensor evidence
- **Multi-currency settlement** — for hosts whose payout currency differs from their charge currency
- **Recurring stays / monthlies** — cycle deposit policy per stay-period

---

## Appendix A — Why not Stripe Connect "destination charges with manual capture"?

Stripe Connect offers `transfer_data + capture_method='manual'` for marketplace-style flows. GAS is **not** a marketplace — each property's Stripe account is independent. A direct PI with manual capture on the property's account is simpler, has no platform-fee complexity, and keeps each host's funds in their own Stripe.

## Appendix B — Why not custodial holds (we hold the £200)?

Holding guest money on GAS's balance creates massive regulatory burden — money transmitter licensing in most US states, e-money licence in EU, Payment Services Directive 2 in UK. Stripe's auth-only sidesteps all of this: the bank holds the money, GAS never touches it, GAS isn't a financial institution.

## Appendix C — Gateway abstraction layer

Phase 2 introduces a thin gateway dispatch in front of the four hold operations (`block`, `release`, `capture`, `reauth`). It lands in `lib/payment-gateways/` so additional backends drop in cleanly later without rewriting the claim flow:

```
lib/payment-gateways/
  index.js              # picks the gateway based on bookings.deposit_hold_gateway
  stripe-deposit.js     # PaymentIntent manual-capture flow                ← Phase 2
  enigma-deposit.js     # wraps existing enigma_card_token + /charge-card  ← deferred (no live Enigma charge clients today)
  authnet-deposit.js    # AUTH_ONLY / PRIOR_AUTH_CAPTURE / VOID            ← deferred (Pedro sandbox pending)
```

Each module exports the same four functions: `block(booking, amount)`, `release(booking)`, `capture(booking, amount)`, `reauth(booking)`. The endpoints in server.js stay gateway-agnostic — they just call into `lib/payment-gateways`.

The `bookings.deposit_hold_gateway` column tells the dispatch which module to load. In Phase 2 it's always `'stripe'`; reserved values for later phases are documented in the schema comment.

## Appendix D — Enigma in scope today

GAS has the Enigma vault relationship (`ENIGMA_CLIENT_ID` / `ENIGMA_CLIENT_SECRET` in env) and one client uses it for **card-as-spam-filter** at booking — the card is captured to validate the booking is real, never charged. That flow is **untouched by Phase 2** — they stay on their existing path until either:

- (a) we revisit Enigma and build the owner-gateway-config UX so charges actually flow through to the owner's own merchant gateway, OR
- (b) we migrate the one client to Stripe SetupIntent (which serves the same spam-filter purpose) and retire the Enigma integration

Either is a separate session, separate decision. Phase 2 doesn't depend on either.

## Appendix E — Why not Stripe Connect "destination charges with manual capture"?

Stripe Connect offers `transfer_data + capture_method='manual'` for marketplace-style flows. GAS is not a marketplace — each property's Stripe account is independent. A direct PI with manual capture on the property's account is simpler, has no platform-fee complexity, and keeps each host's funds in their own Stripe.

## Appendix F — Why not custodial holds (we hold the £200)?

Holding guest money on GAS's balance creates massive regulatory burden — money transmitter licensing in most US states, e-money licence in EU, PSD2 in UK. Stripe's auth-only sidesteps all of this: the bank holds the right to the funds, GAS never touches the money, GAS isn't a financial institution.

---

*Last updated: 2026-05-10. Authored: design conversation Steve + Claude.*
