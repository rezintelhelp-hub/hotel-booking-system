# Checkout — shared init refactor

**Status:** Queued — not started
**Estimate:** 2-3 hours careful work + a full click-through of every checkout path
**Trigger:** 2026-09-06 cart-only patch spiral (Steve/Hebden bike-storage)

## The problem

`plugins/gas-booking/assets/js/gas-booking.js` currently has three parallel checkout paths — room checkout, group checkout, cart-only checkout — each with its own copy of:

- Step navigation (`.gas-next-step` / `.gas-prev-step` handlers)
- Payment option selection (card / property / etc.)
- Stripe fetch + Elements mount
- Form visibility toggles (`.gas-stripe-form`, `.gas-payment-summary`)
- Card-status label updates
- Deposit / total display

Any UX polish shipped for room checkout silently doesn't reach the other two. Cart-only drifted so far that Continue buttons were dead, Stripe was mounting into `display:none` elements, and payment options showed pay-at-property on bike-storage flows. Result: four patch commits over one session that Steve rejected as the wrong shape.

## The refactor

Extract the shared UX into a single `initCheckoutShared({ mode, ... })` function that ALL three flows call. Each mode contributes only its unique bits:

- **room** — room fetch, availability calendar, per-night pricing, room-specific extras
- **group** — cart iteration for multi-room bookings, per-group Stripe instances
- **cart-only** — cart line render, single Stripe instance, bike-storage submit endpoint

`initCheckoutShared` owns:
1. Step navigation (delegated on $checkoutPage, scoped)
2. Payment option render + selection (based on payment_methods config OR mode-override for cart-only)
3. Stripe fetch + Elements mount + card-status label
4. Form visibility toggles when card option selected
5. Standard submit-button state machine (enabled / processing / error)

## Rollout

Ship one flow at a time behind a `?refactored=1` URL flag on Steve's own gites (account 197) first. Compare side-by-side with the current path. Flip default to on per-account with monitoring. Delete old duplicated paths only after 30 days of no regressions.

## Risks

- **Live business.** All three flows are on production sites. Any regression in payment shows up as lost bookings.
- **DOM diff.** The three flows may have small HTML shape differences that the shared init needs to accommodate. Audit each mode's HTML before writing the shared function.
- **Stripe scope.** Multiple stripeInstance vars in the same file. Refactor must not accidentally leak state between modes (a cart Stripe instance shouldn't be reachable from the room-checkout submit).

## What NOT to do

- Do not attempt this refactor as a live-session drip fix. Dedicated session with the full plugin file open, a test recipe for all three flows, and a rollback path.
- Do not merge unless every flow has been click-through tested end-to-end on the multisite VPS staging (bookrocketstay is the sandbox).

## Files that will change

- `plugins/gas-booking/assets/js/gas-booking.js` (only)
- Plugin version bump

No server.js changes — this is purely a client refactor.

## Related

- `feedback_never_patch_always_root_cause.md` (2026-09-06) — the incident that generated this spec
- `feedback_mirror_working_sibling.md` — don't invent when a sibling section already works
