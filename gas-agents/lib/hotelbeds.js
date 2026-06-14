/**
 * Slim Hotelbeds caller for gas-agents.
 *
 * Mirrors the relevant bits of gas-sync/adapters/hotelbeds-adapter.js
 * (which can't be require()'d from here because Railway only deploys this
 * service's root directory). Uses native fetch (Node 20+).
 *
 * Credentials live on accounts (account 272 = singleton Hotelbeds source).
 */

const crypto = require('crypto');

const HOTELBEDS_BASES = {
    test: 'https://api.test.hotelbeds.com',
    production: 'https://api.hotelbeds.com',
};

function signHotelbeds(apiKey, secret) {
    const ts = Math.floor(Date.now() / 1000);
    return crypto.createHash('sha256').update(`${apiKey}${secret}${ts}`).digest('hex');
}

function hbHeaders(apiKey, secret) {
    return {
        'Api-key': apiKey,
        'X-Signature': signHotelbeds(apiKey, secret),
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
    };
}

async function loadCreds(pool, accountId = 272) {
    const r = await pool.query(
        `SELECT hotelbeds_api_key, hotelbeds_secret, hotelbeds_environment, hotelbeds_status
           FROM accounts WHERE id = $1`,
        [accountId]
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    if (!row.hotelbeds_api_key || !row.hotelbeds_secret) return null;
    if (row.hotelbeds_status && row.hotelbeds_status !== 'active') return null;
    return {
        apiKey: row.hotelbeds_api_key,
        secret: row.hotelbeds_secret,
        base: HOTELBEDS_BASES[row.hotelbeds_environment === 'production' ? 'production' : 'test'],
    };
}

/**
 * Search Hotelbeds availability for given stay + occupancy.
 * Returns { ok, data } from /hotel-api/1.0/hotels or { ok:false, error }.
 */
async function searchAvailability(pool, accountId, { stay, occupancies, destinationCode, hotelCodes }) {
    const creds = await loadCreds(pool, accountId);
    if (!creds) return { ok: false, error: 'no Hotelbeds credentials on account' };

    const payload = {
        sourceMarket: 'UK',
        stay,
        occupancies: Array.isArray(occupancies) ? occupancies : [occupancies],
    };
    if (Array.isArray(hotelCodes) && hotelCodes.length) {
        payload.hotels = { hotel: hotelCodes.map((c) => parseInt(c, 10)).filter(Number.isFinite) };
    } else if (destinationCode) {
        payload.destination = { code: String(destinationCode) };
    } else {
        return { ok: false, error: 'destinationCode or hotelCodes required' };
    }
    try {
        const resp = await fetch(`${creds.base}/hotel-api/1.0/hotels`, {
            method: 'POST',
            headers: hbHeaders(creds.apiKey, creds.secret),
            body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) return { ok: false, error: data?.error || `HTTP ${resp.status}`, raw: data };
        return { ok: true, data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Confirm a Hotelbeds booking against a previously-returned rateKey.
 * Body: { rateKey, holder: {name, surname, email?}, paxes?, clientReference? }
 * Returns { ok, data } where data.booking is Hotelbeds' booking row.
 */
async function createBooking(pool, accountId, { rateKey, holder, paxes, clientReference, tolerance, remark }) {
    const creds = await loadCreds(pool, accountId);
    if (!creds) return { ok: false, error: 'no Hotelbeds credentials on account' };
    if (!rateKey || !holder?.name || !holder?.surname) {
        return { ok: false, error: 'rateKey + holder.name + holder.surname required' };
    }
    const payload = {
        holder: { name: holder.name, surname: holder.surname },
        rooms: [{
            rateKey,
            paxes: Array.isArray(paxes) && paxes.length
                ? paxes
                : [{ roomId: 1, type: 'AD', name: holder.name, surname: holder.surname }],
        }],
        clientReference: clientReference || `GAS-AG-${Date.now()}`,
    };
    if (tolerance != null) payload.tolerance = tolerance;
    if (remark) payload.remark = remark;
    try {
        const resp = await fetch(`${creds.base}/hotel-api/1.0/bookings`, {
            method: 'POST',
            headers: hbHeaders(creds.apiKey, creds.secret),
            body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) return { ok: false, error: data?.error || `HTTP ${resp.status}`, raw: data };
        return { ok: true, data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = { searchAvailability, createBooking };
