import { NextRequest, NextResponse } from 'next/server';
import { internalHeaders } from '@/lib/client-ip';
import { buildCsp, originOf } from '@/lib/csp';
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookie, refreshCookie, type Tokens } from '@/lib/session-shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const GUARDED = ['/dashboard', '/account', '/rfq', '/admin'];

/** Hosts that serve the marketplace itself. Every other host may be a supplier's website. */
const MARKET_HOSTS = (() => {
  const site = new URL(process.env.SITE_URL ?? 'http://localhost:3001').hostname;
  const root = process.env.ROOT_DOMAIN ?? 'localhost';
  return new Set([site, `www.${site}`, root, `www.${root}`, 'localhost', '127.0.0.1']);
})();

interface HostMatch { slug: string; canonicalHost: string }
const hostCache = new Map<string, { value: HostMatch | null; until: number }>();
/** The lookup itself failed (API down): not the same as "this is not a supplier website". */
const LOOKUP_FAILED = 'lookup-failed' as const;

/** Which supplier website lives at this host? Cached briefly so most requests skip the API call. */
async function siteFor(host: string): Promise<HostMatch | null | typeof LOOKUP_FAILED> {
  const hit = hostCache.get(host);
  if (hit && hit.until > Date.now()) return hit.value;
  let value: HostMatch | null = null;
  let ttl = 30_000;
  try {
    const r = await fetch(`${API_URL}/storefronts/by-host?host=${encodeURIComponent(host)}`, {
      headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '' },
      cache: 'no-store',
    });
    if (r.ok) {
      value = await r.json();
      ttl = 60_000;
    } else if (r.status !== 404) {
      ttl = 0; // API trouble: ask again next time instead of remembering "no".
    }
  } catch {
    ttl = 0;
  }
  if (ttl > 0) {
    if (hostCache.size > 2000) hostCache.clear();
    hostCache.set(host, { value, until: Date.now() + ttl });
    return value;
  }
  return LOOKUP_FAILED;
}

/** A supplier's own website: send the visitor to its canonical address, or serve /sites/<slug>/... */
async function storefront(req: NextRequest, host: string): Promise<NextResponse | null> {
  const match = await siteFor(host);
  if (match === LOOKUP_FAILED) {
    // Do not show the marketplace under a supplier's domain just because the API blinked.
    return new NextResponse('This website is temporarily unavailable. Please try again in a minute.', { status: 503, headers: { 'Retry-After': '30' } });
  }
  if (!match) return null;

  if (match.canonicalHost !== host) {
    const local = host.endsWith('localhost');
    const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
    const port = local && req.nextUrl.port ? `:${req.nextUrl.port}` : '';
    return NextResponse.redirect(`${proto}://${match.canonicalHost}${port}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/sites/${match.slug}${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`;
  const headers = new Headers(req.headers);
  headers.set('x-site-slug', match.slug);
  return NextResponse.rewrite(url, { request: { headers } });
}

/**
 * 1. A supplier's host (acme.digimart360.com or their own domain) is rewritten to their website.
 * 2. /dashboard, /account, /rfq and /admin need a session. Access tokens last minutes; when one has
 *    expired we swap the refresh token for a new pair here (the only place that can set cookies
 *    before the page renders), then let the request through with the fresh token.
 */
async function route(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '');
  if (host && !MARKET_HOSTS.has(host)) {
    const res = await storefront(req, host);
    if (res) return res;
  }

  // Only this middleware may say "this is a supplier website"; ignore the header if a visitor sends it.
  const clean = new Headers(req.headers);
  clean.delete('x-site-slug');

  const path = req.nextUrl.pathname;
  if (!GUARDED.some((p) => path === p || path.startsWith(p + '/'))) return NextResponse.next({ request: { headers: clean } });

  const login = () => {
    const url = new URL('/signin', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url);
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  };

  if (req.cookies.get(ACCESS_COOKIE)) return NextResponse.next({ request: { headers: clean } });
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return login();

  let tokens: Tokens;
  try {
    const r = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalHeaders(req.headers) },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: 'no-store',
    });
    if (!r.ok) return login();
    tokens = await r.json();
  } catch {
    return login();
  }

  // Pass the new token on to this very request, and store it in the browser.
  req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  req.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  clean.set('cookie', req.cookies.toString());
  const res = NextResponse.next({ request: { headers: clean } });
  res.cookies.set(accessCookie(tokens));
  res.cookies.set(refreshCookie(tokens));
  return res;
}

/**
 * Every response carries a Content-Security-Policy with a fresh nonce. The policy is also put on the
 * request headers so Next.js stamps its own inline scripts with that nonce while rendering.
 */
export async function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV !== 'production',
    apiOrigin: originOf(process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL),
    https: req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https',
  });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  const res = await route(new NextRequest(req, { headers }));
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  // Everything except Next's own files and static assets.
  matcher: ['/((?!_next/|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)'],
};
