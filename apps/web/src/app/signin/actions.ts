'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { clearSession, saveSession } from '@/lib/dash';
import { safeNext } from '@/lib/session-shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export interface SignInState {
  step: 'email' | 'code';
  email?: string;
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
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  try {
    const r = await post('/auth/otp/email', { email });
    return { step: 'code', email, challengeId: r.challengeId };
  } catch (e) {
    return { step: 'email', email, error: e instanceof ApiError ? e.message : 'Could not send the code.' };
  }
}

export async function verifyCode(prev: SignInState, form: FormData): Promise<SignInState> {
  const name = String(form.get('name') ?? '').trim();
  try {
    const t = await post('/auth/otp/verify', {
      challengeId: String(form.get('challengeId') ?? ''),
      code: String(form.get('code') ?? '').trim(),
      role: 'SUPPLIER',
      deviceName: 'Supplier dashboard (web)',
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
