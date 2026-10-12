/**
 * Compares the animated layers of two builds, which the UI baseline hides:
 *
 *   node tests/perf/compare-layers.mjs <old site url> <new site url> <out dir>
 *
 * - the scroll-scrubbed background canvas (#bgframes) at several scroll
 *   positions, once every frame has loaded and the scrub has settled
 * - the hero logo (.stage) at the top of the home page
 * - the background with prefers-reduced-motion (only the last frame is drawn)
 *
 * Each pair of screenshots is saved and compared pixel by pixel; it reports
 * how many pixels differ by more than 8/255 and the largest difference.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [oldUrl, newUrl, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

const STILL = '*,*::before,*::after{animation:none!important;transition:none!important} html{scroll-behavior:auto!important}';
const ONLY = (keep) =>
  `${STILL} body > #root > *:not(${keep}), main, footer, nav, .wa-float { visibility: hidden !important; }`;

async function shoot(url, file, { width, height, reduced = false, keep, scroll = 0 }) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: ONLY(keep) });
  // wait for every frame image the page will stream (or the single reduced one)
  await page.waitForTimeout(reduced ? 1500 : 6000);
  if (scroll) {
    await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), scroll);
    await page.waitForTimeout(2500); // the scrub eases to the target frame
  }
  await page.screenshot({ path: file });
  await page.close();
}

async function compare(a, b) {
  const page = await browser.newPage();
  const { readFile } = await import('node:fs/promises');
  const [da, db] = await Promise.all([readFile(a), readFile(b)]);
  const r = await page.evaluate(
    async ({ a, b }) => {
      const load = (s) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = 'data:image/png;base64,' + s;
        });
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, c.width, c.height).data;
      };
      const [pa, pb] = [px(await load(a)), px(await load(b))];
      let diff = 0;
      let max = 0;
      let sum = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
        if (d > 8) diff++;
        if (d > max) max = d;
        sum += d;
      }
      return { diff, max, mean: sum / (pa.length / 4) };
    },
    { a: da.toString('base64'), b: db.toString('base64') },
  );
  await page.close();
  return r;
}

const CASES = [
  ...[0, 0.25, 0.5, 0.75, 1].map((s) => ({ name: `bg-${s * 100}pct-desktop`, route: '/', width: 1440, height: 900, keep: '#bgframes', scroll: s })),
  { name: 'bg-50pct-mobile', route: '/', width: 390, height: 844, keep: '#bgframes', scroll: 0.5 },
  { name: 'bg-contact-desktop', route: '/contact', width: 1440, height: 900, keep: '#bgframes', scroll: 1 },
  { name: 'logo-desktop', route: '/', width: 1440, height: 900, keep: '.stage' },
  { name: 'logo-mobile', route: '/', width: 390, height: 844, keep: '.stage' },
  { name: 'bg-reduced-motion', route: '/', width: 1440, height: 900, keep: '#bgframes', reduced: true },
];

for (const c of CASES) {
  const a = join(outDir, `${c.name}-old.png`);
  const b = join(outDir, `${c.name}-new.png`);
  await shoot(oldUrl + c.route, a, c);
  await shoot(newUrl + c.route, b, c);
  const r = await compare(a, b);
  console.log(
    `${c.name.padEnd(22)} ${r.diff ? `${r.diff} px differ by >8/255` : 'no pixel differs by >8/255'}, ` +
      `largest difference ${r.max}/255, mean ${r.mean.toFixed(3)}`,
  );
}
await browser.close();
