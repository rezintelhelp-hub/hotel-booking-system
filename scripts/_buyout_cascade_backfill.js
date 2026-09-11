#!/usr/bin/env node
// Buyout cascade backfill — post silent Beds24 block bookings for every
// whole_property (Ex Hire) booking in GAS that has no cascade blocks yet.
//
// Background: server.js:116586 fires the buyout cascade inside /public/book
// only. Bookings imported FROM Beds24 (OTA / manual Beds24-side) never
// hit that path, so their child rooms stay bookable on Beds24 + OTAs
// even though GAS knows the whole property is sold.
//
// Hebden 2026-09-11 — Ellen Glasper's Ex Hire (19→22 Nov) came in via
// 'rezintel' source, buyout_block_beds24_ids=null, and BDC still shows
// 21 Nov open on the Mixed 6 Bed Dorm.
//
// This script mirrors the exact cascade logic from server.js:116586-116669
// so behaviour is identical. Runs in dry-run by default — pass APPLY=1 to
// actually POST to Beds24.
//
// Only touches:
//   - status in ('confirmed','pending','inquiry_confirmed')
//   - departure_date > today (skip past bookings, no point blocking them)
//   - listing_kind = 'whole_property'
//   - buyout_block_beds24_ids IS NULL
//   - beds24_booking_id IS NOT NULL (needs a valid Beds24 anchor)
//
// Filter to a single account with ACCOUNT_ID=169 env var.

