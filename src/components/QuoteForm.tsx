import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { readHoneypot, sendEnquiry } from '@/lib/sendEnquiry';
import { FieldShell, Honeypot, SendFailed, SuccessPanel } from '@/components/FormParts';
import { NOT_SURE, PUBLISHING_SERVICES } from '@/lib/packages';

const ROLES = [
  { value: 'Author', label: 'An author' },
  { value: 'Publisher', label: 'A publisher' },
  { value: 'Educator', label: 'An educator' },
];

const SERVICES = ['Complete publishing package', ...PUBLISHING_SERVICES, NOT_SURE];

interface Values {
  name: string;
  contact: string;
  role: string;
  service: string;
}
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { name: '', contact: '', role: '', service: '' };
const FIELD_ORDER: Field[] = ['name', 'contact', 'role', 'service'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]+$/;
const isPhone = (s: string) => {
  const digits = s.replace(/\D/g, '').length;
  return PHONE.test(s) && digits >= 7 && digits <= 15;
};

function validate(v: Values): Errors {
  const e: Errors = {};
  const contact = v.contact.trim();
  if (!v.name.trim()) e.name = 'Please tell us your name.';
  if (!contact) e.contact = 'Add an email or WhatsApp number so we can reply.';
  else if (contact.includes('@') ? !EMAIL.test(contact) : !isPhone(contact)) {
    e.contact = 'Enter an email address, or a WhatsApp number with its country code.';
  }
  if (!v.role) e.role = 'Choose the one that fits best.';
  if (!v.service) e.service = 'Choose a service, or “Not sure yet”.';
  return e;
}

interface QuoteFormProps {
  /** where the form sits, recorded with the lead, e.g. 'home', 'packages', 'footer' */
  placement: string;
  title: ReactNode;
  intro?: ReactNode;
  /** 'band' lays the fields out in a row on wide screens; 'stacked' keeps one column */
  layout?: 'band' | 'stacked';
  headingLevel?: 'h2' | 'h3';
}

/**
 * Short lead form: name, email or WhatsApp, role and service. Used under the
 * hero, in the packages section and in the footer, on the site's dark
 * background (the .quote styles override the light .contact form styles).
 */
export function QuoteForm({ placement, title, intro, layout = 'band', headingLevel = 'h2' }: QuoteFormProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [mailto, setMailto] = useState('');
  const [sentName, setSentName] = useState('');

  const idOf = (field: Field) => `${uid}-${field}`;
  const control = (field: Field, hasHint = false) => ({
    id: idOf(field),
    name: field,
    value: values[field],
    className: errors[field] ? 'is-invalid' : undefined,
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] || hasHint ? `${idOf(field)}-note` : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const contact = values.contact.trim();
    const byEmail = contact.includes('@');
    setStatus('sending');
    const result = await sendEnquiry({
      source: 'quote',
      name: values.name.trim(),
      email: byEmail ? contact : undefined,
      phone: byEmail ? undefined : contact,
      role: values.role,
      interest: values.service,
      message: [
        'Free quote request',
        '',
        'I am: ' + values.role,
        'Service: ' + values.service,
        'Reply on: ' + (byEmail ? 'email' : 'WhatsApp / phone') + ' (' + contact + ')',
        'Sent from: ' + placement,
      ].join('\n'),
      honeypot: readHoneypot(e.currentTarget),
    });

    if (result.status === 'sent') {
      setSentName(values.name.trim().split(/\s+/)[0]);
      setValues(EMPTY);
      setStatus('sent');
    } else {
      setMailto(result.mailto);
      setStatus('failed');
    }
  };

  const Heading = headingLevel;
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className={'quote quote--' + layout}>
      <div className="quote-head">
        <div className="eyebrow">Free quote</div>
        <Heading className="quote-title serif">{title}</Heading>
        {intro && <p className="quote-intro">{intro}</p>}
      </div>

      {status === 'sent' ? (
        <SuccessPanel
          title={sentName ? `Thank you, ${sentName}.` : 'Thank you.'}
          actionLabel="Ask about something else"
          onReset={() => {
            setStatus('idle');
            requestAnimationFrame(() =>
              (formRef.current?.elements.namedItem('name') as HTMLElement | null)?.focus(),
            );
          }}
        >
          A real person will read your request and reply with a free, no-obligation quote.
        </SuccessPanel>
      ) : (
        <form ref={formRef} className="quote-form" onSubmit={onSubmit} noValidate>
          <div className="quote-fields">
            <FieldShell id={idOf('name')} label="Your name" error={errors.name}>
              <input {...control('name')} type="text" autoComplete="name" placeholder="Jane Doe" />
            </FieldShell>
            <FieldShell id={idOf('contact')} label="Email or WhatsApp" error={errors.contact}>
              <input
                {...control('contact')}
                type="text"
                autoComplete="email"
                placeholder="jane@email.com or +91…"
              />
            </FieldShell>
            <FieldShell id={idOf('role')} label="I am" error={errors.role}>
              <select {...control('role')}>
                <option value="">Choose one</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell id={idOf('service')} label="Service" error={errors.service}>
              <select {...control('service')}>
                <option value="">Choose a service</option>
                {SERVICES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FieldShell>
            <button
              className="pill quote-submit"
              type="submit"
              disabled={status === 'sending'}
              data-cta={'Quote form: ' + placement}
            >
              {status === 'sending' ? 'Sending…' : 'Get my free quote'}
            </button>
          </div>
          <Honeypot />
          <p className="formnote" role="status">
            {hasErrors ? 'Please check the highlighted fields.' : ''}
          </p>
          {status === 'failed' && <SendFailed mailto={mailto} />}
        </form>
      )}
    </div>
  );
}
