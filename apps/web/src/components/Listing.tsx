import Link from 'next/link';
import { Suspense } from 'react';
import { BUSINESS_TYPES, businessTypeLabel, plural } from '@/lib/format';
import { productPath, storePath } from '@/lib/seo';
import type { BusinessType, ListingParams, ProductCard, ProductPage, Sort } from '@/lib/types';
import { Monogram, PriceLine, RatingLine, TrustBadges } from './bits';
import { LeadButton } from './LeadButton';
import { ProductVisual } from './ProductVisual';
import { SortSelect } from './SortSelect';

/* ───────────── URL ⇄ filters ───────────── */

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v?: string) => (v && /^\d+(\.\d+)?$/.test(v) ? Number(v) : undefined);
const SORTS: Sort[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating'];

/** Reads listing filters from the query string, ignoring anything malformed. */
export function readParams(sp: Raw): ListingParams {
  const type = one(sp.type)?.toUpperCase() as BusinessType | undefined;
  const sort = one(sp.sort) as Sort | undefined;
  const page = num(one(sp.page));
  return {
    q: one(sp.q)?.slice(0, 100) || undefined,
    city: one(sp.city)?.slice(0, 60) || undefined,
    businessType: type && BUSINESS_TYPES.includes(type) ? type : undefined,
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    trusted: one(sp.trusted) === '1' || undefined,
    gstVerified: one(sp.gst) === '1' || undefined,
    exporter: one(sp.exporter) === '1' || undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: page && page >= 1 && page <= 50 ? Math.floor(page) : undefined,
  };
}

/** Short, readable query keys for our own URLs. */
function toUrlParams(p: ListingParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (p.q) qs.set('q', p.q);
  if (p.city) qs.set('city', p.city);
  if (p.businessType) qs.set('type', p.businessType.toLowerCase());
  if (p.minPrice != null) qs.set('min', String(p.minPrice));
  if (p.maxPrice != null) qs.set('max', String(p.maxPrice));
  if (p.trusted) qs.set('trusted', '1');
  if (p.gstVerified) qs.set('gst', '1');
  if (p.exporter) qs.set('exporter', '1');
  if (p.sort && p.sort !== 'relevance') qs.set('sort', p.sort);
  if (p.page && p.page > 1) qs.set('page', String(p.page));
  return qs;
}

export function hrefWith(base: string, current: ListingParams, change: Partial<ListingParams>): string {
  const next = { ...current, ...change };
  if (!('page' in change)) delete next.page; // any filter change starts from page 1
  const qs = toUrlParams(next).toString();
  return qs ? `${base}?${qs}` : base;
}

/** Only city and page variants are worth indexing; other filter combinations are noindex. */
export function isIndexable(p: ListingParams): boolean {
  return !(p.q || p.businessType || p.minPrice != null || p.maxPrice != null || p.trusted || p.gstVerified || p.exporter || (p.sort && p.sort !== 'relevance'));
}

/* ───────────── Pieces ───────────── */

export function CityChips({ base, params, data }: { base: string; params: ListingParams; data: ProductPage }) {
  if (!data.facets.cities.length) return null;
  return (
    <nav className="chips" aria-label="Filter by city">
      <Link className="chip" href={hrefWith(base, params, { city: undefined })} aria-current={!params.city}>All India</Link>
      {data.facets.cities.map((c) => (
        <Link key={c.value} className="chip" href={hrefWith(base, params, { city: c.value })} aria-current={params.city?.toLowerCase() === c.value.toLowerCase()}>
          {c.value} <small>{c.count}</small>
        </Link>
      ))}
    </nav>
  );
}

function Toggle({ base, params, field, label }: { base: string; params: ListingParams; field: 'trusted' | 'gstVerified' | 'exporter'; label: string }) {
  const on = !!params[field];
  return (
    <Link className="fopt" href={hrefWith(base, params, { [field]: on ? undefined : true })} aria-current={on} rel="nofollow">
      {label}
    </Link>
  );
}

export function Filters({ base, params, data }: { base: string; params: ListingParams; data: ProductPage }) {
  const typeCounts = new Map(data.facets.businessTypes.map((f) => [f.value, f.count]));
  const keep = Object.entries(Object.fromEntries(toUrlParams({ ...params, minPrice: undefined, maxPrice: undefined, page: undefined })));
  const active = !isIndexable({ ...params, q: undefined, sort: undefined }) || params.city;
  return (
    <div className="filters panel">
      {/* Collapsible on phones without JavaScript: the checkbox toggles the panel via CSS. */}
      <input type="checkbox" id="ftoggle" className="sr" />
      <label htmlFor="ftoggle" className="ftoggle">Filters</label>
      <div className="inner">
        <div className="fgroup">
          <h3>Business type</h3>
          {BUSINESS_TYPES.filter((t) => typeCounts.has(t) || params.businessType === t).map((t) => (
            <Link key={t} className="fopt" rel="nofollow" aria-current={params.businessType === t}
              href={hrefWith(base, params, { businessType: params.businessType === t ? undefined : t })}>
              {businessTypeLabel(t)} <small>{typeCounts.get(t) ?? 0}</small>
            </Link>
          ))}
        </div>
        <div className="fgroup">
          <h3>Supplier</h3>
          <Toggle base={base} params={params} field="trusted" label="DM Trusted only" />
          <Toggle base={base} params={params} field="gstVerified" label="GST verified" />
          <Toggle base={base} params={params} field="exporter" label="Exporters" />
        </div>
        <div className="fgroup">
          <h3>Price per unit (₹)</h3>
          <form className="price-form" action={base}>
            {keep.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <label className="sr" htmlFor="min">Minimum price</label>
            <input id="min" name="min" inputMode="numeric" placeholder="Min" defaultValue={params.minPrice ?? ''} />
            <span aria-hidden="true">–</span>
            <label className="sr" htmlFor="max">Maximum price</label>
            <input id="max" name="max" inputMode="numeric" placeholder="Max" defaultValue={params.maxPrice ?? ''} />
            <button className="btn btn-line btn-sm" type="submit">Apply</button>
          </form>
        </div>
        {active && <Link className="clear" href={params.q ? `${base}?q=${encodeURIComponent(params.q)}` : base}>Clear all filters</Link>}
      </div>
    </div>
  );
}

export function ListingCard({ p, tag }: { p: ProductCard; tag?: string }) {
  return (
    <article className="lcard panel">
      <ProductVisual name={p.name} category={p.category.name} image={p.images[0]}>
        {tag && <span className="tag">{tag}</span>}
      </ProductVisual>
      <div className="info">
        <h2><Link href={productPath(p.slug)}>{p.name}</Link></h2>
        <div>
          <PriceLine p={p} />
          {p.moq != null && <span className="moq"> · MOQ {p.moq.toLocaleString('en-IN')} {p.price.unit}</span>}
        </div>
        {p.specs.length > 0 && (
          <dl>
            {p.specs.map((s) => (
              <div key={s.label}><dt>{s.label}</dt><dd title={s.value}>{s.value}</dd></div>
            ))}
          </dl>
        )}
        <Link className="more-link" href={productPath(p.slug)}>More details →</Link>
      </div>
      <div className="sup">
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="who">
            <Monogram name={p.company.name} />
            <div>
              <b><Link href={storePath(p.company.slug)}>{p.company.name}</Link></b>
              <span className="loc">{p.company.city}, {p.company.state}</span>
            </div>
          </div>
          <TrustBadges c={p.company} />
          <RatingLine c={p.company} />
        </div>
        <div className="ctas">
          <LeadButton label="Get Best Price" product={p.name} productId={p.id} categoryId={p.category.id} companyId={p.company.id} supplier={p.company.name} />
          <LeadButton label="Send Inquiry" product={p.name} productId={p.id} categoryId={p.category.id} companyId={p.company.id} supplier={p.company.name} className="btn btn-line btn-sm" title={`Send an inquiry to ${p.company.name}`} />
        </div>
      </div>
    </article>
  );
}

export function Pager({ base, params, data }: { base: string; params: ListingParams; data: ProductPage }) {
  const pages = Math.min(50, Math.ceil(data.total / data.pageSize));
  if (pages <= 1) return null;
  const cur = data.page;
  const shown = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label="Pages">
      {cur > 1 && <Link href={hrefWith(base, params, { page: cur - 1 })} rel="prev">‹ Prev</Link>}
      {shown.map((n, i) => (
        <span key={n} style={{ display: 'contents' }}>
          {i > 0 && n - shown[i - 1] > 1 && <span className="gap">…</span>}
          {n === cur ? <span aria-current="page">{n}</span> : <Link href={hrefWith(base, params, { page: n })}>{n}</Link>}
        </span>
      ))}
      {cur < pages && <Link href={hrefWith(base, params, { page: cur + 1 })} rel="next">Next ›</Link>}
    </nav>
  );
}

/** Filters (left) · results (centre) · requirement box (right). */
export function ListingBody({ base, params, data, topic }: { base: string; params: ListingParams; data: ProductPage; topic: string }) {
  const from = (data.page - 1) * data.pageSize + 1;
  const to = from + data.items.length - 1;
  return (
    <div className="layout">
      <Filters base={base} params={params} data={data} />

      <section aria-label="Results">
        <div className="toolbar">
          <p className="results-note" style={{ margin: 0 }} aria-live="polite">
            {data.total
              ? `Showing ${from}–${to} of ${plural(data.total, 'product')}${params.city ? ` in ${params.city}` : ''}`
              : 'No products match these filters'}
          </p>
          <Suspense><SortSelect value={params.sort ?? 'relevance'} /></Suspense>
        </div>
        <div className="list">
          {data.items.map((p, i) => (
            <div key={p.id} style={{ display: 'contents' }}>
              {i === 3 && (
                <div className="lead-strip">
                  <div>
                    <h3>Not sure which {topic.toLowerCase()} you need?</h3>
                    <p>Describe your requirement. Our team shortlists 5 verified suppliers for you, free.</p>
                  </div>
                  <LeadButton label="Get free shortlist" product={topic} className="btn btn-orange btn-lg" title="Get a free supplier shortlist" />
                </div>
              )}
              <ListingCard p={p} tag={p.company.trustSeal ? 'DM Trusted' : undefined} />
            </div>
          ))}
          {!data.items.length && (
            <div className="panel empty">
              <b>No suppliers match these filters.</b>
              <span>Try another city, clear a filter, or post your requirement and we&apos;ll find suppliers for you.</span>
              <LeadButton label="Post Requirement" product={topic} title="Tell us what you need" />
            </div>
          )}
        </div>
        <Pager base={base} params={params} data={data} />
      </section>

      <aside className="side-right">
        <div className="sidebox panel">
          <h3>Looking for {topic.toLowerCase()}?</h3>
          <p>Tell us once. Get prices from up to 5 verified suppliers.</p>
          <LeadButton label="Get Quotes Now" product={topic} className="btn btn-orange btn-lg btn-block" />
        </div>
        <div className="sidebox panel">
          <h3>Why buyers use DIGI MART 360</h3>
          <ul className="ticks">
            <li>Every supplier GST-checked before listing</li>
            <li>Compare price, MOQ and replies side by side</li>
            <li>Factory prices, no middleman margin</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
