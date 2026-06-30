/**
 * Beds24 Outbox + Worker
 *
 * Mirrors the channex-outbox pattern (./channex-outbox.js) — every
 * availability change in GAS Admin (Quick Edit → Block / Unblock) is recorded
 * as an outbox row. A worker drains the outbox, batches rows by Beds24 room,
 * and sends ONE API call per batch via Beds24 V2's
 *   POST /api/v2/inventory/rooms
 * with the calendar payload. Without this, blocks made in GAS Admin only
 * landed in the GAS DB — Beds24 still showed the dates as available, and
 * OTAs (Booking.com / Airbnb routed through Beds24) could double-book.
 *
 * Auth: per-account access token refreshed from accounts.beds24_refresh_token
 * (invite-code path) OR gas_sync_connections.refresh_token (V2 OAuth path).
 *
 * Retry: failed batches increment `attempts` and reschedule via `next_try_at`
 * with exponential backoff (30s, 1m, 2m, 4m, 8m, 16m). After 6 attempts the
 * row goes to status 'failed' for manual inspection.
 *
 * Schema: see ensureSchema() below. Worker is started once on server boot
 * via startBeds24OutboxWorker(pool).
 */

const axios = require('axios');

const POLL_INTERVAL_MS = 8_000;
const BATCH_LIMIT      = 100;
const MAX_ATTEMPTS     = 6;
const BACKOFF_BASE_MS  = 30_000;

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_beds24_outbox (
      id BIGSERIAL PRIMARY KEY,
      account_id INTEGER,
      gas_room_id INTEGER NOT NULL,
      beds24_room_id INTEGER NOT NULL,
      date DATE NOT NULL,
      num_avail INTEGER NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_try_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_beds24_outbox_status_next ON gas_beds24_outbox (status, next_try_at) WHERE status = 'pending'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_beds24_outbox_account ON gas_beds24_outbox (account_id)`);
  console.log('[beds24-outbox] schema ensured');
}

/**
 * Resolve a GAS room ID to its Beds24 mapping. Returns null if the room
 * isn't Beds24-connected (silent skip).
 */
async function getBeds24Mapping(pool, gasRoomId) {
  try {
    const r = await pool.query(`
      SELECT bu.beds24_room_id, p.account_id
      FROM bookable_units bu
      JOIN properties p ON p.id = bu.property_id
      WHERE bu.id = $1 AND bu.beds24_room_id IS NOT NULL
      LIMIT 1
    `, [gasRoomId]);
    return r.rows[0] || null;
  } catch (_) { return null; }
}

/**
 * Enqueue an availability change for later push to Beds24. No-op if the
 * room isn't Beds24-mapped. Call this AFTER the GAS DB commit succeeds —
 * if the GAS write rolls back, you don't want an orphan outbox row.
 */
async function enqueueAvailabilityForRoom(pool, gasRoomId, date, numAvail) {
  // KILL SWITCH 2026-06-30: the /inventory/rooms/calendar endpoint returned
  // {success:true} on our POSTs but Beds24 didn't actually apply the block
  // (numAvail stayed at 1). Until we identify the correct V2 push endpoint /
  // payload shape, do NOT enqueue any rows — the worker would just keep
  // hitting the wrong endpoint. Re-enable the body of this function once we
  // have the right API confirmed via a methodical (non-rate-limited) probe.
  return false;
  // const m = await getBeds24Mapping(pool, gasRoomId);
  // if (!m) return false;
  // await pool.query(`
  //   INSERT INTO gas_beds24_outbox (account_id, gas_room_id, beds24_room_id, date, num_avail)
  //   VALUES ($1, $2, $3, $4, $5)
  // `, [m.account_id, gasRoomId, parseInt(m.beds24_room_id), date, Math.max(0, parseInt(numAvail) || 0)]);
  // return true;
}

/**
 * Resolve a fresh Beds24 V2 access token for an account. Tries OAuth
 * refresh first (gas_sync_connections), then invite-code (accounts).
 */
async function _getBeds24Token(pool, accountId) {
  // 1. V2 OAuth refresh token on gas_sync_connections
  try {
    const r = await pool.query(
      "SELECT refresh_token FROM gas_sync_connections WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND refresh_token IS NOT NULL ORDER BY id DESC LIMIT 1",
      [accountId]
    );
    if (r.rows[0]?.refresh_token) {
      const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].refresh_token } });
      if (tk.data?.token) return tk.data.token;
    }
  } catch (_) {}
  // 2. Invite-code refresh token on accounts
  try {
    const r = await pool.query("SELECT beds24_refresh_token FROM accounts WHERE id = $1", [accountId]);
    if (r.rows[0]?.beds24_refresh_token) {
      const tk = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken: r.rows[0].beds24_refresh_token } });
      if (tk.data?.token) return tk.data.token;
    }
  } catch (_) {}
  return null;
}

/**
 * One worker tick. Picks ready rows, groups by (account_id, beds24_room_id),
 * collapses consecutive dates into ranges, posts one calendar batch per
 * room to Beds24, marks rows processed.
 */
