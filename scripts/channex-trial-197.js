/**
 * Channex Adapter Trial — Account 197 ("5 Rte Des Thermes", Ussat France)
 *
 * Steps:
 *   1. Create a "GAS-197" Group on Channex staging
 *   2. Create the property (5 Rte Des Thermes) in that Group
 *   3. Create the 2 room types (Julie Anne, No 5)
 *   4. Create gas_sync_connections row pointing to the Group
 *   5. Verify read paths (getProperties / getRoomTypes / getAvailability / getReservations)
 *   6. Test pushAvailability
 *   7. Subscribe a webhook
 *
 * Run: node scripts/channex-trial-197.js
 *
 * The script is idempotent — re-running picks up the existing Group +
 * connection and skips re-creates. Outputs to stdout for the trial doc.
 */

require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');
const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');

const ACCOUNT_ID = 197;
const GROUP_TITLE = `GAS-${ACCOUNT_ID}`;
const PROPERTY_ID_GAS = 535;       // 5 Rte Des Thermes
const UNIT_IDS_GAS = [1309, 1310]; // Julie Anne, No 5

function loadApiKey() {
  const f = '/Users/stevedriver/hotel-booking-system/.env.channex';
  if (!fs.existsSync(f)) throw new Error('.env.channex not found');
  const line = fs.readFileSync(f, 'utf8').split('\n').find(l => l.startsWith('CHANNEX_API_KEY='));
  if (!line) throw new Error('CHANNEX_API_KEY not in .env.channex');
  return line.replace(/^CHANNEX_API_KEY=/, '').trim();
}

function log(...args) { console.log('[trial-197]', ...args); }

