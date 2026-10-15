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
        <p>We help authors self-publish books they’re proud of. You keep your copyright, and we handle everything between manuscript and marketplace, with honest guidance at every stage.</p>
        <a class="go" href="${BASE}?scroll=submit" aria-label="Submit a manuscript">Submit a manuscript →</a>
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

<section class="services" id="services">
  <div class="wrap">
    <div class="lead reveal">
      <h2>Self-publishing services, start to finish</h2>
      <p>Choose a package (Essential, Premium or Elite), or pick only the services you need. Every quote is free, with no obligation.</p>
    </div>
    <div class="svc-grid">
      <div class="svc reveal">
        <h3>Editing &amp; proofreading</h3>
        <p>Three levels, depending on what your manuscript needs:</p>
        <ul>
          <li><strong>Developmental editing:</strong> structure, pacing, plot and character.</li>
          <li><strong>Copy editing:</strong> sentence-level clarity, consistency and flow.</li>
          <li><strong>Proofreading:</strong> the final pass for typos and errors.</li>
        </ul>
        <p class="pkg">Proofreading in every package</p>
      </div>
      <div class="svc reveal">
        <h3>Cover design</h3>
        <p>Custom front covers for eBooks, and full wraparound covers (front, spine and back) for print, designed to stand next to traditionally published books in your genre.</p>
        <p class="pkg">Every package</p>
      </div>
      <div class="svc reveal">
        <h3>Formatting &amp; typesetting</h3>
        <p>Your final text becomes an EPUB for e-readers and a print-ready PDF for paperbacks, typeset properly, not just exported.</p>
        <p class="pkg">Every package</p>
      </div>
      <div class="svc reveal">
        <h3>ISBNs &amp; metadata</h3>
        <p>An ISBN for each format, plus your blurb, BISAC categories and keywords, so readers searching for books like yours can find it.</p>
        <p class="pkg">One ISBN in Essential · every format in Premium and Elite</p>
      </div>
      <div class="svc reveal">
        <h3>Distribution</h3>
        <p>Your book on sale on Amazon through KDP, including Amazon.in, and with IngramSpark and Draft2Digital, which reach other online retailers, bookshops and libraries.</p>
        <p class="pkg">Amazon in every package · IngramSpark &amp; Draft2Digital in Premium and Elite</p>
      </div>
      <div class="svc reveal">
        <h3>Launch &amp; marketing</h3>
        <p>An advance review team for day-one ratings, an author website, and targeted ad campaigns to find your first readers.</p>
        <p class="pkg">Elite</p>
      </div>
    </div>
    <div class="svc-cta reveal">
      <a class="pill" href="${BASE}?scroll=quote">Get a free quote</a>
      <a class="pill ghost" href="${BASE}?scroll=packages">Compare packages</a>
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
