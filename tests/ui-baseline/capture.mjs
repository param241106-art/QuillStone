/**
 * Captures what every page looks like, so a change can be checked against it.
 *
 *   node tests/ui-baseline/capture.mjs <site url> <out dir> [hash|path]
 *
 * For each route at 1440px and 390px wide it saves a full-page screenshot and
 * a JSON file with the bounding box and computed styles of headings, buttons,
 * cards and form controls. The animated layers (#bgframes, #dust, the
 * travelling logo) are hidden (they are fixed to the viewport, so a
 * screenshot mask would cover the top screenful of a full-page shot), CSS
 * transitions are switched off, and the page
 * is scrolled to the bottom and back once so every `.reveal` element is shown.
 *
 * `hash` addresses routes as /#/what-we-do (the old HashRouter build);
 * `path` (the default) as /what-we-do.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [siteUrl, outDir, mode = 'path'] = process.argv.slice(2);
if (!siteUrl || !outDir) {
  console.error('usage: node tests/ui-baseline/capture.mjs <site url> <out dir> [hash|path]');
  process.exit(1);
}

export const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'what-we-do', path: '/what-we-do' },
  { name: 'our-work', path: '/our-work' },
  { name: 'how-it-works', path: '/how-it-works' },
  { name: 'contact', path: '/contact' },
  { name: 'about', path: '/about' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
];
const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const MEASURE = [
  'h1', 'h2', 'h3', 'h4',
  '.eyebrow', '.kicker', '.pill', 'button', '.go', '.plainlink',
  '.package', '.path', '.step', '.faq-item', '.calc', '.release-card',
  'form', 'input', 'select', 'textarea', 'label',
  'nav#nav', 'footer', 'main',
];
const STYLE_PROPS = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'color', 'background-color', 'margin', 'padding', 'display', 'text-transform', 'border-radius',
];

const NO_MOTION_CSS = `
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
  #bgframes, #dust, .stage, #flier { visibility: hidden !important; }
`;

const base = siteUrl.replace(/\/$/, '');
const urlFor = (path) => (mode === 'hash' ? `${base}/#${path}` : `${base}${path === '/' ? '/' : path}`);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const vp of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    await page.goto(urlFor(route.path), { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: NO_MOTION_CSS });
    await page.evaluate(() => document.fonts.ready);

    // scroll down a screen at a time so every .reveal element intersects once
    await page.evaluate(async () => {
      const step = Math.max(200, innerHeight * 0.6);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 150));
      // anything still unrevealed (e.g. below a hidden section) is forced on,
      // the same way on every build
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });

    const file = `${route.name}-${vp.name}`;
    await page.screenshot({
      path: join(outDir, `${file}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    const metrics = await page.evaluate(
      ({ selectors, props }) => {
        const out = [];
        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const style = {};
            for (const p of props) style[p] = cs.getPropertyValue(p);
            out.push({
              selector: sel,
              index: i,
              text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
              box: {
                x: Math.round(r.left + scrollX),
                y: Math.round(r.top + scrollY),
                w: Math.round(r.width),
                h: Math.round(r.height),
              },
              style,
            });
          });
        }
        return {
          title: document.title,
          scrollHeight: document.documentElement.scrollHeight,
          elements: out,
        };
      },
      { selectors: MEASURE, props: STYLE_PROPS },
    );
    await writeFile(join(outDir, `${file}.json`), JSON.stringify(metrics, null, 2));
    console.log(`captured ${file}`);
  }
  await context.close();
}

await browser.close();
