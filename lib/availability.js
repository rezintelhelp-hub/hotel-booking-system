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
//
// Behaviour notes:
//   - Multi-unit rooms (quantity > 1) IGNORE room_availability.is_available
//     and is_blocked when they came from a CM webhook (beds24_webhook,
//     channex_webhook) — those flags flip false on any booking regardless of
//     capacity, which is meaningless for a quantity=5 room with 1 sold.
//   - Operator-intent blocks (source IN operator_block, manual, admin) are
//     always honoured, regardless of quantity.
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
 * @returns {Promise<Array<{date: string, available: boolean, units_free: number, quantity: number, bookings: number, blocked_by: 'operator'|'bookings'|null}>>}
 */
async function computeRoomAvailability(pool, roomId, from, to) {
  // Fetch room quantity + availability rows + bookings in one round-trip pattern
  const roomRes = await pool.query(
    `SELECT COALESCE(quantity, 1) AS quantity FROM bookable_units WHERE id = $1`,
    [roomId]
  );
  if (!roomRes.rows[0]) return [];
  const quantity = parseInt(roomRes.rows[0].quantity, 10) || 1;

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
  const bkRes = await pool.query(
    `WITH nights AS (
       SELECT generate_series(arrival_date, departure_date - INTERVAL '1 day', INTERVAL '1 day')::date AS night
         FROM bookings
        WHERE bookable_unit_id = $1
          AND status NOT IN ('cancelled','rejected','copied','declined','expired','inquiry')
          AND arrival_date < $3::date
          AND departure_date > $2::date
     )
     SELECT to_char(night, 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
       FROM nights
      WHERE night >= $2::date AND night < $3::date
      GROUP BY night`,
    [roomId, from, to]
  );
  const bkByDate = {};
  for (const r of bkRes.rows) bkByDate[r.d] = r.n;

  // Walk the date range in UTC to avoid the same timezone footgun.
  const results = [];
  const start = new Date(from + 'T00:00:00.000Z');
  const end = new Date(to + 'T00:00:00.000Z');
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().split('T')[0];
    const av = avMap[iso];
    const bookings = bkByDate[iso] || 0;
    const unitsFree = Math.max(0, quantity - bookings);

    // Operator intent wins over everything
    const operatorBlocked = av && av.is_blocked === true && OPERATOR_BLOCK_SOURCES.has(av.source);
    if (operatorBlocked) {
      results.push({ date: iso, available: false, units_free: 0, quantity, bookings, blocked_by: 'operator' });
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

    // Single-unit: honour raw is_available / is_blocked (they can't be
    // "false positives" the way they are for multi-unit). If no row exists,
    // default to available (matches legacy behaviour — missing row = open).
    // blocked_by uses cm_block when the block came from a channel-manager
    // sync (source outside the operator whitelist) so callers can
    // distinguish legacy CM noise from real operator intent.
    let available;
    let blockedBy = null;
    if (!av) {
      available = unitsFree > 0;
      if (!available) blockedBy = 'bookings';
    } else if (av.is_blocked === true) {
      available = false;
      blockedBy = 'cm_block';   // (operator_block source was handled above)
    } else if (av.is_available === false) {
      available = false;
      blockedBy = bookings > 0 ? 'bookings' : 'cm_block';
    } else {
      available = unitsFree > 0;
      if (!available) blockedBy = 'bookings';
    }
    results.push({ date: iso, available, units_free: unitsFree, quantity, bookings, blocked_by: blockedBy });
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

module.exports = { computeRoomAvailability, computeRoomAvailabilityForDate };
