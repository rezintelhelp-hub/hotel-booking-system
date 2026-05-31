# GAS Communications — Full Build Plan

**Version:** 2.0 · **Date:** 2026-05-31 · **Author:** Steve Driver

Supersedes the original `docs/GAS-Unified-Inbox-Spec.md` for the messaging-substrate plan. The Unified Inbox spec described the *what*; this document describes the *how* given what's already shipped.

---

## 1. Executive summary

GAS already has ~70% of the unified-communications substrate built. The remaining work — when sequenced correctly — is **~3-4 weeks** of focused work to ship a fully functional product with:

- **Unified inbox** for email, WhatsApp, Slack, Facebook Messenger, OTA messages via channel managers
- **Slack as the "Connect" spine** — the daily client-↔-GAS support loop runs through Slack (Steve already uses it that way; this formalises it as the support channel for every client)
- **Custom email domain per client** (system emails sent from `noreply@clientdomain.com` via Mailgun)
- **Multi-tenant WhatsApp Business** via Meta Embedded Signup — **Meta Tech Provider authorisation CONFIRMED** (unlocks self-onboarding for every client)
- **Social media outbound composer** — Turbine (FB Pages already wired; IG / LinkedIn / TikTok queued) folded into the same Inbox/Compose surface so outbound posts live next to inbound conversations
- **AI triage** powered by Claude (priority, draft replies, day summary)
- **PWA mobile shell** for operators to manage messages on the phone
- **Personal-account integration** for Steve (his own Gmail / iCloud / Slack inboxes alongside client/guest channels)

The strategic positioning: GAS becomes the unification layer that no competitor offers. Mews and Cloudbeds have inboxes but they're locked to their own bookings. Lodgify and most others have weak native messaging. Nobody combines inbound conversations + outbound social posting + per-client branded email in one operator surface. GAS sits ABOVE the channel managers and surfaces everything in one screen.

This maps to the **Connect + Connect + Connect + Grow** positioning: Connect (Slack support spine) + Connect (guest threads via OTA/WhatsApp/email) + Connect (branded outbound social + email) → Grow.

The dual-use angle is critical: every channel built for clients also serves Steve directly. Dogfooding solves Steve's own communication overload AND makes the product better.

---

## 2. Current state inventory (audited 2026-05-31)

### 2.1 Inbox substrate — ✅ COMPLETE

| Component | Location | Notes |
|---|---|---|
| `inbox_messages` table | server.js:~106094 | Channel-agnostic: channel, channel_message_id, thread_id, from_name, from_handle, subject, body, raw_payload, direction, status, category, sentiment, metadata |
| `inbox_channels` table | server.js | Per-account channel configs |
| `GET /api/inbox/messages/:accountId` | server.js:105416 | List with channel + status + search filters, unread counts |
| `GET /api/inbox/messages/:accountId/:id/thread` | server.js:105470 | Full thread |
| `PUT /api/inbox/messages/:id/status` | server.js:105500 | read / replied / archived with timestamps |
| `PUT /api/inbox/messages/bulk-status` | server.js:105523 | Bulk |
| `GET /api/inbox/unread-count/:accountId` | server.js:105543 | Sidebar badge |
| `GET /api/inbox/channels/:accountId` | server.js:105556 | Connected channels list |
| `POST /api/inbox/sync/gmail/:accountId` | server.js:105569 | Gmail pull via OAuth |
| `POST /api/inbox/reply/email` | server.js:105731 | Outbound email reply |
| "GAS Unified Inbox" UI | public/gas-admin.html ~1972+ | Filter tabs, message rows, thread view, reply box, channel badges |
| Master-admin auth gate | all `/api/inbox/*` | `authenticateUser` + `role === 'master_admin'` |

### 2.2 Email infrastructure — ✅ COMPLETE

