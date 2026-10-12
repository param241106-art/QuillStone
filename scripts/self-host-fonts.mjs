/**
 * Self-hosts the site's Google Fonts:
 *
 *   node scripts/self-host-fonts.mjs
 *
 * 1. Fetches the same stylesheet the site used to load from Google Fonts (as a
 *    current Chrome would get it) and downloads every woff2 file it names into
 *    src/assets/fonts/, as <family>-<style>-<subset>.woff2. Vite gives them
 *    content-hashed names at build time.
 * 2. Writes src/fonts.css with the same @font-face rules (families, weights,
 *    styles, unicode-range subsets, font-display: swap) pointing at those files.
 * 3. Measures each family against a common local font in headless Chromium and
 *    adds a metric-matched fallback face ("Playfair Display Fallback" on Times
 *    New Roman, "Inter Fallback" on Arial): size-adjust matches the average
 *    character width, and the ascent/descent/line-gap overrides match the
 *    web font's vertical metrics, so text barely moves when the font swaps in.
 *    Each fallback face only covers the characters its web font has (the
 *    union of its unicode-ranges); anything else, like the → in links, falls
 *    through to the plain generic font as it always did.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const GOOGLE_CSS =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600&display=swap';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const FALLBACKS = {
  'Playfair Display': { generic: 'serif', local: ['Times New Roman', 'Times', 'Liberation Serif', 'Tinos'] },
  Inter: { generic: 'sans-serif', local: ['Arial', 'Helvetica', 'Liberation Sans', 'Arimo'] },
};

const root = fileURLToPath(new URL('..', import.meta.url));
const fontDir = join(root, 'src', 'assets', 'fonts');
await mkdir(fontDir, { recursive: true });

const css = await (await fetch(GOOGLE_CSS, { headers: { 'User-Agent': UA } })).text();
const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)].map(([, subset, body]) => {
  const get = (prop) => body.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1].trim();
  return {
    subset,
    family: get('font-family').replace(/'/g, ''),
    style: get('font-style'),
    weight: get('font-weight'),
    url: body.match(/url\(([^)]+)\)/)[1],
    unicodeRange: get('unicode-range'),
  };
});
if (blocks.length === 0) throw new Error('no @font-face rules in the Google Fonts response');

const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');
const files = new Map(); // url -> local file name
for (const b of blocks) {
  if (!files.has(b.url)) {
    const name = `${slug(b.family)}-${b.style}-${b.subset}.woff2`;
    const res = await fetch(b.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${b.url}: ${res.status}`);
    await writeFile(join(fontDir, name), Buffer.from(await res.arrayBuffer()));
    files.set(b.url, name);
  }
  b.file = files.get(b.url);
}
console.log(`downloaded ${files.size} font files for ${blocks.length} @font-face rules`);

/* ---------- fallback metrics, measured in Chromium ---------- */
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const metrics = {};
for (const family of Object.keys(FALLBACKS)) {
  const latin = blocks.find((b) => b.family === family && b.style === 'normal' && b.subset === 'latin');
  const data = (await readFile(join(fontDir, latin.file))).toString('base64');
  metrics[family] = await page.evaluate(
    async ({ family, data, local }) => {
      const face = new FontFace(`${family} Measure`, `url(data:font/woff2;base64,${data})`, { weight: '400' });
      await face.load();
      document.fonts.add(face);
      // English text with ordinary letter frequencies, for the average width
      const sample =
        'The quick brown fox jumps over the lazy dog. Your story, published. Your book, worldwide. ' +
        'From editing and cover design to ISBNs and distribution, we take your manuscript to readers.';
      const ctx = document.createElement('canvas').getContext('2d');
      const measure = (font) => {
        ctx.font = `400 100px ${font}`;
        const m = ctx.measureText(sample);
        return { width: m.width, ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent };
      };
      const web = measure(`"${family} Measure"`);
      const fallback = local.map((f) => ({ name: f, ...measure(`"${f}", monospace`) }));
      const mono = measure('monospace');
      // the first local font actually installed here (its width differs from monospace)
      const base = fallback.find((f) => Math.abs(f.width - mono.width) > 1);
      if (!base) throw new Error(`none of ${local.join(', ')} is installed`);
      // line gap: the height of a line-height:normal box beyond ascent + descent
      const span = document.createElement('span');
      span.style.cssText = `font: 400 100px "${family} Measure"; line-height: normal; display: inline-block`;
      span.textContent = 'Hg';
      document.body.appendChild(span);
      const lineGap = Math.max(0, span.getBoundingClientRect().height - (web.ascent + web.descent));
      span.remove();
      const sizeAdjust = web.width / base.width;
      return {
        measuredAgainst: base.name,
        sizeAdjust,
        ascent: web.ascent / 100 / sizeAdjust,
        descent: web.descent / 100 / sizeAdjust,
        lineGap: lineGap / 100 / sizeAdjust,
      };
    },
    { family, data, local: FALLBACKS[family].local },
  );
  console.log(`${family}: measured against ${metrics[family].measuredAgainst}`, metrics[family]);
}
await browser.close();

/* ---------- src/fonts.css ---------- */
const pct = (n) => `${(n * 100).toFixed(2)}%`;
const out = [
  '/* Generated by scripts/self-host-fonts.mjs: the Google Fonts faces the site',
  '   uses, served from this site, plus metric-matched local fallbacks used',
  '   while the web fonts load (font-display: swap). */',
  '',
  ...blocks.map(
    (b) => `/* ${b.subset} */
@font-face {
  font-family: '${b.family}';
  font-style: ${b.style};
  font-weight: ${b.weight};
  font-display: swap;
  src: url('./assets/fonts/${b.file}') format('woff2');
  unicode-range: ${b.unicodeRange};
}`,
  ),
  ...Object.entries(FALLBACKS).map(([family, f]) => {
    const m = metrics[family];
    const ranges = [
      ...new Set(blocks.filter((b) => b.family === family).flatMap((b) => b.unicodeRange.split(/,\s*/))),
    ];
    return `/* stands in for ${family} until it loads (measured against ${m.measuredAgainst}) */
@font-face {
  font-family: '${family} Fallback';
  src: ${f.local.map((l) => `local('${l}')`).join(', ')};
  size-adjust: ${pct(m.sizeAdjust)};
  ascent-override: ${pct(m.ascent)};
  descent-override: ${pct(m.descent)};
  line-gap-override: ${pct(m.lineGap)};
  unicode-range: ${ranges.join(', ')};
}`;
  }),
  '',
];
await writeFile(join(root, 'src', 'fonts.css'), out.join('\n'));
console.log('wrote src/fonts.css');
