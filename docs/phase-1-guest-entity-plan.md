# Phase 1 — Guest entity, comms foundation, ID verification

**Status:** plan, awaiting go-ahead.
**Context:** GAS is becoming a PMS. This phase lays every primitive the rest of the PMS (refunds, deposits, mid-stay charges, calendar, CRM, multi-jurisdiction compliance) snaps onto.
**Effort:** ~10-12 days end-to-end (was 7 before ID verification + multi-guest).
**No customer-facing change** the host can't opt out of. No passwords. No signup CTA. Friction-free.

---

## Architecture choices (locked from discussion)

1. **No guest accounts.** Progressive recognition: anonymous → recognised → opted-in. Magic links for self-service. Never a password screen.
2. **Guest scoped per account.** Same person staying at two GAS hosts = two guest records.
3. **Booking snapshot stays.** `bookings.guest_*` columns remain as the "as-booked" snapshot; `bookings.guest_id` FK points to the canonical record. Operators see what the guest typed at booking time even if they later update their phone.
4. **R2 for ID storage** (existing pattern), private ACL, signed URLs only.
5. **Stripe Identity built in from day 1**, with manual-verify as fallback. Per-account config picks the mode.
6. **Multi-guest support** for jurisdictions that require every adult's ID (Spain, Italy, parts of US).
7. **ID requirement defaults to OFF** at the account level — opt-in.

---

## 1. Schema

### `guests` (new)

```sql
CREATE TABLE guests (
  id                       SERIAL PRIMARY KEY,
  account_id               INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email                    CITEXT NOT NULL,
  first_name               VARCHAR,
  last_name                VARCHAR,
  phone                    VARCHAR,
  address                  TEXT,
  city                     VARCHAR,
  postcode                 VARCHAR,
  country                  CHAR(2),
  date_of_birth            DATE,                   -- needed for some compliance reporting
  language                 CHAR(2),
  
  stripe_customer_id       VARCHAR,                -- one Stripe Customer per guest, reused across bookings + shop
  stripe_identity_verified BOOLEAN DEFAULT false,  -- last successful Stripe Identity outcome
  
  opt_in_status            VARCHAR DEFAULT 'unknown',  -- 'unknown' / 'opted_in' / 'opted_out'
  opt_in_source            VARCHAR,
  opt_in_at                TIMESTAMP,
  unsubscribe_token        UUID DEFAULT gen_random_uuid(),
  
  magic_link_secret        VARCHAR DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  recognised_at            TIMESTAMP,
  last_seen_at             TIMESTAMP,
  total_bookings           INT DEFAULT 0,
  total_spent_cents        BIGINT DEFAULT 0,
  last_stay_at             TIMESTAMP,
  
  notes                    TEXT,
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (account_id, email)  -- citext makes this case-insensitive
);
CREATE INDEX idx_guests_email_account ON guests(account_id, lower(email::text));
```

### `booking_guests` (new — multi-guest support)

For bookings where the lead guest isn't the only one we care about (compliance jurisdictions). Most accounts will only ever insert one `lead` row per booking; this is opt-in.

```sql
CREATE TABLE booking_guests (
  id              SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id        INT NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  role            VARCHAR DEFAULT 'lead',  -- 'lead' or 'co_traveller'
  added_at        TIMESTAMP DEFAULT NOW(),
  invited_at      TIMESTAMP,                -- when we sent them an upload-ID link
  ai_invite_token VARCHAR,                  -- their personal magic link (signed against their guest secret)
  UNIQUE (booking_id, guest_id)
);
```

### `guest_documents` (new — ID upload storage)

```sql
CREATE TABLE guest_documents (
  id                       SERIAL PRIMARY KEY,
  guest_id                 INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  booking_id               INT REFERENCES bookings(id) ON DELETE SET NULL,
  
  document_type            VARCHAR,    -- 'passport', 'drivers_license', 'national_id', 'visa', 'proof_of_address'
  issuing_country          CHAR(2),
  document_number_last4    VARCHAR(8),
  document_number_full     VARCHAR,    -- only populated when account.id_policy.full_number_required=true (Italy etc)
  
  file_url                 VARCHAR,    -- R2 private bucket, served via signed URL
  thumbnail_url            VARCHAR,
  file_size_bytes          BIGINT,
  mime_type                VARCHAR,
  
  status                   VARCHAR DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'expired'
  verification_method      VARCHAR,    -- 'manual', 'stripe_identity'
  stripe_verification_id   VARCHAR,    -- Stripe Identity session id
  verified_at              TIMESTAMP,
  verified_by_user_id      INT,
  rejection_reason         TEXT,
  
  document_expires_at      DATE,       -- expiry date on the document itself
  retention_until          TIMESTAMP,  -- GAS auto-purges file after this
  
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW(),
  deleted_at               TIMESTAMP   -- soft delete; R2 object hard-deleted at retention_until
);
CREATE INDEX idx_guest_documents_guest ON guest_documents(guest_id);
CREATE INDEX idx_guest_documents_retention ON guest_documents(retention_until) WHERE deleted_at IS NULL;
```

