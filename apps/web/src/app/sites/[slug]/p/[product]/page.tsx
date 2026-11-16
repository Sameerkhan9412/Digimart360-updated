import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/bits';
import { ProductVisual } from '@/components/ProductVisual';
import { api } from '@/lib/api';
import { trackView } from '@/lib/track';
import { priceRange } from '@/lib/format';
import { productLd, SITE_URL } from '@/lib/seo';
import { Shell, quoteUrl } from '../../Shell';

type Props = { params: Promise<{ slug: string; product: string }> };

async function load(slug: string, product: string) {
  const [p, c, s] = await Promise.all([api.product(product), api.company(slug), api.storefront(slug)]);
  // The product must belong to this supplier: another supplier's product is not found here.
  if (!p || !c || !s || p.company.slug !== slug) return null;
  return { p, c, s };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product } = await params;
  const d = await load(slug, product);
  if (!d) return { title: 'Product not found', robots: { index: false } };
  const { p, c, s } = d;
  const price = priceRange(p.price);
  const title = `${p.name}${price ? ` at ${price}/${p.price.unit}` : ''} · ${c.name}`;
  const description = [p.summary, `${c.name}, ${c.city}.`, p.moq ? `MOQ ${p.moq.toLocaleString('en-IN')} ${p.price.unit}.` : ''].filter(Boolean).join(' ').slice(0, 160);
  const proto = SITE_URL.startsWith('http://') ? 'http' : 'https';
  return {
    metadataBase: new URL(`${proto}://${s.canonicalHost}`),
    title: { absolute: title },
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title, description, url: `/p/${p.slug}`, siteName: c.name, images: p.images.slice(0, 1) },
  };
}

export default async function SiteProduct({ params }: Props) {
  const { slug, product } = await params;
  const d = await load(slug, product);
  if (!d) notFound();
  const { p, c, s } = d;
  await trackView('product', p.slug);
  const price = priceRange(p.price);

  return (
    <Shell c={c} s={s}>
      <JsonLd data={productLd(p)} />
      <section className="sf-sec">
        <div className="sf-wrap">
          <p className="sf-muted"><a href="/">Home</a> / <a href="/products">Products</a> / {p.name}</p>
          <div className="sf-pdp">
            <div className="sf-gallery">
              <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} className="pic big" />
              {p.images.length > 1 && (
                <ul className="sf-thumbs">
                  {p.images.slice(1, 6).map((u, i) => (
                    <li key={u}><img src={u} alt={`${p.name}, photo ${i + 2}`} loading="lazy" /></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sf-info">
              <h1>{p.name}</h1>
              {p.summary && <p className="sf-lede">{p.summary}</p>}
              <div>
                <span className="sf-price big">{price ? `${price} / ${p.price.unit}` : 'Price on request'}</span>
                {p.moq != null && <div className="sf-muted">Minimum order: {p.moq.toLocaleString('en-IN')} {p.price.unit}</div>}
              </div>
              <div>
                <a
                  className="sf-btn"
                  href={quoteUrl(c, { title: p.name, product: p.id, category: p.category.id })}
                >
                  Get best price
                </a>
              </div>
              {p.specs.length > 0 && (
                <table className="sf-specs">
                  <caption className="sf-sr">Specifications</caption>
                  <tbody>{p.specs.map((x) => <tr key={x.label}><th scope="row">{x.label}</th><td>{x.value}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
          {p.description && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 24 }}>Description</h2>
              <p className="sf-prose" style={{ marginTop: 10 }}>{p.description}</p>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
