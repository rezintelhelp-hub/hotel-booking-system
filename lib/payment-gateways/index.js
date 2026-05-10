// Gateway dispatch for deposit hold operations.
//
// Picks the right backend module based on bookings.deposit_hold_gateway.
// Phase 2 ships only Stripe; 'enigma' and 'authnet' modules slot in here
// when their integrations are built — no rewrite of the calling code.
//
// Usage from server.js:
//   const gateway = require('./lib/payment-gateways');
//   const result = await gateway.block(booking, { stripe, amount, currency, returnUrl });

const stripeDeposit = require('./stripe-deposit');

const MODULES = {
  stripe: stripeDeposit,
  // 'enigma':  require('./enigma-deposit'),   // future
  // 'authnet': require('./authnet-deposit'),  // future
};

function pickModule(booking) {
  const gw = booking.deposit_hold_gateway || 'stripe';
  const mod = MODULES[gw];
  if (!mod) throw new Error(`Unsupported deposit gateway: ${gw}`);
  return { mod, gateway: gw };
}

async function block(booking, opts) {
  const { mod } = pickModule(booking);
  return mod.block({ booking, ...opts });
}

async function release(booking, opts) {
  const { mod } = pickModule(booking);
  return mod.release({
    paymentIntentId: booking.deposit_hold_pi_id,
    stripeAccount: booking.stripe_account_id,
    ...opts
  });
}

async function capture(booking, opts) {
  const { mod } = pickModule(booking);
  return mod.capture({
    paymentIntentId: booking.deposit_hold_pi_id,
    stripeAccount: booking.stripe_account_id,
    ...opts
  });
}

async function setupCard(booking, opts) {
  const { mod } = pickModule(booking);
  return mod.setupCard({
    customerId: booking.stripe_customer_id,
    stripeAccount: booking.stripe_account_id,
    ...opts
  });
}

module.exports = { block, release, capture, setupCard, pickModule };
