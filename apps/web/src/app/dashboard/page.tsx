import Link from 'next/link';
import { dash } from '@/lib/dash';
import { priceRange } from '@/lib/format';
import { productPath, storePath } from '@/lib/seo';
import type { OwnProduct, ProductStatus } from '@/lib/types';
import { ProductVisual } from '@/components/ProductVisual';
import { archiveProduct, restoreProduct } from './actions';

const STATUS: Record<ProductStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'st-draft' },
  PENDING_REVIEW: { label: 'In review', cls: 'st-wait' },
  ACTIVE: { label: 'Live', cls: 'st-live' },
  REJECTED: { label: 'Rejected', cls: 'st-bad' },
  ARCHIVED: { label: 'Archived', cls: 'st-draft' },
};

export default async function Overview({ searchParams }: { searchParams: Promise<{ saved?: ProductStatus }> }) {
  const saved = (await searchParams).saved;
  const company = await dash.company();

  if (!company) {
    return (
      <section className="panel dcard">
        <h1>Welcome. Let&apos;s set up your company</h1>
        <p>Add your business details first. Products you list appear on the marketplace and on your own website once our team approves your company.</p>
        <p><Link className="btn btn-orange btn-lg" href="/dashboard/company">Create company profile</Link></p>
      </section>
    );
  }

  const products = await dash.products();
  const count = (s: ProductStatus) => products.filter((p) => p.status === s).length;

  return (
    <>
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>{company.name}</h1>
          <p>{company.city}, {company.state}</p>
        </div>
        {company.status === 'ACTIVE' && <Link className="btn btn-line" href={storePath(company.slug)}>View my public page</Link>}
      </div>

      {company.status === 'PENDING' && (
        <p className="notice" role="status"><b>Awaiting approval.</b> Our team reviews new companies, usually within a working day. Your products become public once you are approved.</p>
      )}
      {company.status === 'SUSPENDED' && <p className="notice err" role="alert"><b>Your company is suspended.</b> Contact support to find out why.</p>}
      {saved && <p className="notice ok" role="status">{saved === 'DRAFT' ? 'Draft saved.' : saved === 'ACTIVE' ? 'Product saved and live.' : 'Saved. It goes live once our team approves it.'}</p>}
      {!company.gstin && <p className="notice" role="note">Add your GSTIN in <Link className="link-more" href="/dashboard/company">Company profile</Link> to earn the GST-verified badge. Buyers trust verified suppliers.</p>}

      <ul className="kpis">
        <li className="panel"><b className="num">{count('ACTIVE')}</b><span>Live products</span></li>
        <li className="panel"><b className="num">{count('PENDING_REVIEW')}</b><span>In review</span></li>
        <li className="panel"><b className="num">{count('DRAFT') + count('REJECTED')}</b><span>Drafts and rejected</span></li>
        <li className="panel"><b>{company.gstVerified ? '✓ Verified' : company.gstin ? 'Pending' : 'Not added'}</b><span>GSTIN</span></li>
      </ul>

      <section className="band" aria-labelledby="pl">
        <div className="sec-head">
          <h2 id="pl">Your products</h2>
          <Link className="btn btn-orange" href="/dashboard/products/new">+ Add product</Link>
        </div>
        {products.length === 0 ? (
          <div className="panel dcard"><p>No products yet. Add your first one. It takes about two minutes.</p></div>
        ) : (
          <ul className="plist">
            {products.map((p) => <ProductRow key={p.id} p={p} />)}
          </ul>
        )}
      </section>
    </>
  );
}

function ProductRow({ p }: { p: OwnProduct }) {
  const st = STATUS[p.status];
  const range = priceRange(p.price);
  return (
    <li className="panel prow">
      <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} className="pv thumb" />
      <div className="pmain">
        <b>{p.name}</b>
        <span className="muted">{p.category.name} · {range ?? 'Ask for price'}{p.moq != null && ` · MOQ ${p.moq.toLocaleString('en-IN')}`}</span>
        {p.status === 'REJECTED' && p.rejectionReason && <span className="why">Rejected: {p.rejectionReason}</span>}
      </div>
      <span className={`st ${st.cls}`}>{st.label}</span>
      <div className="pact">
        {p.status === 'ARCHIVED' ? (
          <form action={restoreProduct.bind(null, p.id)}><button className="btn btn-line btn-sm">Restore as draft</button></form>
        ) : (
          <>
            {p.status === 'ACTIVE' && <Link className="btn btn-line btn-sm" href={productPath(p.slug)}>View</Link>}
            <Link className="btn btn-soft btn-sm" href={`/dashboard/products/${p.id}`}>Edit</Link>
            <form action={archiveProduct.bind(null, p.id)}><button className="btn btn-line btn-sm" aria-label={`Archive ${p.name}`}>Archive</button></form>
          </>
        )}
      </div>
    </li>
  );
}