### `guest_communications` (new — comms log)

```sql
CREATE TABLE guest_communications (
  id                       SERIAL PRIMARY KEY,
  guest_id                 INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  booking_id               INT REFERENCES bookings(id) ON DELETE SET NULL,
  channel                  VARCHAR,        -- 'email', 'sms', 'inbox'
  direction                VARCHAR,        -- 'out' or 'in'
  event_type               VARCHAR,        -- enumerated below
  subject                  TEXT,
  body                     TEXT,
  status                   VARCHAR,        -- 'sent', 'failed', 'opened', 'clicked', 'bounced'
  sent_at, opened_at, clicked_at  TIMESTAMP,
  provider_message_id      VARCHAR,
  metadata                 JSONB,
  created_at               TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_guest_comms_guest ON guest_communications(guest_id, created_at DESC);
```

`event_type` enumeration:
```
booking_confirmed, balance_reminder, balance_paid, refund_processed,
extra_charge_applied, deposit_held, deposit_released, modification_confirmed,
cancellation_confirmed, pre_arrival_info, in_stay_welcome, post_stay_thanks,
review_request, newsletter, opt_in_confirm, magic_link_request,
id_upload_requested, id_verification_approved, id_verification_rejected
```

### Account-level policy config

Add to `accounts`:

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS id_policy JSONB DEFAULT '{
  "require_guest_id": false,
  "require_id_for_lead_only": true,
  "required_documents": ["passport"],
  "required_id_countries": [],
  "verification_mode": "manual",
  "stripe_identity_enabled": false,
  "retention_days_post_stay": 90,
  "collect_at": "pre_arrival",
  "full_number_required": false
}';
```

Default is the safe "off" — host opts in if their property needs it.

### `bookings` (extend)

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_id INT REFERENCES guests(id);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
```

### Optional: `guest_consent_log` (audit)

Lightweight GDPR audit table:
```sql
CREATE TABLE guest_consent_log (
  id SERIAL PRIMARY KEY,
  guest_id INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  action VARCHAR,    -- 'opted_in', 'opted_out', 'updated_details', 'requested_deletion'
  source VARCHAR,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. Magic links — stateless

No tokens table. Each guest has `magic_link_secret`. Token format:

```
base64url({ guest_id, scope, exp, nonce }) + '.' + base64url(hmac_sha256(payload, secret))
```

Scopes:
- `view_stay` — read-only "Your Stay" panel (7 days)
- `shop_attribute` — pre-fill shop checkout (24h)
- `upload_id` — open ID upload widget (until expires_at on the document or 30 days)
- `confirm_details` — "we have your details" yes/no (24h)
- `unsubscribe` — flip to opted_out (no expiry)
- `co_traveller_invite` — co-travel guest opens their own upload page (until check-in date)

Validation: parse, verify HMAC against guest's stored secret, check exp. Rotate `magic_link_secret` to revoke all outstanding tokens for that guest.

---

## 3. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/guests` | List guests for the account, filterable + sortable |
| `GET /api/admin/guests/:id` | Operator's full guest profile (bookings, comms, documents) |
| `PUT /api/admin/guests/:id` | Operator edits notes, opt-in, etc. |
| `POST /api/admin/guests/:id/invite-co-traveller` | Adds row to `booking_guests`, sends magic-link email |
| `POST /api/admin/guests/:id/document/:docId/verify` | Manual verify or reject (with reason) |
| `POST /api/admin/guests/:id/document/:docId/start-stripe-identity` | Mint a Stripe Identity session |
| `GET /api/public/stay/:token` | Magic-link stay portal — booking + extras + ID upload prompts |
| `POST /api/public/stay/:token/confirm-details` | "Yes, details still right" |
| `POST /api/public/guest/:token/upload-id` | Upload to R2, create `guest_documents` row |
| `POST /api/public/guest/:token/opt-in` | Newsletter opt-in |
| `GET /api/public/unsubscribe/:token` | One-click unsubscribe |
| `POST /api/webhooks/stripe-identity` | Stripe Identity verification result → updates `guest_documents.status` |

