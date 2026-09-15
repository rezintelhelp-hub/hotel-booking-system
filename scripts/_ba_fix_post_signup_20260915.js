require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const d = await pool.query(`DELETE FROM accounts WHERE id=287 AND role='owner' AND email='rezinteldev@gmail.com' RETURNING id`);
  console.log('orphan deleted:', d.rowCount);

  const r = await pool.query('SELECT id, sections FROM page_sections WHERE id=119');
  const secs = r.rows[0].sections;
  const NEW_MSG = "Thanks! Your dashboard is ready — check your email for the login link. If you don't see it in a few minutes, check spam.";
  let touched = 0;
  secs.forEach(s => {
    if (s.type === 'form') {
      s.success_message = NEW_MSG;
      s.success_message_en = NEW_MSG;
      touched++;
    }
  });
  await pool.query('UPDATE page_sections SET sections=$1, updated_at=NOW() WHERE id=119', [JSON.stringify(secs)]);
  console.log('form sections updated:', touched);

  await pool.end();
})();
