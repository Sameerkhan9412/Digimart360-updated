'use client';

import { useActionState } from 'react';
import { confirmPhone, saveProfile, sendPhoneCode, type ProfileState, type VerifyState } from '@/app/account/profile/actions';
import type { Me } from '@/lib/types';

export function ProfileForm({ me, whatsapp }: { me: Me; whatsapp: boolean }) {
  const [saved, save, saving] = useActionState<ProfileState, FormData>(saveProfile, {});

  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <form action={save} className="dform">
        <div className="f">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" defaultValue={me.name} minLength={2} maxLength={100} autoComplete="name" />
        </div>
        <div className="f">
          <label htmlFor="email">Email</label>
          <input id="email" value={me.email ?? 'Not added'} readOnly disabled />
        </div>
        <div className="f">
          <label htmlFor="phone">WhatsApp / mobile number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={me.phone ?? ''} placeholder="98220 12345 or +971 50 123 4567" />
          <small>Leave blank to remove it. Changing the number means you verify it again.</small>
        </div>
        {saved.error && <p className="notice err" role="alert">{saved.error}</p>}
        {saved.saved && <p className="notice ok" role="status">Saved.</p>}
        <button className="btn btn-orange" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>

      {/* Keyed by the number so a new number starts from a clean state. */}
      {me.phone && <VerifyNumber key={me.phone} phone={me.phone} verified={me.phoneVerified} whatsapp={whatsapp} />}
    </div>
  );
}

function VerifyNumber({ phone, verified, whatsapp }: { phone: string; verified: boolean; whatsapp: boolean }) {
  const [asked, ask, asking] = useActionState<VerifyState, FormData>(sendPhoneCode, { step: 'idle' });
  const [confirmed, confirm, confirming] = useActionState<VerifyState, FormData>(confirmPhone, { step: 'idle' });
  const error = confirmed.error ?? asked.error;

  return (
    <section aria-labelledby="verify-h" style={{ marginTop: 24 }}>
      <h2 id="verify-h" style={{ fontSize: 17, color: 'var(--navy)' }}>Verify your number</h2>
      {verified ? (
        <p className="notice ok">{phone} is verified. You can sign in with it using a WhatsApp code.</p>
      ) : !whatsapp ? (
        <p className="muted">{phone} is not verified yet. Verification by WhatsApp is not available right now.</p>
      ) : asked.step !== 'code' ? (
        <form action={ask} className="dform">
          <p>{phone} is not verified yet. We will WhatsApp a 6-digit code to this number.</p>
          {error && <p className="notice err" role="alert">{error}</p>}
          <button className="btn" disabled={asking}>{asking ? 'Sending…' : 'Send code on WhatsApp'}</button>
        </form>
      ) : (
        <form action={confirm} className="dform">
          <input type="hidden" name="challengeId" value={asked.challengeId} />
          <p>We sent a 6-digit code on WhatsApp to <b>{phone}</b>. It is valid for a few minutes.</p>
          <div className="f">
            <label htmlFor="vcode">6-digit code</label>
            <input id="vcode" name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" autoFocus />
          </div>
          {error && <p className="notice err" role="alert">{error}</p>}
          <button className="btn btn-orange" disabled={confirming}>{confirming ? 'Checking…' : 'Verify number'}</button>
        </form>
      )}
    </section>
  );
}
