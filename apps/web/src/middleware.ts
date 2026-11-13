import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookie, refreshCookie, type Tokens } from '@/lib/session-shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

/**
 * Guards /dashboard (suppliers) and /account and /rfq (buyers). Access tokens last minutes; when one has expired we swap the
 * refresh token for a new pair here (the only place that can set cookies before
 * the page renders), then let the request through with the fresh token.
 */
export async function middleware(req: NextRequest) {
  const login = () => {
    const url = new URL('/signin', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url);
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  };

  if (req.cookies.get(ACCESS_COOKIE)) return NextResponse.next();
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return login();

  let tokens: Tokens;
  try {
    const r = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '' },
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
  const headers = new Headers(req.headers);
  headers.set('cookie', req.cookies.toString());
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(accessCookie(tokens));
  res.cookies.set(refreshCookie(tokens));
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/account/:path*', '/rfq/:path*'] };
