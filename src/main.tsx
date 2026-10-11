import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics';
import { routeOf } from './lib/assets';
import './index.css';

initAnalytics();

// Note: intentionally not wrapped in <StrictMode>. The page below drives a
// canvas particle field and a scroll-linked logo with plain imperative DOM
// code (rAF loops, event listeners) set up once on mount — StrictMode's
// dev-only double-invoke of effects would double up listeners/loops.
//
// Each route's HTML is prerendered at build time (scripts/prerender.mjs), with
// the route it was rendered for in data-route. React takes over that markup
// as it is; anywhere else (`vite dev`, an unknown address) it renders afresh.
const root = document.getElementById('root')!;
if (root.dataset.route && root.dataset.route === routeOf(location.pathname)) {
  hydrateRoot(root, <App />);
} else {
  root.textContent = '';
  createRoot(root).render(<App />);
}
