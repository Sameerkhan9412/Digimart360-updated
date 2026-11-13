import type { CompanyProfile, ProductCard, ProductDetail, Ref } from './types';

export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export const SITE_NAME = 'DIGI MART 360';

/** Full address of a supplier website host. In development (*.localhost) it keeps the dev server's port. */
export function siteUrl(host: string): string {
  const site = new URL(SITE_URL);
  const port = host.endsWith('localhost') && site.port ? `:${site.port}` : '';
  return `${site.protocol}//${host}${port}`;
}
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost';

export const url = (path: string) => SITE_URL + path;
export const productPath = (slug: string) => `/p/${slug}`;
export const categoryPath = (slug: string) => `/c/${slug}`;
export const storePath = (slug: string) => `/store/${slug}`;

/* schema.org structured data, rendered as JSON-LD (see components/JsonLd.tsx). */

export function breadcrumbLd(trail: Ref[], last?: { name: string; path: string }) {
  const items = [
    { name: 'Home', path: '/' },
    ...trail.map((c) => ({ name: c.name, path: categoryPath(c.slug) })),
    ...(last ? [last] : []),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: url(it.path) })),
  };
}

function offers(p: ProductCard) {
  if (p.price.min == null && p.price.max == null) return undefined;
  const lo = p.price.min ?? p.price.max!;
  const hi = p.price.max ?? p.price.min!;
  const seller = { '@type': 'Organization', name: p.company.name, url: url(storePath(p.company.slug)) };
  return lo === hi
    ? { '@type': 'Offer', price: lo, priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: url(productPath(p.slug)), seller }
    : { '@type': 'AggregateOffer', lowPrice: lo, highPrice: hi, priceCurrency: 'INR', offerCount: 1, url: url(productPath(p.slug)), seller };
}

/** Product markup. Ratings are the supplier's, not the product's, so they are deliberately left out. */
export function productLd(p: ProductDetail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.summary ?? p.description ?? undefined,
    sku: p.slug,
    category: p.breadcrumb.map((b) => b.name).join(' > '),
    image: p.images.length ? p.images : undefined,
    url: url(productPath(p.slug)),
    brand: { '@type': 'Brand', name: p.company.name },
    additionalProperty: p.specs.map((s) => ({ '@type': 'PropertyValue', name: s.label, value: s.value })),
    offers: offers(p),
  };
}

export function itemListLd(items: ProductCard[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: url(productPath(p.slug)), name: p.name })),
  };
}

export function organizationLd(c: CompanyProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: c.name,
    legalName: c.legalName ?? undefined,
    url: url(storePath(c.slug)),
    logo: c.logoUrl ?? undefined,
    foundingDate: c.yearEstablished ? String(c.yearEstablished) : undefined,
    description: c.description ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.addressLine ?? undefined,
      addressLocality: c.city,
      addressRegion: c.state,
      postalCode: c.pincode ?? undefined,
      addressCountry: 'IN',
    },
    sameAs: c.website ? [c.website] : undefined,
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
