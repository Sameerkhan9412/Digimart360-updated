import 'server-only';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { internalHeaders } from './client-ip';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

/** Crawlers, link previews, monitors and scripts are not customers looking at a product. */
const NOT_A_VISITOR = /bot|crawl|spider|slurp|preview|facebookexternalhit|monitor|uptime|pingdom|lighthouse|headless|curl|wget|python|httpclient|axios|node-fetch|go-http|vercel/i;

export type ViewKind = 'product' | 'company' | 'site';

/**
 * Count one view for the supplier's analytics, after the response has gone out (the visitor never waits
 * for it, and a failure here is ignored). Skips crawlers and the browser's guesses at the next page.
 * Call it only once the page is known to exist and be public.
 */
export async function trackView(kind: ViewKind, slug: string): Promise<void> {
  const h = await headers();
  const ua = h.get('user-agent') ?? '';
  if (!ua || NOT_A_VISITOR.test(ua)) return;
  if (h.get('next-router-prefetch') || h.get('purpose') === 'prefetch' || (h.get('sec-purpose') ?? '').includes('prefetch')) return;

  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...internalHeaders(h) },
    body: JSON.stringify({ kind, slug }),
    cache: 'no-store' as const,
    signal: AbortSignal.timeout(5000),
  };
  after(async () => {
    try {
      await fetch(`${API_URL}/internal/track`, request);
    } catch {
      /* analytics must never break a page */
    }
  });
}