| Component | Location | Notes |
|---|---|---|
| Mailgun API config | server.js:522 | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN=mg.gas.travel` |
| `sendEmail(...)` helper | server.js:829 | Resolves per-account sender, attaches DKIM, tracks delivery |
| Per-account sender resolver | server.js:~800 | Returns `{domain, displayName, replyTo, isBranded}` |
| `email_domains` table | server.js:~17659 | Tracks per-account custom domains: `domain, mailgun_domain_id, status, mailgun_state, dkim_record, spf_record, mx_records, tracking_records, verified_at, last_checked_at` |
| Add domain endpoint | server.js:17672 | POST to Mailgun, handles "already exists" |
| Verify domain endpoint | server.js:17737 | PUT `/domains/{domain}/verify` to Mailgun |
| Inbound email parser | server.js:105569 | Gmail sync writes to inbox_messages |
| Outbound reply | server.js:105731 | Send via Mailgun + log thread |

### 2.3 WhatsApp — ✅ COMPLETE single-tenant, multi-tenant ready

| Component | Location | Notes |
|---|---|---|
| `gas_whatsapp_configs` table | server.js:105996 | waba_id, phone_number_id, access_token, app_id, app_secret, webhook_verify_token, account_id (NULL = platform default) |
| Per-account WABA resolver | server.js:673 | Prefers per-account, falls back to platform default |
| Outbound send | server.js:~696 | `graph.facebook.com/v25.0/{phone_number_id}/messages` |
| Inbound webhook verify | server.js:51833 | GET — Meta verification challenge |
| Inbound webhook handler | server.js:51855 | POST — writes incoming messages to inbox_messages |
| HMAC signature check | server.js:51891 | Validates `x-hub-signature-256` against `app_secret` |
| Park Row WABA | gas_whatsapp_configs id=1, account_id=NULL | Currently the platform default; works as proof |
| **Meta Tech Provider authorisation** | Meta-side | ✅ Confirmed — unlocks Embedded Signup for multi-tenant |

### 2.4 Slack — 🟡 PARTIAL

| Component | Location | Notes |
|---|---|---|
| `/api/slack/events` GET | server.js:30167 | Health check |
| `/api/slack/events` POST | server.js:30171 | Handles URL verification + event_callback. Currently narrowly scoped to "thread reply in monitored channel becomes KB article". Does NOT write to inbox_messages. |
| `SLACK_WEBHOOK_URL` outbound | several call sites | Used for system notifications (legacy path; many should migrate to `sendMasterNotification` per `architecture_master_notifications.md`) |

### 2.5 Facebook — 🟡 PARTIAL

| Component | Location | Notes |
|---|---|---|
| Facebook App ID + Secret | env: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Provisioned |
| Facebook Pages OAuth start | server.js:103282 | `/api/oauth/facebook/start` redirects to FB OAuth |
| Facebook Pages OAuth callback | server.js:103311 | Exchanges code for long-lived user + page tokens, stores in `turbine_connections` |
| Page access tokens | `turbine_connections` table | Per-page tokens for GAS Turbine social posting |
| Messenger inbox | ❌ | Not yet wired — just need messages-subscription on existing tokens + handler |

### 2.6 CM message ingestion — ❌ NOT STARTED

| CM | Booking webhook | Message webhook |
|---|---|---|
| Beds24 | ✅ server.js:62532 | ❌ |
| Channex | ✅ server.js:73486 | ❌ |
| Hostaway | ✅ server.js:52033 | ❌ |
| Smoobu | ✅ server.js:52984 | ❌ |
| Hostfully | ❌ (no booking webhook either) | ❌ |

Booking webhooks prove the plumbing pattern. Each CM's message webhook is a parallel handler writing to `inbox_messages` with `channel='channex' | 'hostaway' | etc.` and `metadata.source_ota` per OTA.

### 2.7 AI triage — ❌ NOT STARTED

- Claude API (`api.anthropic.com`) standardised as the platform AI per `feedback_claude_only_ai.md`
- No inbox-side integration yet
- The DB schema already has `category` and `sentiment` columns on `inbox_messages` ready to populate

### 2.8 PWA shell — ❌ NOT STARTED

- Spec mentioned in CLAUDE.md ("PWA first")
- No service worker, no manifest, no install-to-home-screen handler
- Web Push (iOS 16.4+) supported, not yet wired

### 2.9 Personal-account integration for Steve — ❌ NOT STARTED

- Pattern is right (Gmail sync exists for any account_id)
- Schema needs either `inbox_channels.owner_user_id` OR a designated "platform" account_id for Steve's personal channels

### 2.10 Social media outbound (GAS Turbine) — 🟡 PARTIAL

GAS Turbine is the outbound counterpart to the inbound channels. It already exists as a separate surface — this plan folds it into the unified Inbox/Compose so operators see "what came in" and "what we said publicly" in one place.

| Component | Location | Notes |
|---|---|---|
| `turbine_connections` table | server.js:36524 | Per-account social account tokens (FB Pages tokens currently) |
| `turbine_campaigns` table | server.js:36615 | Campaign rows with `channels JSONB DEFAULT '{"email": false, "facebook": false, "instagram": false}'` |
| Facebook Pages OAuth | server.js:103282-103415 | Start + callback wired, tokens persisted |
| `POST /api/turbines/post/facebook` | server.js:103415 | Publishes to a connected FB Page |
| Email campaign send | server.js:102813 | Mailgun-based broadcast to contacts |
| Instagram | schema only | `channels.instagram` field exists in campaigns; OAuth + publish not wired |
| LinkedIn | ❌ | No OAuth, no posting endpoint, not in schema |
| TikTok | ❌ | No OAuth, no posting endpoint, not in schema |
| Composer UI in Inbox | ❌ | Turbine campaigns currently live in a separate nav section, not next to inbox threads |

**What "fold into comms" means:**
- Outbound social posts become rows in `inbox_messages` with `channel='facebook_post' | 'instagram_post' | …` and `direction='outbound'`, so they appear in the same surface as conversations
- Engagement back (comments, DMs to a post) attaches as inbound replies under the same thread
- Composer in Inbox can post to one or many social channels at once, reusing existing Turbine plumbing

---

## 3. Goals & success metrics

### 3.1 Functional goals

- **One inbox surface** for every operator — guest threads from every OTA, direct email, WhatsApp, Slack, Facebook
- **Slack as the Connect spine** — every paying client gets a shared Slack channel with GAS; that's the daily support, ops, and incident loop. Already Steve's preferred channel; this productises it so it's the same for every client and so messages from those channels surface in the GAS Inbox too
- **One outbound social composer** — post to FB/IG (and later LinkedIn/TikTok) from the same surface that handles inbound, engagement attaches back as threads
- **One review surface** — reviews from every connected OTA in one dashboard (deferred to v2.1)
- **Operator-branded outbound** — emails from `noreply@theirdomain.com`, WhatsApp from their own WABA
- **AI-assisted triage** — priority sort, suggested replies, day summary
- **Mobile-first** — operators run their business on the phone
- **Dogfooded by Steve** — his personal Gmail / Slack / iCloud all inside GAS

### 3.2 Success metrics (6 months post-launch)

| Metric | Target |
|---|---|
| Active monthly users of Inbox (per account) | 60% of accounts |
| Median time-to-reply (inbox messages) | < 2 hours during business hours |
| Custom email domains verified | 50% of paying accounts |
| Multi-tenant WABAs onboarded | 30% of paying accounts |
| Mobile sessions (PWA) as % of all sessions | 40% |
| Steve's personal Gmail volume routed through GAS | 100% |

---

## 4. Architecture overview

### 4.1 Channel adapter pattern

Every channel plugs into a single substrate via two adapters:

```
┌──────────────────────────────────────────────────────────────┐
│                       inbox_messages                          │
│        (channel-agnostic, single source of truth)             │
└────────────────────────┬─────────────────────────────────────┘
                         │
   ┌─────────────────────┼─────────────────────┐
   │                     │                     │
   ▼                     ▼                     ▼
