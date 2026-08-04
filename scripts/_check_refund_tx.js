require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const r = await p.query(`SELECT DISTINCT transaction_type FROM payment_transactions ORDER BY transaction_type`);
  console.log('transaction_type values:', r.rows.map(x=>x.transaction_type).join(', '));
  // Any negative amounts?
  const neg = await p.query(`SELECT COUNT(*)::int AS n FROM payment_transactions WHERE amount::numeric < 0`);
  console.log('rows with negative amount:', neg.rows[0].n);
  // Any type='refund'?
  const rf = await p.query(`SELECT COUNT(*)::int AS n FROM payment_transactions WHERE transaction_type ILIKE '%refund%'`);
  console.log('rows with refund in type:', rf.rows[0].n);
  await p.end();
})();
