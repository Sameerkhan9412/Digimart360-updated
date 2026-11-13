import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from './api';
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookie, refreshCookie, type Tokens } from './session-shared';
import type { BuyerRfq, CompanyStatus, ModerationCompany, OwnCompany, Page, ProductStatus, OwnProduct, RfqSummary, SupplierRfq } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export async function saveSession(t: Tokens) {
  const jar = await cookies();
  jar.set(accessCookie(t));
  jar.set(refreshCookie(t));
}

export async function clearSession() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  if (refresh) {
    // Revoke it server-side too; ignore failures, the cookie is gone either way.
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => {});
  }
}

export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(REFRESH_COOKIE) || jar.has(ACCESS_COOKIE);
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = res.statusText;
  try {
    const body = await res.json();
    message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? message);
  } catch {}
  return new ApiError(res.status, message);
}

/** Call the API as the signed-in supplier. Sends them to sign-in if the session is gone. */
export async function authed(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/signin');
  const { json, headers, ...rest } = init;
  const res = await fetch(API_URL + path, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '',
      Accept: 'application/json',
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/signin');
  return res;
}

export async function authedJson<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await authed(path, init);
  if (!res.ok) throw await errorFrom(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const dash = {
  /** null = the user has not created a company yet. */
  async company(): Promise<OwnCompany | null> {
    const res = await authed('/me/company');
    if (res.status === 404) return null;
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  },
  /** Everything except archived products, then the archived ones. */
  products: (): Promise<OwnProduct[]> =>
    Promise.all([authedJson<OwnProduct[]>('/me/products'), authedJson<OwnProduct[]>('/me/products?status=ARCHIVED')]).then(
      ([live, archived]) => [...live, ...archived],
    ),
  async product(id: string): Promise<OwnProduct | null> {
    const res = await authed(`/me/products/${encodeURIComponent(id)}`);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  },
};

async function orNull<T>(path: string): Promise<T | null> {
  const res = await authed(path);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export const rfqs = {
  /** The signed-in person's own requirements. */
  mine: () => authedJson<RfqSummary[]>('/me/rfqs'),
  get: (id: string) => orNull<BuyerRfq>(`/me/rfqs/${encodeURIComponent(id)}`),
  /** Requirements sent to this supplier or open in their categories. [] if the company is not approved yet. */
  async inbox(): Promise<SupplierRfq[] | 'not-approved'> {
    const res = await authed('/me/rfq-inbox');
    if (res.status === 403) return 'not-approved';
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  },
  inboxItem: (id: string) => orNull<SupplierRfq>(`/me/rfq-inbox/${encodeURIComponent(id)}`),
};

export const admin = {
  /** 'forbidden' when the signed-in person is not an admin. */
  async companies(status: CompanyStatus): Promise<Page<ModerationCompany> | 'forbidden'> {
    const res = await authed(`/admin/catalog/companies?status=${status}`);
    if (res.status === 403) return 'forbidden';
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  },
  async products(status: ProductStatus): Promise<Page<OwnProduct> | 'forbidden'> {
    const res = await authed(`/admin/catalog/products?status=${status}`);
    if (res.status === 403) return 'forbidden';
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  },
};

/** Readable message from any thrown error, for forms. */
export function messageOf(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
}
