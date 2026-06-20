// Payment-provider adapter registry.
//
// accepted_methods stores the user-facing payment OPTIONS the property offers
// (e.g. 'stripe', 'square', 'card_guarantee'). Each option maps to the
// technology adapter that backs it. Adding a new provider:
//
//   1. Drop a new module in payments/<name>.js implementing the adapter
//      contract (provider, loadConfig, clientConfig, chargeAndConfirm[,
//      storeCardOnly]).
//   2. Add a mapping below (accepted_method string → adapter module).
//
// That's it. No changes to the GAS Admin modal or the with-card dispatcher
// — both iterate this registry.
//
// Why method-name → adapter-module (rather than provider-name → module):
// 'card_guarantee' is a payment option name, not a technology. Today it's
// backed by Enigma; tomorrow it could be backed by Worldpay's $0 auth
// flow. Keeping the mapping in one place means the swap is one line.

const stripe = require('./stripe');
const square = require('./square');
const enigma = require('./enigma');

const REGISTRY = {
  stripe:         stripe,
  square:         square,
  card_guarantee: enigma,
};

module.exports = {
  /**
   * Get adapter for a given accepted_methods string.
   * Returns null if no adapter is registered (e.g. 'pay_at_property',
   * 'bank_transfer' — these don't need a payment widget).
   */
  forMethod(method) {
    return REGISTRY[method] || null;
  },

  /**
   * All registered methods (the ones with an adapter). Useful when the
   * caller wants to know "which payment OPTIONS could this property
   * possibly support?" — versus per-property accepted_methods which
   * narrows it down.
   */
  registeredMethods() {
    return Object.keys(REGISTRY);
  },

  /**
   * Resolve every adapter for a property in one pass. For each method in
   * the property's accepted_methods that has a registered adapter, calls
   * loadConfig and returns the client-safe shape (no secrets).
   *
   * Returns { stripe: {...} | null, square: {...} | null, card_guarantee: {...} | null }
   * keyed by accepted_methods string. Methods not in accepted_methods or
   * not configured at the property level are null.
   */
  async resolveClientConfig(pool, propertyId, acceptedMethods, helpers) {
    const result = {};
    for (const method of Object.keys(REGISTRY)) {
      if (!acceptedMethods.includes(method)) {
        result[method] = null;
        continue;
      }
      const adapter = REGISTRY[method];
      try {
        const cfg = await adapter.loadConfig(pool, propertyId, helpers);
        result[method] = cfg ? adapter.clientConfig(cfg) : null;
      } catch (e) {
        // One provider's lookup failing must not block the rest. Log but
        // surface as "not configured" to the modal.
        console.warn(`[payments] ${method} loadConfig failed for property ${propertyId}:`, e.message);
        result[method] = null;
      }
    }
    return result;
  },
};
