// One-off: register a global webhook subscription on Channex for connection
// 341 (Steve's gites account 197, "5 Rte Des Thermes"). After this, every
// booking_new / booking_modify / booking_cancel event on this group will be
// POSTed to https://admin.gas.travel/api/webhooks/channex within seconds.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const CONN_ID = 341;
  const c = (await p.query("SELECT credentials, webhook_registered, webhook_url FROM gas_sync_connections WHERE id = $1", [CONN_ID])).rows[0];
  if (!c) { console.log('connection not found'); await p.end(); return; }
  console.log('current state: webhook_registered=' + c.webhook_registered + ', webhook_url=' + c.webhook_url);
  const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : c.credentials;

  const { ChannexAdapter } = require('../gas-sync/adapters/channex-adapter');
  const adapter = new ChannexAdapter({ apiKey: creds.apiKey, pool: p, connectionId: CONN_ID });
  const callbackUrl = 'https://admin.gas.travel/api/webhooks/channex';
  // Channex uses single-word event names (probed 2026-06-30). 'booking'
  // fires for the whole booking lifecycle (create/modify/cancel) — the
  // handler reads the booking status to differentiate.
  const events = ['booking'];
  console.log('\nregistering webhook → ' + callbackUrl + ' for events ' + events.join(','));
  const result = await adapter.registerWebhook(callbackUrl, events, { isGlobal: true });
  console.log('\nChannex response:'); console.log(JSON.stringify(result, null, 2).slice(0, 1500));

  const webhookId = result?.data?.id || result?.id || result?.data?.data?.id;
  if (webhookId) {
    await p.query(
      "UPDATE gas_sync_connections SET webhook_url = $1, webhook_registered = true, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{channex_webhook_id}', to_jsonb($2::text)), updated_at = NOW() WHERE id = $3",
      [callbackUrl, String(webhookId), CONN_ID]
    );
    console.log('\n✓ saved webhook_id ' + webhookId + ' on connection ' + CONN_ID);
  } else {
    console.log('\n⚠️  No webhook id in response — check the raw output above');
  }
  await p.end();
})();
