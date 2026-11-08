import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category, CompanyStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Breadcrumb } from '../dto/views';
import { slugify } from '../util/slug';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

export class CategoryNode {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional({ nullable: true, type: String }) icon: string | null;
  @ApiProperty({ description: 'Live products in this category and all below it' }) productCount: number;
  @ApiProperty({ type: () => [CategoryNode] }) children: CategoryNode[];
}

export class CategoryPage {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) icon: string | null;
  @ApiProperty({ description: 'Ready-to-use <title>' }) seoTitle: string;
  @ApiProperty({ description: 'Ready-to-use meta description' }) seoDescription: string;
  @ApiProperty() productCount: number;
  @ApiProperty({ type: [Breadcrumb], description: 'From the top group down to this category' }) breadcrumb: Breadcrumb[];
  @ApiProperty({ type: [CategoryNode] }) children: CategoryNode[];
}

interface TreeIndex {
  roots: CategoryNode[];
  bySlug: Map<string, { cat: Category; node: CategoryNode }>;
  byId: Map<string, { cat: Category; node: CategoryNode }>;
}

const CACHE_MS = 60_000;

@Injectable()
export class CategoriesService {
  private cache?: { at: number; tree: Promise<TreeIndex> };

  constructor(private readonly prisma: PrismaService) {}

  /** Drop the cached tree (after category edits or product approvals). */
  invalidate() {
    this.cache = undefined;
  }

  async tree(): Promise<CategoryNode[]> {
    return (await this.index()).roots;
  }

  async page(slug: string): Promise<CategoryPage> {
    const idx = await this.index();
    const hit = idx.bySlug.get(slug);
    if (!hit) throw new NotFoundException('Category not found');
    const { cat, node } = hit;
    const breadcrumb = this.breadcrumb(idx, cat);
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      seoTitle: cat.seoTitle ?? `${cat.name} Manufacturers & Suppliers in India | DIGI MART 360`,
      seoDescription:
        cat.seoDescription ??
        `Compare ${node.productCount.toLocaleString('en-IN')} ${cat.name.toLowerCase()} from GST-verified manufacturers and suppliers. Get prices, MOQ and quotes on DIGI MART 360.`,
      productCount: node.productCount,
      breadcrumb,
      children: node.children,
    };
  }

  /** This category's id plus every id below it, for listing filters. */
  async descendantIds(slug: string): Promise<string[]> {
    const idx = await this.index();
    const hit = idx.bySlug.get(slug);
    if (!hit) throw new NotFoundException('Category not found');
    const out: string[] = [];
    const walk = (n: CategoryNode) => {
      out.push(n.id);
      n.children.forEach(walk);
    };
    walk(hit.node);
    return out;
  }

  async breadcrumbFor(categoryId: string): Promise<Breadcrumb[]> {
    const idx = await this.index();
    const hit = idx.byId.get(categoryId);
    return hit ? this.breadcrumb(idx, hit.cat) : [];
  }

  async exists(id: string): Promise<boolean> {
    return (await this.index()).byId.has(id);
  }

  async idForSlug(slug: string): Promise<string | undefined> {
    return (await this.index()).bySlug.get(slug)?.cat.id;
  }

  /* ───── Admin ───── */

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? slugify(dto.name);
    try {
      const cat = await this.prisma.category.create({ data: { ...dto, slug } });
      this.invalidate();
      return cat;
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      // Refuse to move a category under itself or one of its descendants.
      const idx = await this.index();
      const self = idx.byId.get(id);
      if (self) {
        const below = new Set<string>();
        const walk = (n: CategoryNode) => (below.add(n.id), n.children.forEach(walk));
        walk(self.node);
        if (below.has(dto.parentId)) throw new ConflictException('A category cannot be moved under itself');
      }
    }
    try {
      const cat = await this.prisma.category.update({ where: { id }, data: dto });
      this.invalidate();
      return cat;
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return new ConflictException('A category with this slug already exists');
      if (e.code === 'P2025') return new NotFoundException('Category not found');
      if (e.code === 'P2003') return new NotFoundException('Parent category not found');
    }
    return e;
  }

  private breadcrumb(idx: TreeIndex, cat: Category): Breadcrumb[] {
    const chain: Breadcrumb[] = [];
    let cur: Category | undefined = cat;
    while (cur) {
      chain.unshift({ name: cur.name, slug: cur.slug });
      cur = cur.parentId ? idx.byId.get(cur.parentId)?.cat : undefined;
    }
    return chain;
  }

  private index(): Promise<TreeIndex> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.tree;
    const tree = this.build();
    this.cache = { at: Date.now(), tree };
    tree.catch(() => (this.cache = undefined));
    return tree;
  }

  private async build(): Promise<TreeIndex> {
    const [cats, counts] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { status: ProductStatus.ACTIVE, company: { status: CompanyStatus.ACTIVE } },
        _count: { _all: true },
      }),
    ]);
    const own = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const byId = new Map<string, { cat: Category; node: CategoryNode }>();
    for (const cat of cats) {
      byId.set(cat.id, {
        cat,
        node: { id: cat.id, name: cat.name, slug: cat.slug, icon: cat.icon, productCount: 0, children: [] },
      });
    }
    const roots: CategoryNode[] = [];
    for (const { cat, node } of byId.values()) {
      const parent = cat.parentId ? byId.get(cat.parentId) : undefined;
      if (parent) parent.node.children.push(node);
      else if (!cat.parentId) roots.push(node);
      // A category whose parent is inactive is hidden along with it.
    }
    const total = (n: CategoryNode): number =>
      (n.productCount = (own.get(n.id) ?? 0) + n.children.reduce((s, c) => s + total(c), 0));
    roots.forEach(total);
    const bySlug = new Map([...byId.values()].map((v) => [v.cat.slug, v]));
    return { roots, bySlug, byId };
  }
}
