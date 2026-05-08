// Channel description formatter — turns raw imported text/HTML from any
// channel manager into GAS-canonical HTML using only the tags the GAS
// theme styles. See docs/CLAUDE.md for the architectural intent.
//
// Pipeline (text mode):
//   1. Repair common UTF-8-as-Latin-1 mojibake (apostrophes, dashes)
//   2. Replace mangled-emoji byte sequences with newlines (we can't recover
//      the original glyph, but the position is a structural break)
//   3. Insert newlines before known section headings, real emoji glyphs,
//      bullet glyphs, "Room 1:"-style sub-items, and run-on periods
//   4. Walk the now-broken-up lines, classify each by content, emit canonical
//      HTML with grouped <ul> blocks
//
// HTML mode runs the input through sanitize-html with the same allowlist
// the rest of GAS uses, so source-side <div>/style/class noise is dropped.
//
// Pure function, no DB/network. Used by the Beds24 content-sync today;
// will be the single boundary every channel adapter feeds through.

const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = ['strong', 'em', 'b', 'i', 'u', 'p', 'h2', 'h3', 'ul', 'li', 'br', 'a'];
const ALLOWED_ATTRS = { a: ['href', 'target', 'rel'] };

const SECTION_HEADINGS = [
  'Sleeping Arrangements',
  'Sleeping Configuration',
  'Bedroom Configuration',
  'About this Space',
  'About the Space',
  'About the Host',
  'About the Property',
  'House Rules',
  'Pet Policy',
  'Pet Friendly',
  'Pets Allowed',
  'Additional Notes',
  'Other Things to Note',
  'Other Notes',
  'Cancellation Policy',
  'Refund Policy',
  'Check-in Instructions',
  'Check-In Instructions',
  'Check-in',
  'Check-out',
  'Check In',
  'Check Out',
  'Getting Around',
  'Getting There',
  'Directions',
  'Guest Access',
  'The Space',
  'The Neighbourhood',
  'The Neighborhood',
  'Neighborhood Overview',
  'Neighbourhood Overview',
  'Health & Safety',
  'Health and Safety',
  'Safety Features',
  'Access Information',
  'What to Expect',
  'Things to Know',
  'Amenities',
  'Features',
  'Highlights',
  'Location',
  'Parking'
];

const SECTION_HEADINGS_SET = new Set(SECTION_HEADINGS.map(h => h.toLowerCase()));

const MOJIBAKE_REPLACEMENTS = [
  ['â€™', '’'],
  ['â€˜', '‘'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€"', '—'],
  ['â€"', '–'],
  ['â€¦', '…'],
  ['Ã©', 'é'], ['Ã¨', 'è'], ['Ã ', 'à'], ['Ã§', 'ç'],
  ['Ãª', 'ê'], ['Ã®', 'î'], ['Ã´', 'ô'], ['Ã»', 'û']
];

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function repairMojibake(text) {
  let out = text;
  for (const [bad, good] of MOJIBAKE_REPLACEMENTS) out = out.split(bad).join(good);
  return out;
}

// Mangled-emoji removal. The supplementary-plane bytes are gone; what's
// left is some combination of `?`, ZWJ (U+200D), and variation selectors
// (U+FE0E/F). We replace those mangled blocks with a newline so the
// position serves as a structural break (each amenity still gets its
// own line, just without the original emoji icon).
function removeMangledEmoji(text) {
  // Convert mangled-emoji sequences into a newline + `• ` bullet. The
  // original emoji was a bullet/amenity marker — we can't recover the
  // glyph itself, but the position carries the structural intent.
  // Section-heading detection later in the pipeline strips the bullet
  // when the line content is actually a heading word.
  return text
    .replace(/\?‍[\?♀♂♀♂]️?/g, '\n• ')
    .replace(/\?️/g, '\n• ')
    // Bare `?` mid-text acting as a marker. Requires a non-quote char
    // before AND a capital/digit after a single space — avoids splitting
    // legit "?" punctuation (which is followed by lowercase or end).
    .replace(/(^|[a-zA-Z\d.,!])\?(\s+(?=[A-Z0-9]))/g, '$1\n• ');
}

function looksLikeHtml(text) {
  return /<\s*(p|div|h[1-6]|ul|ol|li|br|strong|em|table)\b/i.test(text);
}

function sanitiseHtmlInput(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: { div: 'p', h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3' }
  })
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .trim();
}

