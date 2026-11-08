'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { Suggestions } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

type Option = { label: string; href: string; hint?: string };

/** Search with type-ahead. Works as a plain GET form to /search without JavaScript. */
export function SearchBox({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`${API}/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const s: Suggestions = await res.json();
        setOptions([
          ...s.categories.map((c) => ({ label: c.name, href: `/c/${c.slug}`, hint: 'Category' })),
          ...s.products.map((p) => ({ label: p, href: `/search?q=${encodeURIComponent(p)}` })),
          ...s.companies.map((c) => ({ label: c.name, href: `/store/${c.slug}`, hint: 'Supplier' })),
        ]);
        setActive(-1);
      } catch {
        /* aborted or offline: keep the plain search working */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const show = open && options.length > 0;

  return (
    <div className="searchwrap">
      <form
        className="search"
        role="search"
        action="/search"
        onSubmit={(e) => {
          if (show && active >= 0) {
            e.preventDefault();
            setOpen(false);
            router.push(options[active].href);
          }
        }}
      >
        <label className="sr" htmlFor="site-search">Search products, categories or suppliers</label>
        <input
          id="site-search"
          name="q"
          value={q}
          autoComplete="off"
          placeholder="Search products, e.g. ball valve, TMT bar, cotton yarn"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % options.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button type="submit">Search</button>
      </form>
      {show && (
        <ul className="suggest" id={listId} role="listbox">
          {options.map((o, i) => (
            <li key={o.href + i} role="presentation">
              <a id={`${listId}-${i}`} role="option" aria-selected={i === active} href={o.href} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)}>
                {o.label}
                {o.hint && <small>{o.hint}</small>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
