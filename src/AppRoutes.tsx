import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { WhatWeDoPage } from '@/pages/WhatWeDoPage';
import { OurWorkPage } from '@/pages/OurWorkPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { ContactPage } from '@/pages/ContactPage';

/**
 * The route table, shared by the browser (App.tsx, BrowserRouter) and the
 * build-time prerender (entry-server.tsx, StaticRouter). Every path here also
 * needs an entry in PAGES (seo/meta.ts) so it gets its own HTML file.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="what-we-do" element={<WhatWeDoPage />} />
        <Route path="our-work" element={<OurWorkPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
