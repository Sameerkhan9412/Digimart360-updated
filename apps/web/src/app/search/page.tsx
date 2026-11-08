import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CityChips, ListingBody, readParams } from '@/components/Listing';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = readParams(await searchParams);
  // Internal search results are thin, ever-changing pages: keep them out of Google's index.
  return { title: q ? `“${q}” · Search results` : 'Search', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const p = readParams(await searchParams);
  const data = await api.products({ ...p, pageSize: 20 });
  // Pages past the end would be empty, thin pages: treat them as not found.
  if (p.page && p.page > 1 && data.items.length === 0) notFound();
  const topic = p.q ?? 'products';

  return (
    <>
      <div className="title-row" style={{ marginTop: 16 }}>
        <div>
          <h1>{p.q ? <>Results for “{p.q}”</> : 'All products'}</h1>
          <p><b className="num">{plural(data.total, 'product')}</b> from GST-checked suppliers</p>
        </div>
      </div>
      <CityChips base="/search" params={p} data={data} />
      <ListingBody base="/search" params={p} data={data} topic={topic} />
    </>
  );
}
