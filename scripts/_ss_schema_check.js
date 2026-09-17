require('dotenv').config({path:'/Users/stevedriver/hotel-booking-system/.env'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});
(async () => {
  for (const t of ['properties', 'bookable_units', 'deployed_sites']) {
    const cols = await p.query(
      `SELECT column_name, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_name = $1 AND is_nullable = 'NO' AND column_default IS NULL
        ORDER BY ordinal_position`,
      [t]
    );
    console.log('\n=== ' + t + ' required (NOT NULL, no default) ===');
    cols.rows.forEach(r => console.log(' ', r.column_name));
  }
  const uEmail = await p.query(
    `SELECT COUNT(*)::int FROM accounts WHERE email = $1`,
    ['sterlingscott+dummy@gas.travel']
  );
  console.log('\nemail collision:', uEmail.rows[0].count);
  const uUrl = await p.query(
    `SELECT COUNT(*)::int FROM deployed_sites WHERE site_url = $1`,
    ['https://sterlingscott.sites.gas.travel/']
  );
  console.log('site_url collision:', uUrl.rows[0].count);
  await p.end();
})();
