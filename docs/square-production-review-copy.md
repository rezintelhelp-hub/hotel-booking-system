# Square Production Review — Submission Copy

Paste each field into the matching question on Square's production review form
at developer.squareup.com → your app → Production → Request production access.

## App name
GAS Travel

## App description (short, ~1 sentence)
GAS Travel is a direct-booking platform for independent hotels, B&Bs and
short-stay rentals — operators connect their own payment processor to take
guest payments directly into their own merchant account.

## What does your application do? (long, ~3-5 sentences)
GAS Travel lets independent accommodation operators sell rooms direct from
their own website, free from OTA commissions. When a guest books a room,
GAS charges the deposit via the operator's connected Square merchant, then
auto-charges the balance closer to arrival from the card on file. Funds land
directly in the operator's Square dashboard — GAS never holds the money.
We also sync the booking to the operator's PMS (Beds24, Mews, Cloudbeds,
Hostaway etc.) and trigger the guest's confirmation email + lifecycle
WhatsApp messages.

## Who are your users?
Owners of independent hotels, bed-and-breakfasts, vacation rentals and small
hotel groups (typically 1–50 rooms). Currently active across the UK, EU and
USA — first US client is Casa Magnolia Bed & Breakfast in St Louis.

## OAuth scopes requested and why
- MERCHANT_PROFILE_READ — show the merchant's business name in our admin UI
  after they connect.
- PAYMENTS_READ — read payment status when an operator opens the booking in
  GAS admin (e.g. to verify a charge succeeded).
- PAYMENTS_WRITE — create the actual deposit + balance payments at booking
  time using the source_id tokenised by Square Web Payments SDK.
- CUSTOMERS_READ, CUSTOMERS_WRITE — store a Square Customer per guest so we
  can save the card on file (Cards API) for the later balance auto-charge.
- ORDERS_READ, ORDERS_WRITE — attach an Order to each payment so the
  operator's Square dashboard shows line items (room, nights, taxes,
  extras) matching the GAS booking invoice.

## Payment processing model
PCI scope kept to SAQ-A: guest card details are tokenised entirely in the
browser by Square Web Payments SDK. The tokenised source_id is sent to our
server, which calls /v2/payments against the operator's own OAuth-connected
Square merchant. We never see, store, or transmit raw card data. 3DS / SCA
is handled inline via Verify Buyer where the issuer requires it.

## App URLs
- Production app URL: https://admin.gas.travel
- Production OAuth redirect URL: https://admin.gas.travel/api/square/callback
- Privacy policy: https://admin.gas.travel/privacy.html
- Terms of service: https://admin.gas.travel/terms.html

## Webhooks
Not yet — webhook subscriptions for payment.updated / refund.created /
dispute.created follow in Phase 4 of our rollout. (If Square requires a
webhook endpoint at production-approval time, use
https://admin.gas.travel/api/webhooks/square — we'll publish the handler
before any production merchant connects.)

## Screenshots needed
1. The GAS Admin "Connect Square" button in the Bulk Payment Setup modal
   (Properties → Bulk Payment Setup → Square tab).
2. The Square OAuth grant screen as it appears to an operator (showing the
   requested scopes).
3. The Square card form rendered inside the GAS guest checkout (mobile
   browser view is best — pick a property like Casa Magnolia's dev site at
   casamagnoliabandb.sites.gas.travel).
4. The admin booking detail view showing the Square payment_id stamped on
   a confirmed booking.

## Contact for review questions
Steve Driver — rezintelhelp@gmail.com
