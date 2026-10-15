import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { NOT_SURE, PACKAGE_CHOICES } from '@/lib/packages';
import { readHoneypot, sendEnquiry } from '@/lib/sendEnquiry';
import { SITE } from '@/config/site';
import { ContactLinks } from '@/components/ContactLinks';
import { FieldShell, Honeypot, PrivacyNote, SendFailed, SuccessPanel } from '@/components/FormParts';

const GENRES = [
  'Literary fiction',
  'Romance',
  'Mystery & thriller',
  'Fantasy & science fiction',
  'Historical fiction',
  'Memoir & biography',
  'History & politics',
  'Business & self-help',
  'Poetry',
  'Children’s & young adult',
  'Other',
];

const STAGES = [
  'Still writing',
  'First draft complete',
  'Self-edited',
  'Professionally edited',
];

const NEXT_STEPS = [
  {
    title: 'We read it',
    text: 'A real person reads every submission. No gatekeepers, no auto-replies.',
  },
  {
    title: 'You get a plan',
    text: 'Within a week: an honest read, a rough timeline and what it costs. No obligation.',
  },
  {
    title: 'We get to work',
    text: 'If we go ahead, one team takes you from first edit to launch day.',
  },
];

interface Values {
  name: string;
  email: string;
  title: string;
  genre: string;
  wordCount: string;
  stage: string;
  pkg: string;
  link: string;
  notes: string;
  rights: boolean;
}
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;
type TextEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

const EMPTY: Values = {
  name: '',
  email: '',
  title: '',
  genre: '',
  wordCount: '',
  stage: '',
  pkg: NOT_SURE,
  link: '',
  notes: '',
  rights: false,
};

/** The order fields appear in, so a failed submit can focus the first problem. */
const FIELD_ORDER: Field[] = [
  'name', 'email', 'title', 'genre', 'wordCount', 'stage', 'pkg', 'link', 'notes', 'rights',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseWords = (s: string) => Number(s.replace(/[,\s]/g, ''));

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Please tell us your name.';
  if (!v.email.trim()) e.email = 'Add an email so we can reply.';
  else if (!EMAIL.test(v.email.trim())) e.email = 'That email doesn’t look right.';
  if (!v.title.trim()) e.title = 'Add your book’s working title.';
  if (!v.genre) e.genre = 'Choose the closest genre.';
  const words = parseWords(v.wordCount);
  if (!v.wordCount.trim()) e.wordCount = 'Add an approximate word count.';
  else if (!Number.isInteger(words) || words < 1 || words > 2_000_000) {
    e.wordCount = 'Enter a whole number, for example 85000.';
  }
  if (!v.stage) e.stage = 'Tell us where the manuscript is today.';
  if (v.link.trim() && !/^https?:\/\/\S+\.\S+/i.test(v.link.trim())) {
    e.link = 'Use a full link that starts with https://';
  }
  if (!v.rights) e.rights = 'Please confirm this before you submit.';
  return e;
}

function composeMessage(v: Values) {
  const lines = [
    'Manuscript submission',
    '',
    'Title: ' + v.title.trim(),
    'Genre: ' + v.genre,
    'Word count: ' + parseWords(v.wordCount).toLocaleString('en-US'),
    'Stage: ' + v.stage,
    'Package interest: ' + v.pkg,
    'Manuscript link: ' + (v.link.trim() || 'not provided'),
    'Rights: the author confirmed they hold the rights to publish this work',
  ];
  if (v.notes.trim()) lines.push('', 'About the book:', v.notes.trim());
  return lines.join('\n');
}

/**
 * Manuscript submission: the page's closing call to action.
 *
 * It sends through the same route as the Contact form (see lib/sendEnquiry.ts).
 * The manuscript itself is shared as a link rather than uploaded, because a
 * static host has nowhere to keep uploaded files.
 *
 * `.reveal` stays on the two static column wrappers: elements that mount later
 * (the success panel) would never be picked up by the reveal observer.
 */
