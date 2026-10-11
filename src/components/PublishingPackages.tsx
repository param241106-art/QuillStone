import { Link } from 'react-router-dom';
import { PACKAGES } from '@/lib/packages';
import { SITE, formatPrice } from '@/config/site';
import { QuoteForm } from '@/components/QuoteForm';

/**
 * Three-tier pricing grid. The middle (popular) tier is highlighted, and each
 * "Choose" button jumps to the submission form with that package preselected.
 * Packages have no published prices for now, so each card links to the quote
 * form below instead. A price added in lib/packages.ts replaces that link.
 * `.reveal` wraps each card rather than sitting on it so the card's own hover
 * transition isn't overridden by the reveal transition.
 */
export function PublishingPackages() {
  return (
    <section className="packages" id="packages">
      <div className="wrap">
        <div className="section-head centered reveal">
          <div className="eyebrow">Publishing packages</div>
          <h2>
            Choose your <em>path to print.</em>
          </h2>
          <p>Three ways to publish. Every package ends with your book on sale worldwide.</p>
        </div>

        <div className="package-grid">
          {PACKAGES.map((pkg) => {
            const price = formatPrice(pkg.price);
            return (
              <div className="package-slot reveal" key={pkg.name}>
                <article className={'package' + (pkg.popular ? ' is-popular' : '')}>
                  {pkg.popular && <div className="package-badge">Most Popular</div>}
                  <h3 className="package-name serif">{pkg.name}</h3>
                  <p className="package-tagline">{pkg.tagline}</p>
                  {price ? (
                    <div className="package-price serif">
                      {price}
                      {SITE.taxNote && <span className="package-tax">{SITE.taxNote}</span>}
                    </div>
                  ) : (
                    <Link
                      className="package-price package-price-quote serif"
                      to="/?scroll=package-quote"
                      data-cta={'Get a quote: ' + pkg.name}
                    >
                      Get a quote <span aria-hidden="true">→</span>
                      <span className="visually-hidden"> for the {pkg.name} package</span>
                    </Link>
                  )}
                  {pkg.includes && <p className="package-includes">{pkg.includes}</p>}
                  <ul className="package-features">
                    {pkg.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link
                    to={`/?scroll=submit&package=${encodeURIComponent(pkg.name)}`}
                    className={'package-cta pill' + (pkg.popular ? '' : ' ghost')}
                  >
                    Choose {pkg.name}
                  </Link>
                </article>
              </div>
            );
          })}
        </div>

        <div className="package-quote reveal" id="package-quote">
          <QuoteForm
            placement="packages"
            headingLevel="h3"
            title={
              <>
                Not sure which <em>fits your book?</em>
              </>
            }
            intro={
              <>
                Tell us a little and we’ll recommend a package, with a free quote. Ready to send
                your manuscript? <Link to="/?scroll=submit" aria-label="Submit it here">Submit it here →</Link>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
