'use client';

import { useActionState } from 'react';
import { postRfq, type RfqState } from '@/app/account/actions';
import type { CategoryNode } from '@/lib/types';

export function RfqForm({
  categories,
  defaults,
  supplier,
}: {
  categories: CategoryNode[];
  defaults: { title?: string; categoryId?: string; productId?: string; companyId?: string };
  supplier?: string;
}) {
  const [state, action, pending] = useActionState<RfqState, FormData>(postRfq, {});
  // React clears the form after every submit; on an error put back what the buyer typed.
  const v = (k: string, fallback?: string) => state.values?.[k] ?? fallback;
  return (
    <form action={action} className="dform panel">
      {defaults.productId && <input type="hidden" name="productId" value={defaults.productId} />}
      {defaults.companyId && <input type="hidden" name="companyId" value={defaults.companyId} />}
      {supplier && <p className="notice" role="note">{supplier} will be asked first. We also invite other matching verified suppliers so you can compare.</p>}

      <div className="f"><label htmlFor="title">What do you need? *</label><input id="title" name="title" required minLength={4} maxLength={120} defaultValue={v('title', defaults.title)} placeholder="e.g. SS304 flanged ball valves, DN50" /></div>

      <div className="f">
        <label htmlFor="categoryId">Category *</label>
        <select id="categoryId" name="categoryId" required defaultValue={v('categoryId', defaults.categoryId) ?? ''}>
          <option value="" disabled>Choose the closest category</option>
          {categories.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {g.children.length > 0 && <option value={g.id}>{g.name}: any</option>}
              {(g.children.length ? g.children : [g]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="row3">
        <div className="f"><label htmlFor="quantity">Quantity *</label><input id="quantity" name="quantity" required inputMode="numeric" defaultValue={v('quantity')} /></div>
        <div className="f"><label htmlFor="unit">Unit</label><input id="unit" name="unit" defaultValue={v('unit', 'Piece')} maxLength={20} /></div>
        <div className="f"><label htmlFor="budget">Total budget (₹) <small>optional</small></label><input id="budget" name="budget" inputMode="decimal" defaultValue={v('budget')} /></div>
      </div>

      <div className="row2">
        <div className="f"><label htmlFor="city">Delivery city *</label><input id="city" name="city" required autoComplete="address-level2" defaultValue={v('city')} /></div>
        <div className="f"><label htmlFor="state">State *</label><input id="state" name="state" required autoComplete="address-level1" defaultValue={v('state')} /></div>
      </div>

      <div className="f"><label htmlFor="description">Details <small>size, material, grade, certificates</small></label><textarea id="description" name="description" rows={5} maxLength={4000} defaultValue={v('description')} /></div>

      <div className="f">
        <label htmlFor="closesInDays">Collect quotes for</label>
        <select id="closesInDays" name="closesInDays" defaultValue={v('closesInDays', '7')}>
          <option value="3">3 days</option>
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
        </select>
      </div>

      <p className="hint">Suppliers see your city, quantity and budget, but not your name or contact details. You share those only with the supplier you choose.</p>
      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      <div><button className="btn btn-orange btn-lg" disabled={pending}>{pending ? 'Posting…' : 'Post requirement'}</button></div>
    </form>
  );
}
