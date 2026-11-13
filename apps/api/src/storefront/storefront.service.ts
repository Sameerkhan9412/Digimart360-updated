import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyStatus, CustomDomain, DomainStatus, Prisma, Storefront } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { CompaniesService } from '../catalog/companies/companies.service';
import { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  DomainView,
  HostMatch,
  ModerationDomain,
  ModerationDomainPage,
  PublicStorefront,
  SetDomainDto,
  StorefrontView,
  UpdateStorefrontDto,
} from './storefront.dto';

/** Sub-domains that belong to the platform itself, never to a supplier. */
const RESERVED = new Set(['www', 'api', 'admin', 'app', 'mail', 'sites', 'static', 'media', 'cdn']);
const PAGE = 25;
const VERIFY_LABEL = '_digimart-verify';

const DEFAULTS: StorefrontView = {
  theme: 'MERIDIAN',
  accent: null,
  tagline: null,
  bannerUrl: null,
  showAbout: true,
  showProducts: true,
  showCertificates: true,
  showContact: true,
  certificates: [],
};

/** Lower-case host without port or trailing dot. */
export function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get root(): string {
    return this.config.get('ROOT_DOMAIN', { infer: true }).toLowerCase();
  }

  private subdomain(slug: string): string {
    return `${slug}.${this.root}`;
  }

  // ── settings ──

  private view(s: Storefront | null): StorefrontView {
    if (!s) return { ...DEFAULTS };
    return {
      theme: s.theme,
      accent: s.accent,
      tagline: s.tagline,
      bannerUrl: s.bannerUrl,
      showAbout: s.showAbout,
      showProducts: s.showProducts,
      showCertificates: s.showCertificates,
      showContact: s.showContact,
      certificates: s.certificates,
    };
  }

  async mine(userId: string): Promise<StorefrontView> {
    const c = await this.companies.requireMine(userId);
    return this.view(await this.prisma.storefront.findUnique({ where: { companyId: c.id } }));
  }

  async update(userId: string, dto: UpdateStorefrontDto): Promise<StorefrontView> {
    const c = await this.companies.requireMine(userId);
    if (dto.bannerUrl !== undefined) {
      const base = this.config.get('MEDIA_BASE_URL', { infer: true }).replace(/\/$/, '') + '/';
      if (dto.bannerUrl && !dto.bannerUrl.startsWith(base)) throw new BadRequestException('Use a photo uploaded to DIGI MART 360');
    }
    // Only accent, tagline and banner can be cleared (null); the rest always have a value.
    for (const k of ['theme', 'showAbout', 'showProducts', 'showCertificates', 'showContact', 'certificates'] as const) {
      if ((dto as Record<string, unknown>)[k] === null) throw new BadRequestException(`${k} cannot be removed`);
    }
    const data: Prisma.StorefrontUpdateInput = { ...dto, accent: dto.accent == null ? dto.accent : dto.accent.toLowerCase() };
    // Sending null clears accent, tagline and banner; leaving a field out keeps it.
    const saved = await this.prisma.storefront.upsert({
      where: { companyId: c.id },
      update: data,
      create: { ...(data as Prisma.StorefrontUncheckedCreateInput), companyId: c.id },
    });
    return this.view(saved);
  }

  // ── public ──

  /** Public settings of an approved company's website. */
  async publicBySlug(slug: string): Promise<PublicStorefront> {
    const c = await this.prisma.company.findFirst({
      where: { slug, status: CompanyStatus.ACTIVE },
      include: { storefront: true, customDomain: true },
    });
    if (!c) throw new NotFoundException('Website not found');
    const own = c.customDomain?.status === DomainStatus.ACTIVE ? c.customDomain.host : null;
    return { ...this.view(c.storefront), slug: c.slug, canonicalHost: own ?? this.subdomain(c.slug) };
  }

  /** Which supplier's website lives at this host? 404 = it is the marketplace (or unknown). */
  async match(rawHost: string): Promise<HostMatch> {
    const host = normalizeHost(rawHost);
    const suffix = `.${this.root}`;
    if (host.endsWith(suffix)) {
      const label = host.slice(0, -suffix.length);
      if (!label || label.includes('.') || RESERVED.has(label)) throw new NotFoundException('Not a supplier website');
      const c = await this.prisma.company.findFirst({
        where: { slug: label, status: CompanyStatus.ACTIVE },
        include: { customDomain: true },
      });
      if (!c) throw new NotFoundException('Not a supplier website');
      const own = c.customDomain?.status === DomainStatus.ACTIVE ? c.customDomain.host : null;
      return { slug: c.slug, canonicalHost: own ?? host };
    }
    const d = await this.prisma.customDomain.findUnique({ where: { host }, include: { company: true } });
    if (!d || d.status !== DomainStatus.ACTIVE || d.company.status !== CompanyStatus.ACTIVE) {
      throw new NotFoundException('Not a supplier website');
    }
    return { slug: d.company.slug, canonicalHost: d.host };
  }

  /** For Caddy's on-demand TLS: may a certificate be issued for this host? */
  async certificateAllowed(rawHost: string): Promise<boolean> {
    try {
      await this.match(rawHost);
      return true;
    } catch {
      return false;
    }
  }

  // ── custom domain ──

  private domainView(d: CustomDomain): DomainView {
    return {
      id: d.id,
      host: d.host,
      status: d.status,
      txtName: `${VERIFY_LABEL}.${d.host}`,
      txtValue: d.verifyToken,
      cnameTarget: this.config.get('SITES_TARGET', { infer: true }) ?? null,
      rejectionReason: d.rejectionReason,
    };
  }

  async myDomain(userId: string): Promise<DomainView | null> {
    const c = await this.companies.requireMine(userId);
    const d = await this.prisma.customDomain.findUnique({ where: { companyId: c.id } });
    return d ? this.domainView(d) : null;
  }

  /** Start (or restart with a different name) the custom-domain setup. */
  async setDomain(userId: string, dto: SetDomainDto): Promise<DomainView> {
    const c = await this.companies.requireMine(userId);
    if (c.status !== CompanyStatus.ACTIVE) throw new BadRequestException('Your company must be approved before you can connect a domain');
    const host = normalizeHost(dto.host);
    if (host === this.root || host.endsWith(`.${this.root}`)) {
      throw new BadRequestException(`Your free address is already ${this.subdomain(c.slug)}. Enter a domain you own.`);
    }
    const existing = await this.prisma.customDomain.findUnique({ where: { companyId: c.id } });
    if (existing?.host === host) return this.domainView(existing);
    const data = {
      host,
      verifyToken: `dm-verify-${randomBytes(18).toString('base64url')}`,
      status: DomainStatus.PENDING_DNS,
      rejectionReason: null,
      verifiedAt: null,
    };
    try {
      const saved = existing
        ? await this.prisma.customDomain.update({ where: { id: existing.id }, data })
        : await this.prisma.customDomain.create({ data: { ...data, companyId: c.id } });
      return this.domainView(saved);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('That domain is already connected to another supplier');
      }
      throw e;
    }
  }

  /** Look for the TXT record. On success the domain moves on to staff approval. */
  async checkDomain(userId: string): Promise<DomainView> {
    const c = await this.companies.requireMine(userId);
    const d = await this.prisma.customDomain.findUnique({ where: { companyId: c.id } });
    if (!d) throw new NotFoundException('Add a domain first');
    if (d.status !== DomainStatus.PENDING_DNS) return this.domainView(d);

    let records: string[][] = [];
    try {
      records = await resolveTxt(`${VERIFY_LABEL}.${d.host}`);
    } catch {
      // Not published yet (or DNS has not caught up): same answer to the supplier.
    }
    if (!records.some((parts) => parts.join('') === d.verifyToken)) {
      throw new BadRequestException(
        `We could not find the TXT record yet. Add ${VERIFY_LABEL}.${d.host} with the value shown, then try again (DNS can take a few minutes).`,
      );
    }
    return this.domainView(
      await this.prisma.customDomain.update({
        where: { id: d.id },
        data: { status: DomainStatus.PENDING_APPROVAL, verifiedAt: new Date() },
      }),
    );
  }

  async removeDomain(userId: string): Promise<void> {
    const c = await this.companies.requireMine(userId);
    await this.prisma.customDomain.deleteMany({ where: { companyId: c.id } });
  }

  // ── admin ──

  async domains(status: DomainStatus = DomainStatus.PENDING_APPROVAL, page = 1): Promise<ModerationDomainPage> {
    const where = { status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customDomain.findMany({
        where,
        include: { company: { include: { owner: { select: { email: true } } } } },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * PAGE,
        take: PAGE,
      }),
      this.prisma.customDomain.count({ where }),
    ]);
    const items: ModerationDomain[] = rows.map((d) => ({
      ...this.domainView(d),
      companyName: d.company.name,
      companySlug: d.company.slug,
      ownerEmail: d.company.owner.email ?? '',
      createdAt: d.createdAt,
    }));
    return { items, total, page };
  }

  async approveDomain(id: string): Promise<DomainView> {
    const d = await this.prisma.customDomain.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Domain not found');
    if (d.status === DomainStatus.PENDING_DNS) throw new ConflictException('The supplier has not proven ownership of this domain yet');
    return this.domainView(await this.prisma.customDomain.update({ where: { id }, data: { status: DomainStatus.ACTIVE, rejectionReason: null } }));
  }

  async rejectDomain(id: string, reason: string): Promise<DomainView> {
    const d = await this.prisma.customDomain.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Domain not found');
    return this.domainView(
      await this.prisma.customDomain.update({ where: { id }, data: { status: DomainStatus.REJECTED, rejectionReason: reason } }),
    );
  }
}