async function drain(pool) {
  // Reaper: reset rows stuck in 'processing' for >2min (worker died mid-tick)
  await pool.query(`
    UPDATE gas_beds24_outbox SET status = 'pending'
    WHERE status = 'processing' AND processed_at IS NULL AND created_at < NOW() - INTERVAL '2 minutes'
  `).catch(() => {});

  const claim = await pool.query(`
    UPDATE gas_beds24_outbox
       SET status = 'processing'
     WHERE id IN (
       SELECT id FROM gas_beds24_outbox
        WHERE status = 'pending' AND next_try_at <= NOW()
        ORDER BY created_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     RETURNING *
  `, [BATCH_LIMIT]);

  if (claim.rows.length === 0) return { drained: 0, batches: 0 };

  // Group by (account_id, beds24_room_id). Within each room, also dedupe by
  // (date) keeping the LAST row (operator may have flipped block/unblock
  // multiple times — only the final state matters).
  const byRoom = new Map();
  for (const r of claim.rows) {
    const key = r.account_id + ':' + r.beds24_room_id;
    if (!byRoom.has(key)) byRoom.set(key, { account_id: r.account_id, beds24_room_id: r.beds24_room_id, rowsByDate: new Map() });
    byRoom.get(key).rowsByDate.set(r.date.toISOString().slice(0, 10), r);
  }

  let batches = 0, drained = 0;
  for (const group of byRoom.values()) {
    const dates = Array.from(group.rowsByDate.keys()).sort();
    // Collapse consecutive same-num_avail dates into flat {roomId, from, to,
    // numAvail} entries — verified payload shape via
    // scripts/_lehmann_beds24_block_probe.js (2026-06-30). Endpoint is
    // /inventory/rooms/calendar; entries are NOT nested under a parent
    // {id, calendar:[...]} object.
    const entries = [];
    let runStart = null, runEnd = null, runNum = null;
    const flush = () => { if (runStart) entries.push({ roomId: group.beds24_room_id, from: runStart, to: runEnd, numAvail: runNum }); };
    for (const d of dates) {
      const row = group.rowsByDate.get(d);
      if (runStart && runNum === row.num_avail && _nextDay(runEnd) === d) {
        runEnd = d;
      } else {
        flush();
        runStart = d; runEnd = d; runNum = row.num_avail;
      }
    }
    flush();

    const token = await _getBeds24Token(pool, group.account_id);
    if (!token) {
      await _markBatchFailed(pool, Array.from(group.rowsByDate.values()), 'no_token', 'Could not resolve Beds24 access token for account ' + group.account_id);
      continue;
    }

    try {
      const resp = await axios.post(
        'https://beds24.com/api/v2/inventory/rooms/calendar',
        entries,
        { headers: { token, accept: 'application/json' }, timeout: 30_000 }
      );
      // V2 returns an array — one result per entry. Treat the batch as
      // failed if ANY entry came back success:false.
      const results = Array.isArray(resp.data) ? resp.data : [resp.data];
      const firstFailure = results.find(r => r && r.success === false);
      if (firstFailure) {
        await _markBatchFailed(pool, Array.from(group.rowsByDate.values()), 'api_error', JSON.stringify(firstFailure).slice(0, 500));
        continue;
      }
      const ids = Array.from(group.rowsByDate.values()).map(r => r.id);
      await pool.query(
        `UPDATE gas_beds24_outbox SET status = 'done', processed_at = NOW(), last_error = NULL WHERE id = ANY($1::bigint[])`,
        [ids]
      );
      drained += ids.length;
      batches++;
    } catch (e) {
      const msg = e.response?.data ? JSON.stringify(e.response.data).slice(0, 500) : e.message;
      const code = e.response?.status || 'net';
      await _markBatchFailed(pool, Array.from(group.rowsByDate.values()), String(code), msg);
    }
  }

  return { drained, batches };
}

function _nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function _markBatchFailed(pool, rows, code, errorMsg) {
  for (const r of rows) {
    const attempts = (r.attempts || 0) + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    const backoff = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
    await pool.query(`
      UPDATE gas_beds24_outbox
         SET status = $2::text, attempts = $3,
             next_try_at = NOW() + ($4::bigint || ' milliseconds')::interval,
             last_error = $5,
             processed_at = CASE WHEN $2::text = 'failed' THEN NOW() ELSE processed_at END
       WHERE id = $1
    `, [r.id, giveUp ? 'failed' : 'pending', attempts, backoff, `[${code}] ${errorMsg}`.slice(0, 1000)]);
  }
  console.warn(`[beds24-outbox] batch failure (${code}): ${errorMsg} — ${rows.length} rows backed off`);
}

let _workerHandle = null;
async function startBeds24OutboxWorker(pool) {
  if (_workerHandle) return;
  await ensureSchema(pool);
  console.log('[beds24-outbox] worker started, poll every', POLL_INTERVAL_MS, 'ms');
  _workerHandle = setInterval(async () => {
    try {
      const { drained, batches } = await drain(pool);
      if (drained > 0) console.log(`[beds24-outbox] tick: drained ${drained} rows in ${batches} batches`);
    } catch (e) {
      console.error('[beds24-outbox] worker tick error:', e.message);
    }
  }, POLL_INTERVAL_MS);
}

function stopBeds24OutboxWorker() {
  if (_workerHandle) { clearInterval(_workerHandle); _workerHandle = null; }
}

module.exports = {
  ensureSchema,
  enqueueAvailabilityForRoom,
  drain,
  startBeds24OutboxWorker,
  stopBeds24OutboxWorker,
};
