# GAS Unified Inbox — Full Product Specification

**Status**: Specification complete, not yet built
**Owner**: Steve Driver
**Scope**: Master Admin only — NOT available to clients until productised
**Created**: March 2026

---

## Problem

Clients and partners communicate across email, WhatsApp, Slack, LinkedIn,
Facebook, YouTube, Google Sheets, Notion — forcing Steve and property owners
to context-switch constantly. No single view of all conversations.

## Solution

A GAS Inbox section in gas-admin.html that pulls all messages into one
feed, allows replies from GAS that route back through the correct channel,
with AI-assisted draft replies.

---

## Where It Sits in GAS

Top level sidebar — "Inbox" with bell/message icon and unread count badge.
Same level as Properties, Bookings, Website Builder. NOT buried in settings.

Sidebar structure:
- Dashboard
- **Inbox** (unread badge)
- Properties
- Bookings & Revenue
- Website Builder
- Payments
- Settings

---

## Channels

### Phase 1
- Email (Gmail API — already connected)
- WhatsApp Business (Meta Cloud API)
- Facebook Messenger (Meta Cloud API)

### Phase 2
- LinkedIn Messages (LinkedIn API)
- Instagram DMs (Meta API)
- YouTube Comments (Google API)
- Slack (Slack API)

### Phase 3 — Document Collaboration
- Google Sheets (comments, shares, activity)
- Google Docs (comments, suggestions)
- Google Drive (file shares, activity)
- Microsoft OneDrive/SharePoint
- Notion (page comments, mentions)
- Airtable (comments, record activity)

---

## Database Schema

### inbox_messages

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| account_id | INT | FK to accounts |
| channel | VARCHAR | email / whatsapp / facebook / linkedin / etc |
| from_name | VARCHAR | Sender display name |
| from_handle | VARCHAR | Email address, phone number, social handle |
| from_avatar | VARCHAR | Avatar URL |
| subject | VARCHAR | Email subject or conversation title |
| body | TEXT | Message content |
| raw_payload | JSONB | Full original payload from channel API |
| direction | VARCHAR | inbound / outbound |
| status | VARCHAR | unread / read / replied / archived |
| thread_id | VARCHAR | Thread/conversation grouping ID |
| parent_message_id | INT | FK to inbox_messages for threading |
| created_at | TIMESTAMPTZ | When message was sent/received |
| read_at | TIMESTAMPTZ | When marked as read |
| replied_at | TIMESTAMPTZ | When reply was sent |
| metadata | JSONB | Channel-specific data (message IDs, labels, etc) |

### inbox_channels

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| account_id | INT | FK to accounts |
| channel_type | VARCHAR | email / whatsapp / facebook / linkedin / etc |
| credentials | JSONB | OAuth tokens, API keys, encrypted |
| webhook_url | VARCHAR | Webhook endpoint for this channel |
| active | BOOLEAN | Whether channel is enabled |
| last_sync_at | TIMESTAMPTZ | Last successful sync timestamp |

---

## GAS Admin UI

- Inbox in top level sidebar with unread badge
- Message feed — chronological, all channels mixed
- Filter by channel, status, date
- Click message — opens thread view
- Reply box with channel indicator showing which platform
- AI draft reply button using account/property context
- Mark read / archive / label
- Mobile responsive — property owners use this on the go

---

## Mobile Strategy

### Phase 1 — PWA (Progressive Web App)
- Add manifest.json and service worker to GAS Admin
- Installable on iPhone/Android home screen
- Push notifications when new message arrives
- Same codebase as web — weeks not months to build
- No app store approval needed

### Phase 2 — Native iOS/Android App
- Build once GAS Inbox proven with 50+ active property owners
- Full native experience, camera integration
- App store presence for credibility
- 3-4 months build, separate codebase

---

## Server Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/inbox/channels/:accountId` | Connect a channel |
| GET | `/api/inbox/messages/:accountId` | Fetch messages with filters |
| POST | `/api/inbox/reply` | Send reply via correct channel API |
| POST | `/api/webhooks/whatsapp` | Receive WhatsApp webhooks |
| POST | `/api/webhooks/facebook` | Receive Facebook webhooks |
| POST | `/api/webhooks/gmail` | Receive Gmail push notifications |

---

## AI Features

- Auto-draft replies using account/property context
- Sentiment detection — flag urgent/negative messages
- Auto-categorise — booking enquiry, complaint, general
- Suggested responses based on past reply history

---

## Business Model

- **Phase 1**: Steve/team internal tool — built first, used daily
- **Phase 2**: Property owners — manage guest messages from one screen
- **Pricing**: £19/month per account as paid add-on
- **Replaces**: Front ($25-65/user/month) for GAS clients
- **Long term**: Becomes a standalone GAS product — usable by ANY property owner, even without GAS properties registered

---

## Build Order

1. DB schema — `inbox_messages`, `inbox_channels` tables
2. Gmail integration (OAuth already exists)
3. GAS Admin UI — basic inbox view, mobile responsive
4. PWA — manifest.json, service worker, push notifications
5. WhatsApp Business API integration
6. Facebook Messenger integration
7. AI draft replies
8. Phase 2: LinkedIn, Instagram, YouTube, Slack
9. Phase 3: Google Sheets/Docs/Drive, Notion, Airtable

---

## Dependencies

- Meta Business Account for WhatsApp + Facebook API
- LinkedIn Developer App
- Google Cloud project for YouTube API
- WhatsApp Business API approval from Meta
- Apple Developer account for future iOS app

---

## Important Notes

- **Master Admin only** — do NOT expose to client accounts until Steve approves
- **Do NOT overwrite** existing webhook endpoints when building inbox webhooks
- **Standalone product** — must work for accounts with zero properties
- **Credentials security** — all OAuth tokens and API keys stored encrypted in JSONB
