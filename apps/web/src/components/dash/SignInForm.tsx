'use client';

import { useActionState, useState } from 'react';
import { requestCode, verifyCode, type SignInState } from '@/app/signin/actions';

export function SignInForm({ next, role, whatsapp = false }: { next: string; role: 'BUYER' | 'SUPPLIER'; whatsapp?: boolean }) {
  const [asked, ask, asking] = useActionState<SignInState, FormData>(requestCode, { step: 'email' });
  const [verified, verify, verifying] = useActionState<SignInState, FormData>(verifyCode, { step: 'code' });
  const [choice, setChoice] = useState<'email' | 'phone'>('email');
  // After a code is requested, show its form; errors from checking the code come from the second action.
  const state = asked.step === 'code' ? { ...asked, error: verified.error } : asked;
  const method = whatsapp ? choice : 'email';

  if (state.step === 'email') {
    // Show an error only under the method it belongs to.
    const err = state.error && (state.method ?? 'email') === method ? state.error : null;
    return (
      <form action={ask} className="dform">
        {whatsapp && (
          <div role="group" aria-label="How should we send your code?" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn ${method === 'email' ? 'btn-orange' : ''}`} aria-pressed={method === 'email'} onClick={() => setChoice('email')}>Email</button>
            <button type="button" className={`btn ${method === 'phone' ? 'btn-orange' : ''}`} aria-pressed={method === 'phone'} onClick={() => setChoice('phone')}>WhatsApp</button>
          </div>
        )}
        <input type="hidden" name="method" value={method} />
        {method === 'phone' ? (
          <div className="f">
            <label htmlFor="phone">WhatsApp number</label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="98220 12345 or +971 50 123 4567" defaultValue={state.phone} />
          </div>
        ) : (
          <div className="f">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={state.email} />
          </div>
        )}
        {err && <p className="notice err" role="alert">{err}</p>}
        <button className="btn btn-orange btn-lg" disabled={asking}>
          {asking ? 'Sending…' : method === 'phone' ? 'Send code on WhatsApp' : 'Email me a sign-in code'}
        </button>
      </form>
    );
  }

  return (
    <form action={verify} className="dform">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="challengeId" value={state.challengeId} />
      <p>
        We sent a 6-digit code {state.method === 'phone' ? 'on WhatsApp ' : ''}to <b>{state.sentTo}</b>. It is valid for a few minutes.
      </p>
      <div className="f">
        <label htmlFor="code">6-digit code</label>
        <input id="code" name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" autoFocus />
      </div>
      <div className="f">
        <label htmlFor="name">Your name <small>(only needed the first time)</small></label>
        <input id="name" name="name" autoComplete="name" />
      </div>
      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      <button className="btn btn-orange btn-lg" disabled={verifying}>{verifying ? 'Checking…' : 'Sign in'}</button>
    </form>
  );
}
