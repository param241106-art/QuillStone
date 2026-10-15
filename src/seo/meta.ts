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
import { BOOKS } from '@/data/books';
import { CLIENTS } from '@/data/clients';
import { TESTIMONIALS } from '@/data/testimonials';
import { PACKAGES, PUBLISHING_SERVICES } from '@/lib/packages';
import { BASE, LOGO, routeOf } from '@/lib/assets';

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '')
  .trim()
  .replace(/\/+$/, '') || 'https://quillstones.com';

/**
 * Whether Our work has anything to show (a book, a testimonial or a client).
 * Until it does, the page is kept out of search results, the sitemap and the
 * nav, and all three come back on their own once src/data/ has an entry.
 */
export const HAS_PUBLISHED_WORK = BOOKS.length + TESTIMONIALS.length + CLIENTS.length > 0;

export interface PageMeta {
  title: string;
  description: string;
  /** the page's name in its structured-data breadcrumb */
  label: string;
  /** adds <meta name="robots" content="noindex"> and leaves the page out of sitemap.xml */
  noindex?: boolean;
}

/** Every route that gets its own HTML file, sitemap entry and head tags. */
export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Self-Publishing for Authors — Quillstones',
    description:
      'Self-publishing for authors: editing, cover design, formatting, ISBNs and worldwide distribution on Amazon KDP, IngramSpark and Draft2Digital. Free quote.',
    label: 'Home',
  },
  '/what-we-do': {
    title: 'Self-Publishing Services — What We Do — Quillstones',
    description:
      'Self-publishing services for authors with a manuscript: editing, design and publishing, with honest guidance at every stage. Plus brand and marketing work.',
    label: 'What we do',
  },
  '/our-work': {
    title: 'Self-Published Books — Our Work — Quillstones',
    description:
      'Self-published books from Quillstones authors appear here, with links to buy them. Have a manuscript? Submit it or get a free, no-obligation quote.',
    label: 'Our work',
    noindex: !HAS_PUBLISHED_WORK,
  },
  '/how-it-works': {
    title: 'How Self-Publishing Works — Quillstones',
    description:
      'How self-publishing with Quillstones works: send your manuscript, get an honest read, timeline and quote within a week, then one team takes you to launch.',
    label: 'How it works',
  },
  '/contact': {
    title: 'Contact Us About Self-Publishing — Quillstones',
    description: `Ask about self-publishing your book. Email ${SITE.email}, call or WhatsApp us, or send a message. A real person reads every one.`,
    label: 'Contact',
  },
  '/about': {
    title: 'About Quillstones — Self-Publishing Services in India',
    description:
      'Quillstones helps authors in India self-publish: editing, cover design, formatting, ISBNs and distribution. You keep your copyright. Here’s how we work.',
    label: 'About',
  },
  '/privacy': {
    title: 'Privacy Policy — Quillstones',
    description:
      'What personal information Quillstones collects through its website and forms, why, who it’s shared with, and how to access, correct or delete it.',
    label: 'Privacy policy',
  },
  '/terms': {
    title: 'Terms of Service — Quillstones',
    description:
      'Quillstones’ terms for self-publishing services: quotes, payment, two revision rounds per stage, cancellations and refunds, and your rights to your book.',
    label: 'Terms of service',
  },
};

export const ROUTE_PATHS = Object.keys(PAGES);
/** The routes listed in sitemap.xml: every page not marked noindex. */
export const INDEXED_ROUTE_PATHS = ROUTE_PATHS.filter((r) => !PAGES[r].noindex);

/** The canonical URL of a route: the site root keeps its slash, other pages have none. */
export const urlOf = (route: string) => `${SITE_URL}${route === '/' ? '/' : route}`;

const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630, alt: 'The Quillstones logo' };

export interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script';
  attrs: Record<string, string>;
  text?: string;
}

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Where Quillstones works with authors: India for now. Add countries as the business grows. */
const AREA_SERVED = { '@type': 'Country', name: 'India' };

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: urlOf('/'),
    logo: `${SITE_URL}/${LOGO.slice(BASE.length)}`,
    description:
      'Quillstones is a self-publishing services company. It edits, designs, formats and distributes authors’ books on Amazon KDP, IngramSpark and Draft2Digital, and authors keep their copyright.',
    areaServed: AREA_SERVED,
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
    '@id': WEBSITE_ID,
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

/** The schema.org type of the pages that are more specific than a plain WebPage. */
const PAGE_TYPES: Record<string, string> = {
  '/contact': 'ContactPage',
  '/our-work': 'CollectionPage',
  '/about': 'AboutPage',
};

/** The page itself, tied to the site and the organization, with its breadcrumb on every page but home. */
function webPage(route: string) {
  const url = urlOf(route);
  const type = PAGE_TYPES[route] ?? 'WebPage';
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: PAGES[route].title,
    description: PAGES[route].description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORG_ID },
    ...(route !== '/' && { breadcrumb: { '@id': `${url}#breadcrumb` } }),
  };
}

function breadcrumb(route: string) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${urlOf(route)}#breadcrumb`,
    itemListElement: ['/', route].map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: PAGES[r].label,
      item: urlOf(r),
    })),
  };
}

/** What we do: the self-publishing service as a whole, with each individual service it covers. */
function servicesCatalog() {
  return {
    '@type': 'Service',
    '@id': `${urlOf('/what-we-do')}#self-publishing`,
    name: 'Self-publishing services',
    serviceType: 'Self-publishing services',
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Self-publishing services',
      itemListElement: PUBLISHING_SERVICES.map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name },
      })),
    },
  };
}

function structuredData(route: string) {
  if (!PAGES[route]) return null;
  // the home page carries the packages and the FAQ, so the detail lives there
  const graph =
    route === '/'
      ? [organization(), website(), webPage(route), ...services(), faqPage()]
      : [webPage(route), breadcrumb(route), ...(route === '/what-we-do' ? [servicesCatalog()] : [])];
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function headTags(route: string): HeadTag[] {
  const page = PAGES[route] ?? PAGES['/'];
  const url = urlOf(PAGES[route] ? route : '/');
  const image = `${SITE_URL}${OG_IMAGE.path}`;
  const tags: HeadTag[] = [
    { tag: 'title', attrs: {}, text: page.title },
    { tag: 'meta', attrs: { name: 'description', content: page.description } },
    { tag: 'link', attrs: { rel: 'canonical', href: url } },
    ...(page.noindex ? [{ tag: 'meta' as const, attrs: { name: 'robots', content: 'noindex' } }] : []),
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
