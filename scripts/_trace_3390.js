const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Look at all 3 Mornington bookings side by side + all their extras
  const IDS = [548702, 532487, 528284];
  for (const id of IDS) {
    const b = await p.query(`SELECT id, guest_first_name, guest_last_name, grand_total, subtotal, accommodation_price, discount_amount, tax_amount, deposit_amount, balance_amount, nights_count FROM bookings WHERE id = $1`, [id]);
    console.log(`\nB${id} ${b.rows[0].guest_first_name} ${b.rows[0].guest_last_name}:`);
    console.log(`  grand=${b.rows[0].grand_total} sub=${b.rows[0].subtotal} accom=${b.rows[0].accommodation_price} tax=${b.rows[0].tax_amount} disc=${b.rows[0].discount_amount} deposit=${b.rows[0].deposit_amount} bal=${b.rows[0].balance_amount} nights=${b.rows[0].nights_count}`);
    const ex = await p.query(`SELECT id, name, qty, unit_price, source_type FROM booking_extras WHERE booking_id = $1`, [id]);
    console.log(`  extras:`);
    for (const e of ex.rows) console.log(`    ${e.name} qty=${e.qty} price=${e.unit_price} src=${e.source_type}`);
    const pt = await p.query(`SELECT transaction_type, amount FROM payment_transactions WHERE booking_id = $1 ORDER BY id`, [id]);
    let sum = 0; for (const t of pt.rows) sum += parseFloat(t.amount);
    console.log(`  payments: ${pt.rows.map(t => t.transaction_type + ' £' + t.amount).join(', ')} = total £${sum.toFixed(2)}`);
  }
  // Also check payment_configurations for Mornington (account 173) for any fees
  console.log('\n---\nAccount 173 tax/fee config:');
  const acc = await p.query(`SELECT id, name, shop_tax_rate, shop_delivery_fee, total_tax_enabled, total_tax_rate, total_tax_label, total_tax_inclusive FROM accounts WHERE id = 173`);
  console.log(JSON.stringify(acc.rows[0], null, 2));
  const taxes = await p.query(`SELECT * FROM taxes WHERE account_id = 173`);
  console.log('\ntaxes rows:', JSON.stringify(taxes.rows, null, 2));
  await p.end();
})();