[Ingestion]          [Read API]           [Reply API]
   ▲                     │                     │
   │                     ▼                     ▼
[Adapter]            [Inbox UI]            [Channel adapter]
   ▲                                            │
   │                                            ▼
[Webhook /        ┌───────────────────────────────────┐
 Pull cron]       │  Gmail / WhatsApp / Slack /       │
   ▲              │  Facebook / Channex / Hostaway /  │
   │              │  Beds24 / Hostfully / ...         │
External         └───────────────────────────────────┘
```

Each new channel is:
- One **ingestion adapter** (webhook handler OR polling cron)
- One **delivery adapter** (outbound API caller for replies)
- Optionally one **onboarding flow** (OAuth or credential capture)

After 2-3 channels are integrated, the pattern is solid and each new channel is 2-4 days.

### 4.2 Data flow — inbound message

```
External event (e.g. guest sends WhatsApp)
  → Channel webhook fires (POST /api/webhooks/whatsapp)
  → Adapter validates signature
  → Adapter extracts: channel_message_id, from_handle, from_name, body, thread_id
  → INSERT INTO inbox_messages (...)
  → (optional) AI triage: Claude API call → write category + sentiment + priority
  → (optional) Push notification to operator's PWA
```

### 4.3 Data flow — outbound reply

```
Operator clicks Reply in Inbox UI
  → POST /api/inbox/reply/:channel (e.g. /api/inbox/reply/whatsapp)
  → Server looks up channel adapter for the thread
  → Adapter calls channel's send API (WhatsApp Graph, Slack chat.postMessage, Mailgun send, etc.)
  → On success: INSERT INTO inbox_messages with direction='outbound', mark thread as 'replied'
  → On failure: surface error to operator, retry queue
```

### 4.4 Custom email domain — per-account branded sending

```
Client adds custom domain via Settings UI
  → POST /api/admin/email-domain/:accountId { domain: "cotswoldretreats.com" }
  → Server creates domain at Mailgun → returns DKIM/SPF/MX records
  → UI displays records with copy buttons
  → Client adds records to their DNS provider
  → Client clicks "Verify"
  → PUT /api/admin/email-domain/:accountId/verify
  → Mailgun verifies (10-30s); updates email_domains.status = 'verified'
  → All future sendEmail() calls for that account use noreply@cotswoldretreats.com
