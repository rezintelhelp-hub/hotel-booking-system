// Extract colours, fonts, font-sizes, spacing from the Dwellfort theme's
// CSS files (+ pulled live-page HTML). Outputs a design spec markdown
// file used by the port. Read-only — no theme changes.
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/stevedriver/hotel-booking-system/scripts/_dwellfort_theme_ref';
const CSS_DIRS = [
  path.join(ROOT, 'global_design_mode_theme7/css/main'),
  path.join(ROOT, 'global_design_mode_theme7/css/widgets'),
];
const HTML_DIR = path.join(ROOT, 'live_pages');
const OUT = path.join(ROOT, 'DESIGN_SPEC.md');

// Collect all CSS
let allCss = '';
for (const dir of CSS_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.css')) continue;
    allCss += `\n/* ==== ${f} ==== */\n` + fs.readFileSync(path.join(dir, f), 'utf8');
  }
}

// Also pull the live-page inline <style> blocks — SetSeed puts a big
// per-site theme override there.
let allHtml = '';
if (fs.existsSync(HTML_DIR)) {
  for (const f of fs.readdirSync(HTML_DIR)) {
    if (!f.endsWith('.html')) continue;
    allHtml += fs.readFileSync(path.join(HTML_DIR, f), 'utf8');
  }
}
const inlineStyles = [];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/g;
let m;
while ((m = styleRe.exec(allHtml))) inlineStyles.push(m[1]);
const inlineCss = inlineStyles.join('\n');

// --- COLOURS ---
const colourSet = new Map(); // key -> count
const pickColour = (src, tag) => {
  // hex 3 or 6 chars
  for (const c of src.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    const norm = c.toLowerCase();
    colourSet.set(norm, (colourSet.get(norm) || 0) + 1);
  }
  for (const c of src.match(/rgba?\([^)]+\)/g) || []) {
    colourSet.set(c.replace(/\s+/g, ''), (colourSet.get(c.replace(/\s+/g, '')) || 0) + 1);
  }
};
pickColour(allCss, 'theme');
pickColour(inlineCss, 'live');

// --- FONTS ---
const fontFamilies = new Map();
for (const f of (allCss.match(/font-family\s*:\s*([^;}]+)[;}]/g) || []).concat(inlineCss.match(/font-family\s*:\s*([^;}]+)[;}]/g) || [])) {
  const v = f.replace(/^font-family\s*:\s*/, '').replace(/[;}]$/, '').trim();
  fontFamilies.set(v, (fontFamilies.get(v) || 0) + 1);
}
// Google Font imports
const googleFonts = new Set();
for (const g of (allHtml.match(/fonts\.googleapis\.com\/css[^"'>]+/g) || [])) googleFonts.add(g);

// --- FONT SIZES ---
const fontSizes = new Map();
for (const f of (allCss.match(/font-size\s*:\s*[^;}]+[;}]/g) || []).concat(inlineCss.match(/font-size\s*:\s*[^;}]+[;}]/g) || [])) {
  const v = f.replace(/^font-size\s*:\s*/, '').replace(/[;}]$/, '').trim();
  fontSizes.set(v, (fontSizes.get(v) || 0) + 1);
}

// --- BUTTONS ---
const btnRules = [];
const buttonRe = /(?:^|})\s*([^{}]*(?:button|\.btn|\.button|\.buy_now|\.add_to_basket)[^{}]*)\{([^}]+)\}/gi;
while ((m = buttonRe.exec(allCss))) {
  btnRules.push({ selector: m[1].trim(), body: m[2].trim() });
}

// --- WRITE SPEC ---
const sortByCount = (map, limit = 30) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

let out = `# Dwellfort Design Spec\n\n`;
out += `**Source:** \`global_design_mode_theme7\` SetSeed theme (2011 Skeleton-based) + live www.dwellfort.com pages\n`;
out += `**Extracted:** ${new Date().toISOString()}\n\n`;

out += `## Palette (most-used colours)\n\n`;
out += `| Colour | Usage count |\n|---|---|\n`;
for (const [c, n] of sortByCount(colourSet, 40)) out += `| \`${c}\` | ${n} |\n`;

out += `\n## Font families\n\n`;
out += `| Family | Usage count |\n|---|---|\n`;
for (const [f, n] of sortByCount(fontFamilies, 20)) out += `| ${f} | ${n} |\n`;

if (googleFonts.size > 0) {
  out += `\n### Google Fonts loaded on live site\n\n`;
  for (const g of googleFonts) out += `- ${g}\n`;
}

out += `\n## Font sizes (most-used)\n\n`;
out += `| Size | Usage count |\n|---|---|\n`;
for (const [s, n] of sortByCount(fontSizes, 25)) out += `| ${s} | ${n} |\n`;

out += `\n## Button rules (${btnRules.length})\n\n`;
for (const b of btnRules.slice(0, 15)) {
  out += `\n### \`${b.selector}\`\n\`\`\`css\n${b.body}\n\`\`\`\n`;
}

fs.writeFileSync(OUT, out);
console.log(`Design spec written → ${OUT}`);
console.log(`  ${colourSet.size} unique colours, ${fontFamilies.size} font families, ${fontSizes.size} font sizes, ${btnRules.length} button rules`);
