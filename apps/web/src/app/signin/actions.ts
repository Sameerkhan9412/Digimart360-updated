'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { clearSession, saveSession } from '@/lib/dash';
import { toE164 } from '@/lib/phone';
import { safeNext } from '@/lib/session-shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export interface SignInState {
  step: 'email' | 'code';
  method?: 'email' | 'phone';
  email?: string;
  /** What the person typed for the phone. */
  phone?: string;
  /** Where the code went: the email address or the E.164 number. */
  sentTo?: string;
  challengeId?: string;
  error?: string;
}

async function post(path: string, body: object) {
  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const b = await res.json();
      message = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? message);
    } catch {}
    throw new ApiError(res.status, message);
  }
  return res.json();
}

export async function requestCode(_: SignInState, form: FormData): Promise<SignInState> {
  if (form.get('method') === 'phone') {
    const typed = String(form.get('phone') ?? '').trim();
    const phone = toE164(typed);
    if (!phone) {
      return { step: 'email', method: 'phone', phone: typed, error: 'Enter a 10-digit mobile number, or include your country code, e.g. +971 50 123 4567.' };
    }
    try {
      const r = await post('/auth/otp/phone', { phone });
      return { step: 'code', method: 'phone', phone: typed, sentTo: phone, challengeId: r.challengeId };
    } catch (e) {
      return { step: 'email', method: 'phone', phone: typed, error: e instanceof ApiError ? e.message : 'Could not send the code.' };
    }
  }
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  try {
    const r = await post('/auth/otp/email', { email });
    return { step: 'code', method: 'email', email, sentTo: email, challengeId: r.challengeId };
  } catch (e) {
    return { step: 'email', method: 'email', email, error: e instanceof ApiError ? e.message : 'Could not send the code.' };
  }
}

export async function verifyCode(prev: SignInState, form: FormData): Promise<SignInState> {
  const name = String(form.get('name') ?? '').trim();
  try {
    const t = await post('/auth/otp/verify', {
      challengeId: String(form.get('challengeId') ?? ''),
      code: String(form.get('code') ?? '').trim(),
      // Only used when this sign-in creates the account. Buyers arrive from the requirement form.
      role: form.get('role') === 'BUYER' ? 'BUYER' : 'SUPPLIER',
      deviceName: 'Website',
      ...(name && { name }),
    });
    await saveSession(t);
  } catch (e) {
    return { ...prev, step: 'code', error: e instanceof ApiError ? e.message : 'Could not verify the code.' };
  }
  redirect(safeNext(form.get('next')));
}

export async function signOut() {
  await clearSession();
  redirect('/');
}