```

---

## 5. Phased build plan

### Phase 0 — Custom Email Domain UI (~3 days)

**Why first:** backend is already built; UI work pays off fastest; immediate trust + brand win for every existing client (Cotswolds going live this week benefits instantly); demonstrates the "GAS as substrate for client branding" pattern that other phases build on.

**Deliverables:**
- Settings page section: "Email Sending" with "Use your own domain" wizard
- Step 1: domain input + validation (`cotswoldretreats.com`)
- Step 2: DNS records display with copy-to-clipboard buttons for each (TXT _domainkey, TXT SPF, MX × 2, optional CNAME tracking)
- Step 3: "Verify" button calling existing verify endpoint
- Status indicator showing current state (`unverified` / `pending` / `verified` / `failed`)
- Auto-recheck every 5 mins for 1 hour after Verify clicked (poll Mailgun)
- "Disconnect" button to revert to platform default sending

**Acceptance criteria:**
- A new client can add their domain and have system emails branded within 30 minutes (assuming their DNS update is fast)
- After verification, booking confirmation emails for that account go from `noreply@theirdomain.com` (verifiable in email headers)
- If verification fails, the UI surfaces the specific record that's missing
- Until verified, system emails fall back to `noreply@mg.gas.travel` (no breakage)

### Phase 1 — Slack as the Connect spine (~2 days)

**Why next:** This is the most strategic phase, not just the cheapest. Slack is the channel through which every paying client should be able to reach GAS daily — questions, support, incidents, "can you check X for site Y", quick wins. Steve already runs his ops loop this way; this productises it. Every other channel in this plan serves *guest* communication; Slack serves *client* communication. They are equally important pillars.

**Strategic framing:**
- Each paid account gets a shared Slack channel between their team and GAS support
- All messages in those channels surface in GAS Inbox (under the relevant account) so Steve and any future support staff have a single queue
- Outbound replies can come from GAS Inbox OR from Slack directly — both write back to `inbox_messages` so the thread stays whole
- Existing KB-from-thread flow keeps working (a Slack reply tagged "KB" still becomes an article)
- This is the differentiator GAS clients won't get from Mews/Cloudbeds — direct line to the platform builder via the platform itself

**Deliverables:**
- Slack app installable per workspace via OAuth (`/api/oauth/slack/start` and `/callback`)
- Extend `/api/slack/events` POST to handle **all** message events, not just KB-thread replies
- For each event: write to `inbox_messages` with `channel='slack'`, `from_handle=slack_user_id`, `from_name=display_name`, `thread_id=slack_channel_id+thread_ts`, `account_id` resolved from workspace_id mapping
- Reply endpoint: `POST /api/inbox/reply/slack { message_id, body }` → uses Slack `chat.postMessage` API to post in thread
- Token storage: new table `slack_workspaces` keyed by account_id + workspace_id
- Preserve the existing KB-from-thread behaviour as a SEPARATE event handler (don't break it)
- Onboarding flow: when a new paid account is provisioned, prompt for "Connect your Slack workspace" → one-click OAuth → shared support channel auto-created

**Acceptance criteria:**
- Steve installs the GAS Slack app on his personal workspace AND on a pilot client workspace
- All messages in monitored channels appear in his GAS Inbox under the right account
- He can reply from GAS Inbox and the reply lands as a Slack thread reply
- A client message in their Slack channel reaches Steve's GAS Inbox within 5 seconds
- Existing KB-from-thread flow still works

### Phase 2 — Facebook Messenger Handler (~2-3 days)

**Why now:** Page OAuth is already built for Turbine; messaging webhook subscription uses the same tokens; cheapest extension of existing infrastructure

**Deliverables:**
- Add `pages_messaging` scope to existing Facebook Pages OAuth flow
- On callback, subscribe each connected page to the messages webhook
- New endpoint `POST /api/webhooks/facebook/messenger` validates signature + writes incoming messages to `inbox_messages` with `channel='facebook'`
- Reply endpoint: `POST /api/inbox/reply/facebook { message_id, body }` → uses Send API
- Existing `turbine_connections` table extended with `messenger_subscribed` boolean

**Acceptance criteria:**
- A client with FB Pages connected for Turbine can opt into Messenger inbox with one toggle
- Messages from their Page's Messenger appear in GAS Inbox
- Replies sent from GAS land in Messenger

### Phase 3 — WhatsApp Embedded Signup (~4 days)

**Why now:** Meta Tech Provider auth is wasted until clients can self-onboard; this is the strategic differentiator vs other multi-tenant PMS platforms

**What Meta Tech Provider approval has now unlocked (action checklist):**
- ✅ Embedded Signup popup via Facebook JS SDK (`feature_type='whatsapp_business_app_onboarding'`)
- ✅ `onbehalfof_business_id` parameter on Graph API calls — required for billing/audit attribution to the client's business, not GAS
- ✅ System-user access tokens (long-lived, do not expire) instead of fragile user tokens
- ✅ Programmatic webhook subscription per WABA (no manual setup in Meta Business Manager per client)
- ✅ Phone number registration via API (clients verify their number in the popup, we don't manually provision)
- ✅ Display name updates without re-approval (within Meta's brand guidelines)
- ⚠️ Still subject to Meta's per-WABA conversation pricing — track and pass through

**Deliverables:**
- Frontend: "Connect WhatsApp Business" button in account Settings → Facebook JS SDK Embedded Signup popup
- Configure Embedded Signup with `feature_type='whatsapp_business_app_onboarding'` and pre-fill account name + currency
- Callback handler `POST /api/whatsapp/embedded-signup-callback` receives `code` + Meta business credentials
- Server exchanges code for system-user access token (long-lived, doesn't expire)
- Server pulls `waba_id` and `phone_number_id` via Graph API
- Server subscribes to messages webhook on the new WABA
- INSERT INTO `gas_whatsapp_configs` with `account_id=X` + all credentials
- Status indicator on Settings: "WhatsApp connected: +44 7xxx xxxx" with disconnect option

**Acceptance criteria:**
- A client with no prior WhatsApp setup can click "Connect WhatsApp", complete the Meta popup (verifying their phone number), and have inbound + outbound WhatsApp working within 5 minutes
- Outbound: client sends a test message from GAS Inbox → guest receives WhatsApp from client's number
- Inbound: guest replies → message appears in GAS Inbox under correct account
- Per memory: don't expose Embedded Signup details to public copy yet (work it through with one pilot client first — Cotswolds is the obvious candidate)

### Phase 3.5 — Social Media Outbound Composer (~4-5 days)

**Why now:** Closes the comms loop. Phases 0-3 covered inbound + branded reply outbound. This phase folds **outbound broadcast** (social posting) into the same surface. Turbine FB posting already works; this surfaces it inside the unified Inbox/Compose UI and extends to Instagram (which is mostly wiring since IG Business runs through the same FB Graph). Can run in parallel with Phase 4 or Phase 5.

**Strategic framing:**
- Outbound social posts are written to `inbox_messages` with `direction='outbound'` and `channel='facebook_post' | 'instagram_post' | 'linkedin_post' | 'tiktok_post'`
- Each post becomes a thread root; comments / DMs to that post attach as inbound replies under the same thread
- Operators see "what we said publicly" alongside "what guests said privately" — both in one timeline per account
- Composer can target multiple channels in one click ("post to FB + IG")
- Existing Turbine Campaigns surface stays for email broadcast + scheduled multi-post campaigns; this is the **ad-hoc composer** path

**Deliverables:**
- New Compose button in Inbox UI ("New post") opens a social composer modal
- Composer: text, image upload, channel multi-select (FB / IG, more added later), schedule or post-now
- Backend: `POST /api/inbox/compose/social { account_id, channels, body, image_url, scheduled_at }`
  - For each selected channel, call the existing/new publisher (`/api/turbines/post/facebook` already exists; add `/post/instagram` via FB Graph IG Business)
  - Write outbound row to `inbox_messages` per channel
- Instagram OAuth: piggyback existing FB Page OAuth (IG Business is linked to FB Page), add `instagram_basic` + `instagram_content_publish` scopes
- LinkedIn: deferred to Phase 3.5b (own OAuth, Marketing API auth flow)
- TikTok: deferred to Phase 3.5c (TikTok for Business API auth flow)
- Inbound engagement webhooks: subscribe FB Page + IG to feed comment events; attach to the thread for the matching `outbound channel_message_id`

**Acceptance criteria:**
- Operator clicks New Post in Inbox, types message, picks FB + IG, clicks Post
- Both posts go live within 30 seconds
- Both posts appear as outbound threads in Inbox
- A guest comments on the FB post → comment appears as inbound reply under that thread
- Operator replies to the comment from Inbox → reply lands on FB

### Phase 4 — Personal accounts for Steve (~3 days)

**Why now:** Phase 0-3 prove the substrate works for client accounts. Steve's personal use is the final dogfooding step that makes the product authentic.

**Deliverables:**
- Add `inbox_channels.owner_user_id INTEGER NULLABLE REFERENCES users(id)` — when set, channel is scoped to that user, not an account
- Adjust inbox queries: master admin sees `(account_id = X) OR (owner_user_id = me)`
- Onboarding UI: "Add personal channel" in Steve's master-admin settings
  - Gmail OAuth (re-use existing flow, store on user not account)
  - iCloud IMAP (manual setup: server, port, username, password) — Apple's app-specific password works
  - Slack workspace (re-use Phase 1 flow, scope by owner_user_id)
- Add a "Personal" filter tab in the inbox UI alongside the account filter

**Acceptance criteria:**
- Steve connects his Gmail + iCloud + 1 Slack workspace
- His Inbox UI shows personal threads alongside client/guest threads, filterable
- Replies go via the correct adapter
- His Mac Mail / Spark usage drops to near-zero within a week

### Phase 5 — CM Message Ingestion (Channex first) (~3 days)

**Why now:** Validates that the substrate scales to CM message ingestion (the biggest aggregation win). Channex first because best API + multi-OTA reach (Booking.com, Airbnb, Expedia, Hostelworld, etc.)

**Deliverables:**
- New endpoint `POST /api/webhooks/channex/messages` (separate from existing booking webhook)
- Subscribe Channex accounts to message events (per Channex docs)
- Handler writes incoming OTA messages to `inbox_messages` with `channel='channex'`, `metadata.source_ota='Booking.com' | 'Airbnb' | ...`
- Reply endpoint `POST /api/inbox/reply/channex { message_id, body }` → routes through Channex send API back to the originating OTA
- Per memory rule `feedback_no_public_channex.md`: client-facing UI label is "OTA messages", not "Channex"

**Acceptance criteria:**
- A Channex-connected client (Steve's gîte? a Cotswolds property?) starts receiving OTA messages in GAS Inbox
- Replies from GAS appear in the originating OTA (verify by checking Booking.com / Airbnb dashboards directly)
- Messages are correctly tagged with `source_ota`

### Phase 6 — AI Triage Layer (~4 days)

**Why now:** Substrate proven, real volume flowing through. AI adds asymmetric value precisely when the inbox is busy.

**Deliverables:**
- New helper `await scoreInboxMessage(messageId)` → calls Claude API with thread context + property KB + booking metadata
  - Returns: `{ priority: 'urgent' | 'normal' | 'low', category: 'arrival' | 'complaint' | 'inquiry' | 'thanks' | ..., one_line_summary: '...', suggested_reply: '...' }`
  - Persist to `inbox_messages.category`, `.sentiment`, `.metadata.priority`, `.metadata.ai_summary`, `.metadata.ai_draft`
- Inbox UI surfaces priority pill (red urgent / amber normal / grey low) + one-line summary above body
- "Draft with AI" button on reply box → fills textarea with `ai_draft`, operator edits, clicks Send
- Daily digest cron: per account, summarise the day's new messages → push notification + inbox-pinned card

**Acceptance criteria:**
- Every new inbox message has priority + summary populated within 30s of arrival
- Operators report time-to-reply drops measurably (target: 30% reduction)
- AI cost per message stays under £0.001 (so 10,000 messages/month = £10)

### Phase 7 — PWA Mobile Shell (~5-7 days)

**Why now:** Substrate + UI + AI all proven on desktop. Mobile is where operators actually work; PWA closes the loop.

**Deliverables:**
- `public/manifest.json` with icons (192 + 512), theme color, display=standalone
- `public/sw.js` service worker:
  - Cache last 100 inbox messages for offline reading
  - Background sync queue for replies sent offline
  - Push event handler → display notification
- Web App install prompt logic (track engagement, prompt at the right moment)
- Push notification subscription flow (Web Push API, VAPID keys)
- Per-channel push opt-in (operator can mute Slack, keep WhatsApp on)
- Mobile-first inbox layout: full-screen thread view, swipe-to-archive, FAB for new message

**Acceptance criteria:**
- Operator installs GAS PWA to home screen on iPhone/Android
- They receive push notifications for new urgent inbox messages
- They can read + reply from the PWA, offline replies queue and send when online
- Lighthouse PWA audit score > 90

### Phase 8+ — Additional CMs and channels (~2-3 days each)

- Beds24 messaging webhook
- Hostaway messaging webhook
- Hostfully messaging webhook (add booking webhook first)
- Smoobu messaging webhook
- SMS via Twilio (Phase 8)
- Discord (if any client uses for team coordination)
- Telegram via Bot API

Each follows the established adapter pattern; sequencing depends on client demand.

---

## 6. Critical UX flows

### 6.1 Custom Email Domain wizard

```
Settings → Email Sending
┌─────────────────────────────────────────────────┐
│ Current sender: noreply@mg.gas.travel           │
│                                                 │
│ [ Use your own domain → ]                       │
└─────────────────────────────────────────────────┘

