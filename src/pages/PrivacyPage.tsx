import { SITE } from '@/config/site';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';

// Keep this in step with what the site actually does: the forms (lib/sendEnquiry.ts,
// Web3Forms), Google Analytics behind the cookie notice (lib/analytics.ts), and
// the contact channels in config/site.ts. Change the date when the text changes.
const UPDATED = '15 October 2026';

const BODY_HTML = `
<section class="doc page-head" id="privacy">
  <div class="wrap">
    <div class="lead reveal">
      <h1 class="eyebrow">Privacy policy</h1>
      <h2>What we collect, and <em>why.</em></h2>
    </div>
    <div class="prose reveal">
      <p class="updated">Last updated: ${UPDATED}</p>
      <p>This policy explains what personal information Quillstones (“we”, “us”) collects through quillstones.com, why, and what you can do about it. We follow India’s Digital Personal Data Protection Act, 2023.</p>
      <p><strong>Who we are.</strong> Quillstones is a self-publishing services business in India. You can reach us at <a href="mailto:${SITE.email}">${SITE.email}</a> or ${SITE.phone}.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>When you fill in a form</strong> (quote, manuscript submission or contact): your name, your email address and/or WhatsApp or phone number, and what you tell us. That can include your role, the service you’re interested in, your book’s title, genre, word count and stage, a link to your manuscript, and your message.</li>
        <li><strong>When you email, call or WhatsApp us:</strong> your contact details and the conversation.</li>
        <li><strong>When you browse the site, and only if you click “Accept” on the cookie notice:</strong> Google Analytics collects usage data, such as the pages you visit, your approximate location, and your device and browser, using cookies. If you click “Decline”, or don’t choose, Google Analytics doesn’t load.</li>
        <li><strong>Your choice on the cookie notice</strong> is saved in your browser’s local storage, so we don’t ask again.</li>
      </ul>
      <p>We don’t collect payment card details on this website.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To reply to you, prepare a quote and provide the services you ask for.</li>
        <li>To understand how the site is used, so we can improve it (Google Analytics, only with your consent).</li>
      </ul>
      <p>We don’t sell your personal information, and we don’t use it for unrelated marketing without your permission.</p>

      <h2>Who we share it with</h2>
      <p>Only the services that help us run the site and talk to you:</p>
      <ul>
        <li><strong>Web3Forms</strong>, which delivers form submissions to our inbox.</li>
        <li><strong>GoDaddy</strong>, which hosts our email.</li>
        <li><strong>Google</strong>, for Google Analytics, with your consent.</li>
        <li><strong>WhatsApp (Meta)</strong>, if you message us there.</li>
        <li><strong>GitHub</strong>, which hosts this website and, like any web host, processes basic connection data such as IP addresses.</li>
      </ul>
      <p>Some of these providers may process data outside India.</p>

      <h2>How long we keep it</h2>
      <p>Enquiries that don’t lead to a project are deleted within 12 months. For authors we work with, we keep project records for as long as we need them to provide the service and to meet legal and tax obligations.</p>

      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>give you a summary of the personal information we hold about you;</li>
        <li>correct or update it;</li>
        <li>delete it, where the law doesn’t require us to keep it;</li>
        <li>withdraw your consent, including for analytics. To see the cookie notice again, clear this site’s data in your browser.</li>
      </ul>
      <p>Email <a href="mailto:${SITE.email}">${SITE.email}</a> and we’ll respond within 30 days. If you’re not satisfied with our response, you can complain to the Data Protection Board of India.</p>

      <h2>Children</h2>
      <p>Our services are for adults. If you’re under 18, please ask a parent or guardian to contact us for you.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy, we’ll update the date at the top of this page.</p>
    </div>
  </div>
</section>
`;

export function PrivacyPage() {
  useRevealAndCounters();
  return <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />;
}
