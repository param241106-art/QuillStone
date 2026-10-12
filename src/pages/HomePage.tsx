import { useEffect, type MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { BASE, HERO_LOGO_WIDTH, LOGO, LOGO_AR } from '@/lib/assets';
import { SITE } from '@/config/site';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';
import { PublishingProcess } from '@/components/PublishingProcess';
import { PublishingPackages } from '@/components/PublishingPackages';
import { RoyaltyCalculator } from '@/components/RoyaltyCalculator';
import { FeaturedReleases } from '@/components/FeaturedReleases';
import { AuthorStories } from '@/components/AuthorStories';
import { AuthorFAQ } from '@/components/AuthorFAQ';
import { ManuscriptSubmission } from '@/components/ManuscriptSubmission';
import { QuoteForm } from '@/components/QuoteForm';
import { Stats } from '@/components/Stats';

// the "since …" line only appears once config/site.ts has a real founding year
const TRUST_HTML = SITE.foundedYear
  ? `<div class="hero-trust reveal"><span class="dot"></span>Working with authors since ${SITE.foundedYear}.</div>`
  : '';

// The logo slot starts at the height Layout gives it (the hero logo width times
// the lockup's aspect ratio), so the prerendered hero doesn't jump when it loads.
const HERO_HTML = `
<!-- HERO -->
<header class="hero">
  <div class="wrap">
    <div class="logo-space" id="logoSpace" style="height:calc(min(${HERO_LOGO_WIDTH}px, 62vw) * ${LOGO_AR})"></div>
    <div class="hero-copy" id="heroCopy">
      <div class="kicker reveal">Self-Publishing for Authors</div>
      <h1 class="hero-tag reveal">Your story, <span class="c-teal">published.</span><br>Your book, <span class="c-coral">worldwide.</span></h1>
      <p class="hero-sub reveal">From editing and cover design to ISBNs and distribution on Amazon KDP, IngramSpark and Draft2Digital, we take your manuscript to readers around the world.</p>
      <div class="hero-cta reveal">
        <a href="${BASE}?scroll=submit" data-scroll-to="submit" class="pill teal">Submit Manuscript</a>
        <a href="${BASE}?scroll=packages" data-scroll-to="packages" class="pill ghost">View Publishing Packages</a>
        <a href="${BASE}contact" class="plainlink" aria-label="Or just say hello">or just say hello →</a>
      </div>
      ${TRUST_HTML}
    </div>
  </div>
  <div class="scroll-cue" aria-hidden="true"><span>Scroll</span><span class="bar"></span></div>
</header>
`;

const INTERLUDE_HTML = `
<!-- MONOGRAM INTERLUDE -->
<section class="interlude">
  <div class="wrap reveal">
    <img class="mono" data-dust-anchor src="${LOGO}" width="827" height="834" alt="The Quillstones mark: a quill drawn through the letters Q and S">
    <blockquote>A quill for the <span>word.</span> A stone for the <span>weight</span> it carries.</blockquote>
    <div class="attrib">The mark, explained</div>
  </div>
</section>
`;

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
}

export function HomePage() {
  useRevealAndCounters();
  const location = useLocation();

  // in-page links like `/?scroll=packages`. `location.key` changes on every
  // navigation, so following the same link a second time scrolls again.
  useEffect(() => {
    const target = new URLSearchParams(location.search).get('scroll');
    if (target) scrollToSection(target);
  }, [location.key, location.search]);

  // hero buttons that point at a section on this page scroll there directly,
  // so they keep working when clicked a second time (the URL wouldn't change)
  const onHeroClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-scroll-to]');
    if (!link) return;
    e.preventDefault();
    scrollToSection(link.dataset.scrollTo!);
  };

  return (
    <>
      <div onClick={onHeroClick} dangerouslySetInnerHTML={{ __html: HERO_HTML }} />
      <section className="quote-band" id="quote">
        <div className="wrap reveal">
          <QuoteForm
            placement="home"
            title={
              <>
                Get a <em>free quote.</em>
              </>
            }
            intro="Tell us who you are and what you need. We’ll reply with a quote, with no obligation."
          />
        </div>
      </section>
      <PublishingProcess />
      <PublishingPackages />
      <RoyaltyCalculator />
      <FeaturedReleases />
      <AuthorStories />
      <div dangerouslySetInnerHTML={{ __html: INTERLUDE_HTML }} />
      <Stats />
      <AuthorFAQ />
      <ManuscriptSubmission />
    </>
  );
}
