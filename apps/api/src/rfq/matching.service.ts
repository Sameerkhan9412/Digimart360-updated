import { Injectable } from '@nestjs/common';
import { CompanyStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Most suppliers told about one RFQ. Keeps inboxes useful and email volume sane. */
export const MAX_INVITES = 15;
/** How many suppliers per tier are looked at before the final ordering. Far more than MAX_INVITES, still bounded. */
const CANDIDATES = 200;

/**
 * "Related" categories for an RFQ in category X: X itself, everything below it,
 * and X's siblings (same parent). A supplier selling any of those is a candidate.
 */
export class CategoryGraph {
  private readonly children = new Map<string, string[]>();
  private readonly parent = new Map<string, string | null>();

  constructor(cats: { id: string; parentId: string | null }[]) {
    for (const c of cats) {
      this.parent.set(c.id, c.parentId);
      if (c.parentId) this.children.set(c.parentId, [...(this.children.get(c.parentId) ?? []), c.id]);
    }
  }

  has(id: string) {
    return this.parent.has(id);
  }

  /** The category and all categories below it. */
  exact(id: string): Set<string> {
    const out = new Set<string>();
    const walk = (x: string) => {
      out.add(x);
      (this.children.get(x) ?? []).forEach(walk);
    };
    if (this.has(id)) walk(id);
    return out;
  }

  related(id: string): Set<string> {
    const out = this.exact(id);
    const p = this.parent.get(id);
    if (p) (this.children.get(p) ?? []).forEach((s) => this.exact(s).forEach((x) => out.add(x)));
    return out;
  }

  /**
   * Every category whose RFQs a seller of `productCategoryIds` should see.
   * A category c is visible when some product category p is in related(c). Walking up from each p is
   * cheap: c qualifies if it is an ancestor-or-self of p, or a sibling of one (same parent).
   */
  visibleTo(productCategoryIds: Set<string>): Set<string> {
    const out = new Set<string>();
    for (const p of productCategoryIds) {
      for (let a: string | null | undefined = this.has(p) ? p : null; a; a = this.parent.get(a)) {
        out.add(a);
        const up = this.parent.get(a);
        if (up) (this.children.get(up) ?? []).forEach((sibling) => out.add(sibling));
      }
    }
    return out;
  }
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  private cached: { graph: CategoryGraph; until: number } | null = null;

  /** The category tree changes rarely, so it is reused for 30 seconds instead of being loaded on every request. */
  async graph(): Promise<CategoryGraph> {
    if (this.cached && this.cached.until > Date.now()) return this.cached.graph;
    const graph = new CategoryGraph(await this.prisma.category.findMany({ select: { id: true, parentId: true } }));
    this.cached = { graph, until: Date.now() + 30_000 };
    return graph;
  }

  /** Category ids a supplier currently sells in (live products only). */
  async sellerCategories(companyId: string): Promise<Set<string>> {
    const rows = await this.prisma.product.findMany({
      where: { companyId, status: ProductStatus.ACTIVE },
      distinct: ['categoryId'],
      select: { categoryId: true },
    });
    return new Set(rows.map((r) => r.categoryId));
  }

  /**
   * Pick the suppliers to tell about an RFQ. A supplier the buyer asked for by name
   * always comes first; the rest are ranked by how close their products are to the
   * request, then trust, then whether they are in the delivery state.
   */
  async match(rfq: { categoryId: string; state: string; companyId?: string | null }, buyerId: string): Promise<string[]> {
    const graph = await this.graph();
    const exact = graph.exact(rfq.categoryId);
    const related = graph.related(rfq.categoryId);

    const ids: string[] = [];
    if (rfq.companyId) {
      const asked = await this.prisma.company.findFirst({
        where: { id: rfq.companyId, status: CompanyStatus.ACTIVE, ownerId: { not: buyerId } },
        select: { id: true },
      });
      if (asked) ids.push(asked.id);
    }

    // Suppliers selling in the exact category come first, then those in related categories.
    // Each tier is a bounded supplier query (never a scan of products), best-trusted first.
    for (const tier of [exact, related]) {
      if (ids.length >= MAX_INVITES) break;
      const found = await this.prisma.company.findMany({
        where: {
          status: CompanyStatus.ACTIVE,
          ownerId: { not: buyerId },
          id: { notIn: ids },
          products: { some: { status: ProductStatus.ACTIVE, categoryId: { in: [...tier] } } },
        },
        orderBy: [{ trustSeal: 'desc' }, { gstVerifiedAt: { sort: 'desc', nulls: 'last' } }],
        take: CANDIDATES,
        select: { id: true, state: true, trustSeal: true, gstVerifiedAt: true },
      });
      // Trust, then GST, then "same state as the delivery" as the final tie-break (the sort is stable).
      const weight = (c: (typeof found)[number]) => (c.trustSeal ? 20 : 0) + (c.gstVerifiedAt ? 10 : 0) + (c.state.toLowerCase() === rfq.state.toLowerCase() ? 5 : 0);
      found.sort((a, b) => weight(b) - weight(a));
      for (const c of found) if (ids.length < MAX_INVITES) ids.push(c.id);
    }
    return ids;
  }
}
