'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authedJson, messageOf } from '@/lib/dash';
import type { OwnCompany, OwnProduct } from '@/lib/types';

export interface FormState {
  error?: string;
  saved?: boolean;
}

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
/** Only send what was filled in: the API treats a missing field as "unchanged". */
const opt = (f: FormData, k: string) => text(f, k) || undefined;
const num = (f: FormData, k: string) => (text(f, k) ? Number(text(f, k).replace(/,/g, '')) : undefined);

export async function saveCompany(_: FormState, f: FormData): Promise<FormState> {
  const exists = text(f, 'exists') === '1';
  const gstin = opt(f, 'gstin')?.toUpperCase();
  const body = {
    name: text(f, 'name'),
    legalName: opt(f, 'legalName'),
    // Leaving the GSTIN as it was keeps its verified badge.
    gstin: gstin && gstin !== text(f, 'gstinWas') ? gstin : exists ? undefined : gstin,
    businessTypes: f.getAll('businessTypes').map(String),
    yearEstablished: num(f, 'yearEstablished'),
    description: opt(f, 'description'),
    phone: opt(f, 'phone'),
    email: opt(f, 'email'),
    website: opt(f, 'website'),
    addressLine: opt(f, 'addressLine'),
    city: text(f, 'city'),
    state: text(f, 'state'),
    pincode: opt(f, 'pincode'),
    exportsTo: text(f, 'exportsTo')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  try {
    await authedJson<OwnCompany>('/me/company', { method: exists ? 'PATCH' : 'POST', json: body });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard', 'layout');
  if (!exists) redirect('/dashboard');
  return { saved: true };
}

/** "Label: value" per line. */
function parseSpecs(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i < 1 ? { label: l, value: '' } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });
}

export async function saveProduct(_: FormState, f: FormData): Promise<FormState> {
  const id = text(f, 'id');
  const specs = parseSpecs(text(f, 'specs'));
  if (specs.some((s) => !s.value)) return { error: 'Write each specification as "Label: value", one per line.' };

  const body = {
    name: text(f, 'name'),
    categoryId: text(f, 'categoryId'),
    summary: id ? text(f, 'summary') : opt(f, 'summary'),
    description: id ? text(f, 'description') : opt(f, 'description'),
    priceMin: num(f, 'priceMin'),
    priceMax: num(f, 'priceMax') ?? num(f, 'priceMin'),
    priceUnit: opt(f, 'priceUnit'),
    moq: num(f, 'moq'),
    specs,
    images: f.getAll('images').map(String),
    // "Save draft" sends submit=0; "Publish" sends submit=1.
    submit: text(f, 'intent') !== 'draft',
  };
  let saved: OwnProduct;
  try {
    saved = await authedJson<OwnProduct>(id ? `/me/products/${id}` : '/me/products', { method: id ? 'PATCH' : 'POST', json: body });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard?saved=${saved.status}`);
}

export async function archiveProduct(id: string) {
  await authedJson(`/me/products/${id}`, { method: 'DELETE' });
  revalidatePath('/dashboard', 'layout');
}

export async function restoreProduct(id: string) {
  await authedJson(`/me/products/${id}/restore`, { method: 'POST', json: {} });
  revalidatePath('/dashboard', 'layout');
}
