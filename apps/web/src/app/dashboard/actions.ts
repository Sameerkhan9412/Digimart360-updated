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
/** Editing: a blank optional field means "remove it" (null). Creating: leave it out. */
const orClear = <T,>(editing: boolean, v: T | undefined): T | null | undefined => (v === undefined && editing ? null : v);

export async function saveCompany(_: FormState, f: FormData): Promise<FormState> {
  const exists = text(f, 'exists') === '1';
  const gstin = opt(f, 'gstin')?.toUpperCase();
  const gstinWas = text(f, 'gstinWas');
  const clear = <T,>(v: T | undefined) => orClear(exists, v);
  const body = {
    name: text(f, 'name'),
    legalName: clear(opt(f, 'legalName')),
    // Leaving the GSTIN as it was keeps its verified badge; emptying it removes it.
    gstin: gstin ? (gstin !== gstinWas ? gstin : exists ? undefined : gstin) : exists && gstinWas ? null : undefined,
    businessTypes: f.getAll('businessTypes').map(String),
    yearEstablished: clear(num(f, 'yearEstablished')),
    description: clear(opt(f, 'description')),
    phone: clear(opt(f, 'phone')),
    email: clear(opt(f, 'email')),
    website: clear(opt(f, 'website')),
    addressLine: clear(opt(f, 'addressLine')),
    city: text(f, 'city'),
    state: text(f, 'state'),
    pincode: clear(opt(f, 'pincode')),
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

  const editing = Boolean(id);
  const clear = <T,>(v: T | undefined) => orClear(editing, v);
  const priceMin = num(f, 'priceMin');
  const body = {
    name: text(f, 'name'),
    categoryId: text(f, 'categoryId'),
    summary: clear(opt(f, 'summary')),
    description: clear(opt(f, 'description')),
    priceMin: clear(priceMin),
    priceMax: clear(num(f, 'priceMax') ?? priceMin),
    priceUnit: opt(f, 'priceUnit'),
    moq: clear(num(f, 'moq')),
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

export async function saveQuote(_: FormState, f: FormData): Promise<FormState> {
  const rfqId = text(f, 'rfqId');
  try {
    await authedJson(`/me/rfq-inbox/${rfqId}/quote`, {
      method: 'PUT',
      json: {
        unitPrice: num(f, 'unitPrice'),
        deliveryDays: num(f, 'deliveryDays'),
        material: opt(f, 'material'),
        warranty: opt(f, 'warranty'),
        paymentTerms: opt(f, 'paymentTerms'),
        certificates: opt(f, 'certificates'),
        note: opt(f, 'note'),
        validForDays: num(f, 'validForDays'),
      },
    });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard', 'layout');
  return { saved: true };
}

export async function withdrawQuote(rfqId: string) {
  await authedJson(`/me/rfq-inbox/${rfqId}/quote/withdraw`, { method: 'POST', json: {} });
  revalidatePath('/dashboard', 'layout');
}

export async function saveSite(_: FormState, f: FormData): Promise<FormState> {
  const on = (k: string) => f.get(k) === 'on';
  try {
    await authedJson('/me/storefront', {
      method: 'PATCH',
      json: {
        theme: text(f, 'theme'),
        // null = go back to the theme's own colour / remove the banner.
        accent: f.get('useThemeColour') === 'on' ? null : text(f, 'accent') || null,
        tagline: text(f, 'tagline') || null,
        bannerUrl: text(f, 'banner') || null,
        showAbout: on('showAbout'),
        showProducts: on('showProducts'),
        showCertificates: on('showCertificates'),
        showContact: on('showContact'),
        certificates: text(f, 'certificates')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
      },
    });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard', 'layout');
  return { saved: true };
}

export async function saveDomain(_: FormState, f: FormData): Promise<FormState> {
  try {
    await authedJson('/me/domain', { method: 'PUT', json: { host: text(f, 'host') } });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard/website');
  return { saved: true };
}

export async function checkDomain(): Promise<FormState> {
  try {
    await authedJson('/me/domain/check', { method: 'POST', json: {} });
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath('/dashboard/website');
  return { saved: true };
}

export async function removeDomain() {
  await authedJson('/me/domain', { method: 'DELETE' });
  revalidatePath('/dashboard/website');
}
