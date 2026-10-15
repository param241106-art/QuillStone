import { SITE } from '@/config/site';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';

// The working terms: payment in full upfront, two revision rounds per stage,
// refunds for stages not started, ISBNs registered to Quillstones. Change the
// date when the text changes.
const UPDATED = '15 October 2026';

const BODY_HTML = `
<section class="doc page-head" id="terms">
  <div class="wrap">
    <div class="lead reveal">
      <h1 class="eyebrow">Terms of service</h1>
      <h2>How we work <em>together.</em></h2>
    </div>
    <div class="prose reveal">
      <p class="updated">Last updated: ${UPDATED}</p>
      <p>These terms apply when you use quillstones.com or hire Quillstones for self-publishing services. Your quote sets out the services, price and timeline for your book, and your quote and these terms together form our agreement.</p>

      <h2>Quotes</h2>
      <p>Quotes are free and carry no obligation. A quote is valid for 30 days. We confirm the final scope and price in writing before any work starts.</p>

      <h2>Payment</h2>
      <ul>
        <li>Payment is <strong>100% upfront</strong>, before work begins.</li>
        <li>Prices are in Indian rupees (₹). If GST applies, it’s shown on your quote.</li>
        <li>We accept UPI and bank transfer. Payment details come with your quote.</li>
      </ul>

      <h2>Revisions</h2>
      <ul>
        <li>Editing, cover design and formatting each include <strong>two rounds of revisions</strong>.</li>
        <li>Further rounds, or changes outside the agreed scope (such as a new cover concept after you’ve approved one, or rewriting after the edit is approved), are quoted separately before we do them.</li>
        <li>Once you approve a stage, we move on to the next. Changing an approved stage later counts as additional work.</li>
      </ul>

      <h2>Cancellations and refunds</h2>
      <ul>
        <li>You can cancel at any time by emailing <a href="mailto:${SITE.email}">${SITE.email}</a>.</li>
        <li>We’ll <strong>refund the full price of every stage we haven’t started</strong>.</li>
        <li>Stages that are finished or in progress aren’t refunded, and you receive the work completed up to that point.</li>
        <li>Refunds are paid to your original payment method within 14 days of cancellation.</li>
        <li>Fees we’ve already paid to retailers, distributors or other third parties on your behalf can’t be refunded.</li>
      </ul>

      <h2>Timelines</h2>
      <p>The timeline in your quote is a good-faith estimate. It depends on your manuscript and on how quickly you review each stage. If anything is likely to be delayed, we’ll tell you promptly.</p>

      <h2>Your book and your rights</h2>
      <ul>
        <li><strong>You keep the copyright</strong> to your book and all rights to your work.</li>
        <li>Your book’s royalties are paid to you under the terms of your agreement.</li>
        <li>ISBNs are registered to Quillstones as the publisher. An ISBN can’t be transferred, so if you later republish the book elsewhere, the new edition will need a new ISBN.</li>
        <li>When the work is complete, you receive the final files we create for your book (the edited manuscript, the cover images, and the EPUB and print-ready PDF) to use as you wish. Editable design source files aren’t included unless your quote says so.</li>
        <li>Covers may use licensed fonts or stock images, which remain subject to their own licences. We’ll tell you if any limits apply.</li>
      </ul>

      <h2>Your responsibilities</h2>
      <p>You confirm that you own, or have permission to publish, everything in your manuscript, including any images, and that it doesn’t infringe anyone’s rights or break the law. We may decline or stop work on content we can’t lawfully publish. If we do, we’ll refund every stage not yet started.</p>

      <h2>Results</h2>
      <p>We do everything we can to help your book succeed, but we can’t promise sales, rankings or reviews, or that a particular retailer or bookshop will accept or stock it. Retailers set their own rules and royalty rates.</p>

      <h2>Liability</h2>
      <p>Our total liability for any claim is limited to the amount you paid us for the services the claim relates to.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and disputes are subject to the jurisdiction of the courts of India.</p>

      <h2>Contact</h2>
      <p><a href="mailto:${SITE.email}">${SITE.email}</a> · ${SITE.phone}</p>
    </div>
  </div>
</section>
`;

export function TermsPage() {
  useRevealAndCounters();
  return <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />;
}
