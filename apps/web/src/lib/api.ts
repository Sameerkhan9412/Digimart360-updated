import 'server-only';
import type {
  CategoryNode,
  CategoryPage,
  CompanyProfile,
  ListingParams,
  ProductDetail,
  ProductPage,
  PublicStorefront,
  SitemapData,
} from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Server-side API call. Sends the internal key so per-IP rate limits apply to
 * visitors, not to this server. `revalidate` = seconds Next.js may reuse the response.
 */
async function get<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(API_URL + path, {
    headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '', Accept: 'application/json' },
    next: { revalidate },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? message);
    } catch {}
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Returns null on 404 so pages can call notFound(). */
async function getOrNull<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    return await get<T>(path, revalidate);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function toQuery(params: ListingParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const api = {
  categories: () => get<CategoryNode[]>('/categories', 300),
  category: (slug: string) => getOrNull<CategoryPage>(`/categories/${encodeURIComponent(slug)}`, 300),
  products: (params: ListingParams) => get<ProductPage>('/products' + toQuery(params), 60),
  product: (slug: string) => getOrNull<ProductDetail>(`/products/${encodeURIComponent(slug)}`, 300),
  company: (slug: string) => getOrNull<CompanyProfile>(`/companies/${encodeURIComponent(slug)}`, 300),
  storefront: (slug: string) => getOrNull<PublicStorefront>(`/storefronts/${encodeURIComponent(slug)}`, 60),
  sitemap: () => get<SitemapData>('/sitemap', 3600),
  /** Which sign-in options the API offers (e.g. whether WhatsApp codes are on). */
  authConfig: () => get<{ google: boolean; otpChannels: string[] }>('/auth/config', 60),
};
