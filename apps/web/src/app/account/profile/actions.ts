'use server';

import { revalidatePath } from 'next/cache';
import { authedJson, messageOf } from '@/lib/dash';
import { toE164 } from '@/lib/phone';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export interface ProfileState {
  error?: string;
  saved?: boolean;
}

export async function saveProfile(_: ProfileState, f: FormData): Promise<ProfileState> {
  const typed = text(f, 'phone');
  const phone = typed ? toE164(typed) : null;
  if (typed && !phone) {
    return { error: 'Enter a 10-digit mobile number, or include your country code, e.g. +971 50 123 4567.' };
  }
  try {
    // A blank phone clears it (null); a missing field would mean "unchanged".
    await authedJson('/users/me', { method: 'PATCH', json: { ...(text(f, 'name') && { name: text(f, 'name') }), phone } });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/account', 'layout');
  return { saved: true };
}

export interface VerifyState {
  /** idle: show the "send code" button; code: waiting for the 6 digits. */
  step: 'idle' | 'code';
  challengeId?: string;
  error?: string;
}

export async function sendPhoneCode(): Promise<VerifyState> {
  try {
    const r = await authedJson<{ challengeId: string }>('/auth/phone/verify/request', { method: 'POST', json: {} });
    return { step: 'code', challengeId: r.challengeId };
  } catch (e) {
    return { step: 'idle', error: messageOf(e) };
  }
}

export async function confirmPhone(prev: VerifyState, f: FormData): Promise<VerifyState> {
  try {
    await authedJson('/auth/phone/verify', {
      method: 'POST',
      json: { challengeId: String(f.get('challengeId') ?? ''), code: text(f, 'code') },
    });
  } catch (e) {
    return { ...prev, step: 'code', error: messageOf(e) };
  }
  revalidatePath('/account', 'layout');
  return { step: 'idle' };
}
