import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRevealAndCounters } from '@/lib/useRevealAndCounters';
import { readHoneypot, sendEnquiry } from '@/lib/sendEnquiry';
import { SITE } from '@/config/site';
import { ContactLinks } from '@/components/ContactLinks';
import { FieldShell, Honeypot, SendFailed, SuccessPanel } from '@/components/FormParts';

const TOPICS = [
  'Publishing a manuscript',
  'Brand & marketing work',
  'Both / not sure yet',
  'Something else',
];

interface Values {
  name: string;
  email: string;
  topic: string;
  msg: string;
}
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { name: '', email: '', topic: TOPICS[0], msg: '' };
const FIELD_ORDER: Field[] = ['name', 'email', 'topic', 'msg'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Please tell us your name.';
  if (!v.email.trim()) e.email = 'Add an email so we can reply.';
  else if (!EMAIL.test(v.email.trim())) e.email = 'That email doesn’t look right.';
  if (!v.msg.trim()) e.msg = 'Tell us a little about your project.';
  return e;
}

/**
 * The general contact form. It sends through lib/sendEnquiry.ts like the other
 * forms. `.reveal` stays on the two static column wrappers, because the
 * success panel mounts later and the reveal observer would never see it.
 */
export function ContactPage() {
  useRevealAndCounters();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [mailto, setMailto] = useState('');

  const idOf = (field: Field) => `${uid}-${field}`;
  const control = (field: Field) => ({
    id: idOf(field),
    name: field,
    value: values[field],
    className: errors[field] ? 'is-invalid' : undefined,
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] ? `${idOf(field)}-note` : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      source: 'contact',
      name: values.name.trim(),
      email: values.email.trim(),
      interest: values.topic,
      message: values.msg.trim(),
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

  return (
    <section className="contact page-head" id="contact">
      <div className="wrap">
        <div className="contact-grid">
          <div className="reveal">
            <h1 className="eyebrow">Contact us about self-publishing</h1>
            <h2>
              Start a <em>conversation.</em>
            </h2>
            <p className="intro">
              Whether it’s a manuscript, a brand, or a half-formed idea — tell us what you’re working
              on. A real person reads every message.
            </p>
            <p className="direct">
              Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
            <ContactLinks className="direct-links" />
          </div>

          <div className="reveal">
            {status === 'sent' ? (
              <SuccessPanel
                title="Thank you. Your message is with us."
                actionLabel="Send another message"
                onReset={() => {
                  setStatus('idle');
                  requestAnimationFrame(() =>
                    (formRef.current?.elements.namedItem('name') as HTMLElement | null)?.focus(),
                  );
                }}
              >
                A real person will read your note and reply to the email address you gave us.
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
                <FieldShell id={idOf('topic')} label="I’m reaching out about" error={errors.topic}>
                  <select {...control('topic')}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </FieldShell>
                <FieldShell id={idOf('msg')} label="Your message" error={errors.msg}>
                  <textarea
                    {...control('msg')}
                    maxLength={3000}
                    placeholder="Tell us a little about your project…"
                  />
                </FieldShell>
                <Honeypot />
                <button className="submit" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
                <p className="formnote" role="status">
                  {hasErrors ? 'Please check the highlighted fields.' : ''}
                </p>
                {status === 'failed' && <SendFailed mailto={mailto} />}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
