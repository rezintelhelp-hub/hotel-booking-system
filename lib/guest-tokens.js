// Stateless magic-link tokens for the guest portal.
//
// Why stateless: no token table to scan/expire. Verifying = recomputing
// the HMAC. Revoking a guest's links = rotating their magic_link_secret.
//
// Token format:  <payload-b64url>.<sig-b64url>
//   payload  = JSON { g: guest_id, p: purpose, e: exp_epoch_sec, b?: booking_id, n?: nonce }
//   sig      = HMAC-SHA256( payload-b64url, peppered_secret )
// peppered_secret = HMAC-SHA256( guest.magic_link_secret, env.GUEST_LINK_PEPPER )
//
// The pepper means a stolen DB dump alone can't forge tokens against
// production — the attacker also needs the running server's env.
//
// Pure module. Server callers fetch guest.magic_link_secret and pass it in.
// No DB / network here.

const crypto = require('crypto');

const PEPPER = process.env.GUEST_LINK_PEPPER || process.env.JWT_SECRET || 'dev-pepper-change-me';

const PURPOSES = Object.freeze({
  YOUR_STAY: 'your_stay',                  // guest portal for a specific booking
  CO_TRAVELLER_INVITE: 'co_traveller_invite', // bring a co-traveller in to add details/ID
  ID_UPLOAD: 'id_upload',                   // direct link to upload ID for a booking
  SHOP_ACCOUNT: 'shop_account'              // shop order history / account view
});

const DEFAULT_TTL_SEC = {
  your_stay: 60 * 60 * 24 * 90,        // 90d — covers pre-arrival → post-stay window
  co_traveller_invite: 60 * 60 * 24 * 30, // 30d
  id_upload: 60 * 60 * 24 * 14,        // 14d
  shop_account: 60 * 60 * 24 * 7       // 7d — shorter, requested on demand
};

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function pepperedSecret(guestSecret) {
  return crypto.createHmac('sha256', PEPPER).update(guestSecret || '').digest();
}

function hmac(payloadB64, guestSecret) {
  return crypto.createHmac('sha256', pepperedSecret(guestSecret)).update(payloadB64).digest();
}

/**
 * Sign a magic-link token.
 *
 * @param {object} opts
 * @param {number} opts.guestId
 * @param {string} opts.purpose                  one of PURPOSES.*
 * @param {string} opts.secret                   guests.magic_link_secret
 * @param {number} [opts.bookingId]              optional scope
 * @param {number} [opts.expiresInSec]           override default TTL
 * @returns {string} token
 */
function signGuestToken({ guestId, purpose, secret, bookingId, expiresInSec }) {
  if (!guestId || !purpose || !secret) {
    throw new Error('signGuestToken: guestId, purpose, secret required');
  }
  if (!Object.values(PURPOSES).includes(purpose)) {
    throw new Error(`signGuestToken: unknown purpose "${purpose}"`);
  }
  const ttl = expiresInSec || DEFAULT_TTL_SEC[purpose] || 60 * 60 * 24;
  const payload = {
    g: guestId,
    p: purpose,
    e: Math.floor(Date.now() / 1000) + ttl
  };
  if (bookingId) payload.b = bookingId;
  payload.n = crypto.randomBytes(6).toString('hex'); // makes each emitted link unique even for identical purpose+ttl

  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = b64url(hmac(payloadB64, secret));
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a token. Returns { ok: true, payload } or { ok: false, reason }.
 * Caller is responsible for looking up guest.magic_link_secret first
 * (typically by decoding the payload to get guestId, then fetching the row).
 *
 * Usage pattern:
 *   const peek = peekGuestToken(token);                 // get guestId without verifying
 *   if (!peek.ok) return 401;
 *   const { magic_link_secret } = await loadGuest(peek.guestId);
 *   const verified = verifyGuestToken(token, magic_link_secret);
 *   if (!verified.ok) return 401;
 */
function verifyGuestToken(token, guestSecret) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return { ok: false, reason: 'malformed' };

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const expected = hmac(payloadB64, guestSecret);
  let provided;
  try {
    provided = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'bad_signature' };
  }

  if (typeof payload.e !== 'number' || payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return {
    ok: true,
    payload,
    guestId: payload.g,
    purpose: payload.p,
    bookingId: payload.b || null,
    expiresAt: new Date(payload.e * 1000)
  };
}

/**
 * Decode the payload WITHOUT verifying the signature. Use only to fetch
 * the guest row for the real verify step. Never trust this output for
 * authorization decisions.
 */
function peekGuestToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [payloadB64] = token.split('.');
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
    return {
      ok: true,
      guestId: payload.g,
      purpose: payload.p,
      bookingId: payload.b || null,
      expiresAt: payload.e ? new Date(payload.e * 1000) : null
    };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

module.exports = {
  PURPOSES,
  DEFAULT_TTL_SEC,
  signGuestToken,
  verifyGuestToken,
  peekGuestToken
};
