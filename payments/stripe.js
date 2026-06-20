// Stripe adapter for the admin Add-Booking flow (and future migration of
// /api/public/book). Sourced from payment_configurations — each property has
// its OWN Stripe account with its own secret key (NOT Stripe Connect). This
// mirrors what the public booking flow already does at server.js:89544.
//
// Adapter contract (shared with payments/square.js, payments/enigma.js):
//   provider            : string identifier
//   loadConfig(pool, propertyId) → cfg with credentials or null
//   clientConfig(cfg)            → safe bits for the browser (no secrets) or null
//   chargeAndConfirm(cfg, opts)  → { provider_payment_id, customer_id, status, last4, brand } or throws
//
// Adapters never hold their own state — they're pure helpers around the
// provider SDK. The endpoint code does credential resolution + dispatch.

const Stripe = require('stripe');

module.exports = {
  provider: 'stripe',

  async loadConfig(pool, propertyId /*, helpers */) {
    // Property-level config first, then account-level (mirrors /api/public/book
    // lookup order at server.js:89547-89557).
    let r = await pool.query(`
      SELECT pc.credentials, p.currency
        FROM payment_configurations pc
        JOIN properties p ON p.id = $1
       WHERE pc.property_id = $1 AND pc.provider = 'stripe' AND pc.is_enabled = true
       LIMIT 1
    `, [propertyId]);
    if (r.rows.length === 0) {
      r = await pool.query(`
        SELECT pc.credentials, p.currency
          FROM payment_configurations pc
          JOIN properties p ON pc.account_id = p.account_id
         WHERE p.id = $1 AND pc.property_id IS NULL
           AND pc.provider = 'stripe' AND pc.is_enabled = true
         LIMIT 1
      `, [propertyId]);
    }
    if (r.rows.length === 0) return null;
    const creds = r.rows[0].credentials || {};
    if (!creds.secret_key) return null;
    return {
      secret_key: creds.secret_key,
      publishable_key: creds.publishable_key || null,
      currency: (r.rows[0].currency || 'GBP').toUpperCase(),
    };
  },

  clientConfig(cfg) {
    if (!cfg || !cfg.publishable_key) return null;
    return {
      publishable_key: cfg.publishable_key,
      currency: cfg.currency,
      // stripe_account_id intentionally absent — direct-key properties don't
      // route via Connect, so the client must NOT pass a stripeAccount option.
    };
  },

  // opts: {
  //   token: payment_method_id,
  //   amount: number (major units, e.g. 12.50),
  //   currency: string (ISO upper),
  //   save_card_on_file: bool,
  //   description: string,
  //   metadata: object,
  //   moto: bool (operator-keyed call — bypasses 3DS, lower chargeback exposure)
  // }
  async chargeAndConfirm(cfg, opts) {
    const stripe = Stripe(cfg.secret_key);
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(opts.amount * 100),
      currency: (opts.currency || cfg.currency).toLowerCase(),
      payment_method: opts.token,
      ...(opts.moto ? { payment_method_options: { card: { moto: true } } } : {}),
      confirm: true,
      off_session: false,
      setup_future_usage: opts.save_card_on_file ? 'off_session' : undefined,
      description: opts.description,
      metadata: opts.metadata || {},
    });

    if (pi.status !== 'succeeded') {
      // Caller decides whether to surface client_secret for SCA. Throw with
      // structured info so the dispatcher can return a clean error.
      const err = new Error(`Stripe charge not succeeded: status=${pi.status}`);
      err.code = 'NOT_SUCCEEDED';
      err.payment_intent_id = pi.id;
      err.client_secret = pi.client_secret;
      err.status = pi.status;
      throw err;
    }

    const charge = pi.latest_charge ? (typeof pi.latest_charge === 'string'
      ? await stripe.charges.retrieve(pi.latest_charge)
      : pi.latest_charge) : null;

    return {
      provider: 'stripe',
      provider_payment_id: pi.id,
      customer_id: typeof pi.customer === 'string' ? pi.customer : (pi.customer?.id || null),
      payment_method_id: typeof pi.payment_method === 'string' ? pi.payment_method : (pi.payment_method?.id || null),
      status: pi.status,
      last4: charge?.payment_method_details?.card?.last4 || null,
      brand: charge?.payment_method_details?.card?.brand || null,
    };
  },
};
