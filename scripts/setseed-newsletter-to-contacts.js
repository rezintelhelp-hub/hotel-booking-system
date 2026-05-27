#!/usr/bin/env node
/**
 * setseed-newsletter-to-contacts.js
 *
 * Pull newsletter_email subscribers from a Setseed site DB into GAS contacts.
 * Idempotent — matches by (account_id, lower(email)) so safe to re-run.
 *
 * Usage:
 *   ssh -fNL 3307:127.0.0.1:3306 -i ~/.ssh/id_ed25519 root@139.162.234.112
 *   node scripts/setseed-newsletter-to-contacts.js --setseed-db setseed_wwwlehmannhousecom5x5gp57chag --account-id 4 [--dry-run]
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg, i, a) => {
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = a[i + 1];
      return [key, next && !next.startsWith('--') ? next : true];
    }
    return null;
  }).filter(Boolean)
);

if (!args['setseed-db'] || !args['account-id']) {
  console.error('Usage: node scripts/setseed-newsletter-to-contacts.js --setseed-db <db> --account-id <id> [--dry-run]');
  process.exit(1);
}

const SETSEED_DB = args['setseed-db'];
const ACCOUNT_ID = parseInt(args['account-id'], 10);
const DRY_RUN = args['dry-run'] === true;
const MYSQL_PORT = parseInt(args['mysql-port'] || '3307', 10);

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { Client } = require('pg');

(async () => {
  const my = await mysql.createConnection({ host: '127.0.0.1', port: MYSQL_PORT, user: 'setseed_master', password: 'hrDpymeXhGjcBgvT8GTZ', database: SETSEED_DB });
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const [rows] = await my.execute(`
    SELECT email, name, joined, inactive, verified
    FROM newsletter_email
    WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
  `);
  console.log(`Found ${rows.length} subscribers in ${SETSEED_DB}`);

  let inserted = 0, skipped = 0, errors = 0;
  for (const row of rows) {
    const email = String(row.email || '').toLowerCase().trim();
    if (!email) { skipped++; continue; }

    // Skip inactive/unsubscribed
    if (row.inactive && row.inactive !== '0' && row.inactive !== '' && row.inactive !== null) { skipped++; continue; }

    // Split name into first/last (best-effort — Setseed stores as one string)
    const parts = String(row.name || '').trim().split(/\s+/);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(' ') || null;
    const fullName = String(row.name || '').trim() || null;

    if (DRY_RUN) { inserted++; continue; }

    try {
      // Manual dedupe by (account_id, lower(email)) — no unique constraint
      // exists on this combo, and ghl_contact_id is NULL for these so the
      // existing constraint wouldn't catch duplicates either.
      const exists = await pg.query(`SELECT id FROM contacts WHERE account_id = $1 AND LOWER(email) = $2 LIMIT 1`, [ACCOUNT_ID, email]);
      if (exists.rows[0]) { skipped++; continue; }
      await pg.query(`
        INSERT INTO contacts (account_id, source, email, first_name, last_name, full_name, created_at)
        VALUES ($1, 'setseed_newsletter', $2, $3, $4, $5, COALESCE($6, NOW()))
      `, [ACCOUNT_ID, email, firstName, lastName, fullName, row.joined || null]);
      inserted++;
    } catch (e) {
      console.warn(`  [err] ${email}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nResult: ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
  await my.end();
  await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
