import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Company, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CompaniesService } from '../companies/companies.service';
import { OwnProduct, toOwnProduct } from '../dto/views';
import { productSlug } from '../util/slug';
import { CreateProductDto, UpdateProductDto } from './supplier-products.dto';

/** Fields whose change needs another moderation pass. Price and MOQ edits go live immediately. */
const REVIEWED_FIELDS = ['name', 'summary', 'description', 'specs', 'images', 'categoryId'] as const;
const INCLUDE = { company: true, category: true } as const;

/**
 * A supplier's own products.
 * Life cycle: DRAFT → (submit) PENDING_REVIEW → ACTIVE or REJECTED; any → ARCHIVED → (restore) DRAFT.
 * "DM Trusted" suppliers skip review: their submissions go live at once.
 */
@Injectable()
export class SupplierProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly categories: CategoriesService,
  ) {}

  async list(userId: string, status?: ProductStatus): Promise<OwnProduct[]> {
    const company = await this.companies.requireMine(userId);
    const rows = await this.prisma.product.findMany({
      where: { companyId: company.id, status: status ?? { not: ProductStatus.ARCHIVED } },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return rows.map(toOwnProduct);
  }

  async get(userId: string, id: string): Promise<OwnProduct> {
    const company = await this.companies.requireMine(userId);
    return toOwnProduct(await this.find(company, id));
  }

  async create(userId: string, dto: CreateProductDto): Promise<OwnProduct> {
    const company = await this.companies.requireMine(userId);
    await this.assertCategory(dto.categoryId);
    const { submit = true, specs, ...fields } = dto;
    const prices = this.prices(dto.priceMin, dto.priceMax);
    const status = !submit ? ProductStatus.DRAFT : company.trustSeal ? ProductStatus.ACTIVE : ProductStatus.PENDING_REVIEW;

    const p = await this.prisma.product.create({
      data: {
        ...fields,
        ...prices,
        specs: (specs ?? []) as unknown as Prisma.InputJsonValue,
        images: dto.images ?? [],
        slug: productSlug(dto.name),
        companyId: company.id,
        status,
        publishedAt: status === ProductStatus.ACTIVE ? new Date() : null,
      },
      include: INCLUDE,
    });
    if (status === ProductStatus.ACTIVE) this.categories.invalidate();
    return toOwnProduct(p);
  }

  async update(userId: string, id: string, dto: UpdateProductDto): Promise<OwnProduct> {
    const company = await this.companies.requireMine(userId);
    const current = await this.find(company, id);
    if (current.status === ProductStatus.ARCHIVED) throw new ConflictException('Restore this product before editing it');
    if (dto.categoryId) await this.assertCategory(dto.categoryId);

    const { submit, specs, ...fields } = dto;
    const prices = this.prices(
      dto.priceMin !== undefined ? dto.priceMin : current.priceMin == null ? undefined : Number(current.priceMin),
      dto.priceMax !== undefined ? dto.priceMax : current.priceMax == null ? undefined : Number(current.priceMax),
    );

    const contentChanged = REVIEWED_FIELDS.some((f) => dto[f] !== undefined);
    let status = current.status;
    if (submit && (status === ProductStatus.DRAFT || status === ProductStatus.REJECTED)) {
      status = company.trustSeal ? ProductStatus.ACTIVE : ProductStatus.PENDING_REVIEW;
    } else if (contentChanged && status === ProductStatus.ACTIVE && !company.trustSeal) {
      status = ProductStatus.PENDING_REVIEW;
    }

    // The slug never changes after creation, so shared links and search rankings survive renames.
    const p = await this.prisma.product.update({
      where: { id },
      data: {
        ...fields,
        ...prices,
        ...(specs !== undefined && { specs: specs as unknown as Prisma.InputJsonValue }),
        status,
        rejectionReason: status === ProductStatus.REJECTED ? current.rejectionReason : null,
        publishedAt: status === ProductStatus.ACTIVE ? (current.publishedAt ?? new Date()) : current.publishedAt,
      },
      include: INCLUDE,
    });
    if (status !== current.status) this.categories.invalidate();
    return toOwnProduct(p);
  }

  /** Hide a product. It stays in the database so old links and RFQs still resolve. */
  async archive(userId: string, id: string): Promise<OwnProduct> {
    const company = await this.companies.requireMine(userId);
    const current = await this.find(company, id);
    const p = await this.prisma.product.update({ where: { id: current.id }, data: { status: ProductStatus.ARCHIVED }, include: INCLUDE });
    this.categories.invalidate();
    return toOwnProduct(p);
  }

  /** Bring an archived product back as a draft. */
  async restore(userId: string, id: string): Promise<OwnProduct> {
    const company = await this.companies.requireMine(userId);
    const current = await this.find(company, id);
    if (current.status !== ProductStatus.ARCHIVED) throw new ConflictException('Only archived products can be restored');
    return toOwnProduct(
      await this.prisma.product.update({ where: { id: current.id }, data: { status: ProductStatus.DRAFT }, include: INCLUDE }),
    );
  }

  private async find(company: Company, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId: company.id }, include: INCLUDE });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  private async assertCategory(id: string) {
    if (!(await this.categories.exists(id))) throw new BadRequestException('categoryId does not match an active category');
  }

  /** One price given = a fixed price. Both = a range, which must not be reversed. */
  private prices(min?: number | null, max?: number | null) {
    const lo = min ?? max ?? null;
    const hi = max ?? min ?? null;
    if (lo != null && hi != null && lo > hi) throw new BadRequestException('priceMin cannot be more than priceMax');
    return { priceMin: lo, priceMax: hi };
  }
}
