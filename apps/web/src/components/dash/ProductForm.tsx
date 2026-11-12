'use client';

import { useActionState } from 'react';
import { saveProduct, type FormState } from '@/app/dashboard/actions';
import type { CategoryNode, OwnProduct } from '@/lib/types';
import { ImageUploader } from './ImageUploader';

export function ProductForm({ product, categories, trusted }: { product?: OwnProduct; categories: CategoryNode[]; trusted: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, {});
  const p = product;
  const editingLive = p && (p.status === 'ACTIVE' || p.status === 'PENDING_REVIEW');
  const specs = p?.specs.map((s) => `${s.label}: ${s.value}`).join('\n') ?? '';

  return (
    <form action={action} className="dform panel">
      {p && <input type="hidden" name="id" value={p.id} />}
      {p?.status === 'REJECTED' && p.rejectionReason && (
        <p className="notice err" role="note"><b>Rejected:</b> {p.rejectionReason}. Fix it and publish again.</p>
      )}

      <div className="f"><label htmlFor="name">Product name *</label><input id="name" name="name" required minLength={4} maxLength={120} defaultValue={p?.name} placeholder={'2" SS304 Flanged Ball Valve, Class 150'} /></div>

      <div className="f">
        <label htmlFor="categoryId">Category *</label>
        <select id="categoryId" name="categoryId" required defaultValue={p?.category.id ?? ''}>
          <option value="" disabled>Choose the most specific category</option>
          {categories.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {(g.children.length ? g.children : [g]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="f"><label htmlFor="summary">One-line summary</label><input id="summary" name="summary" maxLength={200} defaultValue={p?.summary ?? ''} /></div>

      <div className="row3">
        <div className="f"><label htmlFor="priceMin">Price from (₹)</label><input id="priceMin" name="priceMin" inputMode="decimal" defaultValue={p?.price.min ?? ''} /></div>
        <div className="f"><label htmlFor="priceMax">Price to (₹)</label><input id="priceMax" name="priceMax" inputMode="decimal" defaultValue={p?.price.max ?? ''} /></div>
        <div className="f"><label htmlFor="priceUnit">Per</label><input id="priceUnit" name="priceUnit" maxLength={20} defaultValue={p?.price.unit ?? 'Piece'} /></div>
      </div>
      <p className="hint">Leave both prices empty to show &quot;Ask for price&quot;.</p>

      <div className="f"><label htmlFor="moq">Minimum order quantity</label><input id="moq" name="moq" inputMode="numeric" defaultValue={p?.moq ?? ''} /></div>

      <div className="f">
        <label htmlFor="specs">Specifications <small>one per line, as &quot;Label: value&quot;</small></label>
        <textarea id="specs" name="specs" rows={6} defaultValue={specs} placeholder={'Material: SS304 / CF8\nPressure: Class 150\nEnd connection: Flanged'} />
      </div>
      <div className="f"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={6} maxLength={8000} defaultValue={p?.description ?? ''} /></div>

      <ImageUploader initial={p?.images ?? []} />

      {editingLive && !trusted && (
        <p className="notice" role="note">Changing the name, photos, specifications or category sends this product back for a quick review. Price and MOQ changes go live immediately.</p>
      )}
      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      <div className="actions">
        <button className="btn btn-orange btn-lg" name="intent" value="publish" disabled={pending}>
          {pending ? 'Saving…' : p && p.status !== 'DRAFT' && p.status !== 'REJECTED' ? 'Save changes' : trusted ? 'Publish' : 'Submit for review'}
        </button>
        {(!p || p.status === 'DRAFT') && <button className="btn btn-line btn-lg" name="intent" value="draft" disabled={pending}>Save as draft</button>}
      </div>
    </form>
  );
}
