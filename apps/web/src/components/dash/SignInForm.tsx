'use client';

import { useActionState } from 'react';
import { requestCode, verifyCode, type SignInState } from '@/app/signin/actions';

export function SignInForm({ next }: { next: string }) {
  const [asked, ask, asking] = useActionState<SignInState, FormData>(requestCode, { step: 'email' });
  const [verified, verify, verifying] = useActionState<SignInState, FormData>(verifyCode, { step: 'code' });
  // After a code is requested, show its form; errors from checking the code come from the second action.
  const state = asked.step === 'code' ? { ...asked, error: verified.error } : asked;

  if (state.step === 'email') {
    return (
      <form action={ask} className="dform">
        <div className="f">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={state.email} />
        </div>
        {state.error && <p className="notice err" role="alert">{state.error}</p>}
        <button className="btn btn-orange btn-lg" disabled={asking}>{asking ? 'Sending…' : 'Email me a sign-in code'}</button>
      </form>
    );
  }

  return (
    <form action={verify} className="dform">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="challengeId" value={state.challengeId} />
      <p>We sent a 6-digit code to <b>{state.email}</b>. It is valid for a few minutes.</p>
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