---

## 4. UX touchpoints

### Booking flow
- Guest types email → server lookup against `guests` for the account
- If found → form pre-fills with grey-edit pencils; "We've got your details on file from a previous stay — these still right?"
- If new → standard flow

### Confirmation email (now structured)
- "Booking ref: GAS-XXXX"
- "Add extras to your stay" → shop magic-link
- "Stay in touch" → opt-in magic-link  
- If `id_policy.collect_at='booking'`: "Quick step — please upload your ID" → upload magic-link

### Pre-arrival email (new, scheduled cron 7 days before check-in)
- Welcome message
- ID upload reminder if pending (varies by `collect_at`)
- Local info / property notes
- Magic-link to "Your Stay" panel

### "Your Stay" panel (`/api/public/stay/:token`)
- Booking summary
- Outstanding balance (if any) + "Pay now" button
- Required ID documents — upload widget per pending doc
- Co-traveller list — "Add a co-guest" button (sends them their own magic-link)
- Add extras (deeplinks to shop with prefill)
- Modify stay request → goes to operator inbox (NOT auto-modify)
- Cancel request → goes to operator inbox

### GAS Admin → Guests (new nav item)
- Searchable + sortable list
- Click → guest detail page:
  - Profile (name, email, phone, address, total bookings, total spent, last seen)
  - Bookings tab — every stay, status, amount
  - Communications tab — full comms log
  - Documents tab — every uploaded ID, status, verify/reject buttons, view file (signed URL)
  - Notes tab — operator's free-form notes

### GAS Admin → Account Settings → Compliance (new section)
- Toggle: Require guest ID
- For which countries / documents
- Verification mode (manual vs Stripe Identity)
- Retention period
- When to collect (booking / pre-arrival / on-site)

### GAS Admin → Booking detail → Guest tab (existing booking modal, new tab)
- Embedded guest profile snapshot
- "Open full guest record" link
- Document status pills with quick-verify

---

## 5. Stripe Identity integration

Per-document flow when `verification_method='stripe_identity'`:

1. Operator (or guest via auto-trigger) hits "Verify with Stripe Identity"
2. Server: `stripe.identity.verificationSessions.create({ type: 'document', metadata: { guest_id, document_id, gas_account_id } })`
3. Returns a session URL — emailed to guest as a magic link or shown in their "Your Stay" panel
4. Guest opens → Stripe-hosted page → takes selfie + ID photo → submits
5. Stripe webhook fires → our `/api/webhooks/stripe-identity` handler:
   - On `verified`: update `guest_documents.status='approved'`, `verified_at=NOW()`, store extracted name/DOB to compare
   - On `requires_input`: status stays `pending` with rejection_reason
6. Comms hook: log + email the guest the result

Cost: ~$1.50 per verification, host-billed via existing Stripe Connect arrangements (or absorbed by GAS for now and we figure out billing in Phase 5).

We never see or store the ID images in this mode — Stripe holds them. Reduces our compliance surface.

For `verification_method='manual'`: file uploaded to R2 via `/api/public/guest/:token/upload-id`, operator reviews in GAS Admin, clicks Verify. Free, slower.

---

## 6. Comms hooks

Wrap existing `sendEmail()` so every send logs to `guest_communications`:

```js
async function sendGuestEmail(guestId, eventType, { to, subject, html, bookingId, metadata }) {
  // 1. log first
  const log = await pool.query(
    `INSERT INTO guest_communications (guest_id, booking_id, channel, direction, event_type, subject, body, status, metadata)
     VALUES ($1, $2, 'email', 'out', $3, $4, $5, 'pending', $6) RETURNING id`,
    [guestId, bookingId, eventType, subject, html, JSON.stringify(metadata || {})]
  );
  // 2. send via existing infrastructure (existing sendEmail() already wraps Postmark/SES/whatever)
  const result = await sendEmail({ to, subject, html });
  // 3. update with provider id + status
  await pool.query(
    `UPDATE guest_communications SET status = $1, provider_message_id = $2, sent_at = NOW() WHERE id = $3`,
    [result.success ? 'sent' : 'failed', result.providerMessageId || null, log.rows[0].id]
  );
}
```

Existing flows wrapped in Phase 1:
- Booking confirmation
- Balance-due reminder
- Auto-charge success / failure
- Cancellation confirmation

Future Phase 2 ops add to the list:
- Refund processed (template + comm log + email)
- Extra charge applied
- Security deposit held / released
- Modification confirmed
- ID verification approved / rejected

Each event_type has a default template; per-account override via a future `email_templates` table (Phase 5 CRM).

