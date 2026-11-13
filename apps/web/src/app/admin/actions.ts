'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authedJson, messageOf } from '@/lib/dash';

type Patch = { status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING'; gstVerified?: boolean; trustSeal?: boolean };

/** Run an admin call; on failure come back to the queue with the reason in the URL. */
async function run(back: string, fn: () => Promise<unknown>) {
  let failure: string | null = null;
  try {
    await fn();
  } catch (e) {
    failure = messageOf(e);
  }
  revalidatePath('/admin');
  redirect(failure ? `${back}&error=${encodeURIComponent(failure)}` : back);
}

export async function moderateCompany(id: string, patch: Patch, back: string) {
  await run(back, () => authedJson(`/admin/catalog/companies/${id}`, { method: 'PATCH', json: patch }));
}

export async function approveProduct(id: string, back: string) {
  await run(back, () => authedJson(`/admin/catalog/products/${id}/approve`, { method: 'POST', json: {} }));
}

export async function rejectProduct(id: string, back: string, f: FormData) {
  const reason = String(f.get('reason') ?? '').trim();
  await run(back, () => authedJson(`/admin/catalog/products/${id}/reject`, { method: 'POST', json: { reason } }));
}
