'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authedJson, messageOf } from '@/lib/dash';
import type { BuyerRfq } from '@/lib/types';
import type { FormState } from '../dashboard/actions';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const opt = (f: FormData, k: string) => text(f, k) || undefined;
const num = (f: FormData, k: string) => (text(f, k) ? Number(text(f, k).replace(/,/g, '')) : undefined);

export async function postRfq(_: FormState, f: FormData): Promise<FormState> {
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
    return { error: messageOf(e) };
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
