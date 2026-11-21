import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Breadcrumbs, PriceLine, RatingLine, TrustBadges } from '@/components/bits';
import { LeadButton } from '@/components/LeadButton';
import { ProductVisual } from '@/components/ProductVisual';
import { api } from '@/lib/api';
import { COMPARE_COOKIE, MAX_COMPARE, compareHref, parseSlugs } from '@/lib/compare';
import { businessTypeLabel, replyTime } from '@/lib/format';
import { productPath, storePath } from '@/lib/seo';
import type { ProductCard } from '@/lib/types';

export const metadata: Metadata = { title: 'Compare products', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ p?: string; diff?: string; full?: string }> };

const NONE = '—';
const same = (values: string[]) => new Set(values.map((v) => v.trim().toLowerCase())).size <= 1;

/** Every specification label any product has, in the order first met. */
function specLabels(items: ProductCard[]): string[] {
  const seen: string[] = [];
  for (const p of items) for (const s of p.specs) if (!seen.some((l) => l.toLowerCase() === s.label.toLowerCase())) seen.push(s.label);
  return seen;
}
const specOf = (p: ProductCard, label: string) => p.specs.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value ?? NONE;

function Post({ op, slug, from, children, label }: { op: 'remove' | 'clear'; slug?: string; from: string; children: React.ReactNode; label: string }) {
  return (
    <form action="/compare/update" method="post">
      <input type="hidden" name="op" value={op} />
      {slug && <input type="hidden" name="slug" value={slug} />}
      {from && <input type="hidden" name="from" value={from} />}
      <button type="submit" className="link-btn" aria-label={label}>{children}</button>
    </form>
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const shared = parseSlugs(sp.p);
  const asked = shared.length ? shared : parseSlugs((await cookies()).get(COMPARE_COOKIE)?.value);
  const items = asked.length ? await api.compare(asked) : [];
  // When opened from a shared link, remove/clear start from that list rather than the cookie.
  const from = shared.join(',');
  const onlyDiff = sp.diff === '1' && items.length > 1;

  if (items.length === 0) {
    return (
      <>
        <Breadcrumbs trail={[]} current="Compare products" />
        <section className="panel dcard" style={{ marginTop: 12 }}>
          <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>Compare products</h1>
          <p>Nothing to compare yet. Open a product and choose “Compare” to line it up against others, up to {MAX_COMPARE} at a time.</p>
          <Link className="btn btn-orange" href="/search">Find products</Link>
        </section>
      </>
    );
  }

  const rows = specLabels(items).map((label) => {
    const values = items.map((p) => specOf(p, label));
    return { label, values, differs: !same(values) };
  });
  const shown = onlyDiff ? rows.filter((r) => r.differs) : rows;
  const share = compareHref(items.map((p) => p.slug));
  const oneCategory = new Set(items.map((p) => p.category.id)).size === 1;

  const row = (label: string, cell: (p: ProductCard) => React.ReactNode) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      {items.map((p) => <td key={p.id}>{cell(p)}</td>)}
    </tr>
  );

  return (
    <>
      <Breadcrumbs trail={[]} current="Compare products" />
      <div className="sec-head" style={{ marginTop: 12 }}>
        <h1 style={{ fontSize: 24, color: 'var(--navy)' }}>
          Compare products <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>({items.length} of {MAX_COMPARE})</span>
        </h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {items.length > 1 && (
            <Link className="chip" aria-current={onlyDiff} href={`${share}${onlyDiff ? '' : '&diff=1'}`}>
              {onlyDiff && <span aria-hidden="true">✓ </span>}Show differences only
            </Link>
          )}
          <Post op="clear" from="" label="Remove all products from the comparison">Clear all</Post>
        </div>
      </div>

      {sp.full === '1' && <p className="notice" role="status">You can compare up to {MAX_COMPARE} products. Remove one to add another.</p>}
      {!oneCategory && <p className="muted">These products are in different categories, so their specifications may not line up.</p>}

      <div className="cmp-wrap panel" tabIndex={0} role="region" aria-label="Product comparison. Scroll sideways to see every product.">
        <table className="cmp">
          <caption className="sr">Side-by-side comparison of {items.length} products</caption>
          <thead>
            <tr>
              <td />
              {items.map((p) => (
                <th key={p.id} scope="col">
                  <div className="cmp-head">
                    <ProductVisual name={p.name} category={p.category.name} image={p.images[0]} />
                    <Link href={productPath(p.slug)}><b>{p.name}</b></Link>
                    <Post op="remove" slug={p.slug} from={from} label={`Remove ${p.name} from the comparison`}>✕ Remove</Post>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('Price', (p) => <PriceLine p={p} />)}
            {row('Minimum order', (p) => (p.moq != null ? `${p.moq.toLocaleString('en-IN')} ${p.price.unit}` : NONE))}
            {row('Supplier', (p) => <Link href={storePath(p.company.slug)}>{p.company.name}</Link>)}
            {row('Location', (p) => `${p.company.city}, ${p.company.state}`)}
            {row('Business type', (p) => p.company.businessTypes.map(businessTypeLabel).join(', ') || NONE)}
            {row('Verification', (p) => <TrustBadges c={p.company} />)}
            {row('Rating', (p) => (p.company.rating || replyTime(p.company.responseHours) ? <RatingLine c={p.company} /> : NONE))}
            {row('Category', (p) => p.category.name)}
            {shown.length > 0 && (
              <tr className="cmp-sec"><th scope="colgroup" colSpan={items.length + 1}>Specifications{onlyDiff ? ' that differ' : ''}</th></tr>
            )}
            {shown.map((r) => (
              <tr key={r.label} className={r.differs ? 'diff' : undefined}>
                <th scope="row">{r.label}{r.differs && <small className="cmp-flag"> differs</small>}</th>
                {r.values.map((v, i) => <td key={items[i].id}>{v}</td>)}
              </tr>
            ))}
            <tr className="cmp-act">
              <th scope="row"><span className="sr">Contact</span></th>
              {items.map((p) => (
                <td key={p.id}>
                  <LeadButton label="Get Best Price" product={p.name} productId={p.id} categoryId={p.category.id} companyId={p.company.id} supplier={p.company.name} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {onlyDiff && shown.length === 0 && <p className="muted">These products have identical specifications.</p>}

      <p className="muted" style={{ marginTop: 12 }}>
        {items.length < MAX_COMPARE && <>Want another? Open a product and choose “Compare”. </>}
        Share this comparison: <Link href={share}>{share}</Link>
      </p>
    </>
  );
}
