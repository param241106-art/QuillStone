/**
 * A small static server that answers the way GitHub Pages does, for checking
 * a build locally:
 *
 *   node tests/ui-baseline/serve.mjs <dir> [port]
 *
 * /path serves path, path.html or path/index.html; anything else gets
 * 404.html with a 404 status. Paths are case-sensitive, as on GitHub Pages,
 * even on a case-insensitive disk.
 */
import { createServer } from 'node:http';
import { realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const [dir = 'dist', port = '4173'] = process.argv.slice(2);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile() && realpathSync.native(p) === resolve(p);
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const candidates = path.endsWith('/')
    ? [join(dir, safe, 'index.html')]
    : [join(dir, safe), join(dir, `${safe}.html`), join(dir, safe, 'index.html')];

  for (const file of candidates) {
    if (await isFile(file)) {
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
      return;
    }
  }
  const notFound = join(dir, '404.html');
  res.writeHead(404, { 'Content-Type': TYPES['.html'] });
  res.end((await isFile(notFound)) ? await readFile(notFound) : 'Not found');
}).listen(Number(port), () => console.log(`serving ${dir} on http://localhost:${port}`));
