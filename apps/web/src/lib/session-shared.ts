/** Cookie names and options, shared by the middleware (edge) and server code. No Node-only imports here. */
export const ACCESS_COOKIE = 'dm_at';
export const REFRESH_COOKIE = 'dm_rt';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const base = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };

export const accessCookie = (t: Tokens) => ({
  name: ACCESS_COOKIE,
  value: t.accessToken,
  ...base,
  maxAge: Math.max(60, t.expiresIn - 30),
});

export const refreshCookie = (t: Tokens) => ({
  name: REFRESH_COOKIE,
  value: t.refreshToken,
  ...base,
  maxAge: 60 * 60 * 24 * 30,
});

/** Only follow redirects to pages on this site. */
export function safeNext(next: unknown, fallback = '/dashboard'): string {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : fallback;
}
