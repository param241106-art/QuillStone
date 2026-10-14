/**
 * Contact details and business facts shown around the site.
 *
 * Every empty value is a TODO(real data): the element that uses it stays hidden
 * until you fill it in, so the site never shows a made-up number or address.
 * Fill in only details that are real and current.
 */

export interface SocialLink {
  label: string;
  url: string;
}

export const SITE = {
  name: 'Quillstones',

  email: 'contact@quillstones.com',

  /** Shown in the header, footer and mobile menu, in international format. */
  phone: '+91 90026 50816',

  // The same number on WhatsApp: digits only, with the country code and no
  // '+' or spaces. Turns on the floating WhatsApp button and the WhatsApp links.
  whatsapp: '919002650816',

  /** Pre-filled text when a visitor opens WhatsApp from the site. */
  whatsappMessage: 'Hi Quillstones, I’d like to know more about publishing my book.',

  // No public postal address. Add lines here (one per entry) to show one in the footer.
  address: [] as string[],

  // TODO(real data): social profiles, e.g. { label: 'Instagram', url: 'https://instagram.com/…' }.
  social: [] as SocialLink[],

  /** ISO 4217 code used for package prices, once lib/packages.ts has any. */
  currency: 'INR',

  // Shown under package prices, e.g. 'Prices include GST.' Unused while the
  // packages have no prices.
  taxNote: '',

  // Quillstones has only just started, so there is no "working with authors
  // since …" line under the hero. Set a year here to show one later.
  foundedYear: null as number | null,
};

/** Strips everything but digits, so wa.me links work however the number was typed. */
const digits = (s: string) => s.replace(/\D/g, '');

export const hasWhatsApp = digits(SITE.whatsapp).length >= 8;
export const hasPhone = digits(SITE.phone).length >= 7;

export function whatsappHref(message = SITE.whatsappMessage) {
  return `https://wa.me/${digits(SITE.whatsapp)}?text=${encodeURIComponent(message)}`;
}

export const phoneHref = () => `tel:${SITE.phone.replace(/[^\d+]/g, '')}`;

/** The WhatsApp number as visitors will read it, e.g. +447700900000. */
export const whatsappDisplay = () => '+' + digits(SITE.whatsapp);

/** Formats a package price in the configured currency, or null if prices aren't set up yet. */
export function formatPrice(amount: number | undefined) {
  if (amount === undefined || !SITE.currency) return null;
  try {
    return new Intl.NumberFormat(SITE.currency === 'INR' ? 'en-IN' : 'en', {
      style: 'currency',
      currency: SITE.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return null;
  }
}
