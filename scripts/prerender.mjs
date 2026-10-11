/**
 * Runs after `vite build` (the site) and `vite build --ssr` (dist-ssr/, the
 * same app as a Node module). For every route it writes a complete HTML file,
 * so search engines and link previews get the real page and its own head tags
 * without running any JavaScript:
 *
 *   dist/index.html, dist/what-we-do.html, …   GitHub Pages serves /what-we-do
 *                                              from what-we-do.html
 *   dist/404.html     any other address: /contact/ → /contact, the rest → home
 *   dist/sitemap.xml, dist/robots.txt          absolute URLs from VITE_SITE_URL
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const { render, headHtml, ROUTE_PATHS, SITE_URL, BASE, urlOf } = await import(
  pathToFileURL(join(ssrDir, 'entry-server.js')).href
);

const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-head-->') || !template.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html is missing the <!--app-head--> or <div id="root"></div> placeholder');
}

const fileFor = (route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`);

for (const route of ROUTE_PATHS) {
  const body = render(route);
  if (body.length < 500) throw new Error(`prerendering ${route} produced almost no HTML`);
  const html = template
    .replace('<html lang="en">', `<html lang="en" data-head-route="${route}">`)
    .replace('<!--app-head-->', headHtml(route))
    .replace('<div id="root"></div>', () => `<div id="root" data-route="${route}">${body}</div>`);
  await writeFile(join(dist, fileFor(route)), html);
  console.log(`prerendered ${route} -> dist/${fileFor(route)} (${Math.round(html.length / 1024)} kB)`);
}

/* ---------- 404.html: GitHub Pages serves it for any address with no file ---------- */
const known = JSON.stringify(ROUTE_PATHS);
await writeFile(
  join(dist, '404.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex" />
    <title>Page not found — Quillstones</title>
    <script>
      // A known page under a slightly different address (/contact/, /Contact)
      // goes to that page; anything else goes to the home page, as the app's
      // own catch-all route does. Old /#/… links keep their route.
      (function () {
        var base = ${JSON.stringify(BASE)};
        var routes = ${known};
        var path = location.pathname;
        path = path.indexOf(base) === 0 ? '/' + path.slice(base.length) : path;
        path = path.replace(/\\/+$/, '').toLowerCase() || '/';
        var target = routes.indexOf(path) >= 0 ? path : '/';
        // never send a page back to its own address (that would loop)
        if (base + target.slice(1) === location.pathname) target = '/';
        location.replace(base + target.slice(1) + (target === '/' ? '' : location.search) + location.hash);
      })();
    </script>
  </head>
  <body>
    <p><a href="${BASE}">Go to the Quillstones home page</a></p>
  </body>
</html>
`,
);
console.log('wrote dist/404.html');

/* ---------- sitemap.xml + robots.txt ---------- */
const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTE_PATHS.map((r) => `  <url><loc>${urlOf(r)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`wrote dist/sitemap.xml and dist/robots.txt for ${SITE_URL}`);

await rm(ssrDir, { recursive: true, force: true });
