// Extract clean visible text from Sterling Scott's static pages into a
// structured content dump we can then load into Web Builder sections.

const fs = require('fs');

function strip(html) {
  // Nuke script/style/iframe blocks and their contents entirely.
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
              .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  // Preserve line breaks for block elements before stripping.
  s = s.replace(/<\/(h[1-6]|p|li|div|section|article|br|tr)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  // Strip tags.
  s = s.replace(/<[^>]+>/g, '');
  // Decode common entities.
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '–')
       .replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
       .replace(/&pound;/g, '£').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Collapse whitespace.
  s = s.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
  return s;
}

function extractHeadings(html) {
  const out = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
                     .replace(/&amp;/g, '&').trim();
    if (text) out.push({ level: m[1].toUpperCase(), text });
  }
  return out;
}

function extractImages(html) {
  const out = [];
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].includes('AjaxLoader') || m[1].includes('spacer') || m[1].startsWith('data:')) continue;
    out.push(m[1]);
  }
  return [...new Set(out)]; // dedupe
}

function extractPrimaryColor(html) {
  // Find inline colours + rough gauge of primary theme colour by frequency.
  const colours = {};
  const re = /(?:color|background(?:-color)?)\s*:\s*(#[0-9a-f]{3,8}|rgb[a]?\([^)]+\))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const c = m[1].toLowerCase();
    colours[c] = (colours[c] || 0) + 1;
  }
  const sorted = Object.entries(colours).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 10);
}

const pages = ['home', 'about-us', 'services', 'contact', 'testimonials'];
const bag = {};
for (const p of pages) {
  const path = `/tmp/ss-content/${p}.html`;
  if (!fs.existsSync(path)) { continue; }
  const html = fs.readFileSync(path, 'utf8');
  bag[p] = {
    headings: extractHeadings(html),
    images: extractImages(html).slice(0, 15),
    body_preview: strip(html).slice(0, 3000)
  };
}

// Only compute colours from homepage — likely most representative.
bag._palette = extractPrimaryColor(fs.readFileSync('/tmp/ss-content/home.html', 'utf8'));

console.log(JSON.stringify(bag, null, 2));
