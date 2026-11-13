import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductVisual } from '@/components/ProductVisual';
import { api } from '@/lib/api';
import { businessTypeLabel, monogram, plural, priceRange } from '@/lib/format';
import { SITE_URL, productPath } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

/** Pick readable text for a supplier's brand colour. */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

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
  const products = s.showProducts ? await api.products({ company: c.slug, pageSize: 12 }) : null;

  const style: CSSProperties & Record<string, string> = s.accent ? { '--brand': s.accent, '--brand-ink': inkOn(s.accent) } : {};
  const quote = `${SITE_URL}/rfq/new?company=${c.id}&supplier=${encodeURIComponent(c.name)}`;
  const nav = [s.showAbout && ['About', '#about'], s.showProducts && ['Products', '#products'], s.showCertificates && s.certificates.length > 0 && ['Certificates', '#certificates'], s.showContact && ['Contact', '#contact']].filter(Boolean) as [string, string][];

  return (
    <div className="sf" data-theme={s.theme} style={style}>
      <header className="sf-head">
        <div className="sf-wrap">
          <a className="sf-brand" href="#top">
            {c.logoUrl ? <img src={c.logoUrl} alt="" /> : <span className="sf-mono" aria-hidden="true">{monogram(c.name)}</span>}
            <span>{c.name}</span>
          </a>
          <nav className="sf-nav" aria-label="Sections">
            {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a className="sf-btn" href={quote}>Get a quote</a>
          </nav>
        </div>
      </header>

      <main id="top">
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
                        <h3><a href={`${SITE_URL}${productPath(p.slug)}`}>{p.name}</a></h3>
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
                  <a className="sf-btn ghost" href={`${SITE_URL}/store/${c.slug}`}>See all {plural(products.total, 'product')}</a>
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
      </main>

      <footer className="sf-foot">
        <div className="sf-wrap">
          <span>© {new Date().getFullYear()} {c.name}</span>
          <span>Verified on <a href={`${SITE_URL}/store/${c.slug}`}>DIGI MART 360</a></span>
        </div>
      </footer>
    </div>
  );
}
