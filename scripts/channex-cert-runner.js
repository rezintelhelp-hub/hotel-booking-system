/**
 * Channex PMS Certification Test Runner — automated drives of tests 1-10.
 *
 * Each test fires the exact API pattern Channex's cert page expects
 * (batched into ONE call where the test requires it) and records the
 * task_id returned. Output saved to cert_task_ids.json for submission.
 *
 * Tests 11 (booking webhook+ack), 12 (rate-limit affirmative), 13 (delta-
 * only affirmative) are handled separately:
 *   - 11 needs a real booking via test CRS in Channex
 *   - 12/13 are answered in the cert form, code-review only
 *
 * Usage: node scripts/channex-cert-runner.js
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.channex', override: false });
const fs = require('fs');
const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');

// === Channex cert test property (standard structure required by cert form) ===
// "Test Property - GAS" — Twin Room + Double Room, each with BAR + B&B plans
const PROPERTY_ID = 'd3397365-a134-48c4-a7c9-de9f497466a8';
const ROOM_TYPES = {
  twin:   '2108e611-4698-46c2-88f6-a2d72039b39b',
  double: '443ce23a-2899-4b8f-862c-31d6a9836c8d',
};
const RATE_PLANS = {
  twin_bar:    '1d43121a-8ca1-49f7-801e-b40a1fd7c0e9',
  twin_bb:     'a50a7ffe-65f3-4b8d-a9d7-6fc2f091bf88',
  double_bar:  'c2471d7b-f417-4382-83ac-86d1f1db5682',
  double_bb:   '23968f57-3d14-43cd-acca-1a7e4ed8d4b9',
};
// Backwards-compat aliases for the script body below
const RP_ALIAS = {
  julieAnne_std: RATE_PLANS.twin_bar,
  no5_std:       RATE_PLANS.double_bar,
  julieAnne_gbp: RATE_PLANS.twin_bb,
  no5_gbp:       RATE_PLANS.double_bb,
};
const RT_ALIAS = {
  julieAnne: ROOM_TYPES.twin,
  no5:       ROOM_TYPES.double,
};

const adapter = new ChannexAdapter({ apiKey: process.env.CHANNEX_API_KEY });

const results = {};

function logResult(testNum, label, resp) {
  const taskId = Array.isArray(resp.data) ? resp.data[0]?.id : (resp.data?.id || null);
  const status = resp.success ? '✅ PASS' : '❌ FAIL';
  results[`test_${testNum}`] = {
    label,
    task_id: taskId,
    success: resp.success,
    status_code: resp.status,
    error: resp.error || null,
  };
  console.log(`Test ${testNum}: ${status} — ${label} — task=${taskId}`);
  if (!resp.success) console.log('   error:', resp.error, resp.details || '');
}

function isoDate(daysFromNow) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

async function run() {
  // === TEST 1: Full Data Update — 500 days of availability + restrictions ===
  // Two API calls total: one /availability across all rooms, one /restrictions
  // across all rate plans. Cert: "must contain realistic varied data".
  console.log('\n=== Test 1: Full Data Update (500 days) ===');
  {
    const availItems = [];
    for (let i = 0; i < 500; i++) {
      const date = isoDate(i);
      availItems.push({ propertyId: PROPERTY_ID, roomTypeId: ROOM_TYPES.julieAnne, date, count: 1 });
      availItems.push({ propertyId: PROPERTY_ID, roomTypeId: ROOM_TYPES.no5, date, count: 1 });
    }
    const r1 = await adapter.updateAvailabilityBatch(availItems);
    logResult('1a', 'Full 500-day availability sync (2 rooms × 500 days)', r1);

    const restrItems = [];
    for (let i = 0; i < 500; i++) {
      const date = isoDate(i);
      // Realistic variation: weekend +20%, otherwise base
      const day = new Date(isoDate(i)).getUTCDay();
      const baseJA = day === 5 || day === 6 ? 120 : 100;
      const baseN5 = day === 5 || day === 6 ? 140 : 115;
      restrItems.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, rate: baseJA });
      restrItems.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std, date, rate: baseN5 });
    }
    const r2 = await adapter.updateRestrictions(restrItems);
    logResult('1b', 'Full 500-day rate sync (2 rate plans × 500 days)', r2);
  }

  // === TEST 2: Single Date Update for Single Rate ===
  console.log('\n=== Test 2: Single date, single rate ===');
  {
    const r = await adapter.updateRestrictions([
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date: isoDate(30), rate: 95 },
    ]);
    logResult(2, 'Single date single rate', r);
  }

  // === TEST 3: Single Date Update for Multiple Rates (batched in 1 call) ===
  console.log('\n=== Test 3: Single date, multiple rates (1 call) ===');
  {
    const date = isoDate(31);
    const r = await adapter.updateRestrictions([
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, rate: 99 },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, rate: 119 },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_gbp, date, rate: 85 },
    ]);
    logResult(3, '3 rates same date, 1 API call', r);
  }

  // === TEST 4: Multiple Date Update for Multiple Rates (1 call) ===
  console.log('\n=== Test 4: Multi-date multi-rate (1 call) ===');
  {
    const items = [];
    for (let i = 32; i <= 38; i++) {
      const date = isoDate(i);
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, rate: 100 + i });
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, rate: 130 + i });
    }
    const r = await adapter.updateRestrictions(items);
    logResult(4, '7 dates × 2 rates batched into 1 call', r);
  }

  // === TEST 5: Min Stay Update (batched) ===
  console.log('\n=== Test 5: Min stay batch ===');
  {
    const date = isoDate(40);
    const r = await adapter.updateRestrictions([
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, minStayArrival: 3 },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, minStayArrival: 3 },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_gbp, date, minStayArrival: 3 },
    ]);
    logResult(5, 'Min-stay across 3 rate plans, 1 call', r);
  }

  // === TEST 6: Stop Sell Update (batched) ===
  console.log('\n=== Test 6: Stop sell ===');
  {
    const items = [];
    for (let i = 50; i <= 54; i++) {
      const date = isoDate(i);
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, stopSell: true });
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, stopSell: true });
    }
    const r = await adapter.updateRestrictions(items);
    logResult(6, '5 dates × 2 rate plans stop-sell, 1 call', r);
  }

  // === TEST 7: Multiple Restrictions Update (CTA, CTD, max-stay, min-stay) ===
  console.log('\n=== Test 7: Complex restrictions ===');
  {
    const date = isoDate(60);
    const r = await adapter.updateRestrictions([
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, minStayArrival: 2, closedToArrival: false, closedToDeparture: true },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, minStayArrival: 4, closedToArrival: true,  closedToDeparture: false },
      { propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_gbp, date, minStayThrough: 7 },
    ]);
    logResult(7, 'Mixed restriction types, 1 call', r);
  }

  // === TEST 8: Half-Year Update (152 days × 2 rate plans) ===
  console.log('\n=== Test 8: Half-year ===');
  {
    const items = [];
    for (let i = 80; i < 232; i++) { // 152 days
      const date = isoDate(i);
      const day = new Date(date).getUTCDay();
      const baseJA = day === 5 || day === 6 ? 130 : 105;
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.julieAnne_std, date, rate: baseJA });
      items.push({ propertyId: PROPERTY_ID, ratePlanId: RATE_PLANS.no5_std,       date, rate: baseJA + 20 });
    }
    const r = await adapter.updateRestrictions(items);
    logResult(8, '152 days × 2 rates batched into 1 call', r);
  }

  // === TEST 9: Single Date Availability ===
  console.log('\n=== Test 9: Single date availability ===');
  {
    const r = await adapter.updateAvailabilityBatch([
      { propertyId: PROPERTY_ID, roomTypeId: ROOM_TYPES.julieAnne, date: isoDate(70), count: 0 }, // mark unavailable
    ]);
    logResult(9, 'Single date availability=0', r);
  }

  // === TEST 10: Multiple Date Availability ===
  console.log('\n=== Test 10: Multi-date availability ===');
  {
    const items = [];
    for (let i = 71; i <= 80; i++) {
      const date = isoDate(i);
      items.push({ propertyId: PROPERTY_ID, roomTypeId: ROOM_TYPES.julieAnne, date, count: 1 });
      items.push({ propertyId: PROPERTY_ID, roomTypeId: ROOM_TYPES.no5,       date, count: 1 });
    }
    const r = await adapter.updateAvailabilityBatch(items);
    logResult(10, '10 dates × 2 rooms batched into 1 call', r);
  }

  // === SAVE RESULTS ===
  const outPath = './cert_task_ids.json';
  fs.writeFileSync(outPath, JSON.stringify({ ran_at: new Date().toISOString(), property_id: PROPERTY_ID, results }, null, 2));
  console.log(`\n📋 All task IDs saved to ${outPath}`);
  console.log('\nSummary:');
  Object.entries(results).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.success ? '✅' : '❌'} task=${v.task_id} — ${v.label}`);
  });
}

run().catch(e => { console.error('CERT RUNNER ERROR:', e); process.exit(1); });