Step 1: Enter domain
┌─────────────────────────────────────────────────┐
│ Your domain:  [cotswoldretreats.com         ]  │
│                                                 │
│ This is the domain guests will see emails       │
│ coming from. You'll need access to its DNS.     │
│                                                 │
│ [ Cancel ]    [ Continue → ]                    │
└─────────────────────────────────────────────────┘

Step 2: Add DNS records
┌─────────────────────────────────────────────────┐
│ Add these 4 records at your DNS provider:       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ TXT   _domainkey.cotswoldretreats.com       │ │
│ │       k=rsa; p=MIGfMA0GCSqG... [📋 Copy]    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ TXT   cotswoldretreats.com                  │ │
│ │       v=spf1 include:mailgun.org ~all       │ │
│ │       [📋 Copy]                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ MX    mxa.mailgun.org   (priority 10)       │ │
│ │ MX    mxb.mailgun.org   (priority 10)       │ │
│ │       [📋 Copy both]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Once added (can take up to 30 min to propagate):│
│ [ ↻ Verify ]                                    │
└─────────────────────────────────────────────────┘

Step 3 (after verify success):
┌─────────────────────────────────────────────────┐
│ ✅ Verified!                                     │
│                                                 │
│ System emails will now come from:               │
│ noreply@cotswoldretreats.com                    │
│                                                 │
│ Display name shown in inbox:                    │
│ [Cotswold Retreats                          ]   │
│                                                 │
│ Reply-to address (optional):                    │
│ [bookings@cotswoldretreats.com              ]   │
│                                                 │
│ [ Save & enable ]    [ Disconnect domain ]      │
└─────────────────────────────────────────────────┘
```

### 6.2 WhatsApp Embedded Signup

```
Settings → WhatsApp
┌─────────────────────────────────────────────────┐
│ WhatsApp Business is not yet connected.         │
│                                                 │
│ Connect your WhatsApp Business number so        │
│ guests can message you via WhatsApp.            │
│                                                 │
│ [ Connect WhatsApp Business → ]                 │
└─────────────────────────────────────────────────┘

