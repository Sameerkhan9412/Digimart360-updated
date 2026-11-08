'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CategoryNode } from '@/lib/types';

/** "All Categories" button + panel: top-level groups on the left, their categories on the right. */
export function MegaMenu({ tree }: { tree: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const group = tree[sel];
  return (
    <>
      <button ref={button} className="all" type="button" aria-expanded={open} aria-controls="mega" onClick={() => setOpen((o) => !o)}>
        ☰ All Categories
      </button>
      <div className="mega" id="mega" ref={panel} hidden={!open}>
        <div className="wrap">
          <div className="rail" role="tablist" aria-label="Category groups">
            {tree.map((g, i) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={i === sel}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => setSel(i)}
              >
                <i aria-hidden="true">{g.icon}</i>
                <span>{g.name}</span>
                <small>{g.productCount || ''}</small>
              </button>
            ))}
          </div>
          {group && (
            <div className="pane" role="tabpanel">
              {group.children.map((c) => (
                <div key={c.id}>
                  <h4><Link href={`/c/${c.slug}`}>{c.name}</Link></h4>
                  <ul>
                    {c.children.map((leaf) => (
                      <li key={leaf.id}><Link href={`/c/${leaf.slug}`}>{leaf.name}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <h4><Link href={`/c/${group.slug}`}>All {group.name} →</Link></h4>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
