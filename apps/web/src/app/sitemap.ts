import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { categoryPath, productPath, storePath, url } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Every public page, from the API's list of live categories, products and suppliers. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await api.sitemap();
  return [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/sell'), changeFrequency: 'monthly', priority: 0.5 },
    ...data.categories.map((c) => ({ url: url(categoryPath(c.slug)), lastModified: c.updatedAt, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...data.products.map((p) => ({ url: url(productPath(p.slug)), lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...data.companies.map((c) => ({ url: url(storePath(c.slug)), lastModified: c.updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