Click → Meta-hosted popup opens (Embedded Signup)
  - Verify your business
  - Add or select your business phone number
  - Receive verification code via SMS or call
  - Confirm
  - (Popup closes, GAS callback fires)

After successful onboarding:
┌─────────────────────────────────────────────────┐
│ ✅ WhatsApp Business connected                   │
│                                                 │
│ Number: +44 7xxx xxx xxx                        │
│ Display name: Cotswold Retreats                 │
│ Status: Active                                  │
│                                                 │
│ Connected: 31 May 2026                          │
│ Messages today: 0                               │
│                                                 │
│ [ Send test message ]   [ Disconnect ]          │
└─────────────────────────────────────────────────┘
```

---

## 7. Database schema additions

### Phase 1 (Slack)
```sql
CREATE TABLE IF NOT EXISTS slack_workspaces (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT,
  bot_user_id TEXT,
  access_token TEXT NOT NULL,
  installed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (account_id, workspace_id),
  UNIQUE (owner_user_id, workspace_id),
  CHECK ((account_id IS NULL) <> (owner_user_id IS NULL))
);
```

### Phase 2 (Messenger)
```sql
ALTER TABLE turbine_connections
  ADD COLUMN IF NOT EXISTS messenger_subscribed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS messenger_subscribed_at TIMESTAMP;