export function ManuscriptSubmission() {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [mailto, setMailto] = useState('');

  // "Choose Premium" on the pricing grid links here with ?package=Premium
  const [params] = useSearchParams();
  const location = useLocation();
  const requestedPackage = params.get('package');
  useEffect(() => {
    if (requestedPackage && PACKAGE_CHOICES.includes(requestedPackage)) {
      setValues((v) => ({ ...v, pkg: requestedPackage }));
      setStatus((s) => (s === 'sent' ? 'idle' : s));
    }
  }, [requestedPackage, location.key]);

  const idOf = (field: Field) => `${uid}-${field}`;

  /** Props shared by every text-like control: value, change handler and a11y wiring. */
  const control = (field: Exclude<Field, 'rights'>, hasHint = false) => ({
    id: idOf(field),
    name: field,
    value: values[field],
    className: errors[field] ? 'is-invalid' : undefined,
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] || hasHint ? `${idOf(field)}-note` : undefined,
    onChange: (e: TextEvent) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [field]: value }));
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    },
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      (formRef.current?.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setStatus('sending');
    const result = await sendEnquiry({
      source: 'manuscript',
      name: values.name.trim(),
      email: values.email.trim(),
      interest: 'Publishing a manuscript',
      message: composeMessage(values),
      honeypot: readHoneypot(e.currentTarget),
    });
    if (result.status === 'sent') {
      setValues(EMPTY);
      setStatus('sent');
    } else {
      setMailto(result.mailto);
      setStatus('failed');
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const note = hasErrors ? 'Please check the highlighted fields.' : '';

  return (
    <section className="contact submission" id="submit">
      <div className="wrap">
        <div className="contact-grid">
          <div className="reveal">
            <div className="eyebrow">Submit your manuscript</div>
            <h2>
              Ready when <em>you are.</em>
            </h2>
            <p className="intro">
              Tell us about your book and share a link to the manuscript. We’ll take it from there.
            </p>
            <ol className="submission-steps">
              {NEXT_STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <b>{step.title}</b>
                    <span className="t">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="direct">
              Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
            <ContactLinks className="direct-links" />
          </div>

          <div className="reveal">
            {status === 'sent' ? (
              <SuccessPanel
                title="Thank you. It’s with us."
                actionLabel="Submit another manuscript"
                onReset={() => {
                  setStatus('idle');
                  requestAnimationFrame(() =>
                    (formRef.current?.elements.namedItem('name') as HTMLElement | null)?.focus(),
                  );
                }}
              >
                Every submission is read by a person. You’ll hear back within a week with an honest
                read, a rough timeline and a quote.
              </SuccessPanel>
            ) : (
              <form ref={formRef} onSubmit={onSubmit} noValidate>
                <div className="row">
                  <FieldShell id={idOf('name')} label="Your name" error={errors.name}>
                    <input {...control('name')} type="text" autoComplete="name" placeholder="Jane Doe" />
                  </FieldShell>
                  <FieldShell id={idOf('email')} label="Email" error={errors.email}>
                    <input
                      {...control('email')}
                      type="email"
                      autoComplete="email"
                      placeholder="jane@email.com"
                    />
                  </FieldShell>
                </div>

                <div className="row">
                  <FieldShell id={idOf('title')} label="Book title" error={errors.title}>
                    <input {...control('title')} type="text" placeholder="Working title is fine" />
                  </FieldShell>
                  <FieldShell id={idOf('genre')} label="Genre" error={errors.genre}>
                    <select {...control('genre')}>
                      <option value="">Choose a genre</option>
                      {GENRES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </FieldShell>
                </div>

                <div className="row">
                  <FieldShell
                    id={idOf('wordCount')}
                    label="Word count"
                    hint="A typical novel runs 70,000 to 100,000 words."
                    error={errors.wordCount}
                  >
                    <input
                      {...control('wordCount', true)}
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 85,000"
                    />
                  </FieldShell>
                  <FieldShell id={idOf('stage')} label="Where is it now?" error={errors.stage}>
                    <select {...control('stage')}>
                      <option value="">Choose one</option>
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </FieldShell>
                </div>

                <div className="row">
                  <FieldShell id={idOf('pkg')} label="Package you’re considering" error={errors.pkg}>
                    <select {...control('pkg')}>
                      {PACKAGE_CHOICES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </FieldShell>
                  <FieldShell
                    id={idOf('link')}
                    label="Link to your manuscript"
                    hint="Google Drive, Dropbox or similar, shared as ‘anyone with the link can view’."
                    error={errors.link}
                  >
                    <input
                      {...control('link', true)}
                      type="url"
                      maxLength={500}
                      placeholder="https://drive.google.com/…"
                    />
                  </FieldShell>
                </div>

                <FieldShell id={idOf('notes')} label="Tell us about the book" error={errors.notes}>
                  <textarea
                    {...control('notes')}
                    maxLength={1500}
                    placeholder="What’s it about, who’s it for, and what do you hope to achieve?"
                  />
                </FieldShell>

                <div>
                  <div className="consent">
                    <input
                      id={idOf('rights')}
                      name="rights"
                      type="checkbox"
                      checked={values.rights}
                      aria-invalid={errors.rights ? true : undefined}
                      aria-describedby={errors.rights ? `${idOf('rights')}-note` : undefined}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setValues((v) => ({ ...v, rights: checked }));
                        setErrors((prev) => (prev.rights ? { ...prev, rights: undefined } : prev));
                      }}
                    />
                    <label htmlFor={idOf('rights')}>
                      This is my own work, and I hold the rights to publish it.
                    </label>
                  </div>
                  {errors.rights && (
                    <p className="field-error" id={`${idOf('rights')}-note`}>
                      {errors.rights}
                    </p>
                  )}
                </div>

                <Honeypot />
                <button className="submit" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Submit manuscript'}
                </button>
                <p className="formnote" role="status">
                  {note}
                </p>
                {status === 'failed' && <SendFailed mailto={mailto} />}
                <PrivacyNote />
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
