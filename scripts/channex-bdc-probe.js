/**
 * Live probe of Channex Channel Connection API for Booking.com.
 * Read-only — no channel actually created.
 *
 * Uses Evan's test BDC property: 5868189 (Occupancy-Based Pricing).
 *
 * Confirms:
 *   1. BookingCom is in /channels/list
 *   2. test_connection succeeds with the test hotel_id
 *   3. mapping_details returns rooms + rates from BDC
 *   4. connection_details returns currency
 *
 * Run: node scripts/channex-bdc-probe.js
 */

require('dotenv').config();
const fs = require('fs');
const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');

const TEST_HOTEL_ID = '5868189';

function loadKey() {
  const line = fs.readFileSync('/Users/stevedriver/hotel-booking-system/.env.channex', 'utf8')
    .split('\n').find(l => l.startsWith('CHANNEX_API_KEY='));
  return line.replace(/^CHANNEX_API_KEY=/, '').trim();
}

function trim(o) {
  if (!o) return o;
  const s = JSON.stringify(o);
  return s.length > 500 ? s.substring(0, 500) + '…' : s;
}

(async () => {
  const adapter = new ChannexAdapter({ apiKey: loadKey(), environment: 'staging' });

  console.log('=== STEP 1: listAvailableChannels — find BookingCom ===');
  const list = await adapter.listAvailableChannels();
  if (!list.success) { console.error('FAIL:', list); process.exit(1); }
  const bdc = (list.data || []).find(c => c.code === 'BookingCom');
  if (!bdc) { console.error('BookingCom not in catalog'); process.exit(1); }
  console.log('  OK — code:', bdc.code, '| title:', bdc.title);
  console.log('  required params:', Object.keys(bdc.params || {}).join(', '));
  console.log('  rate_params:', Object.keys(bdc.rate_params || {}).join(', '));
  console.log('  channel_restrictions:', JSON.stringify(bdc.channel_restrictions));
  console.log('  actions:', JSON.stringify(bdc.actions));

  console.log('\n=== STEP 2: testChannelConnection — hotel_id', TEST_HOTEL_ID, '===');
  const test = await adapter.testChannelConnection('BookingCom', { hotel_id: TEST_HOTEL_ID });
  console.log('  success:', test.success);
  console.log('  data:', trim(test.data));

  console.log('\n=== STEP 3: getChannelMappingDetails — what rooms+rates does BDC have? ===');
  const map = await adapter.getChannelMappingDetails('BookingCom', { hotel_id: TEST_HOTEL_ID });
  if (!map.success) {
    console.error('  FAIL:', trim(map));
  } else {
    const rooms = map.data?.rooms || [];
    console.log('  pricing_type:', map.data?.pricing_type);
    console.log('  rooms:', rooms.length);
    rooms.forEach(r => {
      console.log(`    - room id=${r.id} title="${r.title}" max_children=${r.max_children}`);
      (r.rates || []).forEach(rate => {
        console.log(`        rate id=${rate.id} title="${rate.title}" max_persons=${rate.max_persons} occupancies=${JSON.stringify(rate.occupancies)} readonly=${rate.readonly}`);
      });
    });
  }

  console.log('\n=== STEP 4: getChannelConnectionDetails — what currency? ===');
  const conn = await adapter.getChannelConnectionDetails('BookingCom', { hotel_id: TEST_HOTEL_ID });
  console.log('  success:', conn.success, '| currency:', conn.data?.attributes?.currency);

  console.log('\n=== DONE — read-only probe complete, no Channex state created ===');
})().catch(e => { console.error(e); process.exit(1); });
