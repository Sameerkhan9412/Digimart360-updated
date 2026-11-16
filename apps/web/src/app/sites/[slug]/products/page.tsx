import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductVisual } from '@/components/ProductVisual';
import { ApiError, api } from '@/lib/api';
import { trackView } from '@/lib/track';
import { plural, priceRange } from '@/lib/format';
import { SITE_URL } from '@/lib/seo';
import { Shell } from '../Shell';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
const PAGE = 24;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [c, s] = await Promise.all([api.company(slug), api.storefront(slug)]);
  if (!c || !s) return { title: 'Website not found', robots: { index: false } };
  const proto = SITE_URL.startsWith('http://') ? 'http' : 'https';
  return {
    metadataBase: new URL(`${proto}://${s.canonicalHost}`),
    title: { absolute: `Products · ${c.name}` },
    alternates: { canonical: '/products' },
  };
}

export default async function SiteProducts({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [c, s] = await Promise.all([api.company(slug), api.storefront(slug)]);
  if (!c || !s || !s.showProducts) notFound();
  await trackView('site', c.slug);
  // A page number the API rejects is just a page that does not exist.
  const data = await api.products({ company: c.slug, pageSize: PAGE, page }).catch((e) => {
    if (e instanceof ApiError && e.status === 400) notFound();
    throw e;
  });
  if (page > 1 && data.items.length === 0) notFound();
  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  return (
    <Shell c={c} s={s}>
      <section className="sf-sec">
        <div className="sf-wrap">
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 6 }}>Products</h1>
          <p className="sf-muted" style={{ marginBottom: 18 }}>{plural(data.total, 'product')} from {c.name}</p>
          {data.items.length === 0 ? (
            <p className="sf-muted">Products will appear here soon.</p>
          ) : (
            <ul className="sf-grid">
              {data.items.map((p) => (
                <li key={p.id} className="sf-card">
                  <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} className="pic" />
                  <div className="body">
                    <h3><a href={`/p/${p.slug}`}>{p.name}</a></h3>
                    <span className="sf-price">{priceRange(p.price) ?? 'Ask for price'}</span>
                    {p.moq != null && <span className="sf-muted">MOQ {p.moq.toLocaleString('en-IN')}</span>}
                    {p.summary && <span className="sf-muted">{p.summary}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className="sf-pager" aria-label="Pages">
              {page > 1 && <a className="sf-btn ghost" href={`/products?page=${page - 1}`}>← Previous</a>}
              <span className="sf-muted">Page {page} of {pages}</span>
              {page < pages && <a className="sf-btn ghost" href={`/products?page=${page + 1}`}>Next →</a>}
            </nav>
          )}
        </div>
      </section>
    </Shell>
  );
}
