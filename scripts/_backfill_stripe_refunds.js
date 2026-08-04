// Sync Stripe refunds into payment_transactions for the 3 bookings where
// refunds were issued via Stripe dashboard but never mirrored back into
// GAS. Once the ledger reflects the refunds, the (now-fixed) overcharge
// audit stops flagging these as false positives.
// Rebecca Dean B531014, Janet Emery B552760, Chris Moffat B423159.
// Idempotent — skips if a refund row for the same charge already exists.
require('dotenv').config();
const Stripe = require('stripe');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const BOOKINGS = [531014, 552760, 423159];
(async () => {
  for (const id of BOOKINGS) {
    const bk = await p.query(`SELECT b.id, b.currency, pc.credentials->>'secret_key' AS sk FROM bookings b LEFT JOIN properties p ON p.id = b.property_id LEFT JOIN payment_configurations pc ON pc.property_id = b.property_id AND pc.provider='stripe' AND pc.is_enabled=true WHERE b.id = $1`, [id]);
    const row = bk.rows[0]; if (!row?.sk) { console.log(`B${id}: no stripe key`); continue; }
    const stripe = new Stripe(row.sk);
    const pt = await p.query(`SELECT id, gateway_transaction_id FROM payment_transactions WHERE booking_id = $1 AND payment_gateway='stripe' AND status IN ('completed','succeeded') AND transaction_type IN ('deposit','balance','payment','charge','capture')`, [id]);
    for (const tx of pt.rows) {
      try {
        const rf = await stripe.refunds.list({ payment_intent: tx.gateway_transaction_id, limit: 10 });
        for (const r of rf.data) {
          if (r.status !== 'succeeded') continue;
          const rfId = r.id;
          const dupe = await p.query(`SELECT id FROM payment_transactions WHERE booking_id = $1 AND gateway_transaction_id = $2 LIMIT 1`, [id, rfId]);
          if (dupe.rows[0]) { console.log(`  B${id} tx${tx.id}: refund ${rfId} already in ledger — skip`); continue; }
          const amt = r.amount / 100;
          await p.query(`INSERT INTO payment_transactions (booking_id, transaction_type, amount, currency, status, gateway_transaction_id, payment_gateway, description, created_at) VALUES ($1, 'refund', $2, $3, 'succeeded', $4, 'stripe', $5, $6)`, [id, amt, (row.currency || 'GBP'), rfId, `Stripe refund backfill (refund of ${tx.gateway_transaction_id})`, new Date(r.created * 1000).toISOString()]);
          console.log(`  B${id} tx${tx.id}: backfilled refund ${rfId} £${amt.toFixed(2)}`);
        }
      } catch (e) { console.log(`  B${id} tx${tx.id}: ${e.message}`); }
    }
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
