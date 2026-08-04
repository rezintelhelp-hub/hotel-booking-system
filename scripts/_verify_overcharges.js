require('dotenv').config();
const Stripe = require('stripe');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BOOKINGS = [531014, 423159, 552760, 232, 197947];

(async () => {
  for (const id of BOOKINGS) {
    const bk = await p.query(`
      SELECT b.id, b.guest_first_name, b.guest_last_name, b.grand_total, b.currency,
             b.stripe_payment_intent_id, b.property_id, p.account_id,
             pc.credentials->>'secret_key' AS sk
        FROM bookings b
        LEFT JOIN properties p ON p.id = b.property_id
        LEFT JOIN payment_configurations pc
               ON pc.property_id = b.property_id AND pc.provider='stripe' AND pc.is_enabled=true
       WHERE b.id = $1 LIMIT 1`, [id]);
    const row = bk.rows[0];
    if (!row) { console.log(`\nB${id} — not found`); continue; }
    console.log(`\n=== B${id} ${row.guest_first_name} ${row.guest_last_name} · grand ${row.currency}${row.grand_total} ===`);
    if (!row.sk) { console.log('  no per-property stripe key — skipping stripe check'); continue; }
    const stripe = new Stripe(row.sk);
    const pt = await p.query(`SELECT gateway_transaction_id FROM payment_transactions WHERE booking_id = $1 AND payment_gateway='stripe' AND status IN ('completed','succeeded')`, [id]);
    const piIds = pt.rows.map(r => r.gateway_transaction_id).filter(Boolean);
    console.log(`  GAS ledger has ${piIds.length} PIs: ${piIds.join(', ')}`);
    let realCharged = 0, realRefunded = 0;
    for (const pi of piIds) {
      try {
        const p1 = await stripe.paymentIntents.retrieve(pi);
        const amt = p1.amount / 100;
        // Refunds on that PI
        const rf = await stripe.refunds.list({ payment_intent: pi, limit: 10 });
        const refunded = rf.data.reduce((s, r) => s + (r.amount || 0), 0) / 100;
        realCharged += amt;
        realRefunded += refunded;
        console.log(`  ${pi}: charged ${p1.currency.toUpperCase()}${amt.toFixed(2)} status=${p1.status} · refunded ${refunded.toFixed(2)}`);
      } catch (e) {
        console.log(`  ${pi}: ${e.message}`);
      }
    }
    const netKept = realCharged - realRefunded;
    const overNet = netKept - parseFloat(row.grand_total);
    console.log(`  NET on Stripe: charged ${realCharged.toFixed(2)} − refunded ${realRefunded.toFixed(2)} = ${netKept.toFixed(2)} · grand ${row.grand_total} · OVER ${overNet.toFixed(2)}`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
