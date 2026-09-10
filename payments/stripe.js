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
    // Connect-Standard mode (Steve 2026-09-09 — St Ives driver): properties
    // onboarded via /api/admin/stripe-connect/onboard land here with a
    // stripe_account_id but NO per-property publishable/secret keys. Fall
    // back to the platform's keys (env) and route API calls with the
    // {stripeAccount} option so charges land on the client's Connect
    // account. Direct-key properties (creds.secret_key present) stay on
    // the legacy path.
    const isConnectMode = !creds.secret_key && (creds.stripe_account_id || creds.account_id);
    if (isConnectMode) {
      const platformSecret = process.env.STRIPE_SECRET_KEY;
      const platformPk = process.env.STRIPE_PUBLISHABLE_KEY;
      if (!platformSecret || !platformPk) return null;
      return {
        secret_key: platformSecret,
        publishable_key: platformPk,
        stripe_account_id: creds.stripe_account_id || creds.account_id,
        currency: (r.rows[0].currency || 'GBP').toUpperCase(),
      };
    }
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
      // For Connect-mode configs, surface stripe_account_id so the browser
      // Stripe.js SDK knows to initialise with { stripeAccount } — required
      // for the payment element to render against the client's Connect acct.
      stripe_account_id: cfg.stripe_account_id || null,
    };
  },

  // Build the request options bag for every Stripe SDK call so Connect-mode
  // calls carry { stripeAccount }. Direct-key calls get undefined — NOT {},
  // because stripe-node 14.25 rejects an empty options object with
  // "Unknown arguments ([object Object])" on POST /v1/customers etc.
  // Hebden 2026-09-10: attach-card modal died with that exact error.
  _reqOpts(cfg) {
    return cfg.stripe_account_id ? { stripeAccount: cfg.stripe_account_id } : undefined;
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
    const reqOpts = this._reqOpts(cfg);
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
    }, reqOpts);

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
      ? await stripe.charges.retrieve(pi.latest_charge, reqOpts)
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

  // Save a card without charging — used by /api/admin/bookings/:id/attach-card
  // (operator adds a card to an existing booking after the fact) and by the
  // guest-facing capture-card page. Creates a Customer, confirms a SetupIntent
  // against the passed payment_method, and returns the IDs the caller writes
  // onto the booking so the balance-due auto-charge cron can pick it up.
  //
  // opts: { token: payment_method_id, buyer_email, description, metadata }
  async storeCardOnly(cfg, opts /*, helpers */) {
    const stripe = Stripe(cfg.secret_key);
    const reqOpts = this._reqOpts(cfg);
    // Reuse existing customer if the caller passed one; otherwise create.
    let customerId = opts.customer_id || null;
    // Verify the caller-supplied customer actually still exists on this
    // Stripe account. Channex-cloned bookings sometimes carry a customer
    // id that isn't in the client's account (cloned to a different acct,
    // or the customer was later deleted). Without this check, the next
    // stripe.paymentMethods.attach throws "No such customer" and the
    // operator's Replace Card flow dies. Steve 2026-08-22 — Charles
    // House booking 707849 (cus_V5GUGx0tf5hupl).
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId, reqOpts);
      } catch (e) {
        if (e.code === 'resource_missing') {
          console.warn(`[storeCardOnly] customer ${customerId} not on this Stripe account — creating fresh`);
          customerId = null;
        } else {
          throw e;
        }
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: opts.buyer_email || undefined,
        description: opts.description || undefined,
        metadata: opts.metadata || {},
      }, reqOpts);
      customerId = customer.id;
    }
    try {
      await stripe.paymentMethods.attach(opts.token, { customer: customerId }, reqOpts);
    } catch (e) {
      if (!/already been attached/i.test(e.message || '')) throw e;
    }
    const si = await stripe.setupIntents.create({
      customer: customerId,
      payment_method: opts.token,
      confirm: true,
      usage: 'off_session',
      description: opts.description,
      metadata: opts.metadata || {},
      payment_method_types: ['card'],
    }, reqOpts);
    if (si.status !== 'succeeded' && si.status !== 'requires_action') {
      const err = new Error(`Stripe SetupIntent not succeeded: status=${si.status}`);
      err.code = 'NOT_SUCCEEDED';
      err.setup_intent_id = si.id;
      err.client_secret = si.client_secret;
      err.status = si.status;
      throw err;
    }
    const pm = await stripe.paymentMethods.retrieve(opts.token, reqOpts).catch(() => null);
    return {
      provider: 'stripe',
      provider_payment_id: null,            // no charge
      customer_id: customerId,
      payment_method_id: opts.token,
      setup_intent_id: si.id,
      status: si.status,
      last4: pm?.card?.last4 || null,
      brand: pm?.card?.brand || null,
      exp_month: pm?.card?.exp_month || null,
      exp_year: pm?.card?.exp_year || null,
    };
  },
};
