#!/usr/bin/env node
// Regression test: all availability consumers agree per-date on availability.
//
// Hits three READ endpoints for the same (room_id, from, to) and asserts
// their per-date `available`/`is_available` values match. Backstop for
// project_availability_unification_20260911.md — once the helper is the
// single source of truth, drift between endpoints becomes impossible.
//
// Usage:
//   ROOM_ID=451 FROM=2026-09-15 TO=2026-09-30 \
//   BASE_URL=https://admin.gas.travel \
//   ADMIN_TOKEN=<master-admin-jwt> \
//   node scripts/tests/availability_agreement.js
//
// The /api/availability admin endpoint requires a master-admin JWT. The
// public endpoints don't. Exit code 0 = agreement, 1 = drift found.

'use strict';

require('dotenv').config();

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOM_ID = parseInt(process.env.ROOM_ID, 10);
const FROM = process.env.FROM;
const TO = process.env.TO;
const TOKEN = process.env.ADMIN_TOKEN || '';

if (!ROOM_ID || !FROM || !TO) {
  console.error('Missing ROOM_ID, FROM or TO env vars');
  process.exit(2);
}

async function get(path, opts = {}) {
  const r = await fetch(BASE + path, opts);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch (_) { throw new Error(`Non-JSON from ${path}: ${text.slice(0, 200)}`); }
}

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch (_) { throw new Error(`Non-JSON from ${path}: ${text.slice(0, 200)}`); }
}

(async () => {
  console.log(`\nComparing availability for room ${ROOM_ID} from ${FROM} to ${TO}\n`);

  // 1) /api/availability/:roomId (admin/picker)
  const admin = TOKEN
    ? await get(`/api/availability/${ROOM_ID}?from=${FROM}&to=${TO}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    : await get(`/api/availability/${ROOM_ID}?from=${FROM}&to=${TO}`);
  if (!admin.success) {
    console.error('admin endpoint failed:', admin.error);
    process.exit(2);
  }
  const adminMap = {};
  for (const d of admin.availability || []) adminMap[d.date] = d.is_available !== false && d.is_blocked !== true;

  // 2) /api/public/availability/:unitId (mini-cal)
  const mini = await get(`/api/public/availability/${ROOM_ID}?from=${FROM}&to=${TO}`);
  if (!mini.success) {
    console.error('mini-cal endpoint failed:', mini.error);
    process.exit(2);
  }
  const miniMap = {};
  for (const d of mini.calendar || []) miniMap[d.date] = d.available;

  // 3) /api/public/calculate-price — aggregate is_available across range only.
  //    Compares against admin+mini's AND across the range.
  const calc = await post('/api/public/calculate-price', {
    unit_id: ROOM_ID, check_in: FROM, check_out: TO, guests: 2
  });
  const calcAggregate = calc.success !== false ? (calc.is_available !== false) : null;

  // Compare per-date
  let drift = 0;
  const dates = Object.keys(adminMap).sort();
  console.log('Date         admin  mini   agree');
  console.log('----------   -----  ----   -----');
  for (const d of dates) {
    if (d < FROM || d >= TO) continue;
    const a = adminMap[d];
    const m = miniMap[d];
    const agree = a === m;
    if (!agree) drift++;
    console.log(`${d}   ${String(a).padEnd(6)} ${String(m).padEnd(6)} ${agree ? 'ok' : 'DRIFT'}`);
  }

  const adminAgg = dates.filter(d => d >= FROM && d < TO).every(d => adminMap[d]);
  const miniAgg = dates.filter(d => d >= FROM && d < TO).every(d => miniMap[d]);
  console.log('\nAggregate is_available:');
  console.log('  admin:', adminAgg);
  console.log('  mini:', miniAgg);
  console.log('  calculate-price:', calcAggregate);

  const allAgree = drift === 0 && adminAgg === miniAgg && (calcAggregate === null || calcAggregate === adminAgg);
  console.log('\n' + (allAgree ? 'PASS — all consumers agree' : `FAIL — ${drift} per-date drifts + aggregate mismatch`));
  process.exit(allAgree ? 0 : 1);
})().catch(e => {
  console.error('test error:', e.message);
  process.exit(2);
});