```

### Phase 4 (Personal accounts for Steve)
```sql
ALTER TABLE inbox_channels
  ADD COLUMN IF NOT EXISTS owner_user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT inbox_channels_owner_check CHECK ((account_id IS NULL) <> (owner_user_id IS NULL));

ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS owner_user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE;
```

### Phase 6 (AI triage)
No new tables. Use existing `inbox_messages.category`, `.sentiment`, and `.metadata` JSONB for ai_summary, ai_draft, priority.

### Phase 7 (PWA push)
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  channels_enabled JSONB DEFAULT '["whatsapp","email","slack","facebook"]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);
```

---

## 8. Open design questions

| # | Question | Owner | Resolution needed by |
|---|---|---|---|
| 1 | Personal-vs-client schema split — `inbox_channels.owner_user_id` column OR a designated "platform" account? | Steve | Phase 4 |
| 2 | WhatsApp Embedded Signup `onbehalfof_business_id` — are we tracking Meta's business hierarchy correctly for billing/audit? | Steve + Meta docs review | Phase 3 |
| 3 | Outbound deliverability when client adds custom domain mid-stream — what happens to in-flight scheduled emails? Resolve sender at send-time vs at schedule-time? | Steve | Phase 0 |
| 4 | Slack workspace caps — free tier loses message history at 90 days. Do we keep our own copy in inbox_messages so history survives? | Steve | Phase 1 |
| 5 | AI cost model — Claude calls per inbox message at scale could add up. Cache thread summaries? Only summarise on first-read? Triage tier (Haiku for low-priority, Sonnet for urgent)? | Steve | Phase 6 |
| 6 | PWA push on iOS — landed in 16.4 (Mar 2023). Acceptable to require iOS 16.4+ as a baseline? | Steve | Phase 7 |
| 7 | Reviews ingestion (Axis D from v1 memo) — same substrate or separate? Decided to defer to v2.1 of this plan; revisit after Phase 5 ships. | Steve | After Phase 5 |
| 8 | Operator-→-guest automated lifecycle templates — when do we add the trigger engine + template library? Not in this plan; needs its own scoped doc. | Steve | After Phase 7 |

---

## 9. Risk analysis

### High risk
- **Meta policy changes** — WhatsApp Business API policies tighten regularly. Cloud API conversation pricing, template approval rules, and Embedded Signup requirements all subject to change. Mitigation: monitor Meta developer changelog monthly; have a fallback (per-account WABA paste flow) for clients who can't use Embedded Signup.
- **Email deliverability regressions** — if Mailgun reputation drops on `mg.gas.travel`, ALL non-custom-domain accounts suffer. Mitigation: prioritise Phase 0 (custom domains) so most accounts have their own DKIM/SPF; monitor bounce rate per domain.
- **Slack rate limits** — free tier workspaces have aggressive rate limits on chat.postMessage. Mitigation: queue outbound, throttle to 1/sec/workspace.

