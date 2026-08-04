const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const acc = await p.query(`SELECT id, name, email FROM accounts WHERE id = 273`);
  console.log('Account 273:', JSON.stringify(acc.rows[0], null, 2));
  const conn = await p.query(`SELECT * FROM gas_sync_connections WHERE account_id = 273`);
  console.log('\nSync connections:', JSON.stringify(conn.rows, null, 2));
  const props = await p.query(`SELECT id, name FROM properties WHERE account_id = 273`);
  console.log('\nProperties:', JSON.stringify(props.rows, null, 2));
  const chxProps = await p.query(`SELECT * FROM gas_sync_properties WHERE connection_id IN (SELECT id FROM gas_sync_connections WHERE account_id = 273)`);
  console.log('\nChannex properties (gas_sync_properties):', JSON.stringify(chxProps.rows, null, 2));
  await p.end();
})();
