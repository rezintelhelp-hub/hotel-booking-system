require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});
(async () => {
  try {
    const fks = await pool.query(`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS references_table, ccu.column_name AS references_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_name = 'properties' AND tc.constraint_type = 'FOREIGN KEY'`);
    console.log('properties foreign keys:');
    fks.rows.forEach(r => console.log(' ', r.column_name, '→', r.references_table + '.' + r.references_column, '(' + r.constraint_name + ')'));

    // What kind of value goes into properties.user_id — check existing rows
    const sample = await pool.query(`
      SELECT p.id, p.user_id, p.account_id, p.name FROM properties p LIMIT 3`);
    console.log('\nsample properties:');
    sample.rows.forEach(r => console.log(' ', r));

    // Does properties have account_id?
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'properties' AND column_name IN ('user_id', 'account_id', 'owner_id')`);
    console.log('\nid-like cols:', cols.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await pool.end();
  }
})();
