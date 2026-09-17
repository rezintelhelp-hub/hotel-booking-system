require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});
(async () => {
  try {
    const jsonCols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_name = 'properties' AND (data_type ILIKE '%json%' OR column_default ILIKE '%::json%')`
    );
    console.log('properties json/jsonb columns:');
    jsonCols.rows.forEach(r => console.log(' ', r.column_name.padEnd(30), '|', r.data_type, '|null?', r.is_nullable, '|dflt:', (r.column_default || '').slice(0, 80)));

    const trigs = await pool.query(
      `SELECT trigger_name, event_manipulation, action_statement
         FROM information_schema.triggers
        WHERE event_object_table = 'properties'
        ORDER BY trigger_name`
    );
    console.log('\nproperties triggers:');
    trigs.rows.forEach(r => console.log(' ', r.trigger_name, '|', r.event_manipulation));

    // Sample: pick one existing property and see how it looks in json cols
    const sample = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'properties' AND data_type IN ('json', 'jsonb')`
    );
    const cols = sample.rows.map(r => r.column_name).join(', ');
    if (cols) {
      const one = await pool.query(`SELECT id, ${cols} FROM properties WHERE status = 'active' LIMIT 1`);
      console.log('\nsample active property with json cols:');
      console.log(one.rows[0]);
    }
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await pool.end();
  }
})();
