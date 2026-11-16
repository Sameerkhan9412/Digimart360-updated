import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductVisual } from '@/components/ProductVisual';
import { api } from '@/lib/api';
import { trackView } from '@/lib/track';
import { businessTypeLabel, plural, priceRange } from '@/lib/format';
import { SITE_URL } from '@/lib/seo';
import { Shell, quoteUrl } from './Shell';

type Props = { params: Promise<{ slug: string }> };

const protocol = SITE_URL.startsWith('http://') ? 'http' : 'https';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [c, s] = await Promise.all([api.company(slug), api.storefront(slug)]);
  if (!c || !s) return { title: 'Website not found', robots: { index: false } };
  const title = s.tagline ? `${c.name} · ${s.tagline}` : `${c.name}, ${c.city}`;
  const description = (c.description ?? s.tagline ?? `${c.name}, ${c.city}. Products and quotes.`).slice(0, 155);
  const base = `${protocol}://${s.canonicalHost}`;
  return {
    metadataBase: new URL(base),
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, url: '/', siteName: c.name, ...(s.bannerUrl && { images: [s.bannerUrl] }) },
  };
}

export default async function Site({ params }: Props) {
  const { slug } = await params;
  const [c, s] = await Promise.all([api.company(slug), api.storefront(slug)]);
  if (!c || !s) notFound();
  await trackView('site', c.slug);
  const products = s.showProducts ? await api.products({ company: c.slug, pageSize: 12 }) : null;

  const quote = quoteUrl(c);

  return (
    <Shell c={c} s={s}>
        <section className={`sf-hero${s.bannerUrl ? ' banner' : ''}`} style={s.bannerUrl ? { backgroundImage: `url(${s.bannerUrl})` } : undefined}>
          <div className="sf-wrap">
            <h1>{s.tagline ?? c.name}</h1>
            <p>
              {c.businessTypes.map(businessTypeLabel).join(' · ')} · {c.city}, {c.state}
              {c.yearEstablished ? ` · since ${c.yearEstablished}` : ''}
            </p>
            <div className="sf-badges">
              {c.gstVerified && <span className="sf-badge">GST verified</span>}
              {c.trustSeal && <span className="sf-badge">DM Trusted</span>}
              {c.exporter && <span className="sf-badge">Exporter</span>}
            </div>
            <div><a className="sf-btn" href={quote}>Send your requirement</a></div>
          </div>
        </section>

        {s.showAbout && (
          <section className="sf-sec" id="about">
            <div className="sf-wrap">
              <h2>About us</h2>
              {c.description && <p className="sf-prose">{c.description}</p>}
              <dl className="sf-facts">
                <div><dt>Business type</dt><dd>{c.businessTypes.map(businessTypeLabel).join(', ')}</dd></div>
                {c.yearEstablished && <div><dt>Established</dt><dd>{c.yearEstablished}</dd></div>}
                <div><dt>Location</dt><dd>{c.city}, {c.state}</dd></div>
                <div><dt>Products listed</dt><dd>{c.productCount}</dd></div>
                {c.exportsTo.length > 0 && <div><dt>Exports to</dt><dd>{c.exportsTo.join(', ')}</dd></div>}
              </dl>
            </div>
          </section>
        )}

        {products && (
          <section className="sf-sec alt" id="products">
            <div className="sf-wrap">
              <h2>Our products</h2>
              {products.items.length === 0 ? (
                <p className="sf-muted">Products will appear here soon.</p>
              ) : (
                <ul className="sf-grid">
                  {products.items.map((p) => (
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
              {products.total > products.items.length && (
                <p style={{ marginTop: 20 }}>
                  <a className="sf-btn ghost" href="/products">See all {plural(products.total, 'product')}</a>
                </p>
              )}
            </div>
          </section>
        )}

        {s.showCertificates && s.certificates.length > 0 && (
          <section className="sf-sec" id="certificates">
            <div className="sf-wrap">
              <h2>Certifications</h2>
              <ul className="sf-chips">{s.certificates.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </section>
        )}

        {s.showContact && (
          <section className="sf-sec alt" id="contact">
            <div className="sf-wrap sf-contact">
              <h2>Contact us</h2>
              {c.addressLine && <span>{c.addressLine}{c.pincode ? ` ${c.pincode}` : ''}</span>}
              <span>{c.city}, {c.state}</span>
              {c.website && <a href={c.website} rel="noopener nofollow">{c.website.replace(/^https?:\/\//, '')}</a>}
              <p style={{ marginTop: 8 }}><a className="sf-btn" href={quote}>Request a quote</a></p>
            </div>
          </section>
        )}
    </Shell>
  );
}
