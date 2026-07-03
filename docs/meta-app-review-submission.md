# Meta App Review — WhatsApp Cloud API submission

Submission for GAS Travel's WhatsApp Business app to move from
Development Mode → Live Mode. Approval unlocks unrestricted recipient
sends + the Embedded Signup flow for operator-owned WABAs.

---

## Permissions requested

| Permission | Why GAS needs it |
|---|---|
| `whatsapp_business_messaging` | Send booking lifecycle templates (confirmation, cancellation, payment receipt, balance reminder) to guests + free-form messages to operator clients within the 24h window |
| `whatsapp_business_management` | Programmatically manage Meta-approved templates per WABA, read template approval states, support operator Embedded Signup |
| `business_management` | Required by the Embedded Signup flow so operators can connect their own WhatsApp Business Account from within GAS Admin |

---

## Use Case description (paste verbatim into Meta's form)

> **GAS Travel** is a multi-tenant SaaS platform for independent
> hospitality businesses — boutique hotels, vacation rentals,
> hostels and self-catering cottages. Operators use GAS to run their
> booking, payments, guest communications and channel-manager
> integrations from a single admin UI.
>
> **WhatsApp Business is integrated for three distinct use cases:**
>
> **1. Transactional booking lifecycle messages to guests.**
> When a guest books a stay through any GAS-connected channel
> (direct site, Booking.com, Beds24-routed OTAs), GAS sends Meta-
> approved utility templates at four lifecycle moments: booking
> confirmation, booking cancellation, payment receipt, and balance
> due reminder. Each template uses five body variables: guest first
> name, property name, check-in date, check-out date, and reference
> or amount. These are utility messages tied to a real reservation
> the guest has just made — never marketing.
>
> **2. Operator-to-GAS support channel.**
> Independent operators using the GAS SaaS need a low-friction way
> to ask GAS support for help — billing questions, integration
> setup, technical issues. WhatsApp is the channel they prefer over
> email or a ticketing system. Operators message GAS Support's
> WABA number; the message is matched in our backend to their
> account; our support staff replies through GAS Admin within the
> 24-hour conversation window.
>
> **3. Embedded Signup for operator-owned WhatsApp Business
> Accounts.** Many operators want guest-facing messages to come
> from their own branded WABA (e.g. "The Cotswold Retreats" from
> a UK number) rather than the GAS platform default. Embedded
> Signup lets them connect their existing WABA — or create one —
> directly inside GAS Admin without leaving our product. After
> they connect, their lifecycle messages, ad-hoc guest replies,
> and template approval all flow through their own WABA. Inbound
> guest replies arrive in the operator's own GAS inbox; replies
> sent from GAS go from the operator's number.
>
> All messages are explicitly initiated by either: (a) a real
> guest booking event, (b) a guest's prior message opening the
> 24-hour conversation window, or (c) the operator's own outbound
> action. We do not send unsolicited marketing messages. We do
> not buy phone lists. Recipients can reply STOP at any time — we
> record opt-outs in our `inbox_messages` table and suppress
> further sends for that phone.
>
> The webhook receives all status callbacks (sent / delivered /
> read / failed) and stores them against the original message in
> `inbox_messages` for full audit. Sender attribution is
> per-account: each operator's account_id is tagged on every
> message they're a party to, scoped via our auth model so an
> operator cannot see another operator's traffic.

---

## Screen recording checklist (2–3 minutes)

Record continuously on one device; no cuts. Show:

1. **Operator enables lifecycle WhatsApp** — log into GAS Admin →
   Apps → WhatsApp → pick an account → ⚙️ Lifecycle settings →
   tick "Enable lifecycle WhatsApp for this account" → Save.

2. **Guest makes a booking** — switch to the public booking widget
   on a property under that account → fill the booking form →
   submit. The submission flow ends on a confirmation page.

3. **Lifecycle WhatsApp lands on guest's phone** — show your phone
   receiving the `booking_confirmation` template. Read the body
   on-screen so reviewers can see the 5 variables filled
   correctly.

4. **Guest replies** — type any reply on the phone, send. Show the
   message thread on the phone.

5. **Operator sees the reply in GAS Inbox** — switch back to GAS
   Admin → Messages → the reply appears tagged with the right
   account, conversation thread view shows both messages.

6. **Operator replies from GAS Admin** — type into the WhatsApp
   reply composer → click "💬 Send WhatsApp Reply" → switch to
   phone → reply lands on the guest's WhatsApp.

7. **Operator-to-support flow** — same operator messages the GAS
   Support WABA number from their phone → show it landing in
   GAS Admin master inbox tagged with their account.

---

## Pre-submission checklist

- [ ] Privacy Policy URL live at `https://gas.travel/privacy`
  - Must include a WhatsApp-specific section: what data is sent
    to Meta, how long it's retained, how users opt out
- [ ] Terms of Service URL live at `https://gas.travel/terms`
  - Must reference WhatsApp Business Solution Terms compliance
- [ ] App icon: 1024×1024 PNG, no transparency, no rounded corners
- [ ] App display name: "GAS Travel"
- [ ] Business description (50–250 chars): "Property management
  platform for independent hotels and vacation rentals. WhatsApp
  delivers booking lifecycle messages and connects operators with
  guests and GAS Support."
- [ ] Webhook URL verified + returning 200 (already confirmed in
  Railway logs)
- [ ] `messages` field subscribed on the WABA webhook (already
  confirmed today)
- [ ] At least 4 templates approved (all 4 lifecycle UTILITY
  templates are already APPROVED on the WABA)
- [ ] Screen recording uploaded to YouTube (unlisted) or directly
  to Meta's form — URL ready
- [ ] Test recipient numbers in dev mode still active for any
  follow-up testing Meta wants you to run

---

## Submission steps

1. Meta Business Manager → **Your App** (the WhatsApp Business one)
   → **App Review** (left nav)
2. **Permissions and Features** → search for each permission above
   → click "Request"
3. For each permission, Meta opens a form requesting:
   - Use case description (paste from above)
   - How permission is used (one short paragraph per permission)
   - Screen recording URL
   - Whether app handles platform data (yes — booking + contact +
     message metadata)
4. **App Mode** → still Development. Don't switch to Live yet;
   Meta does that automatically on approval.
5. **Submit for Review**.

Typical timeline: 3–7 days for utility-case apps. They may come
back once with clarifying questions — answer the same day if you
can; reviewers move on quickly.

---

## After approval

1. Meta flips the app to Live Mode automatically — allow-list
   disappears.
2. Remove the 5 test numbers if you want (not required).
3. Tier 2 Embedded Signup becomes functional — wire the 💬 WA
   button to actually open Meta's signup flow.
4. Test on one production operator first (Cotswolds /
   Hebden / Park Row) before opening to the rest.
