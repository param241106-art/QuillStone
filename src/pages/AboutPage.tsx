import { BASE } from '@/lib/assets';
import { SITE } from '@/config/site';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';

// Says plainly that Quillstones is new, and builds trust from how it works
// rather than from names or a back catalogue it doesn't have yet.
const BODY_HTML = `
<section class="doc page-head" id="about">
  <div class="wrap">
    <div class="lead reveal">
      <h1 class="eyebrow">About Quillstones</h1>
      <h2>A small studio for <em>finished books.</em></h2>
      <p>We take an author’s manuscript and do everything between “it’s written” and “it’s on sale”.</p>
    </div>
    <div class="prose reveal">
      <p>Quillstones is a self-publishing studio based in India. We edit, design and format books, assign ISBNs and metadata, and get them listed on Amazon KDP, IngramSpark and Draft2Digital, so a finished manuscript becomes a book readers can buy around the world.</p>

      <h2>We’re new, and we’ll say so</h2>
      <p>Quillstones has only just opened. We don’t have a shelf of past titles to show you yet, and we won’t pretend otherwise. What we can offer is a clear process, written terms, and a straight answer before you pay anything.</p>
      <p>Every manuscript gets an honest read first. If it isn’t ready, we’ll tell you, and we won’t sell you services you don’t need yet.</p>

      <h2>What we believe about self-publishing</h2>
      <ul>
        <li><strong>Your book stays yours.</strong> You keep the copyright and the rights to your work, and your book’s royalties are paid to you under the terms of your agreement.</li>
        <li><strong>You should know the price before you commit.</strong> Every quote is free and comes with no obligation. We confirm the scope and price in writing before any work starts.</li>
        <li><strong>One team, start to finish.</strong> The same people handle your book from the first edit to launch day, so nothing gets lost between stages.</li>
        <li><strong>Honest guidance over upselling.</strong> If a simpler path suits your book, such as publishing the eBook first, we’ll suggest it.</li>
      </ul>

      <h2>Who we work with</h2>
      <ul>
        <li>First-time authors with a finished or nearly finished manuscript.</li>
        <li>Authors who have self-published before and want a better-produced next book.</li>
        <li>Educators and small publishers who need editing, design or production help.</li>
      </ul>
      <p>We also take on brand and marketing work (positioning, identity, content and channels) for authors and small businesses building an audience.</p>

      <h2>Talk to us</h2>
      <p>Email <a href="mailto:${SITE.email}">${SITE.email}</a>, call or WhatsApp ${SITE.phone}, or use the form on any page. A real person reads every message, and we reply within two working days.</p>
      <div class="prose-cta">
        <a class="pill" href="${BASE}?scroll=submit">Send your manuscript</a>
        <a class="pill ghost" href="${BASE}how-it-works">See how it works</a>
      </div>
    </div>
  </div>
</section>
`;

export function AboutPage() {
  useRevealAndCounters();
  return <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />;
}
