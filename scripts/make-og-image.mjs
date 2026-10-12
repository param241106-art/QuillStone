/**
 * Makes public/og-image.png, the 1200x630 picture shown when a page is shared
 * (Open Graph / Twitter card): the existing logo lockup on the site's dark
 * background with the same soft gold glow the hero uses. Run it again after
 * changing design/logo-mark.png:
 *
 *   npm run og-image
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const logo = await readFile(fileURLToPath(new URL('../design/logo-mark.png', import.meta.url)));
const out = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

const html = `<!doctype html>
<html><head><style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: radial-gradient(ellipse 60% 75% at 50% 50%, rgba(203,176,120,.14), rgba(203,176,120,0) 70%), #0b0a09;
    display: flex; align-items: center; justify-content: center;
  }
  img { height: 500px; filter: drop-shadow(0 0 34px rgba(203,176,120,.28)); }
</style></head>
<body><img src="data:image/png;base64,${logo.toString('base64')}" alt=""></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log('wrote public/og-image.png (1200x630)');
