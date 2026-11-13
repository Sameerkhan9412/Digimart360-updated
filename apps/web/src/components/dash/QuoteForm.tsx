'use client';

import { useActionState } from 'react';
import { saveQuote, withdrawQuote, type FormState } from '@/app/dashboard/actions';
import type { QuoteView } from '@/lib/types';

export function QuoteForm({ rfqId, unit, quote }: { rfqId: string; unit: string; quote: QuoteView | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuote, {});
  const live = quote && quote.status === 'SUBMITTED';
  const q = quote && quote.status !== 'WITHDRAWN' ? quote : null;
  return (
    <>
      <form action={action} className="dform panel">
        <input type="hidden" name="rfqId" value={rfqId} />
        <div className="row2">
          <div className="f"><label htmlFor="unitPrice">Price per {unit} (₹) *</label><input id="unitPrice" name="unitPrice" required inputMode="decimal" defaultValue={q?.unitPrice} /></div>
          <div className="f"><label htmlFor="deliveryDays">Delivery in (days) *</label><input id="deliveryDays" name="deliveryDays" required inputMode="numeric" defaultValue={q?.deliveryDays} /></div>
        </div>
        <div className="row2">
          <div className="f"><label htmlFor="material">Material / grade</label><input id="material" name="material" maxLength={120} defaultValue={q?.material ?? ''} /></div>
          <div className="f"><label htmlFor="warranty">Warranty</label><input id="warranty" name="warranty" maxLength={120} defaultValue={q?.warranty ?? ''} /></div>
        </div>
        <div className="row2">
          <div className="f"><label htmlFor="paymentTerms">Payment terms</label><input id="paymentTerms" name="paymentTerms" maxLength={200} defaultValue={q?.paymentTerms ?? ''} placeholder="30% advance, 70% on dispatch" /></div>
          <div className="f"><label htmlFor="certificates">Certificates</label><input id="certificates" name="certificates" maxLength={200} defaultValue={q?.certificates ?? ''} placeholder="EN 10204 3.1" /></div>
        </div>
        <div className="row2">
          <div className="f"><label htmlFor="validForDays">Price valid for (days)</label><input id="validForDays" name="validForDays" inputMode="numeric" defaultValue={14} /></div>
        </div>
        <div className="f"><label htmlFor="note">Note to the buyer</label><textarea id="note" name="note" rows={4} maxLength={2000} defaultValue={q?.note ?? ''} /></div>
        {state.error && <p className="notice err" role="alert">{state.error}</p>}
        {state.saved && <p className="notice ok" role="status">Quote sent. The buyer can see it now.</p>}
        <div><button className="btn btn-orange btn-lg" disabled={pending}>{pending ? 'Sending…' : live ? 'Update quote' : 'Send quote'}</button></div>
      </form>
      {live && (
        <form action={withdrawQuote.bind(null, rfqId)}><button className="btn btn-line">Withdraw my quote</button></form>
      )}
    </>
  );
}
