import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HONEYPOT } from '@/lib/sendEnquiry';
import { hasWhatsApp, whatsappHref } from '@/config/site';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** A label, its control, and either the validation error or the hint under it. */
export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-note`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="field-hint" id={`${id}-note`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * A spam trap: an input moved off screen and hidden from assistive tech, so
 * people never fill it in but form-filling bots usually do. Read it on submit
 * with readHoneypot() and pass it to sendEnquiry, which then sends nothing.
 */
export function Honeypot() {
  const id = useId();
  return (
    <div className="hp-field" aria-hidden="true">
      <label htmlFor={id}>Leave this field empty</label>
      <input id={id} name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

/**
 * Shown in place of the form once it has sent. Moves focus to its heading so
 * keyboard and screen reader users land on the confirmation.
 */
export function SuccessPanel({
  title,
  children,
  actionLabel,
  onReset,
}: {
  title: string;
  children: ReactNode;
  actionLabel: string;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="submission-done" role="status">
      <div className="submission-done-mark" aria-hidden="true"></div>
      <h3 className="serif" tabIndex={-1} ref={headingRef}>
        {title}
      </h3>
      <p>{children}</p>
      <button type="button" className="submit" onClick={onReset}>
        {actionLabel}
      </button>
    </div>
  );
}

/** The line under every form's button, pointing to what happens to the details sent. */
export function PrivacyNote() {
  return (
    <p className="form-privacy">
      By sending this, you agree to our <Link to="/privacy">privacy policy</Link>.
    </p>
  );
}

/** The last resort when no endpoint accepted the form: hand the visitor a pre-filled email. */
export function SendFailed({ mailto }: { mailto: string }) {
  return (
    <div className="send-failed" role="alert">
      <p>
        <b>We couldn’t send this from the website.</b> Your details are still in the form, so
        nothing is lost.
      </p>
      <p>
        <a href={mailto} data-cta="Email fallback">
          Send it by email instead
        </a>{' '}
        (your email app opens with everything filled in)
        {hasWhatsApp && (
          <>
            , or{' '}
            <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" data-cta="WhatsApp fallback">
              message us on WhatsApp
            </a>
          </>
        )}
        .
      </p>
    </div>
  );
}
