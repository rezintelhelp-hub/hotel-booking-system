const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS guest_info JSONB`);
  await p.query(`ALTER TABLE bookable_units ADD COLUMN IF NOT EXISTS guest_info JSONB`);
  console.log('guest_info columns added to properties + bookable_units.');
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
