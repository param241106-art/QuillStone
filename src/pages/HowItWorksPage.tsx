import { BASE } from '@/lib/assets';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';

const BODY_HTML = `
<section class="process page-head" id="process">
  <div class="wrap">
    <h1 class="eyebrow reveal">How self-publishing works</h1>
    <h2 class="reveal">Clear steps, <em>no mystery.</em></h2>
    <div class="steps" role="list">
      <div class="step reveal" role="listitem"><div class="n serif" aria-hidden="true">01</div><h4>Send it over</h4><p>Share your manuscript or your brand brief through the form. We read everything ourselves — no gatekeepers, no auto-replies.</p></div>
      <div class="step reveal" role="listitem"><div class="n serif" aria-hidden="true">02</div><h4>We respond with a plan</h4><p>Within a week you get an honest read: whether we're a fit, what we'd do, a rough timeline, and what it costs. No obligation.</p></div>
      <div class="step reveal" role="listitem"><div class="n serif" aria-hidden="true">03</div><h4>We do the work</h4><p>If we go ahead, you get one team and one standard from first draft to final launch — and a point of contact who actually answers.</p></div>
    </div>
  </div>
</section>

<section class="doc" id="stages">
  <div class="wrap">
    <div class="prose reveal">
      <h2>What happens to your book, stage by stage</h2>
      <p>Times are typical for a manuscript of about 60,000–80,000 words. Shorter books move faster, and your quote gives the timeline for yours.</p>
      <div class="table-scroll">
        <table class="stages">
          <thead><tr><th scope="col">Stage</th><th scope="col">What we do</th><th scope="col">Typical time</th></tr></thead>
          <tbody>
            <tr><td>1. Manuscript prep</td><td>An honest read, and beta-reader guidance if it needs more work</td><td>1 week</td></tr>
            <tr><td>2. Editing</td><td>Developmental edit, copy edit and/or proofread, depending on your package</td><td>2–6 weeks</td></tr>
            <tr><td>3. Cover design</td><td>eBook cover, plus a wraparound print cover if needed</td><td>1–2 weeks, alongside editing</td></tr>
            <tr><td>4. Formatting</td><td>EPUB and print-ready PDF</td><td>1 week</td></tr>
            <tr><td>5. ISBNs &amp; metadata</td><td>ISBNs, blurb, categories and keywords</td><td>A few days</td></tr>
            <tr><td>6. Distribution</td><td>Upload to Amazon KDP, IngramSpark and Draft2Digital</td><td>About 1 week, then 3–10 days for retailers to list it</td></tr>
            <tr><td>7. Launch (Elite)</td><td>Review team, author website and ad campaigns</td><td>2–4 weeks around launch</td></tr>
          </tbody>
        </table>
      </div>
      <p><strong>Typical total:</strong> Essential 3–5 weeks · Premium 6–10 weeks · Elite 3–4 months.</p>
      <p>Editing, cover design and formatting each include <strong>two rounds of revisions</strong>, so you approve the edit, the cover and the layout before anything is published.</p>
      <div class="prose-cta">
        <a class="pill" href="${BASE}?scroll=submit">Send your manuscript</a>
        <a class="pill ghost" href="${BASE}?scroll=quote">Get a free quote</a>
      </div>
    </div>
  </div>
</section>
`;

export function HowItWorksPage() {
  useRevealAndCounters();
  return <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />;
}
