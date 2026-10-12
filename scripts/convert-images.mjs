/**
 * Converts images to WebP at the same pixel dimensions, in headless Chromium
 * (canvas.toBlob), so it needs nothing beyond Playwright:
 *
 *   node scripts/convert-images.mjs <quality 0-1> <out dir> [--bg=#rrggbb] <file…>
 *
 * Quality 1 is lossless. For each file it prints the size before and after
 * and how far the WebP's decoded pixels are from the original's: the mean
 * and largest per-channel difference (0-255) and the PSNR. With --bg, both
 * are first composited onto that colour, which is what a visitor sees of an
 * image with transparency (and ignores the colour of fully clear pixels).
 * The site's images were converted with:
 *
 *   logo-mark.png:             quality 0.95 --bg=#0b0a09 (the page background)
 *   quill-anim/frame_*.jpg:    quality 0.85
 *
 * The originals are in git history (before the WebP switch); keep
 * design/logo-mark.png as the logo's source.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const [qualityArg, outDir, ...rest] = process.argv.slice(2);
const bg = rest.find((a) => a.startsWith('--bg='))?.slice(5) ?? null;
const files = rest.filter((a) => !a.startsWith('--'));
const quality = Number(qualityArg);
if (!(quality > 0 && quality <= 1) || !outDir || files.length === 0) {
  console.error('usage: node scripts/convert-images.mjs <quality 0-1> <out dir> <file…>');
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const browser = await chromium.launch();
const page = await browser.newPage();
let before = 0;
let after = 0;
let worstMax = 0;
let worstPsnr = Infinity;

for (const file of files) {
  const src = `data:${MIME[extname(file).toLowerCase()]};base64,${(await readFile(file)).toString('base64')}`;
  const r = await page.evaluate(
    async ({ src, quality, bg }) => {
      const load = (url) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = url;
        });
      const pixels = (img, fill) => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(img, 0, 0);
        return { canvas: c, data: ctx.getImageData(0, 0, c.width, c.height).data };
      };
      const original = await load(src);
      const { canvas } = pixels(original);
      const { data: a } = pixels(original, bg);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
      const url = URL.createObjectURL(blob);
      const { data: b } = pixels(await load(url), bg);
      let sum = 0;
      let max = 0;
      let sq = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        sum += d;
        sq += d * d;
        if (d > max) max = d;
      }
      const mse = sq / a.length;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return {
        width: canvas.width,
        height: canvas.height,
        mean: sum / a.length,
        max,
        psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse),
        webp: btoa(bin),
      };
    },
    { src, quality, bg },
  );
  const out = join(outDir, basename(file, extname(file)) + '.webp');
  const buf = Buffer.from(r.webp, 'base64');
  await writeFile(out, buf);
  const size = (await stat(file)).size;
  before += size;
  after += buf.length;
  worstMax = Math.max(worstMax, r.max);
  worstPsnr = Math.min(worstPsnr, r.psnr);
  if (files.length <= 5) {
    console.log(
      `${basename(file)} ${r.width}x${r.height}: ${(size / 1024).toFixed(1)} kB -> ${(buf.length / 1024).toFixed(1)} kB, ` +
        `mean diff ${r.mean.toFixed(3)}, max ${r.max}, PSNR ${r.psnr === Infinity ? 'identical' : r.psnr.toFixed(1) + ' dB'}`,
    );
  }
}
await browser.close();
console.log(
  `${files.length} file(s): ${(before / 1024).toFixed(1)} kB -> ${(after / 1024).toFixed(1)} kB ` +
    `(${Math.round((1 - after / before) * 100)}% smaller); worst max diff ${worstMax}, worst PSNR ` +
    `${worstPsnr === Infinity ? 'identical' : worstPsnr.toFixed(1) + ' dB'}`,
);