function isSectionHeading(line) {
  return SECTION_HEADINGS_SET.has(line.trim().toLowerCase());
}

function startsWithRealEmoji(line) {
  try { return /^\p{Extended_Pictographic}/u.test(line); }
  catch (_) { return false; }
}

function startsWithBulletGlyph(line) {
  return /^[•‣▪⁃‐–—\-\*]\s/.test(line);
}

function isKeyValueItem(line) {
  return /^(?:Room|Bed|Bedroom|Bathroom|Suite|Additional|Floor|Level)\s*\d*\s*:/i.test(line);
}

function buildStructureFromText(input) {
  let text = repairMojibake(input);
  text = removeMangledEmoji(text);

  // Insert newlines BEFORE each known section heading. Match either
  // boundary-clean or jammed (e.g. "...with carePet Policy").
  for (const heading of SECTION_HEADINGS) {
    const re = new RegExp('([^\\n])(' + escapeRegex(heading) + ')(?=\\s|[A-Z]|$|[•▪])', 'g');
    text = text.replace(re, '$1\n$2\n');
  }

  // Newline before each bullet glyph.
  text = text.replace(/\s*([•‣▪⁃])\s*/g, '\n$1 ');

  // Newline before each real emoji glyph that's mid-text.
  try {
    text = text.replace(/([^\s\n])(\p{Extended_Pictographic})/gu, '$1\n$2');
  } catch (_) { /* older Node */ }

  // Newline before "Room 1:" / "Bed 2:" / "Additional:" sub-items.
  text = text.replace(/([^\n])((?:Room|Bed|Bedroom|Bathroom|Suite|Additional|Floor|Level)\s*\d*\s*:)/g, '$1\n$2');

  // Run-on sentence: ".X" with no space → ".\nX"
  text = text.replace(/\.([A-Z])/g, '.\n$1');

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const openList = () => { if (!inList) { out.push('<ul>'); inList = true; } };

  for (const line of rawLines) {
    // Skip stray punctuation-only lines from the run-on splitter.
    if (line.length < 2 && !/[A-Za-z0-9]/.test(line)) continue;

    // Strip a leading bullet glyph for classification — a "• Sleeping
    // Arrangements" should still be detected as a heading, not a bullet.
    const stripped = line.replace(/^[•‣▪⁃‐–—\-\*]\s+/, '');

    if (isSectionHeading(stripped)) {
      closeList();
      out.push('<h3>' + escapeHtml(stripped) + '</h3>');
      continue;
    }

    if (startsWithBulletGlyph(line)) {
      openList();
      out.push('<li>' + escapeHtml(stripped.trim()) + '</li>');
      continue;
    }

    if (startsWithRealEmoji(line)) {
      openList();
      out.push('<li>' + escapeHtml(line) + '</li>');
      continue;
    }

    if (isKeyValueItem(stripped)) {
      const m = stripped.match(/^([^:]+):\s*(.*)$/);
      if (m) {
        openList();
        out.push('<li><strong>' + escapeHtml(m[1].trim()) + ':</strong> ' + escapeHtml(m[2].trim()) + '</li>');
        continue;
      }
    }

    closeList();
    out.push('<p>' + escapeHtml(line) + '</p>');
  }
  closeList();
  return out.join('\n');
}

function formatChannelDescription(input, opts = {}) {
  if (input == null) return '';
  const text = String(input).trim();
  if (!text) return '';

  const sourceFormat = (opts.sourceFormat === 'html' || opts.sourceFormat === 'text')
    ? opts.sourceFormat
    : (looksLikeHtml(text) ? 'html' : 'text');

  if (sourceFormat === 'html') return sanitiseHtmlInput(repairMojibake(text));
  return buildStructureFromText(text);
}

function formatMultilangDescription(value, opts = {}) {
  if (!value) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out = {};
        for (const k of Object.keys(parsed)) {
          out[k] = typeof parsed[k] === 'string' ? formatChannelDescription(parsed[k], opts) : parsed[k];
        }
        return JSON.stringify(out);
      }
    } catch (_) {}
    return formatChannelDescription(value, opts);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = typeof value[k] === 'string' ? formatChannelDescription(value[k], opts) : value[k];
    }
    return out;
  }
  return value;
}

module.exports = {
  formatChannelDescription,
  formatMultilangDescription,
  _internals: { repairMojibake, removeMangledEmoji, looksLikeHtml, sanitiseHtmlInput, buildStructureFromText, isSectionHeading }
};
