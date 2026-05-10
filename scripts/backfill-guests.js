/**
 * Phase 1 Guest Entity backfill — one-off.
 *
 * Builds guest records from the existing booking corpus:
 *   - Groups bookings by (account_id, lower(email))
 *   - Creates one guest per unique key
 *   - Links bookings.guest_id → guests.id
 *   - Inserts booking_guests rows with role='lead'
 *   - Computes total_bookings, total_spent_cents, last_stay_at, recognised_at
 *
 * Idempotent. Re-runs are no-ops thanks to ON CONFLICT.
 *
 * Usage: node scripts/backfill-guests.js
 *        node scripts/backfill-guests.js --dry-run   (preview only, no writes)
 */

require('dotenv').config();
const { Client } = require('pg');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : '✏️  LIVE backfill');
  console.log('');

  // Phase 1: create guest records
  console.log('=== Phase 1: upsert guest records ===');
  const upsertSql = `
    INSERT INTO guests (account_id, email, first_name, last_name, phone, country, created_at)
    SELECT
      p.account_id,
      lower(b.guest_email) AS email,
      (array_agg(b.guest_first_name ORDER BY b.created_at DESC) FILTER (WHERE NULLIF(trim(b.guest_first_name),'') IS NOT NULL))[1] AS first_name,
      (array_agg(b.guest_last_name ORDER BY b.created_at DESC) FILTER (WHERE NULLIF(trim(b.guest_last_name),'') IS NOT NULL))[1] AS last_name,
      (array_agg(b.guest_phone ORDER BY b.created_at DESC) FILTER (WHERE NULLIF(trim(b.guest_phone),'') IS NOT NULL))[1] AS phone,
      (array_agg(b.guest_country ORDER BY b.created_at DESC) FILTER (WHERE b.guest_country IS NOT NULL))[1] AS country,
      MIN(b.created_at) AS created_at
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.guest_email IS NOT NULL AND b.guest_email <> ''
    GROUP BY p.account_id, lower(b.guest_email)
    ON CONFLICT (account_id, email) DO NOTHING
    RETURNING id, account_id, email
  `;
  if (DRY_RUN) {
    const preview = await c.query(`
      SELECT p.account_id, lower(b.guest_email) AS email, COUNT(*)::int AS bookings
      FROM bookings b JOIN properties p ON p.id = b.property_id
      WHERE b.guest_email IS NOT NULL AND b.guest_email <> ''
      GROUP BY p.account_id, lower(b.guest_email)
      ORDER BY bookings DESC, p.account_id LIMIT 10
    `);
    console.log('would create up to', preview.rows.length, 'guests (top 10 by booking count):');
    console.table(preview.rows);
  } else {
    const r = await c.query(upsertSql);
    console.log(`  inserted ${r.rows.length} new guest rows`);
  }

  // Phase 2: link bookings.guest_id
  console.log('');
  console.log('=== Phase 2: link bookings.guest_id ===');
  const linkSql = `
    UPDATE bookings b SET guest_id = g.id
    FROM guests g, properties p
    WHERE p.id = b.property_id
      AND g.account_id = p.account_id
      AND lower(g.email) = lower(b.guest_email)
      AND b.guest_id IS NULL
      AND b.guest_email IS NOT NULL AND b.guest_email <> ''
  `;
  if (DRY_RUN) {
    const preview = await c.query(`
      SELECT COUNT(*)::int AS would_link
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN guests g ON g.account_id = p.account_id AND lower(g.email) = lower(b.guest_email)
      WHERE b.guest_id IS NULL AND b.guest_email IS NOT NULL AND b.guest_email <> ''
    `);
    console.log(`  would link ${preview.rows[0].would_link} bookings to guests`);
  } else {
    const r = await c.query(linkSql);
    console.log(`  linked ${r.rowCount} bookings`);
  }

  // Phase 3: booking_guests rows for lead guests
  console.log('');
  console.log('=== Phase 3: insert booking_guests (lead) ===');
  const bgSql = `
    INSERT INTO booking_guests (booking_id, guest_id, role, added_at, first_name, last_name, email, phone)
    SELECT b.id, b.guest_id, 'lead', b.created_at, b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone
    FROM bookings b
    WHERE b.guest_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM booking_guests bg
        WHERE bg.booking_id = b.id AND bg.guest_id = b.guest_id
      )
  `;
  if (DRY_RUN) {
    const preview = await c.query(`
      SELECT COUNT(*)::int AS would_insert
      FROM bookings b
      WHERE b.guest_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM booking_guests bg WHERE bg.booking_id = b.id AND bg.guest_id = b.guest_id)
    `);
    console.log(`  would insert ${preview.rows[0].would_insert} booking_guests rows`);
  } else {
    const r = await c.query(bgSql);
    console.log(`  inserted ${r.rowCount} booking_guests rows`);
  }

  // Phase 4: roll up guest stats
  console.log('');
  console.log('=== Phase 4: roll up guest stats (total_bookings, total_spent_cents, last_stay_at) ===');
  const statsSql = `
    WITH stats AS (
      SELECT
        b.guest_id,
        COUNT(*)::int AS total_bookings,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN ROUND(b.grand_total * 100) ELSE 0 END), 0)::bigint AS total_spent_cents,
        MAX(b.arrival_date) AS last_stay_at
      FROM bookings b
      WHERE b.guest_id IS NOT NULL
      GROUP BY b.guest_id
    )
    UPDATE guests g
    SET total_bookings = s.total_bookings,
        total_spent_cents = s.total_spent_cents,
        last_stay_at = s.last_stay_at,
        recognised_at = COALESCE(g.recognised_at, NOW()),
        last_seen_at = GREATEST(COALESCE(g.last_seen_at, '1970-01-01'::timestamp), s.last_stay_at::timestamp),
        updated_at = NOW()
    FROM stats s
    WHERE g.id = s.guest_id
  `;
  if (DRY_RUN) {
    console.log('  would roll up stats for all linked guests (skipped in dry-run)');
  } else {
    const r = await c.query(statsSql);
    console.log(`  rolled up ${r.rowCount} guest records`);
  }

  // Phase 5: report
  console.log('');
  console.log('=== Final state ===');
  const final = await c.query(`
    SELECT
      (SELECT COUNT(*) FROM guests)::int AS guests_total,
      (SELECT COUNT(*) FROM guests WHERE total_bookings > 1)::int AS repeat_guests,
      (SELECT COUNT(*) FROM bookings WHERE guest_id IS NOT NULL)::int AS bookings_linked,
      (SELECT COUNT(*) FROM bookings WHERE guest_id IS NULL AND guest_email IS NOT NULL AND guest_email <> '')::int AS bookings_orphan_with_email,
      (SELECT COUNT(*) FROM booking_guests WHERE guest_id IS NOT NULL AND role = 'lead')::int AS booking_guests_lead_rows,
      (SELECT MAX(total_bookings) FROM guests)::int AS most_loyal_guest_bookings,
      (SELECT MAX(total_spent_cents) FROM guests)::bigint AS top_spend_cents
  `);
  console.table(final.rows);

  console.log('');
  console.log('=== Sample guest records ===');
  const sample = await c.query(`
    SELECT id, account_id, email, first_name, last_name, total_bookings, total_spent_cents, last_stay_at::text
    FROM guests
    ORDER BY total_bookings DESC, total_spent_cents DESC
    LIMIT 8
  `);
  console.table(sample.rows);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
