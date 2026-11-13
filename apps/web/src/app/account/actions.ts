'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authedJson, messageOf } from '@/lib/dash';
import type { BuyerRfq } from '@/lib/types';
import type { FormState } from '../dashboard/actions';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const opt = (f: FormData, k: string) => text(f, k) || undefined;
const num = (f: FormData, k: string) => (text(f, k) ? Number(text(f, k).replace(/,/g, '')) : undefined);

/** Form state that also carries what was typed, so an error does not wipe the form. */
export type RfqState = FormState & { values?: Record<string, string> };

export async function postRfq(_: RfqState, f: FormData): Promise<RfqState> {
  let rfq: BuyerRfq;
  try {
    rfq = await authedJson<BuyerRfq>('/rfqs', {
      method: 'POST',
      json: {
        title: text(f, 'title'),
        categoryId: text(f, 'categoryId'),
        quantity: num(f, 'quantity'),
        unit: opt(f, 'unit'),
        city: text(f, 'city'),
        state: text(f, 'state'),
        budget: num(f, 'budget'),
        description: opt(f, 'description'),
        closesInDays: num(f, 'closesInDays'),
        productId: opt(f, 'productId'),
        companyId: opt(f, 'companyId'),
      },
    });
  } catch (e) {
    const values: Record<string, string> = {};
    for (const k of ['title', 'categoryId', 'quantity', 'unit', 'budget', 'city', 'state', 'description', 'closesInDays']) values[k] = text(f, k);
    return { error: messageOf(e), values };
  }
  revalidatePath('/account', 'layout');
  redirect(`/account/rfqs/${rfq.id}?posted=1`);
}

export async function awardQuote(rfqId: string, quoteId: string) {
  await authedJson(`/me/rfqs/${rfqId}/award`, { method: 'POST', json: { quoteId } });
  revalidatePath('/account', 'layout');
}

export async function closeRfq(rfqId: string) {
  await authedJson(`/me/rfqs/${rfqId}/close`, { method: 'POST', json: {} });
  revalidatePath('/account', 'layout');
}
