# Unified Form Primitive — Scoping Doc

*Draft · 2026-07-08*

## Problem

GAS has re-implemented "a form" at least 6 times across the codebase. Every new feature adds another one. Copy-paste rot, inconsistent validation, no shared "on submit" mental model, no shared operator experience.

## Current inventory

| Instance | Lives in | Uses |
|---|---|---|
| Lead Forms | `/api/admin/lead-forms/*` | Landing-page captures, PDF delivery, CRM push |
| Spark forms | Sparks landing pages | Form embed on marketing pages |
| Pre-arrival form | Hardcoded HTML in `server.js:/pre-arrival/:token` | Guest check-in capture |
| Add Booking modal | `gas-admin.html` hand-built | Admin manual booking |
| Contact upsert modal | `gas-admin.html` hand-built | Admin CRM entry |
| Attraction / Blog / Property editors | Hand-built modals | Content editing |
| Workflow step config | Dynamic from `config_schema` | Atomic step editing |
| Web Builder sections | Hand-built per section | Site settings |

No cross-linkage. Fields, validation, styling, and "on submit" behaviour all reinvented per instance.

## Proposed primitive

```
Form {
  id
  account_id
  name
  slug
  context_type: 'anonymous' | 'booking' | 'contact' | 'admin' | 'workflow_config'
  fields: FormField[]
  on_submit_actions: OnSubmitAction[]
  success_message | redirect_url | rendered_confirmation
  styling: { theme, primary_color, layout }
  is_published
}

FormField {
  key                (machine name — stored on submissions)
  label
  kind: 'text' | 'email' | 'phone' | 'number' | 'date' | 'time' |
        'dropdown' | 'checkbox' | 'radio' | 'file' | 'signature' |
        'address' | 'rating' | 'section_break' | 'hidden'
  required
  placeholder
  help_text
  validation: { min, max, pattern, custom_check }
  options            (dropdown / radio)
  conditional_show   (show only if another field matches a value)
  default_from_context (e.g. 'guest_email' pre-fills from booking)
}

OnSubmitAction {
  kind: 'mint_access_code' | 'update_booking_field' |
        'upsert_contact' | 'fire_workflow' | 'send_email' |
        'add_tag' | 'redirect' | 'create_booking' |
        'push_to_external_crm' | 'store_only'
  config    (per-action)
}
```

## Field kinds (unified)

Everyone builds forms with these building blocks:

- **Text-ish**: text, email, phone (with country-code + last-N verify), number
- **Choice**: dropdown, radio, checkbox
- **Time**: date, time, date-range
- **File**: file upload (S3-backed), signature capture
- **Composite**: address (auto-completes), rating (stars)
- **Layout**: section break, heading, hidden, computed

## On-submit actions (shared library)

- `mint_access_code` — pre-arrival's current behaviour, extracted
- `update_booking_field` — pre-arrival, guest check-in, incidental info
- `upsert_contact` — lead form standard
- `fire_workflow` — post-submit CRM flow (welcome sequence, etc.)
- `send_email` — confirmation + operator alert
- `add_tag` — segmentation
- `redirect` — external URL or Spark
- `create_booking` — Add Booking modal replacement
- `push_to_external_crm` — GHL / HubSpot bridge (already exists as helper)
- `store_only` — audit trail without side-effects

## Context adapters

`context_type` determines what data the form has access to at render + submit time:

| Context | Rendered when | Merge tags available | Signed link required |
|---|---|---|---|
| `anonymous` | Public landing page / newsletter | none | no |
| `booking` | Signed URL per booking | `{{first_name}}`, `{{arrival_date}}` etc | **yes** |
| `contact` | Signed URL per contact | contact fields | yes |
| `admin` | GAS Admin modal | full ctx (property, booking, etc.) | no (auth) |
| `workflow_config` | Action editor step config | none | no |

## Rendering

- **Guest-facing** (anonymous / booking / contact) — server-rendered mobile-first HTML page, same styling primitive as Sparks
- **Admin** — modal in GAS Admin, same layout engine as current modals
- **Embed** — `<iframe src="…/forms/:slug">` for external sites (Barbara's existing WordPress etc.)
- **API** — `POST /api/public/forms/:slug/submit` — same shape for every context

## Migration path

Not a big-bang. Instances converge one at a time:

1. **Ship the primitive** (new table, new endpoints, no UI yet)
2. **Migrate Lead Forms → primitive** (already the most abstract; smallest jump)
3. **Migrate Pre-arrival → primitive** (proves the `booking` context works)
4. **Migrate Add Booking modal → primitive** (proves `admin` context)
5. **Retire the old code paths** one at a time as each migration lands

Each step is independently shippable — nothing breaks in flight.

## Effort estimate

- Primitive schema + submit endpoint + admin form-builder UI: ~3 days
- Guest-render engine (server-side HTML page): ~1 day
- Each migration: ~half a day per instance (6 total instances)
- Total: **~6 days** of focused work

## Benefits (long term)

- **One place** to fix a validation bug
- **One place** to add a new field kind (signature, address auto-complete)
- **One place** to add a new "on submit" action (Barbara asks for X — every existing form gets X)
- **Consistent UX** for every form clients see or fill
- **Consistent operator UX** — build one form, drop it anywhere

## Non-goals (deliberately)

- Don't try to solve **conditional multi-page** wizards in v1 (rare, adds complexity)
- Don't build a **visual drag-drop canvas** in v1 — a smart form-schema editor is enough; visual canvas can come later
- Don't rebuild the **workflow step config renderer** immediately — it works, migrate last

## Open questions

- Should signed URLs expire per-context (booking arrival + N days) or per-token TTL? Currently pre-arrival tokens have no TTL — booking arrival is the natural window.
- File upload backend — reuse the S3 bucket already used for spark hero images, or a fresh forms bucket?
- Does the workflow step config need to be a Form too, or is a config_schema simpler forever? (Probably keep it separate — dev-facing shape, not operator-facing.)

## When

Not now — CRM day + Charles House pilot come first. Pick this up **Q4** as a proper dedicated week. Doc lives here so we don't lose the shape.
