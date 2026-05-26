#!/usr/bin/env node
/**
 * Auto-map Sparks to GHL workflows by name similarity for an account.
 *
 * Usage:
 *   node scripts/map-sparks-to-workflows.js --account-id 4 [--dry-run] [--min-score 0.3]
 *
 * Algorithm:
 *   - Tokenise both names (lowercase, strip punctuation, split on non-alphanum)
 *   - Drop boilerplate stop-words (the, a, of, and, free, guide… plus
 *     hospitality-specific noise like "2020", "2021", "offer", "follow", "up")
 *   - Score = (intersection size) / (size of shorter set), weighted by IDF on
 *     the rarer tokens. So "paranormal" matching scores higher than
 *     "free" matching.
 *   - Save each suggested mapping with its score in sparks.linked_workflow_id
 *   - Only auto-confirm above --min-score (default 0.4); below that, leave
 *     unset so the operator can manually pick in the UI.
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

const ACCOUNT_ID = parseInt(args['account-id'], 10);
const DRY_RUN = args['dry-run'] === true;
const MIN_SCORE = parseFloat(args['min-score'] || '0.4');

if (!ACCOUNT_ID) {
  console.error('Usage: node scripts/map-sparks-to-workflows.js --account-id <id> [--dry-run] [--min-score N]');
  process.exit(1);
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'to', 'for', 'in', 'on', 'at', 'with', 'by',
  'free', 'new', 'guide', 'offer', 'follow', 'up', 'follow-up', 'sequence',
  '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  'lehmann', 'house', 'bbmb', 'bed', 'breakfast',
  'page', 'landing', 'special', 'launch'
]);

function tokenise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !STOP_WORDS.has(t) && t.length > 1);
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const sparks = (await c.query(`
    SELECT id, slug, title FROM sparks WHERE account_id = $1 AND is_published = true
  `, [ACCOUNT_ID])).rows;
  const workflows = (await c.query(`
    SELECT id, name FROM workflows WHERE account_id = $1 AND source = 'ghl'
  `, [ACCOUNT_ID])).rows;

  console.log(`Mapping ${sparks.length} Sparks against ${workflows.length} workflows for account ${ACCOUNT_ID}`);

  // Compute IDF for all workflow tokens so rare matches score higher
  const docFreq = new Map();
  for (const w of workflows) {
    const seen = new Set(tokenise(w.name));
    for (const t of seen) docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }
  const idf = (token) => Math.log((workflows.length || 1) / ((docFreq.get(token) || 0) + 1)) + 1;

  let highConfidence = 0, lowConfidence = 0, unmapped = 0;
  const mappings = [];

  for (const spark of sparks) {
    const sparkTokens = new Set([...tokenise(spark.slug), ...tokenise(spark.title)]);
    if (sparkTokens.size === 0) { unmapped++; continue; }
    let best = null, bestScore = 0;
    for (const w of workflows) {
      const wfTokens = new Set(tokenise(w.name));
      if (wfTokens.size === 0) continue;
      let overlap = 0;
      for (const t of sparkTokens) if (wfTokens.has(t)) overlap += idf(t);
      const denom = Math.min(sparkTokens.size, wfTokens.size);
      const score = denom > 0 ? overlap / denom : 0;
      if (score > bestScore) { bestScore = score; best = w; }
    }
    mappings.push({ spark, best, score: bestScore });
  }

  // Sort by score descending so the strong matches print first
  mappings.sort((a, b) => b.score - a.score);

  for (const { spark, best, score } of mappings) {
    if (!best || score < 0.15) {
      console.log(`  [—] "${spark.title}" → no match (best score: ${score.toFixed(2)})`);
      unmapped++;
      continue;
    }
    const confidence = score >= MIN_SCORE ? '✓' : '?';
    console.log(`  [${confidence}] "${spark.title}"\n        → "${best.name}" (score: ${score.toFixed(2)})`);
    if (score >= MIN_SCORE) {
      if (!DRY_RUN) {
        await c.query(`UPDATE sparks SET linked_workflow_id = $1 WHERE id = $2`, [best.id, spark.id]);
      }
      highConfidence++;
    } else {
      lowConfidence++;
    }
  }

  console.log(`\nResult: ${highConfidence} confident matches${DRY_RUN ? ' (dry-run, nothing saved)' : ' saved'}, ${lowConfidence} weak suggestions (left unset), ${unmapped} unmapped`);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
