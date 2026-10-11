import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { FAQS } from '@/data/faqs';

/**
 * Accordion of the questions authors most often worry about. One answer is open
 * at a time; clicking the open one closes it.
 */
export function AuthorFAQ() {
  const uid = useId();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <div className="section-head centered reveal">
          <div className="eyebrow">Author questions</div>
          <h2>
            Good questions, <em>straight answers.</em>
          </h2>
          <p>What most authors want to know before they hand over a manuscript.</p>
        </div>

        <div className="faq-list reveal">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `${uid}-panel-${i}`;
            return (
              <div className={'faq-item' + (isOpen ? ' is-open' : '')} key={item.q}>
                <h3 className="faq-question">
                  <button
                    type="button"
                    className="faq-toggle"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-icon" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-panel" id={panelId}>
                  <div className="faq-panel-inner">
                    <p className="faq-answer">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="section-foot reveal">
          Still have a question? <Link to="/contact" aria-label="Ask us directly">Ask us directly →</Link>
        </p>
      </div>
    </section>
  );
}
