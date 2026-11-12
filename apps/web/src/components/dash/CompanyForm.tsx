'use client';

import { useActionState } from 'react';
import { saveCompany, type FormState } from '@/app/dashboard/actions';
import { BUSINESS_TYPES, businessTypeLabel } from '@/lib/format';
import type { OwnCompany } from '@/lib/types';

export function CompanyForm({ company }: { company: OwnCompany | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCompany, {});
  const c = company;
  return (
    <form action={action} className="dform panel">
      <input type="hidden" name="exists" value={c ? '1' : '0'} />
      <input type="hidden" name="gstinWas" value={c?.gstin ?? ''} />

      <div className="row2">
        <div className="f"><label htmlFor="name">Business name *</label><input id="name" name="name" required minLength={2} maxLength={80} defaultValue={c?.name} /></div>
        <div className="f"><label htmlFor="legalName">Registered (legal) name</label><input id="legalName" name="legalName" maxLength={120} defaultValue={c?.legalName ?? ''} /></div>
      </div>

      <div className="f">
        <label htmlFor="gstin">GSTIN <small>we verify it before the GST badge shows{c?.gstVerified ? ' · currently verified ✓' : ''}</small></label>
        <input id="gstin" name="gstin" maxLength={15} placeholder="27AABCA1234F1Z5" defaultValue={c?.gstin ?? ''} style={{ textTransform: 'uppercase' }} />
        {c?.gstin && !c.gstVerified && <p className="hint">Verification requested. Our team checks it against the GST portal.</p>}
      </div>

      <fieldset className="f">
        <legend>You are a * <small>pick all that apply</small></legend>
        <div className="chips-wrap">
          {BUSINESS_TYPES.map((t) => (
            <label key={t} className="check"><input type="checkbox" name="businessTypes" value={t} defaultChecked={c?.businessTypes.includes(t)} /> {businessTypeLabel(t)}</label>
          ))}
        </div>
      </fieldset>

      <div className="row2">
        <div className="f"><label htmlFor="city">City *</label><input id="city" name="city" required defaultValue={c?.city} /></div>
        <div className="f"><label htmlFor="state">State *</label><input id="state" name="state" required defaultValue={c?.state} /></div>
      </div>
      <div className="row2">
        <div className="f"><label htmlFor="addressLine">Address</label><input id="addressLine" name="addressLine" maxLength={200} defaultValue={c?.addressLine ?? ''} /></div>
        <div className="f"><label htmlFor="pincode">PIN code</label><input id="pincode" name="pincode" inputMode="numeric" maxLength={6} defaultValue={c?.pincode ?? ''} /></div>
      </div>

      <div className="row2">
        <div className="f"><label htmlFor="phone">Phone <small>with country code</small></label><input id="phone" name="phone" type="tel" placeholder="+919822012345" defaultValue={c?.phone ?? ''} /></div>
        <div className="f"><label htmlFor="email">Business email</label><input id="email" name="email" type="email" defaultValue={c?.email ?? ''} /></div>
      </div>
      <div className="row2">
        <div className="f"><label htmlFor="website">Website</label><input id="website" name="website" type="url" placeholder="https://" defaultValue={c?.website ?? ''} /></div>
        <div className="f"><label htmlFor="yearEstablished">Year established</label><input id="yearEstablished" name="yearEstablished" type="number" min={1850} max={new Date().getFullYear()} defaultValue={c?.yearEstablished ?? ''} /></div>
      </div>

      <div className="f"><label htmlFor="exportsTo">Countries you export to <small>comma separated</small></label><input id="exportsTo" name="exportsTo" placeholder="UAE, Kenya" defaultValue={c?.exportsTo.join(', ') ?? ''} /></div>
      <div className="f"><label htmlFor="description">About your business</label><textarea id="description" name="description" rows={5} maxLength={4000} defaultValue={c?.description ?? ''} /></div>

      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      {state.saved && <p className="notice ok" role="status">Saved.</p>}
      <div><button className="btn btn-orange btn-lg" disabled={pending}>{pending ? 'Saving…' : c ? 'Save changes' : 'Create company'}</button></div>
    </form>
  );
}
