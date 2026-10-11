import { Link } from 'react-router-dom';
import { BOOKS, type Book } from '@/data/books';

/** One book: cover (or typographic jacket), details and a Buy Now button. */
export function ReleaseCard({ book }: { book: Book }) {
  return (
    <div className="release-slot reveal">
      <article className="card release">
        <div className="release-cover">
          {book.cover ? (
            <img src={book.cover} alt={`Cover of ${book.title}`} loading="lazy" />
          ) : (
            <div className="jacket c">
              <div>
                <div className="jacket-imprint">Quillstones</div>
                <div className="jacket-rule"></div>
              </div>
              <div className="jacket-title serif">{book.title}</div>
              <div className="jacket-foot">{book.author}</div>
            </div>
          )}
        </div>
        <div className="release-body">
          {book.tag && <div className="tag">{book.tag}</div>}
          <h3 className="serif">{book.title}</h3>
          <div className="byline">{book.author}</div>
          <p className="blurb release-synopsis">{book.synopsis}</p>
          {book.buyUrl ? (
            <a
              className="pill release-buy"
              href={book.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cta={'Buy: ' + book.title}
            >
              Buy Now<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            <a className="pill release-buy is-disabled" aria-disabled="true">
              Buy Now
            </a>
          )}
        </div>
      </article>
    </div>
  );
}

/**
 * Bookstore showcase on the home page: the books marked `featured` in
 * data/books.ts. Renders nothing until there is at least one.
 */
export function FeaturedReleases() {
  const featured = BOOKS.filter((b) => b.featured);
  if (featured.length === 0) return null;

  return (
    <section className="releases" id="releases">
      <div className="wrap">
        <div className="head-row reveal">
          <div>
            <div className="eyebrow">Featured releases</div>
            <h2 className="serif">
              From our <em>bookstore.</em>
            </h2>
          </div>
          <Link className="viewall" to="/our-work">
            View all titles <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="release-grid">
          {featured.map((book) => (
            <ReleaseCard book={book} key={book.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
