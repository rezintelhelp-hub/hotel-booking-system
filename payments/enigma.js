// Enigma (card-guarantee) adapter for the admin Add-Booking flow. Enigma
// stores the card in their PCI vault — we never see the PAN, only a token
// + last4 + brand. No money moves at booking time; this is "I'm taking
// your card details so we can charge if you no-show".
//
// Unlike Stripe/Square, Enigma is a single platform-wide account (one set
// of credentials in env, used across every property), so loadConfig only
// gates on whether the property's accepted_methods include 'card_guarantee'
// and whether env credentials are present.
//
// Helpers from caller:
//   getEnigmaAccessToken() → bearer token for the Card Vault API

module.exports = {
  provider: 'enigma',

  async loadConfig(pool, propertyId /*, helpers */) {
    // We don't gate on per-property Enigma credentials (there aren't any) —
    // just on whether Enigma env is configured at all. The endpoint-level
    // accepted_methods check already filters out properties that don't offer
    // card_guarantee to their guests.
    if (!process.env.ENIGMA_API_URL && !process.env.ENIGMA_CLIENT_ID && !process.env.ENIGMA_CLIENT_SECRET) {
      return null;
    }
    const p = await pool.query('SELECT currency FROM properties WHERE id = $1', [propertyId]);
    if (p.rows.length === 0) return null;
    return {
      api_url: process.env.ENIGMA_API_URL || 'https://api.enigmavault.io',
      // Vault iframe URL — the client embeds this so the guest enters card
      // details directly into Enigma (PAN never touches our server).
      vault_url: process.env.ENIGMA_VAULT_URL || 'https://vault.enigmavault.io',
      client_id: process.env.ENIGMA_CLIENT_ID || null,
      currency: (p.rows[0].currency || 'GBP').toUpperCase(),
    };
  },

  clientConfig(cfg) {
    if (!cfg) return null;
    return {
      vault_url: cfg.vault_url,
      client_id: cfg.client_id,
      currency: cfg.currency,
    };
  },

  // Enigma never charges at booking time — chargeAndConfirm throws to make
  // misuse obvious. Use storeCardOnly() instead from the dispatcher.
  async chargeAndConfirm() {
    const err = new Error('card_guarantee is auth-only — use storeCardOnly()');
    err.code = 'NOT_SUPPORTED';
    throw err;
  },

  // opts: { token: enigma_reference_id (from the iframe tokenisation) }
  // Returns the card details to stamp onto the booking row. Caller writes
  // them to bookings.enigma_* columns (see server.js:90315-90337).
  async storeCardOnly(cfg, opts, helpers) {
    const accessToken = await helpers.getEnigmaAccessToken();
    const resp = await fetch(`${cfg.api_url}/cardvault/cards?referenceId=${encodeURIComponent(opts.token)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const body = await resp.json();
    if (!resp.ok || !Array.isArray(body) || body.length === 0) {
      const err = new Error('Enigma card lookup failed or returned no match');
      err.code = 'NOT_FOUND';
      err.reference_id = opts.token;
      throw err;
    }
    const card = body[0];
    return {
      provider: 'enigma',
      provider_payment_id: null,             // no charge → no payment id
      customer_id: null,
      payment_method_id: card.token || card.cardToken,
      status: 'guaranteed',
      last4: card.lastFour || card.last4 || null,
      brand: card.cardType || card.brand || null,
      // Fields specific to enigma storage — caller persists these onto the
      // booking row in bookings.enigma_* columns.
      enigma_reference_id: opts.token,
      enigma_card_token: card.token || card.cardToken,
      enigma_card_first_six: card.firstSix || card.first6 || null,
      enigma_card_name: card.cardholderName || card.name || null,
      enigma_card_exp_month: card.expiryMonth || card.expMonth || null,
      enigma_card_exp_year: card.expiryYear || card.expYear || null,
    };
  },
};
