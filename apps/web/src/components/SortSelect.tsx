'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  ['relevance', 'Sort: Relevance'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Highest rated'],
  ['newest', 'Newest'],
] as const;

/** Changes ?sort= and goes back to page 1. Without JavaScript the Apply button submits it. */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <form action={pathname} style={{ display: 'flex', gap: 6 }}>
      {[...params.entries()]
        .filter(([k]) => k !== 'sort' && k !== 'page')
        .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="sr" htmlFor="sort">Sort by</label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.delete('page');
          if (e.target.value === 'relevance') next.delete('sort');
          else next.set('sort', e.target.value);
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
      >
        {OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <noscript><button className="btn btn-line btn-sm" type="submit">Apply</button></noscript>
    </form>
  );
}
