import { Link } from 'react-router-dom';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';
import { BOOKS } from '@/data/books';
import { CLIENTS } from '@/data/clients';
import { ReleaseCard } from '@/components/FeaturedReleases';
import { AuthorStories } from '@/components/AuthorStories';

/**
 * Everything on this page comes from the files in src/data/ (books,
 * testimonials, clients). Each part stays hidden until it has real entries;
 * until there are books, the shelf says so plainly instead of showing samples.
 */
export function OurWorkPage() {
  useRevealAndCounters();

  return (
    <>
      <section className="shelf-sec page-head" id="work">
        <div className="wrap">
          <div className="head-row reveal">
            <div>
              <h1 className="eyebrow">From the shelf</h1>
              <h2 className="serif">
                {BOOKS.length > 0 ? (
                  <>
                    Recently <em>published.</em>
                  </>
                ) : (
                  <>
                    The shelf is <em>being stocked.</em>
                  </>
                )}
              </h2>
            </div>
          </div>

          {BOOKS.length > 0 ? (
            <div className="release-grid">
              {BOOKS.map((book) => (
                <ReleaseCard book={book} key={book.title} />
              ))}
            </div>
          ) : (
            <div className="shelf-empty reveal">
              <p>
                Books we publish will appear here, with links to buy them. Yours could be one of
                them.
              </p>
              <div className="shelf-empty-cta">
                <Link className="pill" to="/?scroll=submit">
                  Submit your manuscript
                </Link>
                <Link className="pill ghost" to="/?scroll=quote">
                  Get a free quote
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <AuthorStories />

      {CLIENTS.length > 0 && (
        <section className="proof clients">
          <div className="wrap">
            <div className="eyebrow reveal">Who we’ve worked with</div>
            <ul className="logos reveal">
              {CLIENTS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
