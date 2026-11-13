'use client';

import { useActionState } from 'react';
import { checkDomain, removeDomain, saveDomain, type FormState } from '@/app/dashboard/actions';
import type { DomainInfo } from '@/lib/types';

export function DomainPanel({ domain }: { domain: DomainInfo | null }) {
  const [saveState, save, saving] = useActionState<FormState, FormData>(saveDomain, {});
  const [checkState, check, checking] = useActionState<FormState, FormData>(checkDomain, {});

  return (
    <section className="panel dcard" aria-labelledby="dom">
      <h2 id="dom" style={{ fontSize: 17, color: 'var(--navy)' }}>Your own domain</h2>

      {!domain && <p>Use your own web address, like www.yourbrand.com, for your website. Your free address keeps working.</p>}

      {domain?.status === 'ACTIVE' && <p className="notice ok" role="status"><b>{domain.host}</b> is live. Visitors are sent there from your free address.</p>}
      {domain?.status === 'PENDING_APPROVAL' && <p className="notice" role="status"><b>{domain.host}</b>: ownership confirmed. Our team approves it, usually within a working day.</p>}
      {domain?.status === 'REJECTED' && <p className="notice err" role="alert"><b>{domain.host}</b> was not approved: {domain.rejectionReason}</p>}

      {domain?.status === 'PENDING_DNS' && (
        <>
          <p>Step 2 of 3. Add these records where you manage <b>{domain.host}</b> (your domain registrar or DNS provider), then press check.</p>
          <table className="dns">
            <thead><tr><th>Type</th><th>Name</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>TXT</td><td><code>{domain.txtName}</code></td><td><code>{domain.txtValue}</code></td></tr>
              {domain.cnameTarget && <tr><td>CNAME</td><td><code>{domain.host}</code></td><td><code>{domain.cnameTarget}</code></td></tr>}
            </tbody>
          </table>
          <p className="hint">The TXT record proves you own the domain. DNS changes can take a few minutes, sometimes longer.</p>
          <form action={check}><button className="btn btn-orange" disabled={checking}>{checking ? 'Checking…' : 'Check now'}</button></form>
          {checkState.error && <p className="notice err" role="alert">{checkState.error}</p>}
        </>
      )}

      {(!domain || domain.status === 'REJECTED') && (
        <form action={save} className="dform">
          <div className="f">
            <label htmlFor="host">Domain</label>
            <input id="host" name="host" required placeholder="www.yourbrand.com" autoCapitalize="none" spellCheck={false} />
          </div>
          {saveState.error && <p className="notice err" role="alert">{saveState.error}</p>}
          <div><button className="btn btn-orange" disabled={saving}>{saving ? 'Saving…' : 'Connect domain'}</button></div>
        </form>
      )}

      {domain && (
        <form action={removeDomain}><button className="btn btn-line">{domain.status === 'ACTIVE' ? 'Disconnect this domain' : 'Remove'}</button></form>
      )}
    </section>
  );
}