---

## 7. Migration of existing bookings

```sql
-- 1. Group existing bookings by (account_id, lower(email)) and create guest records
INSERT INTO guests (account_id, email, first_name, last_name, phone, country, total_bookings, last_stay_at, created_at, last_seen_at)
SELECT 
  p.account_id,
  lower(b.guest_email),
  (array_agg(b.guest_first_name ORDER BY b.created_at DESC) FILTER (WHERE b.guest_first_name IS NOT NULL))[1],
  (array_agg(b.guest_last_name ORDER BY b.created_at DESC) FILTER (WHERE b.guest_last_name IS NOT NULL))[1],
  (array_agg(b.guest_phone ORDER BY b.created_at DESC) FILTER (WHERE b.guest_phone IS NOT NULL))[1],
  (array_agg(b.guest_country ORDER BY b.created_at DESC) FILTER (WHERE b.guest_country IS NOT NULL))[1],
  COUNT(*),
  MAX(b.arrival_date),
  MIN(b.created_at),
  MAX(b.created_at)
FROM bookings b
JOIN properties p ON p.id = b.property_id
WHERE b.guest_email IS NOT NULL AND b.guest_email <> ''
GROUP BY p.account_id, lower(b.guest_email);

-- 2. Link bookings to their guest_id
UPDATE bookings b SET guest_id = g.id
FROM guests g, properties p
WHERE p.id = b.property_id AND g.account_id = p.account_id
  AND lower(g.email) = lower(b.guest_email);

-- 3. Create booking_guests rows for the lead guest of each booking
INSERT INTO booking_guests (booking_id, guest_id, role)
SELECT id, guest_id, 'lead' FROM bookings WHERE guest_id IS NOT NULL;

-- 4. Compute total_spent_cents from bookings.grand_total
UPDATE guests g
SET total_spent_cents = sub.total_cents
FROM (
  SELECT guest_id, SUM(grand_total * 100)::bigint AS total_cents
  FROM bookings
  WHERE guest_id IS NOT NULL AND payment_status = 'paid'
  GROUP BY guest_id
) sub
WHERE g.id = sub.guest_id;
```

Read-only on existing fields, additive new columns. Roll out account-by-account; rollback = drop the new tables.

---

## 8. Effort breakdown

| Component | Days |
|---|---|
| Schema migration + backfill (guests, booking_guests, guest_documents, guest_communications) | 1.5 |
| Magic-link scheme + signed token utility | 0.5 |
| Wrap existing sendEmail calls + log to guest_communications | 1 |
| Email-lookup recognition in booking + shop checkout | 1 |
| GAS Admin → Guests page + booking-detail Guest tab | 1.5 |
| GAS Admin → Account Settings → Compliance section | 0.5 |
| "Your Stay" magic-link portal | 1 |
| ID upload widget + R2 storage with signed URLs | 1 |
| Stripe Identity integration (init + webhook + status update) | 1 |
| Co-traveller invite flow (multi-guest) | 1 |
| Pre-arrival cron (scheduled email 7 days out) | 0.5 |
| Backfill verify + smoke test on dev account | 0.5 |
| **Total** | **~11 days** |

---

## 9. What's NOT in Phase 1

- Stripe ops (refund, charge, hold) — Phase 2 (~5 days)
- Booking detail page upgrade with operational tabs — Phase 3 (~5 days)
- CRM campaign builder — Phase 5 (~2 weeks)
- Email template editor — Phase 5
- SMS — when there's clear demand
- Inbound message routing — separate Unified Inbox spec

---

## 10. Risk + rollback

**Schema risk:** nil — additive only, no existing-column changes.
**Existing-feature risk:** nil — existing booking flow unchanged until we explicitly wire the email-lookup recognition (which is opt-in per-account too).
**Stripe Identity risk:** the only one with a $ cost — defaulted to disabled per-account. Hosts opt in.
**Rollback plan:** drop new tables + rollback the `guest_id` column on bookings. Existing booking data untouched.

---

## 11. The Phase 2 / 3 / 5 hooks

- **Phase 2 Stripe ops** — every refund/charge/hold reads `guest.stripe_customer_id`, logs to `guest_communications`, sends templated email. The plumbing this phase puts in place is exactly what they'll use.
- **Phase 3 booking detail page** — Guest tab is its prime feature. Documents tab too.
- **Phase 5 CRM** — segments on `total_spent_cents`, `last_stay_at`, `opt_in_status`. Campaign builder writes to `guest_communications` so engagement tracking is unified.

This phase is the highest-leverage starting point — every later feature lands on top.
