/**
 * Measures a build, for before/after comparisons:
 *
 *   node tests/perf/measure.mjs <dist dir> <site url serving it> [out.json]
 *
 * Build: bytes (and gzip) of the JS, CSS and HTML, and the weight of the
 * images and fonts shipped. Browser: for each route at 1440px and 390px, the
 * requests made up to the load event and in total after the page has been
 * idle for a while (the background frames stream in during idle time), with
 * their bytes, split by type and by host. Timings (first contentful paint,
 * load) are the median of three runs; request counts come from the last run.
 */
import { chromium } from 'playwright';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const [distDir, siteUrl, outFile] = process.argv.slice(2);
if (!distDir || !siteUrl) {
  console.error('usage: node tests/perf/measure.mjs <dist dir> <site url> [out.json]');
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const KIND = {
  '.js': 'js', '.css': 'css', '.html': 'html',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.avif': 'image', '.svg': 'image',
  '.woff2': 'font', '.woff': 'font', '.ttf': 'font',
};

const build = { files: 0, kinds: {} };
for (const file of await walk(distDir)) {
  const kind = KIND[extname(file).toLowerCase()] ?? 'other';
  const bytes = (await stat(file)).size;
  const k = (build.kinds[kind] ??= { files: 0, bytes: 0, gzip: 0, list: [] });
  k.files++;
  k.bytes += bytes;
  if (['js', 'css', 'html'].includes(kind)) {
    const gz = gzipSync(await readFile(file), { level: 9 }).length;
    k.gzip += gz;
    k.list.push({ file: relative(distDir, file).replace(/\\/g, '/'), bytes, gzip: gz });
  } else if (bytes > 20000 || kind === 'font' || kind === 'other') {
    k.list.push({ file: relative(distDir, file).replace(/\\/g, '/'), bytes });
  }
  build.files++;
}
// the 145 background frames as one line rather than 145
for (const k of Object.values(build.kinds)) {
  const frames = k.list.filter((f) => /frame_\d+|quill-anim/.test(f.file));
  if (frames.length > 3) {
    k.list = k.list.filter((f) => !frames.includes(f));
    k.list.push({ file: `${frames.length} background frames`, bytes: frames.reduce((s, f) => s + f.bytes, 0) });
  }
  k.list.sort((a, b) => b.bytes - a.bytes);
}

const typeOf = (url, ct = '') => {
  const ext = extname(new URL(url).pathname).toLowerCase();
  if (KIND[ext]) return KIND[ext];
  if (ct.includes('css')) return 'css';
  if (ct.includes('javascript')) return 'js';
  if (ct.includes('font')) return 'font';
  if (ct.includes('image')) return 'image';
  if (ct.includes('html')) return 'html';
  return 'other';
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch();
const runs = [];
const base = siteUrl.replace(/\/$/, '');
for (const route of ['/', '/contact']) {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const timings = [];
    for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const reqs = [];
    let loaded = false;
    page.on('requestfinished', async (req) => {
      const beforeLoad = !loaded;
      // runs after the context of a timing-only run may have closed
      const res = await req.response().catch(() => null);
      const sizes = await req.sizes().catch(() => ({ responseBodySize: 0 }));
      reqs.push({
        url: req.url(),
        type: typeOf(req.url(), res?.headers()['content-type']),
        bytes: sizes.responseBodySize,
        beforeLoad,
      });
    });
    page.on('load', () => (loaded = true));
    await page.goto(base + route, { waitUntil: 'load' });
    // first contentful paint can come after the load event, so wait for it
    const timing = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const nav = performance.getEntriesByType('navigation')[0];
          const done = (fcp) => resolve({ load: Math.round(nav.loadEventStart), fcp });
          new PerformanceObserver((list) => {
            const e = list.getEntriesByName('first-contentful-paint')[0];
            if (e) done(Math.round(e.startTime));
          }).observe({ type: 'paint', buffered: true });
          setTimeout(() => done(null), 10000);
        }),
    );
    timings.push(timing);
    if (run < 2) {
      await context.close();
      continue;
    }
    await page.waitForTimeout(8000); // let the frame streaming finish
    const sum = (list) => {
      const byType = {};
      const hosts = {};
      for (const r of list) {
        const t = (byType[r.type] ??= { requests: 0, bytes: 0 });
        t.requests++;
        t.bytes += r.bytes;
        const h = new URL(r.url).host;
        hosts[h] = (hosts[h] ?? 0) + 1;
      }
      return { requests: list.length, bytes: list.reduce((s, r) => s + r.bytes, 0), byType, hosts };
    };
    runs.push({
      route,
      viewport: name,
      timing: {
        fcp: median(timings.map((t) => t.fcp)),
        load: median(timings.map((t) => t.load)),
      },
      untilLoad: sum(reqs.filter((r) => r.beforeLoad)),
      total: sum(reqs),
    });
    await context.close();
    }
  }
}
await browser.close();

const result = { build, runs };
if (outFile) await writeFile(outFile, JSON.stringify(result, null, 2));

const kb = (b) => `${(b / 1024).toFixed(1)} kB`;
console.log('BUILD');
for (const [kind, k] of Object.entries(build.kinds)) {
  console.log(`  ${kind.padEnd(6)} ${String(k.files).padStart(4)} files  ${kb(k.bytes).padStart(10)}${k.gzip ? `  (gzip ${kb(k.gzip)})` : ''}`);
  for (const f of k.list.slice(0, 6)) console.log(`         ${f.file}  ${kb(f.bytes)}${f.gzip ? ` (gzip ${kb(f.gzip)})` : ''}`);
}
console.log('BROWSER (requests / bytes as served, uncompressed)');
for (const r of runs) {
  const t = (s) =>
    `${s.requests} req ${kb(s.bytes)} [` +
    Object.entries(s.byType).map(([k, v]) => `${k} ${v.requests}/${kb(v.bytes)}`).join(', ') +
    `] hosts: ${Object.entries(s.hosts).map(([h, n]) => `${h}×${n}`).join(' ')}`;
  console.log(`  ${r.route} ${r.viewport}: FCP ${r.timing.fcp} ms, load ${r.timing.load} ms`);
  console.log(`    until load: ${t(r.untilLoad)}`);
  console.log(`    after idle: ${t(r.total)}`);
}
