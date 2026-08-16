// Backfill square_card_id for Casa Magnolia bookings where the customer
// was saved but the card token wasn't captured in the payment response.
// For each booking with square_customer_id + no square_card_id, list the
// customer's cards on file via GET /v2/cards?customer_id=X and adopt the
// newest one.
//
// Usage:
//   node scripts/_casa_square_card_backfill.js         # dry-run (default)
//   node scripts/_casa_square_card_backfill.js --live  # actually write
require('dotenv').config({ path: '/Users/stevedriver/hotel-booking-system/.env' });
const { Client } = require('pg');

const LIVE = process.argv.includes('--live');

async function refreshSquareToken(pg, accountId) {
  const r = await pg.query(
    `SELECT square_access_token, square_refresh_token, square_token_expires_at, square_environment
       FROM accounts WHERE id = $1`, [accountId]);
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  if (!row.square_refresh_token) return row.square_access_token || null;
  const expiresAt = row.square_token_expires_at ? new Date(row.square_token_expires_at) : null;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (expiresAt && (expiresAt.getTime() - Date.now() > sevenDaysMs)) return row.square_access_token;
  const sq = (row.square_environment === 'production')
    ? { apiBase: 'https://connect.squareup.com' }
    : { apiBase: 'https://connect.squareupsandbox.com' };
  const resp = await fetch(`${sq.apiBase}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-12-18' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID,
      client_secret: process.env.SQUARE_CLIENT_SECRET,
      refresh_token: row.square_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const body = await resp.json();
  if (!resp.ok) { console.error('[refresh] failed:', body); return null; }
  await pg.query(`UPDATE accounts SET square_access_token=$1, square_refresh_token=COALESCE($2, square_refresh_token), square_token_expires_at=$3 WHERE id=$4`,
    [body.access_token, body.refresh_token || null, body.expires_at || null, accountId]);
  return body.access_token;
}

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Find candidates: any booking with square_customer_id set but square_card_id
  // NULL, arrival still in the future, balance owed. Casa Magnolia (currently
  // the only Square account) matches all 3 today; generic query so future
  // Square operators sweep too.
  const cand = await pg.query(`
    SELECT b.id, b.guest_first_name, b.guest_last_name, b.arrival_date,
           b.grand_total, b.balance_amount, b.square_customer_id, b.square_location_id,
           p.account_id, a.name AS account_name, a.square_environment
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN accounts a ON a.id = p.account_id
     WHERE b.square_customer_id IS NOT NULL
       AND b.square_card_id IS NULL
       AND b.arrival_date >= CURRENT_DATE
       AND b.status IN ('confirmed','pending')
       AND (COALESCE(b.grand_total::numeric,0) - COALESCE(b.deposit_amount::numeric,0)) > 0.01
     ORDER BY b.id
  `);
  console.log(`[backfill] ${LIVE ? 'LIVE' : 'DRY-RUN'} — ${cand.rows.length} bookings with customer but no card`);

  // Cache tokens per account
  const tokens = new Map();

  const summary = { updated: 0, noCard: 0, errors: 0, alreadySet: 0 };
  for (const row of cand.rows) {
    let token = tokens.get(row.account_id);
    if (!token) {
      token = await refreshSquareToken(pg, row.account_id);
      tokens.set(row.account_id, token);
    }
    if (!token) { console.error(`  [err] #${row.id} no Square token for account ${row.account_id}`); summary.errors++; continue; }
    const sq = (row.square_environment === 'production')
      ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

    const url = `${sq}/v2/cards?customer_id=${encodeURIComponent(row.square_customer_id)}&sort_order=DESC`;
    let cardsBody;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Square-Version': '2024-12-18' }
      });
      cardsBody = await resp.json();
      if (!resp.ok) {
        console.error(`  [err] #${row.id} Square GET cards failed:`, cardsBody?.errors);
        summary.errors++; continue;
      }
    } catch (e) {
      console.error(`  [err] #${row.id}:`, e.message);
      summary.errors++; continue;
    }

    const cards = Array.isArray(cardsBody?.cards) ? cardsBody.cards.filter(c => c.enabled !== false) : [];
    const newest = cards[0] || null;
    const name = `${row.guest_first_name || ''} ${row.guest_last_name || ''}`.trim();
    if (!newest) {
      console.log(`  [no-card]  #${row.id} ${name} — Square has 0 cards on file for customer ${row.square_customer_id}`);
      summary.noCard++;
      continue;
    }

    console.log(`  [FOUND]    #${row.id} ${name} → card ${newest.id} (${newest.card_brand} ****${newest.last_4}, exp ${newest.exp_month}/${newest.exp_year})`);

    if (LIVE) {
      try {
        await pg.query(`UPDATE bookings SET square_card_id = $1, card_last4 = COALESCE(card_last4, $2), updated_at = NOW() WHERE id = $3`,
          [newest.id, newest.last_4 || null, row.id]);
        summary.updated++;
      } catch (e) {
        console.error(`  [db-err] #${row.id}:`, e.message);
        summary.errors++;
      }
    }
  }

  console.log(`\n[backfill] done — ${LIVE ? 'updated' : 'would update'}=${summary.updated}, no-card-on-file=${summary.noCard}, errors=${summary.errors}`);
  if (!LIVE) console.log('(this was a DRY-RUN — re-run with --live to actually write)');
  await pg.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
