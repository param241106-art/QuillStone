/**
 * Build-time entry for scripts/prerender.mjs (built with `vite build --ssr`).
 * Renders a route to HTML with the same route table the browser uses, so the
 * markup React finds when it hydrates is exactly what it would render itself.
 * (Never loaded by the dev server, so the fast-refresh rule doesn't apply.)
 */
/* eslint-disable react-refresh/only-export-components */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from '@/AppRoutes';
import { BASE, BASENAME } from '@/lib/assets';

export { BASE };
export { PAGES, ROUTE_PATHS, INDEXED_ROUTE_PATHS, SITE_URL, headHtml, urlOf } from '@/seo/meta';
export { PAGE_SOURCES, preloadAllPages } from '@/pages';

/** The page body for `route` (e.g. '/contact'), to go inside <div id="root">. Call preloadAllPages() first. */
export function render(route: string) {
  const location = BASENAME === '/' ? route : `${BASENAME}${route === '/' ? '' : route}`;
  return renderToString(
    <StaticRouter location={location} basename={BASENAME}>
      <AppRoutes />
    </StaticRouter>,
  );
}
