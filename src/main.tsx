import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics';
import { routeOf } from './lib/assets';
import { LAZY_PAGES, preloadAllPages } from './pages';
import './fonts.css';
import './index.css';

initAnalytics();

// Note: intentionally not wrapped in <StrictMode>. The page below drives a
// canvas particle field and a scroll-linked logo with plain imperative DOM
// code (rAF loops, event listeners) set up once on mount — StrictMode's
// dev-only double-invoke of effects would double up listeners/loops.
//
// Each route's HTML is prerendered at build time (scripts/prerender.mjs), with
// the route it was rendered for in data-route. React takes over that markup
// as it is, once the page's own code chunk has loaded (the HTML preloads it);
// anywhere else (`vite dev`, an unknown address) it renders afresh.
const root = document.getElementById('root')!;
const route = routeOf(location.pathname);
if (root.dataset.route && root.dataset.route === route) {
  const page = LAZY_PAGES[route];
  const hydrate = () => hydrateRoot(root, <App />);
  if (page) page.preload().then(hydrate, hydrate);
  else hydrate();
} else {
  root.textContent = '';
  createRoot(root).render(<App />);
}

// Fetch the other pages' code once the browser is idle after loading, so
// moving between pages stays instant.
const whenIdle = (cb: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(cb) : setTimeout(cb, 200);
const prefetch = () => whenIdle(() => void preloadAllPages().catch(() => {}));
if (document.readyState === 'complete') prefetch();
else addEventListener('load', prefetch, { once: true });
