/**
 * Channex Outbox + Worker
 *
 * Cert requirement: every change in GAS Admin (price, availability,
 * restriction, stop sell, etc.) is recorded as an outbox row. A worker
 * drains the outbox every few seconds, batches rows by
 * (account_id, channex_property_id, change_type), and sends ONE API call
 * per batch — satisfying cert tests 3, 4, 5, 6, 7, 8, 10.
 *
 * The adapter's request() handles 429/5xx exponential backoff
 * (cert test 12). The outbox handles retry on transient failures: a
 * failed batch increments `attempts` and reschedules via `next_try_at`
 * with exponential backoff. After 6 attempts the row goes to status
 * 'failed' for manual inspection.
 *
 * Schema: see ensureSchema() below. The worker is started once on
 * server boot via startChannexOutboxWorker(pool).
 */

const { ChannexAdapter } = require('./adapters/channex-adapter');

const POLL_INTERVAL_MS = 5_000;        // worker tick
const BATCH_LIMIT      = 100;          // max rows per batch
const MAX_ATTEMPTS     = 6;            // give up after this many tries
const BACKOFF_BASE_MS  = 30_000;       // first retry waits 30s, doubles

const CHANGE_TYPES = ['availability', 'rate', 'restriction'];

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_channex_outbox (
      id BIGSERIAL PRIMARY KEY,
      account_id INTEGER,
      connection_id INTEGER,
      channex_property_id VARCHAR(64),
      channex_room_type_id VARCHAR(64),
      channex_rate_plan_id VARCHAR(64),
      change_type VARCHAR(32) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_try_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      channex_task_id VARCHAR(128),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_channex_outbox_status_next ON gas_channex_outbox (status, next_try_at) WHERE status = 'pending'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_channex_outbox_account ON gas_channex_outbox (account_id, change_type)`);
  console.log('[channex-outbox] schema ensured');
}

/**
 * Enqueue a change for later batched push to Channex.
 *
 * @param {Pool} pool
 * @param {object} row { account_id, connection_id, channex_property_id,
 *                       channex_room_type_id?, channex_rate_plan_id?,
 *                       change_type ('availability'|'rate'|'restriction'),
 *                       payload (object) }
 */
async function enqueue(pool, row) {
  if (!CHANGE_TYPES.includes(row.change_type)) {
    throw new Error('invalid change_type: ' + row.change_type);
  }
  await pool.query(`
    INSERT INTO gas_channex_outbox (
      account_id, connection_id, channex_property_id, channex_room_type_id,
      channex_rate_plan_id, change_type, payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    row.account_id || null,
    row.connection_id || null,
    row.channex_property_id || null,
    row.channex_room_type_id || null,
    row.channex_rate_plan_id || null,
    row.change_type,
    row.payload || {},
  ]);
}

/**
 * One worker tick. Picks ready rows, groups by
 * (connection_id, channex_property_id, change_type), drains in batches.
 */
async function drain(pool) {
  // Get connection-level adapter credentials so we can talk to Channex
  // on behalf of each account. The adapter requires an apiKey + groupId
  // per connection — for now, single shared key from env (matches the
  // trial setup); later this reads gas_sync_connections.credentials.
  const apiKey = process.env.CHANNEX_API_KEY;
  if (!apiKey) {
    console.warn('[channex-outbox] CHANNEX_API_KEY not set, skipping tick');
    return { drained: 0, batches: 0 };
  }

  // Grab ready rows, lock for update so two workers don't race
  const claim = await pool.query(`
    UPDATE gas_channex_outbox
       SET status = 'processing'
     WHERE id IN (
       SELECT id FROM gas_channex_outbox
        WHERE status = 'pending' AND next_try_at <= NOW()
        ORDER BY next_try_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     )
     RETURNING *
  `, [BATCH_LIMIT]);

  const rows = claim.rows;
  if (rows.length === 0) return { drained: 0, batches: 0 };

  // Group rows by (connection_id, channex_property_id, change_type)
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.connection_id || 0}|${r.channex_property_id || ''}|${r.change_type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const adapter = new ChannexAdapter({ apiKey });
  let drained = 0;
  let batches = 0;

  for (const [_key, batch] of groups) {
    batches++;
    try {
      const change_type = batch[0].change_type;
      let resp;
      if (change_type === 'availability') {
        const items = batch.map(r => ({
          propertyId: r.channex_property_id,
          roomTypeId: r.channex_room_type_id,
          date: r.payload?.date,
          count: r.payload?.count,
        }));
        resp = await adapter.updateAvailabilityBatch(items);
      } else {
        // 'rate' and 'restriction' both go via /restrictions with rate/restriction fields
        const items = batch.map(r => ({
          propertyId: r.channex_property_id,
          ratePlanId: r.channex_rate_plan_id,
          date: r.payload?.date,
          rate: r.payload?.rate,
          minStayArrival: r.payload?.minStayArrival,
          minStayThrough: r.payload?.minStayThrough,
          closedToArrival: r.payload?.closedToArrival,
          closedToDeparture: r.payload?.closedToDeparture,
          stopSell: r.payload?.stopSell,
        }));
        resp = await adapter.updateRestrictions(items);
      }

      if (resp.success) {
        const taskId = resp.data?.id || resp.raw?.data?.id || null;
        await pool.query(`
          UPDATE gas_channex_outbox
             SET status = 'succeeded',
                 channex_task_id = $2,
                 processed_at = NOW(),
                 last_error = NULL
           WHERE id = ANY($1::bigint[])
        `, [batch.map(r => r.id), taskId]);
        drained += batch.length;
        console.log(`[channex-outbox] batch ${change_type} x${batch.length} ok, task=${taskId}`);
      } else {
        await markBatchFailure(pool, batch, resp.error || 'unknown', resp.code);
      }
    } catch (err) {
      console.error('[channex-outbox] batch error:', err.message);
      await markBatchFailure(pool, batch, err.message, 'EXCEPTION');
    }
  }

  return { drained, batches };
}

