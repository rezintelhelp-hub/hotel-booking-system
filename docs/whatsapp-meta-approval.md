# WhatsApp Meta Approval — handover

**Owner:** Lehmann (helping Steve)
**Goal:** Submit GAS Travel's WhatsApp Business app for Meta App Review so we can leave Development Mode (5-number test cap) and run lifecycle WhatsApp at scale.

---

## Done already (no action needed)

- 4 lifecycle templates approved by Meta on WABA `1515372740242815`:
  `booking_confirmation`, `booking_cancelled`, `payment_receipt`, `balance_reminder`
- 1 onboarding template submitted, PENDING approval:
  `support_welcome` (id `1313550160371574`)
- Helper `sendBookingLifecycleWhatsApp()` wired into booking lifecycle events
  - confirmation on booking create
  - cancelled on cancel
  - payment_receipt on final-balance-paid
  - balance_reminder via auto-messages `payment_due` rule
- Per-account UI: Apps → WhatsApp → ⚙️ Lifecycle settings + 💬 Connect own WABA (the second is the Embedded Signup button, blocked on this approval)
- Webhook receiving + signature-verifying; `messages` field subscribed (verified today)
- Inbound routing: matches sender phone against `accounts.contact_whatsapp` first, then `bookings.guest_phone` within 30 days, tags `inbox_messages.account_id` accordingly
- Inline WhatsApp reply composer in GAS Inbox thread view, with live 24h-window timer
- Per-booking resend endpoint: `POST /api/admin/bookings/:id/resend-whatsapp`
- Privacy policy at `gas.travel/privacy` now has Section 6 (WhatsApp Business Messaging) — Meta-compliant language
- Terms of service at `gas.travel/terms` now has Section 8 (WhatsApp Business Messaging) — Meta-compliant language
- Microsoft 365 alias `privacy@gas.travel` → development@gas.travel created

---

## To do for submission

### 1. End-to-end guest flow test (proves the platform works)

We never tested the actual **guest** path cleanly. Internal support flow
(operator → GAS) works. Guest flow uses the same plumbing but the recipient
phone is on a booking, not on an account.

To verify before recording:

- Use a phone that isn't on any `accounts.contact_whatsapp` row
  (a friend's phone, or temporarily clear Julie's contact_whatsapp on
  account 197 then use her phone)
- Add that phone to Meta dev-mode allow-list
- Make a booking on a property under account 197 with that phone as
  `guest_phone`
- Wait for the `booking_confirmation` WhatsApp to land
- Reply on that phone
- Verify the reply lands in account 197's GAS Inbox tagged correctly
- Reply from the GAS Inbox WhatsApp composer
- Verify the reply lands back on the phone

### 2. App icon

- 1024×1024 PNG
- No transparency
- No rounded corners
- Use the GAS logo
- Save somewhere accessible for the submission form

### 3. Screen recording (2-3 min)

Single continuous take showing:

1. Operator opens GAS Admin → Apps → WhatsApp → ⚙️ Lifecycle settings → ticks Enable → Save
2. Operator makes a test booking via the booking widget on a property under their account
3. Cut to the guest's phone — `booking_confirmation` template received with name / property / dates / reference
4. Guest replies "what time is check-in?" on the phone
5. Cut back to operator's GAS Admin → Messages → reply appears in the inbox
6. Operator types reply in the green WhatsApp reply box → clicks Send
7. Cut to phone — operator's reply arrives
8. Bonus: show operator-to-GAS-Support flow (operator messages the platform WABA → master GAS Admin sees it)

Tooling: Supademo (export as MP4) or QuickTime (macOS built-in). Upload to YouTube as **Unlisted** (not Private — Meta needs to view without login).

### 4. Submit in Meta Business Manager

Use the prepared text in `docs/meta-app-review-submission.md` for:

- Use Case description (paste verbatim — already written, Meta-compliant)
- Permissions requested:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
  - `business_management`
- Privacy Policy URL: `https://gas.travel/privacy`
- Terms of Service URL: `https://gas.travel/terms`
- Screen recording URL (YouTube unlisted, from step 3)
- App icon (from step 2)

Meta App Review form is in Meta Business Manager → Your App → App Review → Permissions and Features.

Typical review time: 3–7 days. They may come back with clarifying questions — answer same day if possible, reviewers move on quickly.

### 5. After approval (separate piece of work, not blocking submission)

- Wire the `💬 Connect own WABA` button to actually launch Meta's Embedded
  Signup modal (currently shows a placeholder error). Requires:
  - `FACEBOOK_APP_ID` env var on Railway
  - `FACEBOOK_APP_SECRET` env var on Railway
  - `FB_WHATSAPP_CONFIG_ID` env var on Railway
  - Front-end SDK integration (FB.login with WhatsApp config_id)
- Allow-list test numbers can be removed (optional, no functional difference)
- Confirm Tier 1 production sends work with a real (non-test) client
- UI button for the per-booking resend endpoint
  (POST `/api/admin/bookings/:id/resend-whatsapp`)

---

## Reference docs in this repo

- `docs/meta-app-review-submission.md` — full Use Case + checklist
- `scripts/wa-submit-lifecycle-templates.js` — Meta template submitter
  (idempotent — re-run to add new templates without affecting approved ones)
- `server.js:692` — `sendWhatsAppMessage()` low-level send
- `server.js:734` — `sendBookingLifecycleWhatsApp()` high-level lifecycle send
- `server.js:56321` — inbound webhook + routing
- `server.js:117546` — `POST /api/inbox/reply/whatsapp` reply endpoint
- `public/gas-admin.html:87092` — `openWhatsAppSettings()` per-account UI
- `public/privacy.html` — privacy policy
- `public/terms.html` — terms of service

---

## Open questions for Steve

- Is the GAS pricing for Tier 1 lifecycle + Tier 2 branded decided yet?
  (Affects whether we surface a "Add WhatsApp" upsell in the Apps panel
  or just turn the toggle on for everyone after approval.)
- Stripe subscription item / billing flow for paid WhatsApp tier not built —
  do we want it shipped before submission or can we toggle manually for the
  first few clients?
