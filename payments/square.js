// Square adapter for the admin Add-Booking flow. Square is per-ACCOUNT
// (each operator's GAS account connects ONE Square merchant via OAuth), so
// the lookup goes account → token → location → charge. Mirrors the public
// booking Square block at server.js:89629.
//
// Helpers required from the caller (they live in server.js and reach into
// account-scoped state we don't want to duplicate):
//   refreshSquareTokenIfNeeded(accountId) → fresh access_token
//   getSquareLocationForAccount(accountId) → { id, currency, ... }

module.exports = {
  provider: 'square',

  async loadConfig(pool, propertyId, helpers) {
    const acctRow = await pool.query(`
      SELECT a.id AS account_id, a.square_status, a.square_environment, p.currency AS property_currency
        FROM properties p JOIN accounts a ON a.id = p.account_id
       WHERE p.id = $1
    `, [propertyId]);
    if (acctRow.rows.length === 0) return null;
    const acct = acctRow.rows[0];
    if (acct.square_status !== 'active') return null;

    const accessToken = await helpers.refreshSquareTokenIfNeeded(acct.account_id);
    if (!accessToken) return null;

    const loc = await helpers.getSquareLocationForAccount(acct.account_id);
    if (!loc || !loc.id) return null;

    return {
      account_id: acct.account_id,
      access_token: accessToken,
      location_id: loc.id,
      environment: acct.square_environment || 'sandbox',
      // Square is single-currency per merchant — funds settle in the location's
      // currency regardless of the property's currency. /v2/payments rejects
      // a mismatch with INVALID_VALUE.
      currency: (loc.currency || 'USD').toUpperCase(),
      property_currency: (acct.property_currency || 'USD').toUpperCase(),
      application_id: process.env.SQUARE_CLIENT_ID || null,
    };
  },

  clientConfig(cfg) {
    if (!cfg || !cfg.application_id || !cfg.location_id) return null;
    return {
      application_id: cfg.application_id,
      location_id: cfg.location_id,
      environment: cfg.environment,
      currency: cfg.currency,
      property_currency: cfg.property_currency,
    };
  },

  // opts: {
  //   token: square_source_id (from Web Payments SDK tokenisation),
  //   verification_token: optional SCA token,
  //   amount: number (major units),
  //   buyer_email: string,
  //   description: string,
  //   reference_id: string (passed through to Square — appears on the payout report),
  //   idempotency_key: optional — defaulted from token+amount if absent
  // }
  async chargeAndConfirm(cfg, opts) {
    const apiBase = cfg.environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const amountMinor = Math.round(Number(opts.amount) * 100);
    const idemKey = (opts.idempotency_key || `book-${opts.reference_id || cfg.location_id}-${opts.token}-${amountMinor}`).slice(0, 45);

    const resp = await fetch(`${apiBase}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.access_token}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-12-18',
      },
      body: JSON.stringify({
        source_id: opts.token,
        idempotency_key: idemKey,
        amount_money: { amount: amountMinor, currency: cfg.currency },
        location_id: cfg.location_id,
        autocomplete: true,
        verification_token: opts.verification_token || undefined,
        buyer_email_address: opts.buyer_email || undefined,
        note: opts.description || undefined,
        reference_id: opts.reference_id || undefined,
      }),
    });
    const body = await resp.json();
    if (!resp.ok) {
      const errs = Array.isArray(body?.errors) ? body.errors : [];
      const first = errs[0] || {};
      const err = new Error(first.detail || 'Square charge failed');
      err.code = first.code || 'SQUARE_ERROR';
      err.http_status = resp.status;
      err.errors = errs;
      throw err;
    }
    const payment = body.payment;
    if (!payment || payment.status !== 'COMPLETED') {
      const err = new Error(`Square payment not COMPLETED (status=${payment?.status})`);
      err.code = 'NOT_COMPLETED';
      err.payment = payment;
      throw err;
    }
    return {
      provider: 'square',
      provider_payment_id: payment.id,
      customer_id: payment.customer_id || null,
      payment_method_id: payment.card_details?.card?.id || null,
      status: payment.status,
      last4: payment.card_details?.card?.last_4 || null,
      brand: payment.card_details?.card?.card_brand || null,
      // Square needs the merchant's location for refunds and audit.
      location_id: cfg.location_id,
    };
  },
};
