require('dotenv').config();
const Stripe = require('stripe');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const IDS = [564245, 564313];
(async () => {
  for (const id of IDS) {
    const bk = await p.query(`
      SELECT b.id, b.stripe_payment_intent_id, b.grand_total, b.property_id,
             pc.credentials->>'secret_key' AS sk
        FROM bookings b
        LEFT JOIN payment_configurations pc
               ON pc.property_id = b.property_id AND pc.provider = 'stripe' AND pc.is_enabled = true
       WHERE b.id = $1 LIMIT 1`, [id]);
    const row = bk.rows[0]; if (!row) continue;
    console.log(`\n=== B${id} — pi=${row.stripe_payment_intent_id} — GAS £${row.grand_total} — prop=${row.property_id} ===`);
    if (!row.sk) { console.log('  no per-property Stripe secret_key in payment_configurations'); continue; }
    const stripe = new Stripe(row.sk);
    try {
      const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
      console.log(`  status=${pi.status} amount=£${(pi.amount/100).toFixed(2)} currency=${pi.currency} customer=${pi.customer || '(none)'}`);
      const charges = await stripe.charges.list({ payment_intent: pi.id, limit: 10 });
      console.log(`  charges under this PI: ${charges.data.length}`);
      for (const c of charges.data) console.log(`    charge ${c.id}: £${(c.amount/100).toFixed(2)} status=${c.status} paid=${c.paid} refunded=${c.refunded}`);
      if (pi.customer) {
        const list = await stripe.paymentIntents.list({ customer: pi.customer, limit: 20 });
        const others = list.data.filter(x => x.id !== pi.id);
        console.log(`  customer ${pi.customer} has ${list.data.length} PIs total (${others.length} other)`);
        for (const o of others) console.log(`    other: ${o.id} £${(o.amount/100).toFixed(2)} status=${o.status} created=${new Date(o.created*1000).toISOString()}`);
      }
    } catch (e) { console.log('  err:', e.message); }
  }
  await p.end();
})();
