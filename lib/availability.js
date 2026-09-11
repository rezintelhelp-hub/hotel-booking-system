// Shared availability helper — single source of truth for "is this room
// available on this date?" across every consumer (admin calendar, site
// picker, mini-calendar, calculate-price, /book gate, Channex outbox push).
//
// Before this module existed, each endpoint reimplemented the rule locally,
// which drifted. Belmont 2026-09-10 lost hours to admin-vs-picker mismatch
// for a multi-unit room. See project_availability_unification_20260911.md.
//
// The rule
//   available(room, date) = (quantity - active_bookings_on_date) > 0
//                            AND NOT operator_stop_sell(room, date)
//                            AND NOT exclusive_hire_booked(property, date)
//
// Behaviour notes:
//   - Multi-unit rooms (quantity > 1) IGNORE room_availability.is_available
//     and is_blocked when they came from a CM webhook (beds24_webhook,
//     channex_webhook) — those flags flip false on any booking regardless of
//     capacity, which is meaningless for a quantity=5 room with 1 sold.
//   - Single-unit rooms also ignore CM-source is_blocked when there is no
//     matching booking. Beds24's dependency cascade wrongly closes sibling
//     rooms when one child room books (Hebden Ex Hire pattern 2026-09-11).
//     Bookings-count is source of truth; CM cascade noise is discarded.
//   - Operator-intent blocks (source IN operator_block, manual, admin) are
//     always honoured, regardless of quantity.
//   - Exclusive-hire buyout: any active booking on a bookable_units row with
//     unit_role='exclusive_hire' on the same property fully closes THIS room
//     for the date. Guest bought the whole property → all children sold too.
//     The buyout cascade at server.js:116586 posts silent block bookings to
//     Beds24 for OTA closure; here we ensure the read side agrees.
//   - Pool-model accounts (accounts.inventory_model='pool') bypass this
//     helper entirely — pool cascade math lives in /api/availability's pool
//     branch and this helper's caller should route pool rooms there.

'use strict';

const OPERATOR_BLOCK_SOURCES = new Set(['operator_block', 'manual', 'admin']);

/**
 * Compute availability for a room across a date range.
 *
 * @param {Pool} pool - pg Pool
 * @param {number} roomId - bookable_units.id
 * @param {string} from - ISO date, inclusive
 * @param {string} to - ISO date, exclusive
 * @param {number[]} [linkedRoomIds] - optional list of room IDs to include in the
 *   bookings count. Used by the admin availability endpoint for Beds24 wrapper
 *   rooms that hang off hidden child bookable_units (dependencies.includeBookingsRoomId1
 *   pattern) — bookings live on the child ids but must count against the wrapper's
 *   quantity. Defaults to [roomId] when omitted.
 * @returns {Promise<Array<{date: string, available: boolean, units_free: number, quantity: number, bookings: number, blocked_by: 'operator'|'bookings'|'buyout'|null}>>}
 */
