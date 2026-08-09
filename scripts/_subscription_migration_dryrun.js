// Dry-run: walk every account, detect which v2 products they SHOULD be
// subscribed to based on observable signals, compare to existing
// account_subscriptions rows, and report the delta.
//
// Read-only. No INSERT / UPDATE. Companion _subscription_migration_apply.js
// will (later) apply confirmed deltas.
//
// Signals:
//   - deployed_sites live → website / wp_plugin / gas_direct
//   - blog_entries > 0 → blog
//   - attractions > 0 → attractions
//   - repuso_widget_id or reviews entries → reviews
//   - shop_products > 0 → shop
//   - contacts > 5 → crm_pro else crm_basic
//   - gas_sync_connections beds24 → gas24 + atomic sub-products from
//     beds24_usage_snapshots
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function tableExists(name) {
  const r = await p.query("SELECT 1 FROM information_schema.tables WHERE table_name = $1", [name]);
  return r.rows.length > 0;
}

async function safeCount(sql, args) {
  try {
    const r = await p.query(sql, args);
    return parseInt(r.rows[0]?.n) || 0;
  } catch { return 0; }
}

async function loadCatalog() {
  const r = await p.query(`
    SELECT product_code, name, price_monthly::numeric AS price_monthly,
           unit_price::numeric AS unit_price, included_units, unit_type, category, is_active
      FROM billing_plans
     WHERE is_active = true AND product_code IS NOT NULL
     ORDER BY category, product_code`);
  const map = {};
  for (const row of r.rows) map[row.product_code] = row;
  return map;
}

function calcMonthly(plan, qty) {
  const q = parseInt(qty || 0);
  const incl = parseInt(plan.included_units || 0);
  const base = parseFloat(plan.price_monthly || 0);
  const unit = parseFloat(plan.unit_price || 0);
  const overage = Math.max(0, q - incl) * unit;
  return Math.round((base + overage) * 100) / 100;
}

