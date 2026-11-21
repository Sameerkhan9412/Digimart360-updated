import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, JsonLd, Monogram, RatingLine, TrustBadges } from '@/components/bits';
import { LeadButton } from '@/components/LeadButton';
import { hrefWith, ListingBody, readParams } from '@/components/Listing';
import { SaveSupplier } from '@/components/SaveSupplier';
import { api } from '@/lib/api';
import { saved } from '@/lib/dash';
import { trackView } from '@/lib/track';
import { businessTypeLabel, plural } from '@/lib/format';
import { organizationLd, storePath } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await api.company(slug);
  if (!c) return { title: 'Supplier not found', robots: { index: false } };
  const title = `${c.name}, ${c.city} · ${c.businessTypes.map(businessTypeLabel).join(' & ')}`;
  const description = (c.description ?? `${c.name} on DIGI MART 360.`).slice(0, 155);
  const filtered = Object.keys(sp).length > 0;
  return {
    title,
    description,
    alternates: { canonical: storePath(c.slug) },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: storePath(c.slug) },
  };
}

/**
 * Supplier profile on the marketplace. The seller's own themed website
 * (digimart360.com/store/<slug> and their custom domain) replaces this in the storefront phase.
 */
export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await api.company(slug);
  if (!c) notFound();
  const p = readParams(sp);
  await trackView('company', c.slug);
  const savedIds = await saved.ids();
  const base = storePath(c.slug);
  const data = await api.products({ ...p, company: c.slug, city: undefined, pageSize: 20 });
  // Pages past the end would be empty, thin pages: treat them as not found.
  if (p.page && p.page > 1 && data.items.length === 0) notFound();

  return (
    <>
      <JsonLd data={organizationLd(c)} />
      <Breadcrumbs trail={[]} current={c.name} />

      <section className="store-head panel" aria-labelledby="co">
        <Monogram name={c.name} large />
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 id="co">{c.name}</h1>
          <span className="loc">{c.city}, {c.state}</span>
          <TrustBadges c={c} />
          <RatingLine c={c} />
        </div>
        <div className="store-actions">
          <SaveSupplier companyId={c.id} name={c.name} next={base} state={savedIds === null ? 'signed-out' : savedIds.includes(c.id) ? 'saved' : 'unsaved'} />
          <LeadButton label="Contact supplier" companyId={c.id} supplier={c.name} title={`Send your requirement to ${c.name}`} />
        </div>
      </section>

      <div className="below" style={{ marginTop: 14 }}>
        <section className="panel" aria-labelledby="about-h">
          <div className="sec-head"><h2 id="about-h">About {c.name}</h2></div>
          {c.description && <p className="prose" style={{ marginBottom: 14 }}>{c.description}</p>}
          <dl className="facts">
            <div><dt>Business type</dt><dd>{c.businessTypes.map(businessTypeLabel).join(', ')}</dd></div>
            {c.yearEstablished && <div><dt>Established</dt><dd>{c.yearEstablished}</dd></div>}
            <div><dt>Products listed</dt><dd>{c.productCount}</dd></div>
            <div><dt>GST</dt><dd>{c.gstVerified ? 'Verified by DIGI MART' : 'Not yet verified'}</dd></div>
            {c.exportsTo.length > 0 && <div><dt>Exports to</dt><dd>{c.exportsTo.join(', ')}</dd></div>}
          </dl>
          {c.categories.length > 0 && (
            <div className="chips-wrap" style={{ marginTop: 14 }}>
              {c.categories.map((cat) => <Link key={cat.id} className="chip" href={`/c/${cat.slug}`}>{cat.name}</Link>)}
            </div>
          )}
        </section>
      </div>

      <h2 style={{ fontSize: 20, color: 'var(--navy)', marginTop: 22 }} id="products">
        Products from {c.name} <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14 }}>({plural(data.total, 'product')})</span>
      </h2>
      <ListingBody base={hrefWith(base, {}, {})} params={p} data={data} topic={c.name} />
    </>
  );
}
