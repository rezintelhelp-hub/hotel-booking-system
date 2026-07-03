# Channex Meeting — 28 May 2026, 10:00 AM (Steve + Evan)

Live notes captured during the meeting. Steve is dictating; Claude records.

## API patterns Evan called out

### Booking revisions — fetch by ID, not list

- **Use**: `GET /booking_revisions/:id` per webhook
- **Not**: `GET /booking_revisions` (the list endpoint)
- Webhook delivers the revision ID → fetch THAT specific revision → process → ack
- The list endpoint is the **backstop only** for catching up after missed webhooks, not the primary flow
- Docs: https://docs.channex.io/api-v.1-documentation/bookings-collection#get-booking-revision-by-id

**Action**: refactor `incrementalSync()` in `gas-sync/adapters/channex-adapter.js` and the webhook handler at `/api/webhooks/channex` to fetch-by-id rather than polling list.

---

## Property creation defaults (Evan called out)

When GAS creates a Channex property, set these flags exactly:

```json
{
  "allow_availability_autoupdate_on_confirmation": true,
  "allow_availability_autoupdate_on_modification": false,
  "allow_availability_autoupdate_on_cancellation": false
}
```

**Why**:
- `on_confirmation: true` → Channex auto-decrements availability when a booking lands from an OTA. Prevents double-bookings before GAS even sees the webhook.
- `on_modification: false` → GAS is source of truth for date/quantity changes. We push the corrected availability ourselves.
- `on_cancellation: false` → Same — GAS handles re-opening the slot when a booking is cancelled, so we can apply our own rules (e.g. don't immediately re-open if it was within cancellation window).

**Action**: find property-create call in `gas-sync/adapters/channex-adapter.js`. Hard-code or surface as defaults in the property provision flow. Confirm any existing properties already created with wrong defaults — patch via `PUT /properties/:id` if needed.

---

## 💰 Monetization model — Stripe Connect with platform fee

**Evan confirmed** the pattern for OTA payments via Channex Stripe Tokenization:

```
OTA collects card → Channex tokenizes →
  Stripe charge on GAS account (we set application_fee_amount) →
  Stripe Connect routes net to Property's connected Stripe account
```

**What this gives GAS:**
- Automatic platform fee on every OTA booking processed
- Property owner's funds flow through Stripe Connect to THEIR account (we never touch the principal)
- No money-aggregator licence needed (EMI/PI in EU) because we don't hold funds
- Same pattern Shopify uses for payments, Mindbody for class bookings

**Pricing TBD** — what fee % is competitive vs Beds24's current model. Conservative reference: Stripe Connect platform fees of 0.5–2% are common in vertical SaaS.

**Build implications**:
- Every GAS customer needs a Stripe Connect account onboarded (Standard / Express / Custom)
- Set `application_fee_amount` on every PaymentIntent for OTA-originated bookings
- Direct GAS-website bookings: option to also take a platform fee OR pass-through (commercial decision per tier)
- Reporting in GAS Admin: per-month platform-fee earned per customer (becomes a P&L line for us)

**Action**: design the Stripe Connect onboarding wizard for GAS customers (probably Express for fastest onboarding). Pause on actual fee % until pricing meeting.

---

## 🤔 Open strategic question — how does GAS charge customers for Channex usage?

Evan asked us this directly. Worth answering before we sign anything.

**Cost we pay Channex** (per their pricing) needs to be recovered from GAS customers. Options:

| Model | How it works | Pros | Cons |
|---|---|---|---|
| **Bundle into tier** | Channel management free at Pro/Turbines/Direct tier. We eat the Channex cost from the subscription margin. | Simple for customer. No surprise bills. Predictable. | Margin pressure if a customer connects many OTAs. |
| **Pass-through with markup** | Show "Channel manager: £X/mo" line on the bill, marked up X%. | Transparent. Customer sees the value. | Looks like nickel-and-diming for a Pro-tier feature. |
| **Per-OTA monthly fee** | Each connected channel (Booking.com, Airbnb, Expedia, ...) costs £Y/mo on top of base subscription. | Aligns cost with value. Customer self-limits to needed channels. | Adds friction at signup. |
| **Per-booking fee** | £Z per booking processed via Channex. | Pure usage-based, fair. | Hard to forecast revenue. Hurts high-volume properties. |
| **Stripe platform fee covers it** | We don't charge for Channex directly — recoup via the application_fee_amount on Stripe payments. | Customer pays nothing extra on subscription side. Aligns with revenue. | Only works for OTA bookings with card; direct bookings via bank transfer pay no fee. |
| **Combo (recommended starting point)** | Base subscription (Pro = £99/mo includes 2 OTAs) + £15/mo per extra OTA + 1.5% platform fee on OTA card payments. | Predictable base + usage scales fairly. Matches Beds24-replacement story. | More moving parts to explain. |

**Decision needed before commercial launch:**
- Where on the spectrum we land
- Specific £ numbers for each lever
- Whether existing GAS customers grandfather in at no extra cost

**Anchor data points:**
- Beds24 today costs us €1k/mo across our entire customer base (we eat this)
- Mews / Cloudbeds bundle channel management into £150-300/mo seat pricing
- SiteMinder charges roughly £80/mo for channel management alone
- Most boutique B&Bs would balk at >£50/mo dedicated to "channel manager" line item

**Action**: pricing decision needed within ~2 weeks. Tie to the meeting we discussed for setting Pro/Turbines/Direct tier prices.

---

## ✅ MEETING OUTCOME — APPROVED

**GAS is approved as a Channex partner.** Production access and the commercial relationship are unblocked.

---

## 📋 Post-meeting punch list (in priority order)

### 🔴 P0 — Honest gaps Evan saw live

1. **Direct bookings don't auto-push to Channex.** When booking 148934 / 148948 were created in GAS, no outbox row was enqueued. Channex saw no update until I ran the urgent push scripts. Fix: wire `outbox.enqueue({ change_type: 'availability', ... })` into every booking-create code path (~14 sites) OR a single hook on `bookings INSERT`. Estimate: half a day.

2. **Cancellations / modifications need the same wiring.** When GAS decides to cancel or modify a booking, push the corrected availability to Channex via the outbox. Same shape as P0.1.

### 🟡 P1 — Evan's architecture guidance

3. **Use `GET /booking_revisions/:id` per webhook**, not the list endpoint. Webhook delivers the revision ID → fetch that specific revision → process → ack. List endpoint becomes backstop-only. Refactor `incrementalSync()` + webhook handler at `/api/webhooks/channex`.

4. **Property creation defaults** (must be set on every new Channex property GAS provisions):
   - `allow_availability_autoupdate_on_confirmation: true`
   - `allow_availability_autoupdate_on_modification: false`
   - `allow_availability_autoupdate_on_cancellation: false`
   - Audit existing gîte + cert test property — patch via PUT /properties/:id if wrong.

### 🟢 P2 — Commercial unlocks confirmed

5. **Stripe Tokenization + Stripe Connect** — green-lit. Build the integration now.
   - Property owner connects their Stripe via Stripe Connect (Express recommended for fastest onboarding)
   - GAS sets `application_fee_amount` on every PaymentIntent for OTA-originated bookings
   - We earn a platform fee on every OTA booking processed
   - No money-aggregator licence needed (funds never pool in our account)
   - Pricing TBD — needs separate pricing meeting

### 🟢 P2 — New product opportunity Evan flagged

6. **OTA messaging app** — Channex exposes messaging and review pull from connected OTAs (Booking.com / Airbnb / Expedia inbound messages, guest reviews, etc.). This is a discrete client-facing GAS feature:
   - Pull guest messages + reviews from every connected OTA into one inbox
   - Surfaces in the GAS Unified Inbox (already spec'd at `docs/GAS-Unified-Inbox-Spec.md`)
   - Combine with WhatsApp + email + Spark form inbound → genuinely unified guest comms
   - Sale story: "GHL/Mailchimp give you contacts. GAS gives you every conversation — OTA reviews, OTA messages, WhatsApp, email — in one place."
   - This is a Turbines-tier feature.

---

## 🎯 Strategic narrative locked in

After this meeting GAS has the four pillars of a real channel-manager-replacement platform:

1. **Channex production access** (this meeting) — inventory pipeline to every major OTA
2. **Stripe Tokenization + Connect** — monetize OTA payments + earn platform fee
3. **OTA messaging pull** — unified inbox covers OTA conversations not just web forms
4. **GAS Network** (Trail, Wall) — destination-side discovery loop

That's a complete product story for the £250-£1000/mo Pro/Turbines/Direct tiers.

---

*Meeting concluded — Channex partnership approved. Next: pricing meeting + start the punch list.*

---

## 📨 POST-MEETING — Production invite received (28 May, same day)

Evan emailed within hours of the meeting with:

**Invite link** (for Steve to action):
> https://portal.channex.io/invite/cIyYXCeqq_y-8E-I8uhqJNkTGnv_eMYF6AqIByf0n9o

**Instructions from Evan:**
- Subscribe to the **white-label plan**
- Billing is monthly on the 1st: **account fee + per-live-property fee**
- After subscribing, Channex creates a production account
- Steve then generates a production API key
- **Switch the base URL from `staging.channex.io` → `app.channex.io`**

### Action items
1. **Steve**: click the invite link, subscribe to white-label, save the production API key
2. **Claude**: update `gas-sync/adapters/channex-adapter.js` to support a production base URL via env var (`CHANNEX_BASE_URL` — defaults to staging until a production key is in place)
3. **Claude**: add a CI-style switch so production / staging keys can co-exist without code change
4. **Claude**: update `.env.channex` template to document both base URLs
5. **Steve + Claude**: once production key is live, move the gîte (account 197) over as the pilot — every other GAS customer migrates after we've proven the flow on Steve's own property

### Commercial confirmed
- **Pricing model**: account fee + per-live-property fee, monthly
- Specific £ TBD on production invoice — likely visible in the portal after Steve subscribes
- This answers the open "how does GAS charge customers" question — we can mark up at any of the levers we'd discussed once we know our cost

### Confirmation invite received
Steve received `https://app.channex.io/confirm-invite?token=...` — the one-time confirmation link that attaches him to Channex's white-label partner program. Action: click in browser, confirm, then grab the production API key from the portal.

### Once production key is in hand, next steps (Claude's punch list)
1. Add `CHANNEX_BASE_URL` env var to `.env.channex` with default `https://staging.channex.io/api/v1` + production override `https://app.channex.io/api/v1`
2. Update `gas-sync/adapters/channex-adapter.js` to read base URL from env
3. Set production API key in Railway env (replaces staging key)
4. Test by repeating the gîte cert flow against production
5. Onboard EasyLandlord (account 230) as first paying customer
6. Migration plan for Beds24 customers → start with Steve's gîte + Lehmann as proof, then sequence the rest