### Medium risk
- **PWA service worker bugs** — bad SW deploy can lock users out (cache poisoning). Mitigation: version SW with deploy hash, kill-switch endpoint that forces SW unregister.
- **AI hallucinations in draft replies** — Claude could draft a reply that promises something the property doesn't offer. Mitigation: drafts are NEVER auto-sent; operator must edit + confirm. Pass property KB explicitly in the Claude prompt to ground answers.
- **OTA replies appearing as "Direct" in CM** — when GAS replies through Channex, the source attribution might shift. Mitigation: test reply attribution per OTA before rolling Phase 5 widely.

### Low risk
- **Inbox UI clutter at high volume** — operators with 100+ unread messages might find the UI overwhelming. Mitigation: AI prioritisation (Phase 6) addresses this naturally.
- **Search performance at scale** — `inbox_messages` ILIKE searches across millions of rows could slow down. Mitigation: add GIN index on tsvector of body when volume crosses 100k rows.

---

## 10. Rollout strategy

### Per-feature rollout
- Each phase ships as a master-admin-only feature first
- Steve uses it on his own account / personal channels for 3-5 days
- Then enable for 1-2 pilot clients (Cotswolds, Lehmann, Park Row)
- Then announce in client newsletter + enable platform-wide

### Phase 0 (custom email domain) — special considerations
- Default for existing accounts: unchanged (still sending from `mg.gas.travel`)
- New clients onboarded after Phase 0 ship: invite them to add custom domain at signup
- For existing high-value clients, manually walk them through during onboarding calls

### Phase 3 (WhatsApp Embedded Signup) — special considerations
- Per memory `feedback_no_public_channex.md`: don't publicly market the Meta Tech Provider angle until at least 5 clients are live and stable on it
- First pilot: Cotswolds (just went live, motivated, big spend)
- After 5 stable clients: open as a self-serve feature for everyone

---

## 11. Out of scope (deferred to future plans)

These deserve their own scoped docs and are NOT addressed here:

- **Reviews aggregation** (Axis D from v1 memo) — defer to v2.1 after Phase 5 ships
- **Operator-→-guest lifecycle template engine** (welcome / pre-arrival / departure / review-request triggers) — needs its own scoped doc; massive feature in its own right
- **Document collaboration** (per the original Unified Inbox spec) — needs a separate spec
- **Team / multi-user inbox** (assignment, SLA tracking, escalation) — addressed only superficially in Phase 6
- **Voice / phone integration** (Twilio voice, call recording) — speculative; address only if clients demand
- **iMessage** — Apple closed ecosystem, infeasible without official API

---

## 12. Cross-references

- `docs/GAS-Unified-Inbox-Spec.md` — original spec (predates this plan)
- `~/.claude/projects/.../memory/project_communications_build_plan_v2.md` — internal memo version of this plan
- `~/.claude/projects/.../memory/project_communications_unified_research.md` — v1 morning memo (superseded)
- `~/.claude/projects/.../memory/project_whatsapp_integration.md` — Park Row WhatsApp foundation
- `~/.claude/projects/.../memory/project_client_operations_ux_research.md` — Today dashboard surfaces messages from this substrate
- `~/.claude/projects/.../memory/feedback_no_public_channex.md` — client-facing copy rule for Channex mentions
- `~/.claude/projects/.../memory/feedback_claude_only_ai.md` — AI provider standard
- `~/.claude/projects/.../memory/architecture_master_notifications.md` — `sendMasterNotification` pattern that legacy Slack outbound should migrate to

---

## 13. Estimated total effort

| Phase | Days | Cumulative |
|---|---|---|
| 0 — Custom Email Domain UI | 3 | 3 |
| 1 — Slack as the Connect spine | 2 | 5 |
| 2 — Facebook Messenger Handler | 2-3 | 8 |
| 3 — WhatsApp Embedded Signup | 4 | 12 |
| 3.5 — Social Media Outbound Composer (FB + IG) | 4-5 | 16-17 |
| 4 — Personal accounts for Steve | 3 | 19-20 |
| 5 — CM Message Ingestion (Channex) | 3 | 22-23 |
| 6 — AI Triage Layer | 4 | 26-27 |
| 7 — PWA Mobile Shell | 5-7 | 31-34 |
| **Subtotal — full unified comms v2.0** | **26-34 days** | **~5-7 weeks of focused work** |
| 3.5b — LinkedIn publishing | 2-3 | + |
| 3.5c — TikTok publishing | 3-4 | + |
| 8+ — Additional CMs and channels | 2-3 per channel | as needed |

A shippable **v1 (Phases 0-3)** is **12 days** — custom domain + Slack Connect + Messenger + multi-tenant WhatsApp. A shippable **v1.5 (Phases 0-3.5)** is **16-17 days** — adds the social outbound composer so clients can post + reply from one surface. Either is a major product release and would justify a marketing announcement.

Phase 3.5 can run in parallel with Phase 4 or Phase 5 if a second pair of hands is available; it has no hard dependency on Phases 4-5.

---

*End of plan. Reviewed before each phase kick-off.*
