import Link from 'next/link';
import { ProductVisual } from '@/components/ProductVisual';
import { admin } from '@/lib/dash';
import { dateLabel, priceRange } from '@/lib/format';
import type { CompanyStatus, DomainStatus, ProductStatus } from '@/lib/types';
import { approveDomain, approveProduct, moderateCompany, rejectDomain, rejectProduct } from './actions';

const COMPANY_TABS: CompanyStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED'];
const PRODUCT_TABS: ProductStatus[] = ['PENDING_REVIEW', 'ACTIVE', 'REJECTED'];
const DOMAIN_TABS: DomainStatus[] = ['PENDING_APPROVAL', 'ACTIVE', 'PENDING_DNS', 'REJECTED'];
const LABEL: Record<string, string> = { PENDING_APPROVAL: 'Waiting', PENDING_DNS: 'Awaiting DNS', PENDING: 'Waiting', PENDING_REVIEW: 'In review', ACTIVE: 'Live', SUSPENDED: 'Suspended', REJECTED: 'Rejected' };

interface Search { tab?: string; status?: string; error?: string }

const NO_ACCESS = (
  <section className="panel dcard">
    <h1>Admin only</h1>
    <p>This account is not an administrator. Sign out and sign in with the admin email.</p>
  </section>
);

export default async function Admin({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'products' ? 'products' : sp.tab === 'domains' ? 'domains' : 'companies';
  const tabs: string[] = tab === 'products' ? PRODUCT_TABS : tab === 'domains' ? DOMAIN_TABS : COMPANY_TABS;
  const status = tabs.includes(sp.status ?? '') ? sp.status! : tabs[0];
  const back = `/admin?tab=${tab}&status=${status}`;

  const companies = tab === 'companies' ? await admin.companies(status as CompanyStatus) : null;
  const products = tab === 'products' ? await admin.products(status as ProductStatus) : null;
  const domains = tab === 'domains' ? await admin.domains(status as DomainStatus) : null;
  if (companies === 'forbidden' || products === 'forbidden' || domains === 'forbidden') return NO_ACCESS;
  const page = (companies ?? products ?? domains)!;

  return (
    <>
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>{tab === 'products' ? 'Products' : tab === 'domains' ? 'Custom domains' : 'Companies'}</h1>
          <p>
            {page.total} {LABEL[status].toLowerCase()}
            {page.items.length < page.total && `, showing the first ${page.items.length}`}
          </p>
        </div>
        <div className="pact">
          {tabs.map((t) => (
            <Link key={t} className={`btn ${t === status ? 'btn-orange' : 'btn-line'}`} href={`/admin?tab=${tab}&status=${t}`}>{LABEL[t]}</Link>
          ))}
        </div>
      </div>
      {sp.error && <p className="notice err" role="alert">{sp.error}</p>}
      {page.items.length === 0 && <div className="panel dcard"><p>Nothing here.</p></div>}

      {companies && (
        <ul className="plist">
          {companies.items.map((c) => (
            <li key={c.id} className="panel dcard">
              <div className="pmain">
                <b>{c.name}</b>
                <span className="muted">{c.city}, {c.state} · {c.ownerEmail} · {c.productCount} products · joined {dateLabel(c.createdAt)}</span>
                <span className="muted">
                  GSTIN: {c.gstin ?? 'not provided'} {c.gstin && (c.gstVerified ? '(verified)' : '(unchecked)')}
                  {c.trustSeal && ' · DM Trusted'}
                </span>
              </div>
              <div className="pact">
                {c.status !== 'ACTIVE' && <form action={moderateCompany.bind(null, c.id, { status: 'ACTIVE' }, back)}><button className="btn btn-orange">Approve</button></form>}
                {c.status !== 'SUSPENDED' && <form action={moderateCompany.bind(null, c.id, { status: 'SUSPENDED' }, back)}><button className="btn btn-line">Suspend</button></form>}
                {c.gstin && <form action={moderateCompany.bind(null, c.id, { gstVerified: !c.gstVerified }, back)}><button className="btn btn-line">{c.gstVerified ? 'Unverify GST' : 'Verify GST'}</button></form>}
                <form action={moderateCompany.bind(null, c.id, { trustSeal: !c.trustSeal }, back)}><button className="btn btn-line">{c.trustSeal ? 'Remove DM Trusted' : 'Grant DM Trusted'}</button></form>
                {c.status === 'ACTIVE' && <Link className="btn btn-line" href={`/store/${c.slug}`}>View page</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {domains && (
        <ul className="plist">
          {domains.items.map((d) => (
            <li key={d.id} className="panel dcard">
              <div className="pmain">
                <b>{d.host}</b>
                <span className="muted">{d.companyName} ({d.companySlug}) · {d.ownerEmail} · requested {dateLabel(d.createdAt)}</span>
                {d.rejectionReason && <span className="muted">Rejected: {d.rejectionReason}</span>}
                {d.status === 'PENDING_DNS' && <span className="muted">Ownership not proven yet</span>}
              </div>
              <div className="pact">
                {d.status !== 'ACTIVE' && d.status !== 'PENDING_DNS' && <form action={approveDomain.bind(null, d.id, back)}><button className="btn btn-orange">Approve</button></form>}
                {d.status !== 'REJECTED' && (
                  <form action={rejectDomain.bind(null, d.id, back)} className="pact">
                    <input name="reason" required minLength={10} maxLength={500} placeholder="Reason the supplier will see" aria-label="Rejection reason" style={{ minWidth: 260 }} />
                    <button className="btn btn-line">{d.status === 'ACTIVE' ? 'Revoke' : 'Reject'}</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {products && (
        <ul className="plist">
          {products.items.map((p) => (
            <li key={p.id} className="panel dcard">
              <div className="prow">
                <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} className="pv thumb" />
                <div className="pmain">
                  <b>{p.name}</b>
                  <span className="muted">{p.company.name} · {p.category.name} · {priceRange(p.price) ?? 'Ask for price'}{p.moq ? ` · MOQ ${p.moq}` : ''}</span>
                  {p.summary && <span>{p.summary}</span>}
                  {p.rejectionReason && <span className="muted">Rejected: {p.rejectionReason}</span>}
                </div>
              </div>
              {p.description && <p style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>}
              {p.specs.length > 0 && <p className="muted">{p.specs.map((s) => `${s.label}: ${s.value}`).join(' · ')}</p>}
              <div className="pact">
                {p.status !== 'ACTIVE' && <form action={approveProduct.bind(null, p.id, back)}><button className="btn btn-orange">Approve</button></form>}
                {p.status !== 'REJECTED' && (
                  <form action={rejectProduct.bind(null, p.id, back)} className="pact">
                    <input name="reason" required minLength={10} maxLength={500} placeholder="Reason the supplier will see" aria-label="Rejection reason" style={{ minWidth: 260 }} />
                    <button className="btn btn-line">Reject</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
