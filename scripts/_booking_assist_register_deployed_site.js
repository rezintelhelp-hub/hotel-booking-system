#!/usr/bin/env node
// Register booking-assist.sites.gas.travel (blog_id 229) in GAS deployed_sites
// linked to Invest Jet (acct 65). Idempotent — checks first.

'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

const SITE_URL = 'https://booking-assist.sites.gas.travel';
const BLOG_ID = 229;
const ACCOUNT_ID = 152; // Invest Jet Real estate SL
const SITE_NAME = 'Booking Assist';

(async () => {
  const existing = await pool.query(
    `SELECT id, site_url, account_id, blog_id, site_status FROM deployed_sites
      WHERE site_url = $1 OR blog_id = $2`,
    [SITE_URL, BLOG_ID]
  );
  if (existing.rows.length) {
    console.log('Already registered:');
    console.log(existing.rows[0]);
    await pool.end();
    return;
  }

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'deployed_sites' ORDER BY ordinal_position`);
  const colNames = cols.rows.map(r => r.column_name);
  console.log('deployed_sites columns:', colNames.join(', '));

  // Insert with the minimum-viable set + development status
  const ins = await pool.query(
    `INSERT INTO deployed_sites (site_url, site_name, account_id, blog_id, template, site_status, created_at)
     VALUES ($1, $2, $3, $4, 'developer-light', 'development', NOW())
     RETURNING id, site_url, account_id, blog_id, site_status`,
    [SITE_URL, SITE_NAME, ACCOUNT_ID, BLOG_ID]
  );
  console.log('Created:');
  console.log(ins.rows[0]);
  await pool.end();
})().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