async function main() {
  const apiKey = loadApiKey();
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ===== STEP 0: load GAS source data =====
  const gasProp = await pg.query(
    `SELECT id, name, address, city, country, currency, timezone FROM properties WHERE id=$1`,
    [PROPERTY_ID_GAS]
  );
  const gasUnits = await pg.query(
    `SELECT id, property_id, name, unit_type, max_guests, max_adults, max_children, base_price
     FROM bookable_units WHERE id = ANY($1::int[]) ORDER BY id`,
    [UNIT_IDS_GAS]
  );
  if (gasProp.rows.length === 0) throw new Error(`No GAS property ${PROPERTY_ID_GAS}`);
  log('GAS source data:', { property: gasProp.rows[0], units: gasUnits.rows });

  // ===== STEP 1: ensure GAS-197 Group exists on Channex =====
  const adapterNoGroup = new ChannexAdapter({ apiKey, environment: 'staging' });
  const groupsRes = await adapterNoGroup.getGroups();
  if (!groupsRes.success) throw new Error(`getGroups failed: ${JSON.stringify(groupsRes)}`);
  let group = (groupsRes.data || []).find(g => (g.attributes?.title || g.title) === GROUP_TITLE);
  if (group) {
    log(`Group ${GROUP_TITLE} already exists, reusing:`, group.id);
  } else {
    const create = await adapterNoGroup.createGroup({ title: GROUP_TITLE });
    if (!create.success) throw new Error(`createGroup failed: ${JSON.stringify(create, null, 2)}`);
    group = create.data;
    log(`Created group ${GROUP_TITLE}:`, group.id);
  }
  const groupId = group.id;

  // ===== STEP 2: instantiate adapter scoped to the Group =====
  const adapter = new ChannexAdapter({ apiKey, groupId, environment: 'staging' });

  // ===== STEP 3: create property if missing =====
  const propsRes = await adapter.getProperties({ limit: 100 });
  if (!propsRes.success) throw new Error(`getProperties failed: ${JSON.stringify(propsRes)}`);
  let chProp = propsRes.data.find(p => p.name === gasProp.rows[0].name);
  if (chProp) {
    log(`Property "${chProp.name}" already in Channex group, reusing:`, chProp.externalId);
  } else {
    const src = gasProp.rows[0];
    const createRes = await adapter.createProperty({
      title: src.name,
      currency: src.currency || 'EUR',
      country: src.country || 'FR',
      timezone: 'Europe/Paris',  // Override the bad 'America/New_York' from GAS
      city: src.city || '',
      address: src.address || '',
      propertyType: 'apartment',
      email: 'gas-trial@example.com',
      phone: '+33 0 00 00 00 00'
    });
    if (!createRes.success) throw new Error(`createProperty failed: ${JSON.stringify(createRes, null, 2)}`);
    chProp = adapter.mapProperty(createRes.data);
    log(`Created property:`, chProp.externalId, chProp.name);
  }

  // ===== STEP 4: create room types if missing =====
  const rtRes = await adapter.getRoomTypes(chProp.externalId, { limit: 100 });
  if (!rtRes.success) throw new Error(`getRoomTypes failed: ${JSON.stringify(rtRes)}`);
  const existingByName = new Map((rtRes.data || []).map(r => [r.name, r]));
  const createdRoomTypes = [];
  for (const u of gasUnits.rows) {
    if (existingByName.has(u.name)) {
      log(`Room type "${u.name}" already exists, reusing:`, existingByName.get(u.name).externalId);
      createdRoomTypes.push(existingByName.get(u.name));
      continue;
    }
    const create = await adapter.createRoomType(chProp.externalId, {
      title: u.name,
      countOfRooms: 1,
      maxAdults: u.max_adults || u.max_guests || 2,
      maxChildren: u.max_children || 0,
      defaultOccupancy: u.max_adults || u.max_guests || 2,
      capacity: (u.max_adults || u.max_guests || 2) + (u.max_children || 0),
      roomKind: 'room'
    });
    if (!create.success) {
      log(`  createRoomType FAILED for ${u.name}:`, JSON.stringify(create, null, 2));
      continue;
    }
    const mapped = adapter.mapRoomType(create.data);
    log(`Created room type:`, mapped.externalId, mapped.name);
    createdRoomTypes.push(mapped);
  }

  // ===== STEP 5: ensure gas_sync_connections row =====
  const existingConn = await pg.query(
    `SELECT id, status FROM gas_sync_connections WHERE account_id=$1 AND adapter_code='channex'`,
    [ACCOUNT_ID]
  );
  let connectionId;
  if (existingConn.rows.length > 0) {
    connectionId = existingConn.rows[0].id;
    await pg.query(
      `UPDATE gas_sync_connections SET
         credentials=$1, external_account_id=$2, external_account_name=$3,
         status='connected', updated_at=NOW()
       WHERE id=$4`,
      [
        JSON.stringify({ apiKey, groupId, environment: 'staging' }),
        groupId,
        GROUP_TITLE,
        connectionId
      ]
    );
    log(`Updated existing gas_sync_connections row:`, connectionId);
  } else {
    const ins = await pg.query(
      `INSERT INTO gas_sync_connections
         (account_id, adapter_code, credentials, external_account_id, external_account_name, status, sync_enabled, sync_interval_minutes)
       VALUES ($1, 'channex', $2, $3, $4, 'connected', true, 15)
       RETURNING id`,
      [
        ACCOUNT_ID,
        JSON.stringify({ apiKey, groupId, environment: 'staging' }),
        groupId,
        GROUP_TITLE
      ]
    );
    connectionId = ins.rows[0].id;
    log(`Created gas_sync_connections row:`, connectionId);
  }

  // ===== STEP 6: verify read paths =====
  log('=== READ PATH VERIFICATION ===');
  const verifyProps = await adapter.getProperties({ limit: 10 });
  log('getProperties:', verifyProps.success ? `${verifyProps.data.length} properties` : `FAIL: ${verifyProps.error}`);
  verifyProps.data?.forEach(p => log(`  - ${p.externalId}  ${p.name}  ${p.currency}  ${p.timezone}`));

  const verifyRTs = await adapter.getRoomTypes(chProp.externalId);
  log('getRoomTypes:', verifyRTs.success ? `${verifyRTs.data.length} room types` : `FAIL: ${verifyRTs.error}`);
  verifyRTs.data?.forEach(r => log(`  - ${r.externalId}  ${r.name}  cap=${r.capacity}`));

  if (createdRoomTypes[0]) {
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const verifyAvail = await adapter.getAvailability(createdRoomTypes[0].externalId, today, futureDate);
    log(`getAvailability (${today} → ${futureDate}):`,
      verifyAvail.success ? `${verifyAvail.data.length} records` : `FAIL: ${verifyAvail.error}`);
    if (verifyAvail.data?.length) {
      log(`  first record:`, verifyAvail.data[0]);
    }
  }

  const verifyBookings = await adapter.getReservations({ propertyId: chProp.externalId, limit: 10 });
  log('getReservations:', verifyBookings.success ? `${verifyBookings.data.length} bookings` : `FAIL: ${verifyBookings.error}`);

  // ===== STEP 7: write path — pushAvailability =====
  if (createdRoomTypes[0]) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    log(`=== WRITE PATH: updateAvailability ${createdRoomTypes[0].externalId} ${tomorrow} count=1 ===`);
    const pushRes = await adapter.updateAvailability(createdRoomTypes[0].externalId, tomorrow, 1);
    log(`updateAvailability:`, pushRes.success ? 'OK' : `FAIL: ${pushRes.error} ${JSON.stringify(pushRes.details || {})}`);
  }

  // ===== STEP 8: webhooks =====
  log('=== WEBHOOK PATH ===');
  const wh = await adapter.listWebhooks();
  log(`listWebhooks:`, wh.success ? `${(wh.data || []).length} subscriptions` : `FAIL: ${wh.error}`);
  // Skip subscribe in trial (no public callback URL yet)

  await pg.end();
  log('=== TRIAL COMPLETE ===');
  log('Connection ID:', connectionId);
  log('Channex Group ID:', groupId);
  log('Channex Property ID:', chProp.externalId);
  log('Channex Room Type IDs:', createdRoomTypes.map(r => r.externalId));
}

main().catch(e => { console.error(e); process.exit(1); });
