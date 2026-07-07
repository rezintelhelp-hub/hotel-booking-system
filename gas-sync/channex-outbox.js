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

const CHANGE_TYPES = ['availability', 'rate', 'restriction', 'booking_create', 'booking_cancel'];

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

  // Rate plan mapping table — links a Channex rate_plan_id to a GAS
  // synced room type. Used by enqueueRestrictionForRoom to resolve which
  // rate plan to push prices/restrictions against.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_sync_rate_plans (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER REFERENCES gas_sync_connections(id) ON DELETE CASCADE,
      sync_room_type_id INTEGER REFERENCES gas_sync_room_types(id) ON DELETE CASCADE,
      external_id VARCHAR(128) NOT NULL,
      name VARCHAR(255),
      currency VARCHAR(10),
      raw_data JSONB,
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(connection_id, external_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_grp_room_type ON gas_sync_rate_plans(sync_room_type_id)`);
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

  // Reaper: reset rows stuck in 'processing' for more than 2 minutes.
  // Happens if the worker process died mid-tick (e.g. Railway redeploy)
  // or a transient DB hiccup orphaned the row.
  await pool.query(`
    UPDATE gas_channex_outbox
       SET status = 'pending'
     WHERE status = 'processing'
       AND created_at < NOW() - INTERVAL '2 minutes'
  `).catch(() => {});

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
      } else if (change_type === 'booking_create' || change_type === 'booking_cancel') {
        // Bookings are processed per-row (one Channex API call per booking).
        // The batching grouping still applies, but each row is its own
        // independent API call — we don't want a Channex failure on booking
        // X to mark booking Y's row as failed. Process serially and update
        // each row individually.
        for (const r of batch) {
          try {
            const apiResp = (change_type === 'booking_create')
              ? await adapter.createBooking(r.payload || {})
              : await adapter.cancelBooking(r.payload || {});
            if (apiResp.success) {
              const channexBookingId = apiResp.data?.id
                || apiResp.data?.attributes?.id
                || apiResp.raw?.data?.id
                || null;
              await pool.query(`
                UPDATE gas_channex_outbox
                   SET status='succeeded', channex_task_id=$2, processed_at=NOW(), last_error=NULL
                 WHERE id=$1
              `, [r.id, channexBookingId]);
              // For booking_create — backfill bookings.channex_booking_id so
              // future updates and the cancel-push reference the same ID.
              if (change_type === 'booking_create' && channexBookingId && r.payload?.gasBookingId) {
                await pool.query(
                  `UPDATE bookings SET channex_booking_id=$1 WHERE id=$2 AND channex_booking_id IS NULL`,
                  [channexBookingId, r.payload.gasBookingId]
                ).catch(() => {});
              }
              drained++;
              console.log(`[channex-outbox] ${change_type} ok for gas-booking=${r.payload?.gasBookingId} channex=${channexBookingId}`);

              // Re-push canonical availability AFTER Channex's auto-adjust.
              // Channex auto-decrements on booking-create (PMS-pushed records)
              // and auto-increments on booking-cancel. If we already pushed
              // our own availability before this row, Channex's auto change
              // stacks on top → we get -1 (after create-from-0) or qty+1
              // (after cancel-from-1). Force-override here ensures our value
              // is the last write.
              try {
                const dates = Object.keys(r.payload?.rooms?.[0]?.days || {});
                if (dates.length) {
                  // Resolve the room's local quantity for the cancel branch
                  // (qty=1 for single-unit rooms, >1 for shared-room types).
                  let qty = 1;
                  if (change_type === 'booking_cancel') {
                    const qr = await pool.query(`
                      SELECT COALESCE(bu.quantity, 1) AS qty
                        FROM gas_sync_room_types gsrt
                        LEFT JOIN bookable_units bu ON bu.id = gsrt.gas_room_id
                       WHERE gsrt.external_id = $1
                         AND gsrt.connection_id = $2
                       LIMIT 1`,
                      [r.channex_room_type_id, r.connection_id]);
                    if (qr.rows[0]) qty = parseInt(qr.rows[0].qty, 10) || 1;
                  }
                  const targetCount = (change_type === 'booking_create') ? 0 : qty;
                  const values = dates.map(d => ({
                    property_id: r.channex_property_id,
                    room_type_id: r.channex_room_type_id,
                    date: d,
                    availability: targetCount
                  }));
                  const ov = await adapter.request('/availability', 'POST', { values });
                  console.log(`[channex-outbox] post-${change_type} availability override: ${values.length} dates -> ${targetCount}, ok=${ov.success}`);
                }
              } catch (overrideErr) {
                console.error(`[channex-outbox] post-${change_type} availability override failed:`, overrideErr.message);
              }
            } else {
              await markBatchFailure(pool, [r], apiResp.error || 'unknown', apiResp.code);
            }
          } catch (err) {
            await markBatchFailure(pool, [r], err.message, 'EXCEPTION');
          }
        }
        continue; // skip the batch-level success path below
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
        // Channex returns { data: [{ id, type: 'task' }, ...] } for ARI
        // endpoints — the task id is the cert form proof.
        const taskId = Array.isArray(resp.data) ? (resp.data[0]?.id || null)
                       : (resp.data?.id || resp.raw?.data?.[0]?.id || resp.raw?.data?.id || null);
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

/**
 * Push a GAS booking into Channex as a full booking record (one-way
 * mirror — GAS stays system of record). Builds the Channex /bookings
 * payload from the booking row + room + rate plan + per-night price
 * breakdown, then enqueues an outbox row with change_type='booking_create'
 * or 'booking_cancel'. The worker picks it up and calls Channex.
 *
 * No-op if the booking's room isn't mapped to a channex connection or
 * if no currency-matching rate plan exists.
 */
async function enqueueBookingPush(pool, gasBookingId, action) {
  // action: 'booking_create' | 'booking_cancel'
  // Cast date columns to text so pg returns them verbatim — otherwise pg
  // turns a DATE into midnight-local which JS then serialises to UTC as the
  // previous day, shifting every Channex date by 1. (Bit by this 2026-05-21.)
  const b = await pool.query(`
    SELECT b.id, b.bookable_unit_id,
           b.arrival_date::text AS arrival_date,
           b.departure_date::text AS departure_date,
           b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone,
           b.guest_address, b.guest_city, b.guest_country, b.guest_postcode,
           b.num_adults, b.num_children, b.num_infants, b.grand_total,
           b.currency, b.status, b.channex_booking_id,
           b.property_id,
           p.country AS property_country
    FROM bookings b
    LEFT JOIN properties p ON p.id = b.property_id
    WHERE b.id = $1
  `, [gasBookingId]);
  if (!b.rows[0]) return false;
  const bk = b.rows[0];

  const m = await getChannexMapping(pool, bk.bookable_unit_id);
  if (!m) return false;

  // Find a rate plan that matches the booking currency on the same room.
  // Per-currency rate plans were introduced in the price-fix commit so
  // this gracefully ignores wrong-currency plans (e.g. orphan GBP plans).
  const rp = await pool.query(`
    SELECT external_id, currency
      FROM gas_sync_rate_plans
     WHERE sync_room_type_id = (
       SELECT id FROM gas_sync_room_types WHERE gas_room_id = $1 AND connection_id = $2 LIMIT 1
     )
       AND UPPER(currency) = UPPER($3)
     ORDER BY id LIMIT 1
  `, [bk.bookable_unit_id, m.connection_id, bk.currency || 'EUR']);
  if (!rp.rows[0]) {
    console.warn(`[channex-outbox] enqueueBookingPush: no ${bk.currency} rate plan for booking ${gasBookingId}`);
    return false;
  }

  // arrival_date / departure_date come back as 'YYYY-MM-DD' strings now.
  const arrival = bk.arrival_date;
  const departure = bk.departure_date;

  // Build the per-night price map up front — both create and cancel push
  // the full booking payload (Channex's PUT /bookings/:id revalidates
  // every required field even when only status changes).
  const nights = Math.max(1, Math.round((new Date(departure) - new Date(arrival)) / 86400000));
  const dates = [];
  for (let i = 0; i < nights; i++) {
    dates.push(new Date(new Date(arrival).getTime() + i * 86400000).toISOString().slice(0, 10));
  }
  const priceRows = await pool.query(
    `SELECT date::text AS date, standard_price
       FROM room_availability
      WHERE room_id = $1 AND date = ANY($2::date[]) AND standard_price IS NOT NULL`,
    [bk.bookable_unit_id, dates]
  );
  const priceByDate = new Map(priceRows.rows.map(r => [r.date, parseFloat(r.standard_price)]));
  const fallbackPerNight = (parseFloat(bk.grand_total || 0) / nights);
  const days = {};
  for (const d of dates) {
    const price = priceByDate.get(d);
    days[d] = (price !== undefined && price > 0 ? price : fallbackPerNight).toFixed(2);
  }

  // Shared payload skeleton — used by both create and cancel.
  const sharedPayload = {
    gasBookingId,
    propertyId: m.channex_property_id,
    otaReservationCode: `GAS-${gasBookingId}`,
    // Channex restricts ota_name to a fixed allowlist; 'BookingButton' is
    // their semantic match for direct/website bookings (their own booking
    // engine label). Empirically validated 2026-05-21 on staging.
    otaName: 'BookingButton',
    arrivalDate: arrival,
    departureDate: departure,
    currency: bk.currency || 'EUR',
    amount: String(bk.grand_total || 0),
    rooms: [{
      roomTypeId: m.channex_room_type_id,
      ratePlanId: rp.rows[0].external_id,
      checkinDate: arrival,
      checkoutDate: departure,
      occupancy: {
        adults: bk.num_adults || 1,
        children: bk.num_children || 0,
        infants: bk.num_infants || 0
      },
      days,
      guests: [{ name: bk.guest_first_name || '', surname: bk.guest_last_name || '' }],
      amount: String(bk.grand_total || 0)
    }],
    customer: {
      name: bk.guest_first_name || 'Guest',
      surname: bk.guest_last_name || '.',
      mail: bk.guest_email || '',
      phone: bk.guest_phone || '',
      address: bk.guest_address || '.',
      city: bk.guest_city || '.',
      // Fall back to the property's own country so we never send an
      // empty string — Channex sometimes rejects empty customer.country
      // with 403 Forbidden even though it's not technically an auth
      // error. Steve report 2026-07-07 on 331637 (Charles House Windsor,
      // country=GB). Property country pulled by joining properties on
      // the booking; if that's null too, default to GB.
      country: bk.guest_country || bk.property_country || 'GB'
    }
  };

  if (action === 'booking_cancel') {
    if (!bk.channex_booking_id) {
      // The booking was never pushed to Channex (create may have failed,
      // or the booking predates the mirror feature). Nothing to cancel.
      console.log(`[channex-outbox] enqueueBookingPush cancel: booking ${gasBookingId} has no channex_booking_id, skipping`);
      return false;
    }
    await enqueue(pool, {
      account_id: m.account_id,
      connection_id: m.connection_id,
      channex_property_id: m.channex_property_id,
      channex_room_type_id: m.channex_room_type_id,
      channex_rate_plan_id: rp.rows[0].external_id,
      change_type: 'booking_cancel',
      payload: {
        ...sharedPayload,
        channexBookingId: bk.channex_booking_id,
        notes: 'Cancelled via GAS Admin'
      },
    });
    return true;
  }

  // booking_create — same payload as cancel, just with status='new'.
  await enqueue(pool, {
    account_id: m.account_id,
    connection_id: m.connection_id,
    channex_property_id: m.channex_property_id,
    channex_room_type_id: m.channex_room_type_id,
    channex_rate_plan_id: rp.rows[0].external_id,
    change_type: 'booking_create',
    payload: { ...sharedPayload, status: 'new' },
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
  enqueueBookingPush,
  CHANGE_TYPES,
};
