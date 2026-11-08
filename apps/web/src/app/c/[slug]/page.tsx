import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, JsonLd } from '@/components/bits';
import { CityChips, hrefWith, isIndexable, ListingBody, readParams } from '@/components/Listing';
import { LeadButton } from '@/components/LeadButton';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';
import { breadcrumbLd, categoryPath, itemListLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await api.category(slug);
  if (!cat) return { title: 'Category not found', robots: { index: false } };
  const p = readParams(sp);
  const base = categoryPath(cat.slug);
  // City pages are real landing pages ("ball valves in Ahmedabad"); other filter combinations are not indexed.
  const canonical = p.city ? hrefWith(base, { city: p.city }, {}) : base;
  const title = p.city ? `${cat.name} in ${p.city} · Manufacturers & Suppliers` : cat.seoTitle.replace(/ \| DIGI MART 360$/, '');
  return {
    title,
    description: p.city ? `${cat.name} suppliers in ${p.city}. ${cat.seoDescription}` : cat.seoDescription,
    alternates: { canonical: p.page && p.page > 1 ? hrefWith(base, { city: p.city, page: p.page }, { page: p.page }) : canonical },
    robots: isIndexable(p) ? undefined : { index: false, follow: true },
    openGraph: { title, description: cat.seoDescription, url: canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await api.category(slug);
  if (!cat) notFound();

  const p = readParams(sp);
  const base = categoryPath(cat.slug);
  const data = await api.products({ ...p, category: cat.slug, pageSize: 20 });
  // Pages past the end would be empty, thin pages: treat them as not found.
  if (p.page && p.page > 1 && data.items.length === 0) notFound();
  const parents = cat.breadcrumb.slice(0, -1);

  return (
    <>
      <JsonLd data={breadcrumbLd(cat.breadcrumb)} />
      {data.items.length > 0 && <JsonLd data={itemListLd(data.items)} />}
      <Breadcrumbs trail={parents} current={cat.name} />

      <div className="title-row">
        <div>
          <h1>{cat.name} Manufacturers &amp; Suppliers{p.city ? ` in ${p.city}` : ''}</h1>
          <p>
            <b className="num">{plural(cat.productCount, 'product')}</b> from GST-checked suppliers
            {cat.description ? ` · ${cat.description}` : ''}
          </p>
        </div>
        <LeadButton label="Get quotes from 5 suppliers" product={cat.name} className="btn btn-soft" title={`Get quotes from 5 ${cat.name.toLowerCase()} suppliers`} />
      </div>

      {cat.children.length > 0 && (
        <nav className="chips" aria-label={`Types of ${cat.name}`} style={{ marginBottom: 8 }}>
          {cat.children.filter((c) => c.productCount > 0).map((c) => (
            <Link key={c.id} className="chip" href={categoryPath(c.slug)}>{c.name} <small>{c.productCount}</small></Link>
          ))}
        </nav>
      )}
      <CityChips base={base} params={p} data={data} />

      <ListingBody base={base} params={p} data={data} topic={cat.name} />

      <div className="below">
        {cat.children.length > 0 && (
          <section className="panel" aria-labelledby="sub-h">
            <div className="sec-head"><h2 id="sub-h">Browse {cat.name.toLowerCase()} by type</h2></div>
            <div className="subcats">
              {cat.children.map((c) => (
                <Link key={c.id} href={categoryPath(c.slug)}>{c.name} <small>{c.productCount}</small></Link>
              ))}
            </div>
          </section>
        )}
        {data.facets.cities.length > 1 && (
          <section className="panel" aria-labelledby="city-h">
            <div className="sec-head"><h2 id="city-h">{cat.name} suppliers by city</h2></div>
            <div className="cities">
              {data.facets.cities.map((c) => (
                <Link key={c.value} href={hrefWith(base, {}, { city: c.value })}>{cat.name} in {c.value} ({c.count})</Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
