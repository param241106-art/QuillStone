/**
 * The pages other than Home, each in its own chunk so a visitor only downloads
 * the code for the page they open (Home is bundled with the app, since most
 * visits start there). PAGE_SOURCES lets scripts/prerender.mjs find each
 * page's chunk in the build manifest and preload it in that page's HTML.
 */
import { lazyPage, type LazyPage } from '@/lib/lazyPage';

export const WhatWeDoPage = lazyPage(() => import('@/pages/WhatWeDoPage').then((m) => m.WhatWeDoPage));
export const OurWorkPage = lazyPage(() => import('@/pages/OurWorkPage').then((m) => m.OurWorkPage));
export const HowItWorksPage = lazyPage(() => import('@/pages/HowItWorksPage').then((m) => m.HowItWorksPage));
export const ContactPage = lazyPage(() => import('@/pages/ContactPage').then((m) => m.ContactPage));
export const AboutPage = lazyPage(() => import('@/pages/AboutPage').then((m) => m.AboutPage));
export const PrivacyPage = lazyPage(() => import('@/pages/PrivacyPage').then((m) => m.PrivacyPage));
export const TermsPage = lazyPage(() => import('@/pages/TermsPage').then((m) => m.TermsPage));

/** Route -> lazily loaded page. */
export const LAZY_PAGES: Record<string, LazyPage> = {
  '/what-we-do': WhatWeDoPage,
  '/our-work': OurWorkPage,
  '/how-it-works': HowItWorksPage,
  '/contact': ContactPage,
  '/about': AboutPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
};

/** Route -> the page's source file, as named in the build manifest. */
export const PAGE_SOURCES: Record<string, string> = {
  '/what-we-do': 'src/pages/WhatWeDoPage.tsx',
  '/our-work': 'src/pages/OurWorkPage.tsx',
  '/how-it-works': 'src/pages/HowItWorksPage.tsx',
  '/contact': 'src/pages/ContactPage.tsx',
  '/about': 'src/pages/AboutPage.tsx',
  '/privacy': 'src/pages/PrivacyPage.tsx',
  '/terms': 'src/pages/TermsPage.tsx',
};

/** Loads every lazy page's code (the prerender needs them all). */
export const preloadAllPages = () => Promise.all(Object.values(LAZY_PAGES).map((p) => p.preload()));
