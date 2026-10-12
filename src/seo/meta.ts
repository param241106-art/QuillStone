/**
 * Everything that goes in a page's <head> besides the static bits in
 * index.html: title, description, canonical URL, Open Graph / Twitter tags and
 * JSON-LD structured data.
 *
 * One list of tags per route, used twice: scripts/prerender.mjs writes it into
 * each page's HTML at build time (what search engines and link previews read),
 * and Layout calls applyHead() on every in-app navigation so the browser tab
 * and the tags stay in step with the page.
 *
 * Absolute URLs start from VITE_SITE_URL (no trailing slash), e.g.
 * https://quillstones.com, or https://<user>.github.io/QuillStone without a
 * custom domain. Set it as a repository variable for the Pages build.
 */
import { SITE, hasPhone } from '@/config/site';
import { FAQS } from '@/data/faqs';
import { PACKAGES } from '@/lib/packages';
import { BASE, LOGO, routeOf } from '@/lib/assets';

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '')
  .trim()
  .replace(/\/+$/, '') || 'https://quillstones.com';

export interface PageMeta {
  title: string;
  description: string;
}

/** Every route that gets its own HTML file, sitemap entry and head tags. */
export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Self-Publishing for Authors — Quillstones',
    description:
      'Self-publishing for authors: editing, cover design, formatting, ISBNs and worldwide distribution on Amazon KDP, IngramSpark and Draft2Digital. Free quote.',
  },
  '/what-we-do': {
    title: 'Self-Publishing Services — What We Do — Quillstones',
    description:
      'Self-publishing services for authors with a manuscript: editing, design and publishing, with honest guidance at every stage. Plus brand and marketing work.',
  },
  '/our-work': {
    title: 'Self-Published Books — Our Work — Quillstones',
    description:
      'Self-published books from Quillstones authors appear here, with links to buy them. Have a manuscript? Submit it or get a free, no-obligation quote.',
  },
  '/how-it-works': {
    title: 'How Self-Publishing Works — Quillstones',
    description:
      'How self-publishing with Quillstones works: send your manuscript, get an honest read, timeline and quote within a week, then one team takes you to launch.',
  },
  '/contact': {
    title: 'Contact Us About Self-Publishing — Quillstones',
    description: `Ask about self-publishing your book. Email ${SITE.email}, call or WhatsApp us, or send a message. A real person reads every one.`,
  },
};

export const ROUTE_PATHS = Object.keys(PAGES);

/** The canonical URL of a route: the site root keeps its slash, other pages have none. */
export const urlOf = (route: string) => `${SITE_URL}${route === '/' ? '/' : route}`;

const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630, alt: 'The Quillstones logo' };

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script';
  attrs: Record<string, string>;
  text?: string;
}

const ORG_ID = `${SITE_URL}/#organization`;

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: urlOf('/'),
    logo: `${SITE_URL}/${LOGO.slice(BASE.length)}`,
    email: SITE.email,
    ...(hasPhone && {
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: SITE.phone.replace(/\s+/g, ''),
        email: SITE.email,
        contactType: 'customer service',
      },
    }),
    ...(SITE.social.length > 0 && { sameAs: SITE.social.map((s) => s.url) }),
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE.name,
    url: urlOf('/'),
    publisher: { '@id': ORG_ID },
  };
}

/** One Service per publishing package. An Offer is added only for a package with a real price. */
function services() {
  return PACKAGES.map((pkg) => ({
    '@type': 'Service',
    name: `${pkg.name} self-publishing package`,
    serviceType: 'Self-publishing services',
    description: `${pkg.tagline} ${pkg.includes ?? ''} ${pkg.features.join(', ')}.`.replace(/\s+/g, ' ').trim(),
    provider: { '@id': ORG_ID },
    ...(pkg.price !== undefined && {
      offers: { '@type': 'Offer', price: pkg.price, priceCurrency: SITE.currency },
    }),
  }));
}

function faqPage() {
  return {
    '@type': 'FAQPage',
    '@id': `${urlOf('/')}#faq`,
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function structuredData(route: string) {
  // the home page carries the packages and the FAQ, so the detail lives there
  const graph = route === '/' ? [organization(), website(), ...services(), faqPage()] : [];
  return graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null;
}

export function headTags(route: string): HeadTag[] {
  const page = PAGES[route] ?? PAGES['/'];
  const url = urlOf(PAGES[route] ? route : '/');
  const image = `${SITE_URL}${OG_IMAGE.path}`;
  const tags: HeadTag[] = [
    { tag: 'title', attrs: {}, text: page.title },
    { tag: 'meta', attrs: { name: 'description', content: page.description } },
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE.name } },
    { tag: 'meta', attrs: { property: 'og:title', content: page.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: page.description } },
    { tag: 'meta', attrs: { property: 'og:url', content: url } },
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: String(OG_IMAGE.width) } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: String(OG_IMAGE.height) } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: OG_IMAGE.alt } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: page.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: page.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
    { tag: 'meta', attrs: { name: 'twitter:image:alt', content: OG_IMAGE.alt } },
  ];
  const data = structuredData(route);
  if (data) {
    // `<` escaped so no string in the data can close the script element
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: json });
  }
  return tags;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The head tags as HTML, for the prerendered pages. `data-head` marks the ones applyHead() replaces. */
export function headHtml(route: string) {
  return headTags(route)
    .map(({ tag, attrs, text }) => {
      const a = Object.entries({ ...attrs, 'data-head': '' })
        .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
        .join('');
      if (tag === 'meta' || tag === 'link') return `<${tag}${a} />`;
      return `<${tag}${a}>${tag === 'script' ? text : escapeHtml(text ?? '')}</${tag}>`;
    })
    .join('\n    ');
}

/** Swaps the <head> tags for the route at `pathname`; a no-op when they're already in place. */
export function applyHead(pathname: string) {
  const route = routeOf(pathname);
  const root = document.documentElement;
  if (root.dataset.headRoute === route) return;
  root.dataset.headRoute = route;

  document.head.querySelectorAll('[data-head]').forEach((el) => el.remove());
  for (const { tag, attrs, text } of headTags(route)) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('data-head', '');
    if (text !== undefined) el.textContent = text;
    document.head.appendChild(el);
  }
}
