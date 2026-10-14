import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BASE } from '@/lib/assets';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';

const BODY_HTML = `
<section class="paths page-head" id="paths">
  <div class="wrap">
    <div class="lead reveal">
      <h1 class="eyebrow">Self-publishing services</h1>
      <h2>Two doors into <em>one house.</em></h2>
      <p>Tell us which you are, and we'll point you the right way. The craft behind both is the same.</p>
    </div>
    <div class="path-grid">
      <div class="path pub reveal" id="publishing">
        <div class="tagline">The Word — Publishing</div>
        <h3>You have a manuscript.</h3>
        <p>We acquire, edit, design, and publish literary fiction, essays, and epistolary work — with the typographic care a sentence deserves, and honest guidance at every stage.</p>
        <a class="go" href="${BASE}contact" aria-label="Submit a manuscript">Submit a manuscript →</a>
      </div>
      <div class="path mkt reveal" id="marketing">
        <div class="tagline">The Signal — Marketing</div>
        <h3>You're building a brand.</h3>
        <p>Positioning, identity, and voice — then content, channels, and analytics. Strategy before noise, narrative before reach. We start with what you actually need.</p>
        <a class="go" href="${BASE}contact" aria-label="Request a proposal">Request a proposal →</a>
      </div>
    </div>
  </div>
</section>
`;

export function WhatWeDoPage() {
  useRevealAndCounters();
  const [params] = useSearchParams();

  useEffect(() => {
    const target = params.get('scroll');
    if (!target) return;
    const el = document.getElementById(target);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [params]);

  return <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />;
}
