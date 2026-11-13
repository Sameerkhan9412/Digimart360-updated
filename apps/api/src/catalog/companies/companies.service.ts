import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Company, CompanyStatus, Prisma, ProductStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyProfile, OwnCompany, toCompanySummary } from '../dto/views';
import { slugify } from '../util/slug';
import { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public supplier profile. Only approved companies are visible. */
  async profile(slug: string): Promise<CompanyProfile> {
    const c = await this.prisma.company.findFirst({ where: { slug, status: CompanyStatus.ACTIVE } });
    if (!c) throw new NotFoundException('Supplier not found');
    return this.toProfile(c);
  }

  async mine(userId: string): Promise<OwnCompany> {
    const c = await this.prisma.company.findUnique({ where: { ownerId: userId } });
    if (!c) throw new NotFoundException('You have not created a company profile yet');
    return this.toOwn(c);
  }

  async requireMine(userId: string): Promise<Company> {
    const c = await this.prisma.company.findUnique({ where: { ownerId: userId } });
    if (!c) throw new ForbiddenException('Create your company profile first');
    return c;
  }

  /**
   * Creates the supplier's company (status PENDING until an admin approves it).
   * A buyer who creates a company becomes a supplier; they should call
   * /auth/refresh afterwards so their access token carries the new role.
   */
  async create(userId: string, role: Role, dto: CreateCompanyDto): Promise<OwnCompany> {
    if (role === Role.ADMIN) throw new ForbiddenException('Admin accounts cannot own a supplier company');
    if (await this.prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true } })) {
      throw new ConflictException('You already have a company profile. Edit it instead.');
    }
    const slug = await this.uniqueSlug(dto.name);
    try {
      const [company] = await this.prisma.$transaction([
        this.prisma.company.create({ data: { ...dto, slug, ownerId: userId } }),
        this.prisma.user.update({ where: { id: userId }, data: { role: Role.SUPPLIER } }),
      ]);
      return this.toOwn(company);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(userId: string, dto: UpdateCompanyDto): Promise<OwnCompany> {
    const current = await this.requireMine(userId);
    // null clears an optional field; leaving a field out keeps it. Required fields cannot be cleared.
    for (const k of ['name', 'businessTypes', 'city', 'state', 'exportsTo'] as const) {
      if ((dto as Record<string, unknown>)[k] === null) throw new BadRequestException(`${k} cannot be removed`);
    }
    const data: Prisma.CompanyUpdateInput = { ...dto };
    // A changed GSTIN has to be verified again.
    if (dto.gstin !== undefined && dto.gstin !== current.gstin) data.gstVerifiedAt = null;
    try {
      return this.toOwn(await this.prisma.company.update({ where: { id: current.id }, data }));
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async toProfile(c: Company): Promise<CompanyProfile> {
    const [productCount, cats] = await Promise.all([
      this.prisma.product.count({ where: { companyId: c.id, status: ProductStatus.ACTIVE } }),
      this.prisma.category.findMany({
        where: { products: { some: { companyId: c.id, status: ProductStatus.ACTIVE } } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      ...toCompanySummary(c),
      legalName: c.legalName,
      description: c.description,
      yearEstablished: c.yearEstablished,
      website: c.website,
      addressLine: c.addressLine,
      pincode: c.pincode,
      exportsTo: c.exportsTo,
      productCount,
      categories: cats,
    };
  }

  private async toOwn(c: Company): Promise<OwnCompany> {
    return { ...(await this.toProfile(c)), status: c.status, gstin: c.gstin, phone: c.phone, email: c.email };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name, 60);
    const taken = new Set(
      (await this.prisma.company.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((c) => c.slug),
    );
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = String((e.meta as { target?: unknown })?.target ?? '');
      return new ConflictException(
        target.includes('gstin') ? 'This GSTIN is already registered to another company' : 'This company already exists',
      );
    }
    return e;
  }
}
