/**
 * Optional analytics, off unless VITE_ANALYTICS_ID is set at build time.
 *
 *   VITE_ANALYTICS_ID=G-XXXXXXXXXX     Google Analytics 4. Loads only after the
 *                                      visitor accepts the cookie notice.
 *   VITE_ANALYTICS_ID=example.com      Plausible (cookieless, no notice needed).
 *                                      Set VITE_ANALYTICS_SRC to use a
 *                                      self-hosted Plausible script.
 *
 * Tracks page views, clicks on calls to action (any `.pill` button/link,
 * `.plainlink` or element with `data-cta="label"`) and successful form
 * submissions (see sendEnquiry.ts).
 */

import { routeOf } from '@/lib/assets';

const ID = (import.meta.env.VITE_ANALYTICS_ID ?? '').trim();

export type Provider = 'ga4' | 'plausible' | null;
export const provider: Provider = !ID ? null : /^G-[A-Z0-9]+$/i.test(ID) ? 'ga4' : 'plausible';

// Plausible's standard script records the router's history.pushState navigations.
const PLAUSIBLE_SRC =
  (import.meta.env.VITE_ANALYTICS_SRC ?? '').trim() || 'https://plausible.io/js/script.js';

type Props = Record<string, string>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: ((event: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

/* ---------- consent (GA4 only) ---------- */

const CONSENT_KEY = 'qs-analytics-consent';
export type Consent = 'granted' | 'denied';

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(consent: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // storage blocked: the choice still applies for this visit
  }
  // the visitor is already on a page, so record it now
  if (consent === 'granted') loadGa(true);
}

/* ---------- loaders ---------- */

let gaLoaded = false;

function addScript(src: string, attrs: Record<string, string> = {}) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

/** The current route, e.g. "/contact". */
const currentRoute = () => routeOf(location.pathname);

function loadGa(sendPageview: boolean) {
  if (gaLoaded || provider !== 'ga4') return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the `arguments` object itself, not an array
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // page views are sent by hand on each route change (see trackPageview)
  window.gtag('config', ID, { send_page_view: false });
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`);
  if (sendPageview) trackPageview();
}

function loadPlausible() {
  window.plausible =
    window.plausible ||
    Object.assign(
      function (...args: unknown[]) {
        (window.plausible!.q = window.plausible!.q || []).push(args);
      },
      { q: [] as unknown[] },
    );
  addScript(PLAUSIBLE_SRC, { 'data-domain': ID, defer: '' });
}

/* ---------- public API ---------- */

export function track(event: string, props: Props = {}) {
  if (provider === 'ga4' && gaLoaded) window.gtag?.('event', event, props);
  else if (provider === 'plausible') window.plausible?.(event, { props });
}

/** GA4 only: Plausible's script records route changes itself. */
export function trackPageview() {
  if (provider !== 'ga4' || !gaLoaded) return;
  window.gtag?.('event', 'page_view', {
    page_location: location.href,
    page_title: document.title,
  });
}

/** Call once at startup. Does nothing when analytics is off. */
export function initAnalytics() {
  if (!provider) return;
  if (provider === 'plausible') loadPlausible();
  // Layout records the first page view once it mounts
  else if (readConsent() === 'granted') loadGa(false);

  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(
        '[data-cta], a.pill, button.pill, a.plainlink',
      );
      if (!el || el.getAttribute('aria-disabled') === 'true') return;
      const label = (el.dataset.cta || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      track('cta_click', { label, page: currentRoute() });
    },
    { capture: true },
  );
}