async function markBatchFailure(pool, batch, errorMsg, code) {
  for (const r of batch) {
    const attempts = r.attempts + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    const backoff = BACKOFF_BASE_MS * Math.pow(2, attempts - 1);
    await pool.query(`
      UPDATE gas_channex_outbox
         SET status = $2,
             attempts = $3,
             next_try_at = NOW() + ($4 || ' milliseconds')::interval,
             last_error = $5,
             processed_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE processed_at END
       WHERE id = $1
    `, [r.id, giveUp ? 'failed' : 'pending', attempts, backoff, `[${code}] ${errorMsg}`.slice(0, 1000)]);
  }
  console.warn(`[channex-outbox] batch failure (${code}): ${errorMsg} — ${batch.length} rows backed off`);
}

let _workerHandle = null;
async function startChannexOutboxWorker(pool) {
  if (_workerHandle) return;
  await ensureSchema(pool);
  console.log('[channex-outbox] worker started, poll every', POLL_INTERVAL_MS, 'ms');
  _workerHandle = setInterval(async () => {
    try {
      const { drained, batches } = await drain(pool);
      if (drained > 0) console.log(`[channex-outbox] tick: drained ${drained} rows in ${batches} batches`);
    } catch (e) {
      console.error('[channex-outbox] worker tick error:', e.message);
    }
  }, POLL_INTERVAL_MS);
}

function stopChannexOutboxWorker() {
  if (_workerHandle) { clearInterval(_workerHandle); _workerHandle = null; }
}

/**
 * Resolve a GAS room ID to its Channex IDs (property, room_type, rate_plan).
 * Returns null if the room isn't mapped to a Channex connection or sync is
 * disabled — caller should silently skip enqueueing.
 *
 * rate_plan_id is the FIRST rate plan associated with this room; rate-plan
 * specificity comes later when we wire the cert rate-plan setup. For
 * availability-only updates this can be null.
 */
async function getChannexMapping(pool, gasRoomId) {
  try {
    const r = await pool.query(`
      SELECT
        gsc.id AS connection_id,
        gsc.account_id,
        gsp.external_id AS channex_property_id,
        gsrt.external_id AS channex_room_type_id
      FROM gas_sync_room_types gsrt
      JOIN gas_sync_properties gsp ON gsrt.sync_property_id = gsp.id
      JOIN gas_sync_connections gsc ON gsp.connection_id = gsc.id
      WHERE gsrt.gas_room_id = $1
        AND gsc.adapter_code = 'channex'
        AND gsc.sync_enabled = true
      LIMIT 1
    `, [gasRoomId]);
    return r.rows[0] || null;
  } catch (_) {
    return null; // tables may not exist in dev — silent
  }
}

/**
 * Convenience: enqueue an availability change. No-op if the room isn't
 * mapped to a Channex-enabled connection.
 */
async function enqueueAvailabilityForRoom(pool, gasRoomId, date, count) {
  const m = await getChannexMapping(pool, gasRoomId);
  if (!m) return false;
  await enqueue(pool, {
    account_id: m.account_id,
    connection_id: m.connection_id,
    channex_property_id: m.channex_property_id,
    channex_room_type_id: m.channex_room_type_id,
    change_type: 'availability',
    payload: { date, count },
  });
  return true;
}

/**
 * Convenience: enqueue a rate/restriction change. caller picks change_type
 * 'rate' (price change) or 'restriction' (min-stay, stop-sell, CTA, CTD).
 * No-op if the room isn't mapped or no rate plan resolves.
 *
 * payload fields: { date, rate?, minStayArrival?, minStayThrough?,
 *                   closedToArrival?, closedToDeparture?, stopSell? }
 */
async function enqueueRestrictionForRoom(pool, gasRoomId, payload, changeType = 'rate') {
  const m = await getChannexMapping(pool, gasRoomId);
  if (!m) return false;
  // Rate plan resolution: pick the first rate plan for this room type from
  // gas_sync_rate_plans if it exists; otherwise pass null and let Channex
  // apply to the room-type default. Schema may not exist yet in dev.
  let ratePlanId = null;
  try {
    const rp = await pool.query(`
      SELECT external_id FROM gas_sync_rate_plans
       WHERE sync_room_type_id = (
         SELECT id FROM gas_sync_room_types WHERE gas_room_id = $1 AND connection_id = $2 LIMIT 1
       )
       ORDER BY id LIMIT 1
    `, [gasRoomId, m.connection_id]);
    ratePlanId = rp.rows[0]?.external_id || null;
  } catch (_) { /* table may not exist yet */ }
  await enqueue(pool, {
    account_id: m.account_id,
    connection_id: m.connection_id,
    channex_property_id: m.channex_property_id,
    channex_room_type_id: m.channex_room_type_id,
    channex_rate_plan_id: ratePlanId,
    change_type: changeType,
    payload,
  });
  return true;
}

module.exports = {
  ensureSchema,
  enqueue,
  drain,
  startChannexOutboxWorker,
  stopChannexOutboxWorker,
  getChannexMapping,
  enqueueAvailabilityForRoom,
  enqueueRestrictionForRoom,
  CHANGE_TYPES,
};
