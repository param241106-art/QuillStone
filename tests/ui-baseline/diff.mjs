/**
 * Compares two captures made by capture.mjs:
 *
 *   node tests/ui-baseline/diff.mjs <baseline dir> <candidate dir> [diff image dir]
 *
 * For every screenshot it reports the size and the number of pixels that
 * differ (any channel off by more than 8/255), and writes a diff image with
 * the changed pixels in magenta. For every metrics file it lists elements
 * whose box or computed style changed. Exits with 1 if anything differs.
 *
 * Images are compared in headless Chromium (canvas getImageData), so this
 * needs no image library beyond Playwright.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [baseDir, candDir, outDir] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error('usage: node tests/ui-baseline/diff.mjs <baseline dir> <candidate dir> [diff image dir]');
  process.exit(1);
}
if (outDir) await mkdir(outDir, { recursive: true });

const files = (await readdir(baseDir)).sort();
const browser = await chromium.launch();
const page = await browser.newPage();
let failed = false;

for (const file of files.filter((f) => f.endsWith('.png'))) {
  const a = (await readFile(join(baseDir, file))).toString('base64');
  let b;
  try {
    b = (await readFile(join(candDir, file))).toString('base64');
  } catch {
    console.log(`${file}: MISSING in candidate`);
    failed = true;
    continue;
  }
  const r = await page.evaluate(
    async ({ a, b }) => {
      const load = (src) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = 'data:image/png;base64,' + src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h);
      };
      const da = px(ia);
      const db = px(ib);
      const out = new ImageData(w, h);
      let diff = 0;
      let firstY = -1;
      for (let i = 0; i < da.data.length; i += 4) {
        const changed =
          Math.abs(da.data[i] - db.data[i]) > 8 ||
          Math.abs(da.data[i + 1] - db.data[i + 1]) > 8 ||
          Math.abs(da.data[i + 2] - db.data[i + 2]) > 8 ||
          Math.abs(da.data[i + 3] - db.data[i + 3]) > 8;
        if (changed) {
          diff++;
          if (firstY < 0) firstY = Math.floor(i / 4 / w);
          out.data.set([255, 0, 255, 255], i);
        } else {
          const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3;
          out.data.set([g * 0.35, g * 0.35, g * 0.35, 255], i);
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').putImageData(out, 0, 0);
      return {
        sizeA: `${ia.width}x${ia.height}`,
        sizeB: `${ib.width}x${ib.height}`,
        diff,
        firstY,
        png: diff ? c.toDataURL('image/png').split(',')[1] : null,
      };
    },
    { a, b },
  );
  const sameSize = r.sizeA === r.sizeB;
  if (!sameSize || r.diff) failed = true;
  console.log(
    `${file}: ${sameSize ? r.sizeA : `${r.sizeA} -> ${r.sizeB}`}, ` +
      (r.diff ? `${r.diff} px differ (first at y=${r.firstY})` : 'identical'),
  );
  if (outDir && r.png) await writeFile(join(outDir, file), Buffer.from(r.png, 'base64'));
}

const key = (e) => `${e.selector}[${e.index}]`;
for (const file of files.filter((f) => f.endsWith('.json'))) {
  const A = JSON.parse(await readFile(join(baseDir, file), 'utf8'));
  const B = JSON.parse(await readFile(join(candDir, file), 'utf8'));
  const problems = [];
  if (A.scrollHeight !== B.scrollHeight) problems.push(`page height ${A.scrollHeight} -> ${B.scrollHeight}`);
  const mapB = new Map(B.elements.map((e) => [key(e), e]));
  for (const ea of A.elements) {
    const eb = mapB.get(key(ea));
    if (!eb) {
      problems.push(`${key(ea)} "${ea.text}" missing`);
      continue;
    }
    mapB.delete(key(ea));
    if (ea.text !== eb.text) problems.push(`${key(ea)} text "${ea.text}" -> "${eb.text}"`);
    for (const k of ['x', 'y', 'w', 'h'])
      if (ea.box[k] !== eb.box[k]) problems.push(`${key(ea)} ${k} ${ea.box[k]} -> ${eb.box[k]}`);
    for (const [p, v] of Object.entries(ea.style))
      if (eb.style[p] !== v) problems.push(`${key(ea)} ${p} ${v} -> ${eb.style[p]}`);
  }
  for (const k of mapB.keys()) problems.push(`${k} added`);
  if (problems.length) failed = true;
  console.log(`${file}: ${problems.length ? `${problems.length} differences` : 'identical'}`);
  problems.slice(0, 15).forEach((p) => console.log(`    ${p}`));
}

await browser.close();
process.exit(failed ? 1 : 0);