'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const APPLY = process.env.APPLY === '1';
const ACCOUNT_ID = process.env.ACCOUNT_ID ? parseInt(process.env.ACCOUNT_ID, 10) : null;
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '800', 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getAccessTokenForAccount(accountId) {
  const r = await pool.query(
    `SELECT id, credentials, access_token, refresh_token
       FROM gas_sync_connections
      WHERE account_id = $1 AND adapter_code = 'beds24' AND status != 'deleted'
      ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
    [accountId]
  );
  if (!r.rows[0]) throw new Error(`No beds24 connection for account ${accountId}`);
  const creds = typeof r.rows[0].credentials === 'string' ? JSON.parse(r.rows[0].credentials) : (r.rows[0].credentials || {});
  const refreshToken = r.rows[0].refresh_token || creds.refreshToken;
  if (!refreshToken) throw new Error(`No refresh token on connection ${r.rows[0].id}`);
  const t = await axios.get('https://beds24.com/api/v2/authentication/token', { headers: { refreshToken } });
  const tok = t.data?.token;
  if (!tok) throw new Error(`No access token returned for account ${accountId}`);
  return tok;
}

(async () => {
  console.log(`\nBuyout cascade backfill — ${APPLY ? 'APPLY MODE (will POST to Beds24)' : 'DRY RUN'}${ACCOUNT_ID ? ` — account ${ACCOUNT_ID} only` : ''}\n`);

  const eligible = await pool.query(
    `SELECT b.id, b.property_id, b.bookable_unit_id, b.listing_id,
            b.beds24_booking_id, b.arrival_date::text AS arr, b.departure_date::text AS dep,
            b.reference, b.booking_source, p.account_id, a.name AS account_name,
            COALESCE(b.guest_first_name,'')||' '||COALESCE(b.guest_last_name,'') AS guest
       FROM bookings b
       JOIN bookable_units bu ON bu.id = b.bookable_unit_id
       JOIN properties p ON p.id = b.property_id
       JOIN accounts a ON a.id = p.account_id
       JOIN bookable_listings bl ON bl.id = b.listing_id
      WHERE bl.listing_kind = 'whole_property'
        AND b.status IN ('confirmed','pending','inquiry_confirmed')
        AND b.buyout_block_beds24_ids IS NULL
        AND b.beds24_booking_id IS NOT NULL
        AND b.departure_date > CURRENT_DATE
        ${ACCOUNT_ID ? 'AND p.account_id = $1' : ''}
      ORDER BY b.arrival_date`,
    ACCOUNT_ID ? [ACCOUNT_ID] : []
  );

  console.log(`Found ${eligible.rows.length} whole_property bookings needing cascade backfill.\n`);
  if (eligible.rows.length === 0) { await pool.end(); return; }

  // Group by account for token reuse
  const byAccount = {};
  for (const b of eligible.rows) {
    if (!byAccount[b.account_id]) byAccount[b.account_id] = { name: b.account_name, bookings: [] };
    byAccount[b.account_id].bookings.push(b);
  }

  const summary = { attempted: 0, blocks_posted: 0, bookings_completed: 0, errors: [] };

  for (const [accountId, group] of Object.entries(byAccount)) {
    console.log(`\n[Account ${accountId}] ${group.name} — ${group.bookings.length} bookings`);

    let accessToken = null;
    if (APPLY) {
      try {
        accessToken = await getAccessTokenForAccount(parseInt(accountId, 10));
      } catch (e) {
        console.log(`  ❌ Auth failed: ${e.message}`);
        summary.errors.push({ account_id: accountId, error: e.message });
        continue;
      }
    }

    for (const b of group.bookings) {
      summary.attempted++;
      console.log(`  Booking ${b.id} — ${b.guest} — ${b.arr}→${b.dep} (beds24 ${b.beds24_booking_id})`);

      // Query mirrors server.js:116606-116620 exactly.
      const rooms = await pool.query(`
        SELECT bu.id AS unit_id, bu.name, bu.beds24_room_id,
               MAX(FLOOR(ip.default_capacity::numeric / NULLIF(other_lpc.units_consumed, 0))::int) AS default_capacity,
               MAX(ip.capacity_unit) AS capacity_unit
          FROM listing_pool_consumption lpc
          JOIN inventory_pools ip ON ip.id = lpc.pool_id
          JOIN listing_pool_consumption other_lpc ON other_lpc.pool_id = ip.id
          JOIN bookable_listings other_bl ON other_bl.id = other_lpc.listing_id
          JOIN bookable_units bu ON bu.id = other_bl.source_bookable_unit_id
         WHERE lpc.listing_id = $1
           AND other_bl.id <> $1
           AND bu.beds24_room_id IS NOT NULL
           AND bu.id <> $2
         GROUP BY bu.id, bu.name, bu.beds24_room_id`,
        [b.listing_id, b.bookable_unit_id]);

      if (rooms.rows.length === 0) {
        console.log(`    (no child rooms to block)`);
        continue;
      }

      const masterRef = b.reference || ('GAS-' + b.id);
      const created = [];
      for (const room of rooms.rows) {
        const slots = Math.max(1, Number(room.default_capacity) || 1);
        for (let slot = 1; slot <= slots; slot++) {
          const blockPayload = [{
            roomId: Number(room.beds24_room_id),
            status: 'confirmed',
            arrival: b.arr,
            departure: b.dep,
            numAdult: 1, numChild: 0,
            firstName: 'BUYOUT',
            lastName: `BLOCK ${slot}/${slots} — ${masterRef}`,
            email: '',
            referer: 'GAS Buyout Block',
            refererEditable: 'GAS Buyout Block',
            reference: `${masterRef}-BLK-${room.beds24_room_id}-${slot}`,
            notes: `Buyout block (${room.capacity_unit || 'slot'} ${slot}/${slots}) — see master ${masterRef} (Beds24 ${b.beds24_booking_id}). Auto-released on cancel. Backfill 2026-09-11.`,
            price: 0,
            notifyGuest: false, notifyHost: false, allowWebhooks: false
          }];
          if (!APPLY) {
            console.log(`    [dry-run] would post to room ${room.beds24_room_id} slot ${slot}/${slots} (${room.name})`);
            continue;
          }
          try {
            const r = await axios.post('https://beds24.com/api/v2/bookings', blockPayload, {
              headers: { 'Content-Type': 'application/json', token: accessToken }
            });
            const id = r.data?.[0]?.new?.id;
            if (id) {
              created.push({ room_id: Number(room.beds24_room_id), beds24_id: id, unit_name: room.name, slot });
              summary.blocks_posted++;
              console.log(`    ✓ blocked room ${room.beds24_room_id} slot ${slot}/${slots} → Beds24 ${id}`);
            } else {
              console.log(`    ⚠ no id for room ${room.beds24_room_id} slot ${slot}: ${JSON.stringify(r.data).slice(0,200)}`);
            }
            await sleep(300); // 3 req/sec
          } catch (e) {
            const errMsg = e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
            console.log(`    ❌ error on room ${room.beds24_room_id} slot ${slot}: ${errMsg}`);
            if (e.response?.status === 429) await sleep(6000);
          }
        }
      }

      if (APPLY && created.length) {
        await pool.query(
          `UPDATE bookings SET buyout_block_beds24_ids = $1 WHERE id = $2`,
          [JSON.stringify(created), b.id]
        );
        summary.bookings_completed++;
        console.log(`    → saved ${created.length} block ids on booking ${b.id}`);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Bookings attempted:  ${summary.attempted}`);
  console.log(`Bookings completed:  ${summary.bookings_completed}`);
  console.log(`Blocks posted:       ${summary.blocks_posted}`);
  if (summary.errors.length) {
    console.log(`Errors:              ${summary.errors.length}`);
    for (const e of summary.errors) console.log(`  acct ${e.account_id}: ${e.error}`);
  }
  if (!APPLY) console.log('\n(dry run — re-run with APPLY=1 to actually POST)');

  await pool.end();
})().catch(e => {
  console.error('Fatal:', e.message);
  console.error(e.stack);
  process.exit(1);
});
