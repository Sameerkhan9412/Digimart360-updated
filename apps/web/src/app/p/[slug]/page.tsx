import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, JsonLd, Monogram, PriceLine, ProductTile, RatingLine, TrustBadges } from '@/components/bits';
import { LeadButton } from '@/components/LeadButton';
import { ProductVisual } from '@/components/ProductVisual';
import { api } from '@/lib/api';
import { trackView } from '@/lib/track';
import { businessTypeLabel, priceRange } from '@/lib/format';
import { breadcrumbLd, productLd, productPath, storePath } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await api.product((await params).slug);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  const price = priceRange(p.price);
  const title = `${p.name}${price ? ` at ${price}/${p.price.unit}` : ''}`;
  const description = [
    p.summary,
    `${p.company.name}, ${p.company.city}.`,
    p.moq ? `MOQ ${p.moq.toLocaleString('en-IN')} ${p.price.unit}.` : '',
    'Get the best price on DIGI MART 360.',
  ].filter(Boolean).join(' ');
  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: productPath(p.slug) },
    openGraph: { type: 'website', title, description, url: productPath(p.slug), images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await api.product((await params).slug);
  if (!p) notFound();
  const c = p.company;
  await trackView('product', p.slug);

  return (
    <>
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbLd(p.breadcrumb, { name: p.name, path: productPath(p.slug) })} />
      <Breadcrumbs trail={p.breadcrumb} current={p.name} />

      <div className="pdp">
        <div className="gallery">
          <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} />
        </div>

        <section className="pinfo panel" aria-labelledby="pname">
          <h1 id="pname">{p.name}</h1>
          {p.summary && <p className="lede">{p.summary}</p>}
          <div>
            <PriceLine p={p} ask="Price on request" />
            {p.moq != null && <div className="moq">Minimum order: {p.moq.toLocaleString('en-IN')} {p.price.unit}</div>}
          </div>
          {p.specs.length > 0 && (
            <div className="spec-wrap">
              <table className="spec-table">
                <caption className="sr">Key specifications</caption>
                <tbody>
                  {p.specs.slice(0, 8).map((s) => (
                    <tr key={s.label}><th scope="row">{s.label}</th><td>{s.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="ctas">
            <LeadButton label="Get Best Price" product={p.name} productId={p.id} categoryId={p.category.id} companyId={c.id} supplier={c.name} className="btn btn-orange btn-lg" />
            <LeadButton label="Send Inquiry" product={p.name} productId={p.id} categoryId={p.category.id} companyId={c.id} supplier={c.name} className="btn btn-line btn-lg" title={`Send an inquiry to ${c.name}`} />
          </div>
        </section>

        <aside className="supcard panel" aria-label="Supplier">
          <div className="who">
            <Monogram name={c.name} />
            <div>
              <h2><Link href={storePath(c.slug)}>{c.name}</Link></h2>
              <span className="loc">{c.city}, {c.state}</span>
            </div>
          </div>
          <TrustBadges c={c} />
          <RatingLine c={c} />
          <dl>
            <dt>Business</dt><dd>{c.businessTypes.map(businessTypeLabel).join(', ')}</dd>
            {c.yearsInBusiness != null && <><dt>Experience</dt><dd>{c.yearsInBusiness} years</dd></>}
          </dl>
          <Link className="btn btn-line btn-block" href={storePath(c.slug)}>View supplier profile</Link>
        </aside>
      </div>

      <div className="below">
        {(p.description || p.specs.length > 8) && (
          <section className="panel" aria-labelledby="desc-h">
            <div className="sec-head"><h2 id="desc-h">Product details</h2></div>
            {p.description && <p className="prose">{p.description}</p>}
            {p.specs.length > 8 && (
              <div className="spec-wrap" style={{ marginTop: 14 }}>
                <table className="spec-table"><tbody>
                  {p.specs.map((s) => <tr key={s.label}><th scope="row">{s.label}</th><td>{s.value}</td></tr>)}
                </tbody></table>
              </div>
            )}
          </section>
        )}

        {p.moreFromCompany.length > 0 && (
          <section aria-labelledby="more-h">
            <div className="sec-head">
              <h2 id="more-h">More from {c.name}</h2>
              <Link className="link-more" href={storePath(c.slug)}>All products →</Link>
            </div>
            <div className="tiles">{p.moreFromCompany.map((x) => <ProductTile key={x.id} p={x} showSupplier={false} />)}</div>
          </section>
        )}

        {p.related.length > 0 && (
          <section aria-labelledby="rel-h">
            <div className="sec-head">
              <h2 id="rel-h">Similar {p.category.name.toLowerCase()} from other suppliers</h2>
              <Link className="link-more" href={`/c/${p.category.slug}`}>Compare all →</Link>
            </div>
            <div className="tiles">{p.related.map((x) => <ProductTile key={x.id} p={x} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}