async function computeRoomAvailability(pool, roomId, from, to, linkedRoomIds) {
  // Fetch room quantity + property (for buyout lookup) in one round-trip
  const roomRes = await pool.query(
    `SELECT COALESCE(quantity, 1) AS quantity, property_id, COALESCE(unit_role, 'room') AS unit_role
       FROM bookable_units WHERE id = $1`,
    [roomId]
  );
  if (!roomRes.rows[0]) return [];
  const quantity = parseInt(roomRes.rows[0].quantity, 10) || 1;
  const propertyId = roomRes.rows[0].property_id;
  const isSelfExclusiveHire = roomRes.rows[0].unit_role === 'exclusive_hire';

  const avRes = await pool.query(
    `SELECT to_char(date, 'YYYY-MM-DD') AS d, is_available, is_blocked, source
       FROM room_availability
      WHERE room_id = $1 AND date >= $2::date AND date < $3::date`,
    [roomId, from, to]
  );
  const avMap = {};
  for (const r of avRes.rows) avMap[r.d] = r;

  // Bookings-per-date map. Ask Postgres to expand each booking's night
  // range so we avoid the local-vs-UTC Date arithmetic footgun (setDate
  // vs setUTCDate — mixing them silently shifts dates by ±1 day in
  // non-UTC timezones). generate_series inside SQL returns exact dates.
  //
  // Status exclusion list matches /api/availability/:roomId legacy branch
  // exactly (server.js:89289) so this swap is behaviour-preserving. Note
  // 'inquiry' is intentionally NOT excluded here — Beds24 inquiry-status
  // holds DO block availability in the legacy branch. The pool branch
  // differs (excludes inquiry); pool-model callers should route through
  // their own path, not this helper.
  const bookingRoomIds = Array.isArray(linkedRoomIds) && linkedRoomIds.length
    ? linkedRoomIds.map(id => parseInt(id, 10)).filter(Number.isFinite)
    : [parseInt(roomId, 10)];
  const bkRes = await pool.query(
    `WITH nights AS (
       SELECT generate_series(arrival_date, departure_date - INTERVAL '1 day', INTERVAL '1 day')::date AS night
         FROM bookings
        WHERE bookable_unit_id = ANY($1::int[])
          AND status NOT IN ('cancelled','rejected','copied')
          AND arrival_date < $3::date
          AND departure_date > $2::date
     )
     SELECT to_char(night, 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
       FROM nights
      WHERE night >= $2::date AND night < $3::date
      GROUP BY night`,
    [bookingRoomIds, from, to]
  );
  const bkByDate = {};
  for (const r of bkRes.rows) bkByDate[r.d] = r.n;

  // Buyout-per-date map. Bookings on any exclusive_hire unit on the same
  // property mean the whole property is sold to a single guest — every
  // room on that property must show closed for those dates regardless of
  // its own booking count. Skipped when the queried room IS itself an
  // exclusive_hire unit (its own bookings already sit in bkByDate).
  const buyoutByDate = {};
  if (propertyId && !isSelfExclusiveHire) {
    const buyoutRes = await pool.query(
      `WITH exh AS (
         SELECT id FROM bookable_units
          WHERE property_id = $1 AND COALESCE(unit_role, 'room') = 'exclusive_hire'
       ),
       nights AS (
         SELECT generate_series(arrival_date, departure_date - INTERVAL '1 day', INTERVAL '1 day')::date AS night
           FROM bookings b
          WHERE b.bookable_unit_id IN (SELECT id FROM exh)
            AND b.status NOT IN ('cancelled','rejected','copied')
            AND b.arrival_date < $3::date
            AND b.departure_date > $2::date
       )
       SELECT to_char(night, 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
         FROM nights
        WHERE night >= $2::date AND night < $3::date
        GROUP BY night`,
      [propertyId, from, to]
    );
    for (const r of buyoutRes.rows) buyoutByDate[r.d] = r.n;
  }

  // Walk the date range in UTC to avoid the same timezone footgun.
  const results = [];
  const start = new Date(from + 'T00:00:00.000Z');
  const end = new Date(to + 'T00:00:00.000Z');
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().split('T')[0];
    const av = avMap[iso];
    const bookings = bkByDate[iso] || 0;
    const buyout = buyoutByDate[iso] || 0;
    const unitsFree = Math.max(0, quantity - bookings);

    // Operator intent wins over everything
    const operatorBlocked = av && av.is_blocked === true && OPERATOR_BLOCK_SOURCES.has(av.source);
    if (operatorBlocked) {
      results.push({ date: iso, available: false, units_free: 0, quantity, bookings, blocked_by: 'operator' });
      continue;
    }

    // Buyout — whole property sold to one guest
    if (buyout > 0) {
      results.push({ date: iso, available: false, units_free: 0, quantity, bookings, blocked_by: 'buyout' });
      continue;
    }

    // Multi-unit: units_free is authoritative, ignore CM-noise is_blocked
    if (quantity > 1) {
      const available = unitsFree > 0;
      results.push({
        date: iso, available, units_free: unitsFree, quantity, bookings,
        blocked_by: available ? null : 'bookings'
      });
      continue;
    }

    // Single-unit: bookings-count authoritative. CM-source is_blocked with
    // no matching booking is cascade noise (Hebden Ex Hire pattern
    // 2026-09-11 — Beds24 auto-closes sibling rooms when one child books).
    // The /public/book gate's belt-and-braces real-time Beds24 check at
    // server.js:114694 remains the last-line defence against remote drift
    // (e.g. an OTA booking that hasn't reached GAS yet).
    if (bookings > 0) {
      results.push({ date: iso, available: false, units_free: 0, quantity, bookings, blocked_by: 'bookings' });
      continue;
    }
    results.push({ date: iso, available: true, units_free: 1, quantity, bookings, blocked_by: null });
  }
  return results;
}

/**
 * Convenience: single-date lookup.
 */
async function computeRoomAvailabilityForDate(pool, roomId, dateStr) {
  const next = new Date(dateStr);
  next.setDate(next.getDate() + 1);
  const toStr = next.toISOString().split('T')[0];
  const arr = await computeRoomAvailability(pool, roomId, dateStr, toStr);
  return arr[0] || null;
}

/**
 * Return the Set of ISO date strings in [from, to) where the property has
 * at least one active booking on a bookable_units row with
 * unit_role='exclusive_hire'. Callers use this to close every room on
 * those dates regardless of the room's own booking count / pool cascade
 * / CM flag. Pool-model endpoints (which bypass computeRoomAvailability)
 * still need this because Beds24 leaks the wrapper-close's "closed on
 * date X" but sometimes drops date Y that IS covered by the exclusive
 * booking — the buyout cascade at server.js:116586 posts Beds24 blocks
 * but the Beds24 API can still return conflicting availability rows.
 *
 * @param {Pool} pool - pg Pool
 * @param {number} propertyId - properties.id
 * @param {string} from - ISO date, inclusive
 * @param {string} to - ISO date, exclusive
 * @returns {Promise<Set<string>>}
 */
async function getBuyoutDates(pool, propertyId, from, to) {
  const out = new Set();
  if (!propertyId) return out;
  try {
    const r = await pool.query(
      `WITH exh AS (
         SELECT id FROM bookable_units
          WHERE property_id = $1 AND COALESCE(unit_role, 'room') = 'exclusive_hire'
       ),
       nights AS (
         SELECT generate_series(arrival_date, departure_date - INTERVAL '1 day', INTERVAL '1 day')::date AS night
           FROM bookings b
          WHERE b.bookable_unit_id IN (SELECT id FROM exh)
            AND b.status NOT IN ('cancelled','rejected','copied')
            AND b.arrival_date < $3::date
            AND b.departure_date > $2::date
       )
       SELECT DISTINCT to_char(night, 'YYYY-MM-DD') AS d
         FROM nights
        WHERE night >= $2::date AND night < $3::date`,
      [propertyId, from, to]
    );
    for (const row of r.rows) out.add(row.d);
  } catch (e) {
    // Buyout lookup is a safety net; never fail the calling endpoint.
    console.warn('[getBuyoutDates]', e.message);
  }
  return out;
}

module.exports = { computeRoomAvailability, computeRoomAvailabilityForDate, getBuyoutDates };
