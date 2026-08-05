// Evan @ Channex 2026-08-05: Google-via-Channex DOES work for hotels
// (not VR-only as their support first said). Steps:
//   1. Delete the Elizabeth standalone test (property + channel)
//   2. Flip Charles House property_type: apartment → hotel
//   3. Recreate Google channel on Charles House with account_type=Hotel
//      and all 4 room types × their rate plans mapped
require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CHARLES_PID = 'ec54c209-8f51-4866-9d7b-1a3bdcb85704';
const ELIZ_PID    = 'f4afc6e7-edcf-4cbe-b0ff-f5306516a5e6';
const ELIZ_CH     = 'f072f1dd-da53-4160-8e71-883d0ac9542e';

async function main() {
  const c = await p.query("SELECT credentials FROM gas_sync_connections WHERE id=357 LIMIT 1");
  const apiKey = c.rows[0].credentials.apiKey;
  const groupId = c.rows[0].credentials.groupId;
  const H = { 'user-api-key': apiKey, 'Content-Type': 'application/json' };

  console.log('=== 1. Delete Elizabeth Google channel ===');
  try {
    await axios.delete(`https://app.channex.io/api/v1/channels/${ELIZ_CH}`, { headers: H });
    console.log('  channel deleted');
  } catch (e) { console.log('  err:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 120)); }
  await p.query("DELETE FROM gas_sync_channels WHERE channex_channel_id=$1", [ELIZ_CH]);

  console.log('\n=== 2. Delete Elizabeth Channex property ===');
  try {
    await axios.delete(`https://app.channex.io/api/v1/properties/${ELIZ_PID}`, { headers: H });
    console.log('  property deleted');
  } catch (e) { console.log('  err:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 120)); }
  await p.query("DELETE FROM gas_sync_rate_plans WHERE sync_room_type_id IN (SELECT id FROM gas_sync_room_types WHERE sync_property_id IN (SELECT id FROM gas_sync_properties WHERE external_id=$1))", [ELIZ_PID]);
  await p.query("DELETE FROM gas_sync_room_types WHERE sync_property_id IN (SELECT id FROM gas_sync_properties WHERE external_id=$1)", [ELIZ_PID]);
  const dp = await p.query("DELETE FROM gas_sync_properties WHERE external_id=$1 RETURNING id", [ELIZ_PID]);
  console.log('  local gas_sync_properties rows deleted:', dp.rowCount);

  console.log('\n=== 3. Charles House property_type → hotel ===');
  const upd = await axios.put(`https://app.channex.io/api/v1/properties/${CHARLES_PID}`, { property: { property_type: 'hotel' } }, { headers: H });
  console.log('  property_type now:', upd.data?.data?.attributes?.property_type);

  console.log('\n=== 4. Recreate Google channel (Hotel, all rate plans) ===');
  const rp = await axios.get(`https://app.channex.io/api/v1/rate_plans?filter[property_id]=${CHARLES_PID}`, { headers: H });
  const ratePlans = (rp.data.data || []).map(r => ({ rate_plan_id: r.id, settings: {} }));
  console.log('  mapping', ratePlans.length, 'rate plans across 4 rooms');

  const agg = (await p.query(`SELECT COALESCE(SUM(COALESCE(num_bedrooms,bedroom_count,1))::int,1) AS bed,
                                     COALESCE(SUM(COALESCE(num_bathrooms,bathroom_count,1)::numeric)::int,1) AS bath,
                                     COALESCE(SUM(COALESCE(beds_from_amenities,beds,1))::int,1) AS bcount
                              FROM bookable_units WHERE property_id=1134`)).rows[0];

  const body = { channel: {
    channel: 'GoogleHotelARI', title: 'Google Hotel Search',
    group_id: groupId, is_active: false,
    properties: [CHARLES_PID],
    rate_plans: ratePlans,
    settings: {
      email: 'charleshousewindsor@gmail.com',
      partner_account: 'Channex',
      use_built_in_ibe: true,
      account_type: 'Hotel',
      request_credit_card: true, request_billing_info: true, send_email_notifications: true,
      bedrooms_count: agg.bed, bathrooms_count: agg.bath, beds_count: agg.bcount,
    }
  }};
  try {
    const cr = await axios.post('https://app.channex.io/api/v1/channels', body, { headers: H });
    const chId = cr.data.data.id;
    console.log('  created channel:', chId);
    // Follow-up PUT — Channex silently drops rate_plans on the initial POST
    await axios.put(`https://app.channex.io/api/v1/channels/${chId}`, { channel: { rate_plans: ratePlans } }, { headers: H });
    const verify = await axios.get(`https://app.channex.io/api/v1/channels/${chId}`, { headers: H });
    console.log('  rate_plans after PUT:', (verify.data.data?.attributes?.rate_plans || []).length);
    const ins = await p.query(
      `INSERT INTO gas_sync_channels (connection_id, channex_channel_id, channel_code, title, settings, is_active, created_at, updated_at)
       VALUES (357, $1, 'GoogleHotelARI', 'Google Hotel Search', $2::jsonb, false, NOW(), NOW())
       ON CONFLICT (connection_id, channex_channel_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
       RETURNING id`,
      [chId, JSON.stringify({ gas_property_id: 1134, account_type: 'Hotel' })]);
    console.log('  local gas_sync_channels row #' + ins.rows[0].id);
    console.log('\nNext: activate via wizard Home (Channel Manager → Charles House Channex → + Connect Channel → Home → Activate)');
  } catch (e) { console.log('  create err:', e.response?.status, JSON.stringify(e.response?.data)); }

  await p.end();
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
