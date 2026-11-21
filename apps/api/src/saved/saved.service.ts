import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { CompanySummary, toCompanySummary } from '../catalog/dto/views';
import { PrismaService } from '../prisma/prisma.service';

/** A shortlist is for comparing a handful of suppliers, not for hoarding. */
export const MAX_SAVED = 200;

@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. Suppliers that have since been hidden or suspended are left out (but stay saved). */
  async list(userId: string): Promise<CompanySummary[]> {
    const rows = await this.prisma.savedSupplier.findMany({
      where: { userId, company: { status: CompanyStatus.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    });
    return rows.map((r) => toCompanySummary(r.company));
  }

  /** Ids only, for showing a filled or empty heart on a page. */
  async ids(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedSupplier.findMany({ where: { userId }, select: { companyId: true } });
    return rows.map((r) => r.companyId);
  }

  /** Saving twice is fine. */
  async save(userId: string, companyId: string): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, status: CompanyStatus.ACTIVE },
      select: { ownerId: true },
    });
    if (!company) throw new NotFoundException('Supplier not found');
    if (company.ownerId === userId) throw new BadRequestException('This is your own company');
    if ((await this.prisma.savedSupplier.count({ where: { userId } })) >= MAX_SAVED) {
      throw new BadRequestException(`You can save up to ${MAX_SAVED} suppliers. Remove some first.`);
    }
    await this.prisma.savedSupplier.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId },
      update: {},
    });
  }

  /** Removing something that is not saved is fine too. */
  async remove(userId: string, companyId: string): Promise<void> {
    await this.prisma.savedSupplier.deleteMany({ where: { userId, companyId } });
  }
}
