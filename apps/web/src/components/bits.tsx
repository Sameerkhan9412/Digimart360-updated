import Link from 'next/link';
import { monogram, monogramColor, plural, priceRange, replyTime } from '@/lib/format';
import { categoryPath, productPath, storePath } from '@/lib/seo';
import type { CompanySummary, ProductCard, Ref } from '@/lib/types';
import { ProductVisual } from './ProductVisual';

/** schema.org data for search engines. `<` is escaped so text can't close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function Breadcrumbs({ trail, current }: { trail: Ref[]; current?: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        <li><Link href="/">Home</Link></li>
        {trail.map((c) => (
          <li key={c.slug}><Link href={categoryPath(c.slug)}>{c.name}</Link></li>
        ))}
        {current && <li aria-current="page">{current}</li>}
      </ol>
    </nav>
  );
}

export function Monogram({ name, large }: { name: string; large?: boolean }) {
  return (
    <span className={large ? 'mono lg' : 'mono'} style={{ background: monogramColor(name) }} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}

export function TrustBadges({ c }: { c: CompanySummary }) {
  return (
    <div className="badges">
      {c.gstVerified && <span className="bdg gst" title="GSTIN checked by DIGI MART">✓ GST</span>}
      {c.trustSeal && <span className="bdg trust" title="Inspected by DIGI MART staff">◆ DM Trusted</span>}
      {c.yearsInBusiness != null && <span className="bdg yrs">{plural(c.yearsInBusiness, 'yr')}</span>}
      {c.exporter && <span className="bdg exp">Exporter</span>}
    </div>
  );
}

export function RatingLine({ c }: { c: CompanySummary }) {
  const reply = replyTime(c.responseHours);
  if (!c.rating && !reply) return null;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {c.rating && (
        <span className="rating" aria-label={`Rated ${c.rating.avg} out of 5 by ${c.rating.count} buyers`}>
          {c.rating.avg.toFixed(1)}<span>/5 ({c.rating.count})</span>
        </span>
      )}
      {reply && <span className="resp">{reply}</span>}
    </div>
  );
}

export function PriceLine({ p, ask = 'Ask for price' }: { p: ProductCard; ask?: string }) {
  const range = priceRange(p.price);
  return range ? (
    <span className="price num">
      {range} <small>/ {p.price.unit}</small>
    </span>
  ) : (
    <span className="ask">{ask}</span>
  );
}

/** Compact product tile for grids (home, related, supplier pages). */
export function ProductTile({ p, showSupplier = true }: { p: ProductCard; showSupplier?: boolean }) {
  const range = priceRange(p.price);
  return (
    <Link href={productPath(p.slug)} className="tile panel">
      <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} />
      <div className="body">
        <b>{p.name}</b>
        <span className="price num">
          {range ?? 'Ask for price'} {range && <small>/ {p.price.unit}</small>}
        </span>
        {p.moq != null && <span className="moq">MOQ {p.moq.toLocaleString('en-IN')} {p.price.unit}</span>}
        {showSupplier && <span className="sup">{p.company.name} · {p.company.city}</span>}
      </div>
    </Link>
  );
}

export function SupplierLink({ c }: { c: CompanySummary }) {
  return <Link href={storePath(c.slug)}>{c.name}</Link>;
}
