const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await pool.query('DROP TABLE IF EXISTS sparks_body_backup_20260625');
  await pool.query(`CREATE TABLE sparks_body_backup_20260625 AS
    SELECT id, account_id, slug, body, NOW() AS snapped_at
      FROM sparks WHERE account_id = 4`);
  const r = await pool.query('SELECT COUNT(*)::int AS n FROM sparks_body_backup_20260625');
  console.log('Backed up rows:', r.rows[0].n);
  await pool.end();
})();
