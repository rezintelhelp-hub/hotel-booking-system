// calculate-price-batch parity test — hits single endpoint per room and
// the batch endpoint for the same 3 rooms + dates, then diffs.
// If output says "PARITY OK" the batch endpoint is safe to wire in.

const BASE = 'https://admin.gas.travel';

const dates = { check_in: '2026-10-15', check_out: '2026-10-18', guests: 1, pricing_tier: 'standard' };
const rooms = [
  // Pick 3 mixed: Cotswolds, Belmont, RocketStay
  { unit_id: 589, ...dates },  // Cotswolds
  { unit_id: 452, ...dates },  // Belmont Standard Double
  { unit_id: 660, ...dates },  // RocketStay
];

function stableStringify(obj) {
  // Sort keys deterministically so structural equality doesn't fail
  // on key-order differences.
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  if (obj && typeof obj === 'object') {
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
  }
  return JSON.stringify(obj);
}

(async () => {
  console.log('Hitting single endpoint...');
  const singles = await Promise.all(rooms.map(async r => {
    const t = Date.now();
    const resp = await fetch(`${BASE}/api/public/calculate-price`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    });
    return { unit_id: r.unit_id, ms: Date.now() - t, data: await resp.json() };
  }));
  const singleTotalMs = singles.reduce((s, x) => s + x.ms, 0);
  singles.forEach(s => console.log(`  unit ${s.unit_id} — ${s.ms}ms  success=${s.data.success}  available=${s.data.available}`));
  console.log(`  (client-side wall time N-parallel: ${Math.max(...singles.map(s => s.ms))}ms)`);

  console.log('\nHitting batch endpoint...');
  const t0 = Date.now();
  const batchResp = await fetch(`${BASE}/api/public/calculate-price-batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: rooms })
  });
  const batch = await batchResp.json();
  const batchMs = Date.now() - t0;
  console.log(`  batch wall time: ${batchMs}ms  count=${batch.count}`);

  console.log('\nParity check per unit:');
  let allOK = true;
  for (const s of singles) {
    const b = batch.results.find(r => r.unit_id === s.unit_id);
    if (!b) { console.log(`  ✗ unit ${s.unit_id} missing from batch response`); allOK = false; continue; }
    // Compare the fields the frontend actually reads.
    const compareKeys = ['success', 'available', 'accommodation_total', 'cm_total', 'nights', 'currency', 'min_stay_required'];
    const singleView = {}, batchView = {};
    for (const k of compareKeys) { singleView[k] = s.data[k]; batchView[k] = b[k]; }
    const eq = stableStringify(singleView) === stableStringify(batchView);
    console.log(`  ${eq ? '✓' : '✗'} unit ${s.unit_id}  single=${JSON.stringify(singleView)}`);
    if (!eq) {
      console.log(`         batch =${JSON.stringify(batchView)}`);
      allOK = false;
    }
  }
  console.log('\n' + (allOK ? '✓ PARITY OK — safe to wire frontend' : '✗ PARITY FAILED — do not ship'));
})();
