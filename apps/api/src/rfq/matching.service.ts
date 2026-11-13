import { Injectable } from '@nestjs/common';
import { CompanyStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Most suppliers told about one RFQ. Keeps inboxes useful and email volume sane. */
export const MAX_INVITES = 15;

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

  /** Every category whose RFQs a seller of `productCategoryIds` should see. */
  visibleTo(productCategoryIds: Set<string>): Set<string> {
    const out = new Set<string>();
    for (const id of this.parent.keys()) {
      for (const x of this.related(id)) {
        if (productCategoryIds.has(x)) {
          out.add(id);
          break;
        }
      }
    }
    return out;
  }
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async graph(): Promise<CategoryGraph> {
    return new CategoryGraph(await this.prisma.category.findMany({ select: { id: true, parentId: true } }));
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

    const rows = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        categoryId: { in: [...related] },
        company: { status: CompanyStatus.ACTIVE, ownerId: { not: buyerId } },
      },
      select: { categoryId: true, company: { select: { id: true, state: true, trustSeal: true, gstVerifiedAt: true } } },
    });

    // One entry per supplier. Selling in the exact category outranks everything else.
    const score = new Map<string, number>();
    const exactSeller = new Set<string>();
    for (const { categoryId, company: c } of rows) {
      if (!score.has(c.id)) {
        score.set(c.id, (c.trustSeal ? 20 : 0) + (c.gstVerifiedAt ? 10 : 0) + (c.state.toLowerCase() === rfq.state.toLowerCase() ? 5 : 0));
      }
      if (exact.has(categoryId)) exactSeller.add(c.id);
    }
    const total = (id: string) => (score.get(id) ?? 0) + (exactSeller.has(id) ? 100 : 0);
    const ranked = [...score.keys()].sort((a, b) => total(b) - total(a));

    const ids: string[] = [];
    if (rfq.companyId) {
      const asked = await this.prisma.company.findFirst({
        where: { id: rfq.companyId, status: CompanyStatus.ACTIVE, ownerId: { not: buyerId } },
        select: { id: true },
      });
      if (asked) ids.push(asked.id);
    }
    for (const id of ranked) if (!ids.includes(id)) ids.push(id);
    return ids.slice(0, MAX_INVITES);
  }
}
