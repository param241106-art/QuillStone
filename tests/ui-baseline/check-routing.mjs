/**
 * Checks a prerendered build in a real browser:
 *
 *   node tests/ui-baseline/check-routing.mjs <site url>
 *
 * - every route hydrates with no console errors (React reports hydration
 *   mismatches there), next to no layout shift, and its own <title>
 * - the markup React ends up with matches the prerendered HTML
 * - old /#/… links, /contact/ and unknown addresses land on the right page
 * - links inside the pages' raw HTML navigate in-app (no full page load)
 * - ?scroll= links still scroll to their section
 */
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://localhost:4302').replace(/\/$/, '');
const ROUTES = ['/', '/what-we-do', '/our-work', '/how-it-works', '/contact'];
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

  for (const route of ROUTES) {
    errors.length = 0;
    const res = await page.request.get(base + route);
    const served = await res.text();
    const prerendered = served.match(/<div id="root" data-route="[^"]*">([\s\S]*)<\/div>\s*<\/body>/)?.[1] ?? '';

    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const { cls, title, hydratedHtml } = await page.evaluate(() => ({
      cls: window.__cls,
      title: document.title,
      hydratedHtml: document.getElementById('root').innerHTML,
    }));
    check(`${width}px ${route}: no console errors`, errors.length === 0, errors.join(' | ').slice(0, 300));
    // the web-font swap still nudges the nav slightly, as it did before
    // prerendering (the old home page measured CLS 0.13 to 0.15)
    check(`${width}px ${route}: layout shift under 0.05`, cls < 0.05, `CLS ${cls.toFixed(4)}`);
    check(`${width}px ${route}: prerendered with content`, prerendered.length > 2000, `${prerendered.length} chars`);
    check(`${width}px ${route}: page title`, /Quillstones/.test(title), title);

    // after hydration the effects add classes/styles (reveal, nav state, the
    // logo's transform), so compare the text and the element/attribute
    // skeleton rather than the raw string
    const skeleton = (html) =>
      html
        .replace(/<!--.*?-->/g, '')
        .replace(/\s(class|style|data-[\w-]+|width|height|aria-expanded)="[^"]*"/g, '')
        .replace(/\s(inert|data-dust-anchor)(?=[\s>])/g, '')
        .replace(/="true"/g, '')
        .replace(/\s*\/>/g, '>')
        // attribute names are case-insensitive (React writes autoComplete)
        .replace(/\s([a-zA-Z-]+)="/g, (m, n) => ` ${n.toLowerCase()}="`);
    const same = skeleton(prerendered) === skeleton(hydratedHtml);
    let where = '';
    if (!same) {
      const a = skeleton(prerendered);
      const b = skeleton(hydratedHtml);
      let i = 0;
      while (a[i] === b[i]) i++;
      where = `first difference: …${a.slice(Math.max(0, i - 80), i + 80)}… vs …${b.slice(Math.max(0, i - 80), i + 80)}…`;
    }
    check(`${width}px ${route}: hydrated markup matches prerendered HTML`, same, where);
  }
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// old hash links
for (const [from, to] of [
  ['/#/what-we-do', '/what-we-do'],
  ['/#/contact', '/contact'],
  ['/#/', '/'],
  ['/#/?scroll=packages', '/?scroll=packages'],
]) {
  // a fresh document each time: a hash-only change on the same page is not a page load
  await page.goto('about:blank');
  await page.goto(base + from, { waitUntil: 'networkidle' });
  const u = new URL(page.url());
  check(`legacy ${from} -> ${to}`, u.pathname + u.search === to && !u.hash, page.url());
}

// GitHub Pages 404 fallback
for (const [from, to] of [
  ['/contact/', '/contact'],
  ['/What-We-Do', '/what-we-do'],
  ['/no-such-page', '/'],
]) {
  await page.goto(base + from, { waitUntil: 'networkidle' });
  check(`404 ${from} -> ${to}`, new URL(page.url()).pathname === to, page.url());
}

// raw-HTML links navigate in-app, and update the head tags
await page.goto(base + '/what-we-do', { waitUntil: 'networkidle' });
await page.evaluate(() => (window.__sameDocument = true));
await page.click('a.go >> nth=0');
await page.waitForURL('**/contact');
check(
  'raw-HTML link navigates without a page load',
  await page.evaluate(() => window.__sameDocument === true),
);
check(
  'head tags follow in-app navigation',
  (await page.title()).startsWith('Contact') &&
    (await page.getAttribute('link[rel=canonical]', 'href')).endsWith('/contact') &&
    (await page.locator('[data-head]').count()) > 10,
  await page.title(),
);

// ?scroll= links
await page.goto(base + '/our-work', { waitUntil: 'networkidle' });
await page.click('text=Get a free quote');
await page.waitForTimeout(1500); // smooth scrolling
const quoteTop = await page.evaluate(() => document.getElementById('quote').getBoundingClientRect().top);
check('?scroll=quote from another page scrolls to the section', Math.abs(quoteTop) < 5, `top ${quoteTop}`);

await page.goto(base + '/?scroll=packages', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // smooth scrolling
const pkgTop = await page.evaluate(() => document.getElementById('packages').getBoundingClientRect().top);
check('direct /?scroll=packages scrolls to the section', Math.abs(pkgTop) < 5, `top ${pkgTop}`);

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.click('.hero-cta a.pill.ghost');
await page.waitForTimeout(1500); // smooth scrolling
const heroTop = await page.evaluate(() => document.getElementById('packages').getBoundingClientRect().top);
check('hero "View Publishing Packages" scrolls to the section', Math.abs(heroTop) < 5, `top ${heroTop}`);

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
