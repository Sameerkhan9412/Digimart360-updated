import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { Breadcrumb, FacetValue, ProductCard, ProductDetail, ProductPage, toProductCard, toSpecs } from '../dto/views';
import { ListingQueryDto } from './listing.dto';

export class Suggestions {
  @ApiProperty({ type: [Breadcrumb] }) categories: Breadcrumb[];
  @ApiProperty({ type: [String], description: 'Product names to use as search terms' }) products: string[];
  @ApiProperty({ type: [Breadcrumb], description: 'Suppliers (name + company slug)' }) companies: Breadcrumb[];
}

const INCLUDE = { company: true, category: true } as const;
/** Only products that are live AND whose supplier is approved are public. */
const PUBLIC_WHERE: Prisma.ProductWhereInput = {
  status: ProductStatus.ACTIVE,
  company: { status: CompanyStatus.ACTIVE },
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async list(query: ListingQueryDto): Promise<ProductPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const categoryIds = query.category ? await this.categories.descendantIds(query.category) : undefined;
    const q = query.q && query.q.length >= 2 ? query.q : undefined;

    const where = (omit?: 'city' | 'businessType') => {
      const c: Prisma.Sql[] = [Prisma.sql`p."status" = 'ACTIVE'`, Prisma.sql`c."status" = 'ACTIVE'`];
      if (q) c.push(Prisma.sql`(p."searchVector" @@ websearch_to_tsquery('english', ${q}) OR p."name" ILIKE ${'%' + escapeLike(q) + '%'})`);
      if (categoryIds) c.push(Prisma.sql`p."categoryId" IN (${Prisma.join(categoryIds.map((id) => Prisma.sql`${id}::uuid`))})`);
      if (query.city && omit !== 'city') c.push(Prisma.sql`lower(c."city") = lower(${query.city})`);
      if (query.businessType && omit !== 'businessType') c.push(Prisma.sql`${query.businessType}::"BusinessType" = ANY(c."businessTypes")`);
      if (query.minPrice != null) c.push(Prisma.sql`coalesce(p."priceMax", p."priceMin") >= ${query.minPrice}`);
      if (query.maxPrice != null) c.push(Prisma.sql`p."priceMin" <= ${query.maxPrice}`);
      if (query.trusted) c.push(Prisma.sql`c."trustSeal" = true`);
      if (query.gstVerified) c.push(Prisma.sql`c."gstVerifiedAt" IS NOT NULL`);
      if (query.exporter) c.push(Prisma.sql`('EXPORTER' = ANY(c."businessTypes") OR cardinality(c."exportsTo") > 0)`);
      if (query.company) c.push(Prisma.sql`c."slug" = ${query.company}`);
      return Prisma.sql`WHERE ${Prisma.join(c, ' AND ')}`;
    };

    const rank = q
      ? Prisma.sql`ts_rank(p."searchVector", websearch_to_tsquery('english', ${q})) + CASE WHEN p."name" ILIKE ${escapeLike(q) + '%'} THEN 0.5 ELSE 0 END`
      : Prisma.sql`0`;
    const quality = Prisma.sql`c."trustSeal" DESC, c."ratingAvg" DESC NULLS LAST, p."publishedAt" DESC NULLS LAST`;
    const order = {
      relevance: Prisma.sql`ORDER BY rank DESC, ${quality}`,
      price_asc: Prisma.sql`ORDER BY p."priceMin" ASC NULLS LAST, ${quality}`,
      price_desc: Prisma.sql`ORDER BY coalesce(p."priceMax", p."priceMin") DESC NULLS LAST, ${quality}`,
      newest: Prisma.sql`ORDER BY p."publishedAt" DESC NULLS LAST`,
      rating: Prisma.sql`ORDER BY c."ratingAvg" DESC NULLS LAST, c."ratingCount" DESC, ${quality}`,
    }[query.sort ?? 'relevance'];
    const from = Prisma.sql`FROM "products" p JOIN "companies" c ON c."id" = p."companyId"`;

    const [rows, cities, types] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; total: bigint }[]>`
        SELECT p."id", ${rank} AS rank, count(*) OVER() AS total
        ${from} ${where()} ${order}, p."id"
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      this.prisma.$queryRaw<FacetRow[]>`
        SELECT min(c."city") AS value, count(*) AS count ${from} ${where('city')}
        GROUP BY lower(c."city") ORDER BY count DESC, value LIMIT 15`,
      this.prisma.$queryRaw<FacetRow[]>`
        SELECT t::text AS value, count(*) AS count ${from} CROSS JOIN LATERAL unnest(c."businessTypes") t
        ${where('businessType')} GROUP BY t ORDER BY count DESC`,
    ]);

    const ids = rows.map((r) => r.id);
    const products = ids.length
      ? await this.prisma.product.findMany({ where: { id: { in: ids } }, include: INCLUDE })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    return {
      items: ids.map((id) => byId.get(id)).filter((p) => !!p).map(toProductCard),
      total: rows.length ? Number(rows[0].total) : await this.countOnly(from, where()),
      page,
      pageSize,
      facets: { cities: cities.map(facet), businessTypes: types.map(facet) },
    };
  }

  async detail(slug: string): Promise<ProductDetail> {
    const p = await this.prisma.product.findFirst({ where: { slug, ...PUBLIC_WHERE }, include: INCLUDE });
    if (!p) throw new NotFoundException('Product not found');

    const [breadcrumb, moreFromCompany, related] = await Promise.all([
      this.categories.breadcrumbFor(p.categoryId),
      this.prisma.product.findMany({
        where: { ...PUBLIC_WHERE, companyId: p.companyId, id: { not: p.id } },
        include: INCLUDE,
        orderBy: { publishedAt: 'desc' },
        take: 4,
      }),
      this.prisma.product.findMany({
        where: { ...PUBLIC_WHERE, categoryId: p.categoryId, companyId: { not: p.companyId } },
        include: INCLUDE,
        orderBy: [{ company: { trustSeal: 'desc' } }, { publishedAt: 'desc' }],
        take: 4,
      }),
    ]);

    return {
      ...toProductCard(p),
      specs: toSpecs(p.specs),
      description: p.description,
      breadcrumb,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      moreFromCompany: moreFromCompany.map(toProductCard),
      related: related.map(toProductCard),
    };
  }

  /** Type-ahead for the search box: categories, product names, suppliers. */
  async suggest(q: string): Promise<Suggestions> {
    if (q.length < 2) return { categories: [], products: [], companies: [] };
    const like = `%${escapeLike(q)}%`;
    const [categories, products, companies] = await Promise.all([
      this.prisma.$queryRaw<Breadcrumb[]>`
        SELECT "name", "slug" FROM "categories"
        WHERE "isActive" AND ("name" ILIKE ${like} OR similarity("name", ${q}) > 0.3)
        ORDER BY ("name" ILIKE ${escapeLike(q) + '%'}) DESC, similarity("name", ${q}) DESC LIMIT 5`,
      this.prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT ON (lower(p."name")) p."name", similarity(p."name", ${q}) AS s
        FROM "products" p JOIN "companies" c ON c."id" = p."companyId"
        WHERE p."status" = 'ACTIVE' AND c."status" = 'ACTIVE' AND (p."name" ILIKE ${like} OR similarity(p."name", ${q}) > 0.3)
        ORDER BY lower(p."name"), s DESC LIMIT 6`,
      this.prisma.$queryRaw<Breadcrumb[]>`
        SELECT "name", "slug" FROM "companies"
        WHERE "status" = 'ACTIVE' AND ("name" ILIKE ${like} OR similarity("name", ${q}) > 0.35)
        ORDER BY similarity("name", ${q}) DESC LIMIT 3`,
    ]);
    return { categories, products: products.map((p) => p.name), companies };
  }

  /** Public URLs for the sitemap. */
  async sitemapEntries(): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.prisma.product.findMany({
      where: PUBLIC_WHERE,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50_000,
    });
  }

  private async countOnly(from: Prisma.Sql, where: Prisma.Sql): Promise<number> {
    const [r] = await this.prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n ${from} ${where}`;
    return Number(r.n);
  }
}

interface FacetRow {
  value: string;
  count: bigint;
}
const facet = (r: FacetRow): FacetValue => ({ value: r.value, count: Number(r.count) });

/** Treat % and _ typed by the user as literal characters in ILIKE. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

export type { ProductCard };