(async () => {
  const catalog = await loadCatalog();
  const hasBlog = await tableExists('blog_entries');
  const hasAttractions = await tableExists('attractions');
  const hasShop = await tableExists('shop_products');
  const hasContacts = await tableExists('contacts');
  const hasSnapshots = await tableExists('beds24_usage_snapshots');
  const hasReviews = await tableExists('reviews');

  const accts = await p.query(`
    SELECT id, COALESCE(business_name, name) AS name, currency, status
      FROM accounts
     WHERE status = 'active'
       AND role IN ('admin','submaster_admin','agency_admin')
     ORDER BY id`);

  console.log(`\nDry-run subscription migration — ${accts.rows.length} active accounts\n`);
  console.log('Legend: [+ADD] proposed new sub, [~PRICE] re-price existing, [=OK] already correct, [-STALE] existing not in detection\n');

  const summary = { add: 0, reprice: 0, ok: 0, stale: 0, byProduct: {} };

  for (const acct of accts.rows) {
    const detected = {};   // product_code → qty

    // WEBSITE / WP_PLUGIN / GAS_DIRECT
    const sites = await p.query(`
      SELECT id, site_url, template, blog_id, site_status
        FROM deployed_sites
       WHERE account_id = $1 AND (site_status IS NULL OR site_status IN ('live','development'))
    `, [acct.id]).catch(() => ({ rows: [] }));
    let wpCount = 0, siteCount = 0;
    for (const s of sites.rows) {
      const isWp = (s.template && /wp|wordpress/i.test(s.template)) || s.blog_id;
      if (isWp) wpCount++; else siteCount++;
    }
    // Property count for the /property pricing
    const propR = await p.query(`SELECT COUNT(*)::int AS n FROM properties WHERE account_id = $1`, [acct.id]);
    const propCount = propR.rows[0].n;
    if (wpCount > 0) detected.wp_plugin = propCount || 1;
    else if (siteCount > 0) detected.website = propCount || 1;
    else if (propCount > 0) detected.gas_direct = propCount;

    // BLOG — only if the site set has blog enabled (blog_entries table)
    if (hasBlog) {
      const n = await safeCount(`SELECT COUNT(*)::int AS n FROM blog_entries WHERE account_id = $1`, [acct.id]);
      if (n > 0) detected.blog = n;
    }
    // ATTRACTIONS
    if (hasAttractions) {
      const n = await safeCount(`SELECT COUNT(*)::int AS n FROM attractions WHERE account_id = $1`, [acct.id]);
      if (n > 0) detected.attractions = n;
    }
    // REVIEWS — repuso widget OR reviews rows
    let reviewsHit = false;
    for (const s of sites.rows) {
      const rr = await p.query(`SELECT settings->>'repuso_widget_id' AS w FROM website_settings WHERE deployed_site_id = $1 AND section = 'reviews' LIMIT 1`, [s.id]).catch(() => ({ rows: [] }));
      if (rr.rows[0]?.w) { reviewsHit = true; break; }
    }
    if (!reviewsHit && hasReviews) {
      const n = await safeCount(`SELECT COUNT(*)::int AS n FROM reviews WHERE account_id = $1`, [acct.id]);
      if (n > 0) reviewsHit = true;
    }
    if (reviewsHit) detected.reviews = 1;
    // SHOP
    if (hasShop) {
      const n = await safeCount(`SELECT COUNT(*)::int AS n FROM shop_products WHERE account_id = $1`, [acct.id]);
      if (n > 0) detected.shop = n;
    }
    // CRM
    if (hasContacts) {
      const n = await safeCount(`SELECT COUNT(*)::int AS n FROM contacts WHERE account_id = $1`, [acct.id]);
      if (n > 5) detected.crm_pro = n;
      else if (n > 0) detected.crm_basic = n;
    }
    // BEDS24 + gas24_*
    const b24 = await p.query(`
      SELECT id FROM gas_sync_connections
       WHERE account_id = $1 AND adapter_code IN ('beds24','beds24-marketplace') AND sync_enabled = true
       LIMIT 1`, [acct.id]).catch(() => ({ rows: [] }));
    if (b24.rows.length && hasSnapshots) {
      const snap = await p.query(`
        SELECT property_count, rental_count, channel_link_count, sub_user_count, sms_count, has_ssl
          FROM beds24_usage_snapshots
         WHERE account_id = $1
         ORDER BY created_at DESC LIMIT 1`, [acct.id]).catch(() => ({ rows: [] }));
      const s = snap.rows[0] || {};
      detected.gas24 = 1;
      detected.gas24_base = 1;
      if (s.property_count) detected.gas24_property = parseInt(s.property_count);
      if (s.rental_count) detected.gas24_extra_rental = parseInt(s.rental_count);
      if (s.channel_link_count) detected.gas24_link = parseInt(s.channel_link_count);
      if (s.sub_user_count) detected.gas24_sub_user = parseInt(s.sub_user_count);
      if (s.sms_count) detected.gas24_sms = parseInt(s.sms_count);
      if (s.has_ssl) detected.gas24_ssl = 1;
    }

    // Existing subs
    const existing = await p.query(`
      SELECT product, quantity, monthly_price::numeric AS price, currency, status
        FROM account_subscriptions WHERE account_id = $1`, [acct.id]);
    const existMap = {};
    for (const row of existing.rows) existMap[row.product] = row;

    // Compare
    const lines = [];
    for (const [code, qty] of Object.entries(detected)) {
      const plan = catalog[code];
      if (!plan) { lines.push(`  [!MISSING PLAN] ${code} qty=${qty}`); continue; }
      const expectPrice = calcMonthly(plan, qty);
      const cur = existMap[code];
      if (!cur) {
        lines.push(`  [+ADD]     ${code.padEnd(22)} qty=${String(qty).padEnd(4)} → €${expectPrice.toFixed(2)}/mo`);
        summary.add++;
        summary.byProduct[code] = (summary.byProduct[code] || 0) + 1;
      } else {
        const priceDelta = Math.abs(parseFloat(cur.price) - expectPrice) > 0.01;
        const qtyDelta = parseInt(cur.quantity) !== parseInt(qty);
        if (priceDelta || qtyDelta) {
          lines.push(`  [~PRICE]   ${code.padEnd(22)} qty=${cur.quantity}→${qty}  price=€${parseFloat(cur.price).toFixed(2)}→€${expectPrice.toFixed(2)}`);
          summary.reprice++;
        } else {
          lines.push(`  [=OK]      ${code.padEnd(22)} qty=${qty} @ €${expectPrice.toFixed(2)}`);
          summary.ok++;
        }
        delete existMap[code];
      }
    }
    // Stale — existing sub not detected
    for (const [code, row] of Object.entries(existMap)) {
      lines.push(`  [-STALE]   ${code.padEnd(22)} qty=${row.quantity} @ ${row.price} ${row.currency} — NOT DETECTED as active`);
      summary.stale++;
    }
    if (lines.length) {
      console.log(`── acct ${acct.id} · ${acct.name}`);
      for (const l of lines) console.log(l);
      console.log('');
    }
  }

  console.log('\n══════════ SUMMARY ══════════');
  console.log(`  [+ADD] proposals:     ${summary.add}`);
  console.log(`  [~PRICE] re-price:    ${summary.reprice}`);
  console.log(`  [=OK] no change:      ${summary.ok}`);
  console.log(`  [-STALE] to review:   ${summary.stale}`);
  console.log('\n  ADD by product:');
  for (const [code, n] of Object.entries(summary.byProduct).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(22)} × ${n}`);
  }
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
