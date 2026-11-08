import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd, Monogram, ProductTile, RatingLine, TrustBadges } from '@/components/bits';
import { LeadButton } from '@/components/LeadButton';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';
import { categoryPath, storePath, websiteLd } from '@/lib/seo';
import type { CompanySummary } from '@/lib/types';


export const metadata: Metadata = {
  title: { absolute: "DIGI MART 360 · Buy direct from India's verified manufacturers" },
  alternates: { canonical: '/' },
};

const FEATURE_BG = ['linear-gradient(160deg,#1A3C5E,#24527f)', 'linear-gradient(160deg,#8a4510,#b35a0e)', 'linear-gradient(160deg,#14693A,#17773f)'];

export default async function Home() {
  const [tree, latest, trusted, all] = await Promise.all([
    api.categories(),
    api.products({ sort: 'newest', pageSize: 12 }),
    api.products({ trusted: true, sort: 'rating', pageSize: 48 }),
    api.products({ pageSize: 1 }),
  ]);
  const showcases = [...tree].sort((a, b) => b.productCount - a.productCount).filter((g) => g.productCount > 0).slice(0, 3);
  const suppliers = [...new Map(trusted.items.map((p) => [p.company.id, p.company])).values()].slice(0, 6) as CompanySummary[];
  const supplierCount = new Set(trusted.items.map((p) => p.company.id)).size;

  return (
    <>
      <JsonLd data={websiteLd()} />

      <div className="hero">
        <nav className="catlist panel" aria-label="Top categories">
          {tree.map((g) => (
            <Link key={g.id} href={categoryPath(g.slug)}>
              <i aria-hidden="true">{g.icon}</i>{g.name}<small>{g.productCount || ''}</small>
            </Link>
          ))}
        </nav>

        <div className="banner">
          <div>
            <span className="kick">✓ Every supplier GST-checked</span>
            <h1>Buy direct from India&apos;s verified manufacturers</h1>
            <p>Post one requirement and get quotes from up to 5 matched suppliers. Compare prices, MOQ and reply times side by side.</p>
            <div className="cta">
              <LeadButton label="Post Requirement" className="btn btn-orange btn-lg" title="Tell us what you need" />
              <Link className="btn btn-white btn-lg" href="/sell">Start Selling</Link>
            </div>
          </div>
          <div className="stats">
            <div><b className="num">{all.total.toLocaleString('en-IN')}</b><span>Products listed</span></div>
            <div><b className="num">{tree.length}</b><span>Industries</span></div>
            <div><b className="num">{all.facets.cities.length}</b><span>Supplier cities</span></div>
            <div><b className="num">{supplierCount}</b><span>DM Trusted suppliers</span></div>
          </div>
        </div>

        <div className="sidebox panel">
          <h2 style={{ fontSize: 16, color: 'var(--navy)' }}>Get quotes in minutes</h2>
          <p>Tell us the product, quantity and delivery city. Verified suppliers reply with prices.</p>
          <LeadButton label="Post your requirement" className="btn btn-orange btn-block" title="Tell us what you need" />
          <ul className="ticks">
            <li>Free for buyers</li>
            <li>GST-checked suppliers only</li>
            <li>Compare quotes side by side</li>
          </ul>
        </div>
      </div>

      <section className="band panel" aria-label="Why DIGI MART 360">
        <div className="values">
          <div><i aria-hidden="true">🛡️</i><span><b>GST-checked suppliers</b><span>Business documents verified before listing</span></span></div>
          <div><i aria-hidden="true">⚖️</i><span><b>Compare quotes</b><span>Price, MOQ and lead time side by side</span></span></div>
          <div><i aria-hidden="true">🌍</i><span><b>Export ready</b><span>Suppliers shipping worldwide</span></span></div>
          <div><i aria-hidden="true">🤝</i><span><b>Sourcing help</b><span>We shortlist suppliers for you</span></span></div>
        </div>
      </section>

      {latest.items.length > 0 && (
        <section className="band" aria-labelledby="new-h">
          <div className="sec-head">
            <div><h2 id="new-h">New on DIGI MART 360</h2><p>Latest products from verified suppliers</p></div>
            <Link className="link-more" href="/search?sort=newest">View all →</Link>
          </div>
          <div className="tiles">{latest.items.map((p) => <ProductTile key={p.id} p={p} />)}</div>
        </section>
      )}

      {showcases.map((g, i) => (
        <section key={g.id} className="band" aria-labelledby={`sc-${g.slug}`}>
          <div className="sec-head">
            <h2 id={`sc-${g.slug}`}>{g.name}</h2>
            <Link className="link-more" href={categoryPath(g.slug)}>View all {plural(g.productCount, 'product')} →</Link>
          </div>
          <div className="showcase panel">
            <div className="feature" style={{ background: FEATURE_BG[i % FEATURE_BG.length] }}>
              <h3>{g.name}</h3>
              <ul>{g.children.slice(0, 5).map((c) => <li key={c.id}><Link href={categoryPath(c.slug)}>{c.name}</Link></li>)}</ul>
              <Link className="btn btn-white btn-sm" href={categoryPath(g.slug)}>Explore category</Link>
              <span className="big" aria-hidden="true">{g.icon}</span>
            </div>
            <div className="subs">
              {g.children.slice(0, 6).map((c) => (
                <div className="sub" key={c.id}>
                  <h4><Link href={categoryPath(c.slug)}>{c.name}</Link><small>{c.productCount || ''}</small></h4>
                  <ul>{c.children.slice(0, 4).map((leaf) => <li key={leaf.id}><Link href={categoryPath(leaf.slug)}>{leaf.name}</Link></li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {suppliers.length > 0 && (
        <section className="band" aria-labelledby="sup-h">
          <div className="sec-head"><div><h2 id="sup-h">DM Trusted suppliers</h2><p>Inspected by DIGI MART and highly rated by buyers</p></div></div>
          <div className="sups">
            {suppliers.map((c) => (
              <Link key={c.id} href={storePath(c.slug)} className="supc panel">
                <div className="who"><Monogram name={c.name} /><div><b>{c.name}</b><small>📍 {c.city}</small></div></div>
                <TrustBadges c={c} />
                <RatingLine c={c} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {all.facets.cities.length > 0 && (
        <section className="band panel" style={{ padding: 16 }} aria-labelledby="city-h">
          <div className="sec-head"><h2 id="city-h">Find suppliers by city</h2></div>
          <div className="places">
            {all.facets.cities.slice(0, 12).map((c) => (
              <Link key={c.value} href={`/search?city=${encodeURIComponent(c.value)}`}>{c.value}<small>{plural(c.count, 'product')}</small></Link>
            ))}
          </div>
        </section>
      )}

      <section className="band sell panel" aria-labelledby="sell-h">
        <div>
          <h2 id="sell-h">Sell on DIGI MART 360</h2>
          <p>List free. Get buyer requirements and your own branded website on your own domain.</p>
          <Link className="btn btn-orange btn-lg" href="/sell">How selling works</Link>
        </div>
        <ol className="steps">
          <li><b>Sign in</b><span>With your email or Google account.</span></li>
          <li><b>Add your company</b><span>GSTIN, business type and location. We verify it.</span></li>
          <li><b>List products</b><span>Prices, MOQ and specs. Live on the marketplace and your own site.</span></li>
        </ol>
      </section>
    </>
  );
}
