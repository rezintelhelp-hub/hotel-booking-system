// Stripe deposit-hold operations.
//
// Pure module — no DB, no Express. Caller passes in a Stripe SDK instance and
// the booking row, and gets back the operation result. Server.js endpoints
// own the persistence + auth.
//
// Why a module: when Enigma / Authorize.net deposit modules land, they
// implement the same four functions and the dispatch in lib/payment-gateways/
// index.js picks the right one based on bookings.deposit_hold_gateway.
//
// API:
//   block({ stripe, booking, amount, currency, returnUrl, idempotencyKey })
//     → { ok, paymentIntentId, status, expiresAt, clientSecret?, error? }
//
//   release({ stripe, paymentIntentId, stripeAccount?, idempotencyKey })
//     → { ok, status, error? }
//
//   capture({ stripe, paymentIntentId, amountToCapture?, stripeAccount?, idempotencyKey })
//     → { ok, capturedAmount, status, error? }
//
//   setupCard({ stripe, customerId?, stripeAccount? })
//     → { ok, setupIntentId, clientSecret, error? }
//
// All operations are idempotent at the Stripe API level when an
// idempotencyKey is provided — caller is responsible for choosing
// stable keys (typically `deposit-{bookingId}-{action}` is safe).

/**
 * Create a manual-capture PaymentIntent against the booking's saved card.
 * Bank reserves funds; nothing settles until capture() is called.
 *
 * The 7-day expiry on the auth is set by Stripe — `expiresAt` is an
 * advisory return value the caller can store for the cron-driven re-auth
 * watcher.
 */
async function block({ stripe, booking, amount, currency, returnUrl, idempotencyKey }) {
  if (!booking.stripe_payment_method_id) {
    return { ok: false, error: 'No saved payment method on this booking' };
  }
  if (!booking.stripe_customer_id) {
    return { ok: false, error: 'No saved customer on this booking' };
  }
  if (!(amount > 0)) {
    return { ok: false, error: 'amount must be > 0' };
  }

  const stripeOpts = {};
  if (booking.stripe_account_id) stripeOpts.stripeAccount = booking.stripe_account_id;
  if (idempotencyKey) stripeOpts.idempotencyKey = idempotencyKey;

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: (currency || 'gbp').toLowerCase(),
      customer: booking.stripe_customer_id,
      payment_method: booking.stripe_payment_method_id,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      // For a hold we do NOT want Stripe to send a separate receipt — we
      // own that through the sendEmail wrapper for guest_communications.
      receipt_email: null,
      description: `Security deposit hold for booking ${booking.id}`,
      metadata: {
        gas_booking_id: String(booking.id),
        gas_purpose: 'security_deposit_hold'
      },
      // Stripe needs a return_url for off_session 3DS — points at the
      // Your Stay portal so the guest can authenticate if challenged.
      return_url: returnUrl
    }, stripeOpts);

    // Stripe holds typically expire 7 days after creation. Stripe doesn't
    // expose the exact expiry on the PI object, so we compute the
    // conservative end-of-window for our cron watcher.
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
      ok: true,
      paymentIntentId: intent.id,
      status: intent.status,                   // 'requires_capture' on success
      requiresAction: intent.status === 'requires_action' || !!intent.next_action,
      clientSecret: intent.client_secret || null,
      expiresAt
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      stripeCode: err.code || null,
      stripeType: err.type || null
    };
  }
}

/**
 * Cancel an outstanding manual-capture PI — releases the bank's hold.
 * Money was never moved; the guest's "pending" line item drops in 1-7 days
 * (bank-dependent).
 */
async function release({ stripe, paymentIntentId, stripeAccount, idempotencyKey }) {
  if (!paymentIntentId) return { ok: false, error: 'paymentIntentId required' };
  const stripeOpts = {};
  if (stripeAccount) stripeOpts.stripeAccount = stripeAccount;
  if (idempotencyKey) stripeOpts.idempotencyKey = idempotencyKey;

  try {
    const intent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer'
    }, stripeOpts);
    return { ok: true, status: intent.status };
  } catch (err) {
    return { ok: false, error: err.message, stripeCode: err.code || null };
  }
}

/**
 * Capture a manual-capture PI — moves money from the bank's hold to the
 * merchant. Stripe lets us capture less than the auth amount (partial
 * capture); the rest of the hold is automatically released.
 */
async function capture({ stripe, paymentIntentId, amountToCapture, stripeAccount, idempotencyKey }) {
  if (!paymentIntentId) return { ok: false, error: 'paymentIntentId required' };
  const stripeOpts = {};
  if (stripeAccount) stripeOpts.stripeAccount = stripeAccount;
  if (idempotencyKey) stripeOpts.idempotencyKey = idempotencyKey;

  const captureArgs = {};
  if (amountToCapture > 0) {
    captureArgs.amount_to_capture = Math.round(amountToCapture * 100);
  }

  try {
    const intent = await stripe.paymentIntents.capture(paymentIntentId, captureArgs, stripeOpts);
    return {
      ok: true,
      status: intent.status,
      capturedAmount: (intent.amount_received || intent.amount) / 100,
      currency: (intent.currency || 'gbp').toUpperCase(),
      latestChargeId: intent.latest_charge || null
    };
  } catch (err) {
    return { ok: false, error: err.message, stripeCode: err.code || null };
  }
}

/**
 * Create a SetupIntent so the guest can save a card without a charge.
 * Used at booking time when the property's deposit_policy wants the
 * card on file but no immediate hold (`hold_mode: 'on_demand'`).
 *
 * If customerId is omitted, Stripe creates a customer-less SetupIntent
 * (caller can attach later) — but for GAS we always want a customer
 * so off_session charges work.
 */
async function setupCard({ stripe, customerId, stripeAccount }) {
  if (!customerId) return { ok: false, error: 'customerId required for setupCard' };
  const stripeOpts = stripeAccount ? { stripeAccount } : {};
  try {
    const setup = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { gas_purpose: 'security_deposit_setup' }
    }, stripeOpts);
    return {
      ok: true,
      setupIntentId: setup.id,
      clientSecret: setup.client_secret
    };
  } catch (err) {
    return { ok: false, error: err.message, stripeCode: err.code || null };
  }
}

module.exports = { block, release, capture, setupCard };
