# Booking Assist — Strategic Reference

## Who

Verena runs the operation. Manages three brands: booking-assist.com (owner-facing SaaS), book-jet.com (guest-facing booking site), invest-jet.com (parent company).

Currently on old Rezintel/SetSeed infrastructure (server 139.162.234.112, DB `setseed_wwwbookingassistcomvswnnby4umm`). Candidate for GAS migration, agreed as "guinea pig" tester for the GAS onboarding flow.

## Current business model

- EUR 195/month or EUR 1,800/year per 2 properties. No setup fees. 14-day trial.
- 73 properties listed, 5 approved owners, 441 total user accounts (376 signups / 59 customers / 5 owners).
- Manual service: Verena's team does Beds24 setup, property page creation, pricing config by hand.
- Target market: Fuerteventura / Canary Islands holiday-let owners.
- Beds24 account ID: 109705.
- Stripe products: `prod_PccxGjytFWfX14` (monthly), `prod_PccxNFIpiSgzIo` (annual).

## Strategic insight

Verena's key product insight: Beds24's UI is genuinely bad, and operators will pay a premium for a managed-service layer that handles it for them. This validates the same pattern we'd consider for a Rezintel-reseller play — her business is proof the market exists.

## Current pain points (for Verena's operation)

- **474 form submissions, 1% conversion** — rest is bot spam. No honeypot, no CAPTCHA, no rate limiting on Form 11 (Register as an Owner).
- **Entirely manual onboarding** — Verena's team is the bottleneck, caps growth at ~20-30 properties.
- **No owner self-service** — they can't manage their own listings, availability, or see bookings directly.
- **Three brands on one legacy server** — confusing for clients, hard to evolve independently.
- **No API, no webhooks** — every workflow is human-executed.
- **Bot spam flooding** — SSO user list and form submissions heavily polluted with automated garbage.

## How GAS solves this

- **GAS Registration + Quick Connect** = automates Verena's manual onboarding.
- **GAS Admin** = owners self-serve instead of needing Verena's team for every change.
- **GAS WP Multisite** = replaces SetSeed property listing pages; each owner gets a branded site.
- **Beds24 marketplace integration** = automates the "set up Beds24 for them" step.
- **Hostvana AI Chat** = replaces Verena's AI guest messaging.
- **Smart onboarding checklist** = exactly what booking-assist needs for self-service setup.

## Relationship options (to be decided)

**A. Direct migration**: Verena's booking-assist migrates to GAS, she keeps her brand, GAS powers it underneath. She becomes a reference client.

**B. White-label partnership**: Verena licenses GAS under her brand, keeps customer relationships, pays per-account. GAS scales via her go-to-market. Formal partner deal.

**C. Joint venture**: Deeper integration — her market + Hostvana + GAS = a full European managed-service play. Bigger commitment both sides.

**Current stance**: Option A first (migrate, prove it works), revisit B if she wants to grow. C is a future conversation only after trust is built.

## Practical path

1. Ship smart onboarding essentials build (separate spec) — core feature she needs.
2. Add Beds24 Quick Connect into the onboarding so new owners go from signup to property imported in minutes.
3. Fix the spam form on booking-assist.com (honeypot + rate limit, or replace with a GAS-hosted registration form).
4. Migrate Verena's 73 properties + 5 active owners from SetSeed into GAS (bulk migration, similar pattern to Cotswolds blog).
5. Point booking-assist.com and book-jet.com at GAS via custom domain mapping (same pattern used for Hotel Balduin).
6. Verena tests the full onboarding as if she were a new owner. Flag gaps.
7. Iterate based on her feedback — she's the ideal tester because she knows every edge case manually.

## Open questions / future decisions

- Does Verena want to keep all three brands on GAS, or consolidate to one?
- What's her capacity / timeline for the migration?
- Pricing: does she pay GAS a per-property fee, a flat SaaS fee, or revenue share?
- Does GAS bake in managed-service features for her, or do those stay her team's manual work?
- Integration with her existing Stripe subscriptions — preserve or migrate?
- Beds24 account 109705: single master account with 73 properties — marketplace link or invite code per owner?

## Old server reference data

| Field | Value |
|-------|-------|
| URL | www.booking-assist.com |
| invisible_key | `wwwbookingassistcomvswnnby4umm` |
| DB | `setseed_wwwbookingassistcomvswnnby4umm` |
| is_live | 1 |
| Form 11 | "Register as an Owner" — 474 submissions |
| Form 3 | "Register" (guest) — 147 submissions |
| Form 1 | "Contact Form" — 144 submissions |
| Beds24 user | 109705 |
| Properties | 73 (all Fuerteventura) |
| Owners | 5 approved |
| Schema | Standard SetSeed — no custom tables |

## Related docs

- `docs/blogimport.md` — migration runbook pattern (blog + attractions scripts)
- `docs/GAS-Unified-Inbox-Spec.md` — messaging infrastructure for AI chat replacement
- `CLAUDE.md` — GAS + Beds24 integration notes, Hostvana status
