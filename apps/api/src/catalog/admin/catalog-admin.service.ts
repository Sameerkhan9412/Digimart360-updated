import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { toCompanySummary, toOwnProduct } from '../dto/views';
import { ModerateCompanyDto, ModerationCompanyPage, ModerationProductPage } from './catalog-admin.dto';

const PAGE = 25;
const INCLUDE = { company: true, category: true } as const;

@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  /** Moderation queue, oldest first so nothing waits forever. */
  async products(status: ProductStatus = ProductStatus.PENDING_REVIEW, page = 1): Promise<ModerationProductPage> {
    const where = { status };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: INCLUDE, orderBy: { updatedAt: 'asc' }, skip: (page - 1) * PAGE, take: PAGE }),
      this.prisma.product.count({ where }),
    ]);
    return { items: rows.map(toOwnProduct), total, page };
  }

  async approveProduct(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    if (p.status === ProductStatus.ARCHIVED || p.status === ProductStatus.DRAFT) {
      throw new ConflictException(`A ${p.status.toLowerCase()} product cannot be approved; the supplier must submit it`);
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ACTIVE, rejectionReason: null, publishedAt: p.publishedAt ?? new Date() },
      include: INCLUDE,
    });
    this.categories.invalidate();
    return toOwnProduct(updated);
  }

  async rejectProduct(id: string, reason: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    if (p.status === ProductStatus.ARCHIVED) throw new ConflictException('Archived products cannot be rejected');
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, rejectionReason: reason },
      include: INCLUDE,
    });
    this.categories.invalidate();
    return toOwnProduct(updated);
  }

  async companies(status: CompanyStatus = CompanyStatus.PENDING, page = 1): Promise<ModerationCompanyPage> {
    const where = { status };
    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: { owner: { select: { email: true } }, _count: { select: { products: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * PAGE,
        take: PAGE,
      }),
      this.prisma.company.count({ where }),
    ]);
    return {
      items: rows.map((c) => ({
        ...toCompanySummary(c),
        status: c.status,
        gstin: c.gstin,
        ownerEmail: c.owner.email,
        productCount: c._count.products,
        createdAt: c.createdAt,
      })),
      total,
      page,
    };
  }

  async moderateCompany(id: string, dto: ModerateCompanyDto) {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Company not found');
    if (dto.gstVerified && !c.gstin) throw new BadRequestException('This company has no GSTIN to verify');

    const data: Prisma.CompanyUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.trustSeal !== undefined) data.trustSeal = dto.trustSeal;
    if (dto.gstVerified !== undefined) data.gstVerifiedAt = dto.gstVerified ? (c.gstVerifiedAt ?? new Date()) : null;

    const updated = await this.prisma.company.update({ where: { id }, data });
    this.categories.invalidate();
    return { ...toCompanySummary(updated), status: updated.status, gstin: updated.gstin };
  }
}
