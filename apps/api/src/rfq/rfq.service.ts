import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Category, Company, CompanyStatus, Prisma, ProductStatus, Quote, QuoteStatus, Rfq, RfqStatus, User } from '@prisma/client';
import { CompaniesService } from '../catalog/companies/companies.service';
import { toCompanySummary } from '../catalog/dto/views';
import { Env } from '../config/env.validation';
import { MailService } from '../notifications/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuyerQuote, BuyerRfq, Contact, CreateRfqDto, QuoteView, RfqSummary, SubmitQuoteDto, SupplierRfq } from './rfq.dto';
import { MatchingService } from './matching.service';

const DAY = 86_400_000;
const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

type RfqRow = Rfq & { category: Category };
type QuoteRow = Quote;

const standing = (q: { status: QuoteStatus }) => q.status !== QuoteStatus.WITHDRAWN;

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly companies: CompaniesService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /* ───────────────────────── Buyer ───────────────────────── */

  async create(buyerId: string, dto: CreateRfqDto): Promise<BuyerRfq> {
    const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, isActive: true } });
    if (!category) throw new BadRequestException('Unknown category');

    let companyId = dto.companyId;
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, status: ProductStatus.ACTIVE },
        select: { companyId: true },
      });
      if (!product) throw new BadRequestException('That product is not available');
      companyId ??= product.companyId;
    }
    if (companyId) {
      const c = await this.prisma.company.findFirst({ where: { id: companyId, status: CompanyStatus.ACTIVE }, select: { ownerId: true } });
      if (!c) throw new BadRequestException('That supplier is not available');
      if (c.ownerId === buyerId) throw new BadRequestException('You cannot request a quote from your own company');
    }

    const rfq = await this.insert(buyerId, {
      categoryId: dto.categoryId,
      productId: dto.productId ?? null,
      companyId: companyId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      quantity: dto.quantity,
      unit: dto.unit ?? 'Piece',
      city: dto.city,
      state: dto.state,
      budget: dto.budget ?? null,
      closesAt: new Date(Date.now() + (dto.closesInDays ?? 7) * DAY),
    });

    const companyIds = await this.matching.match(rfq, buyerId);
    if (companyIds.length) {
      await this.prisma.rfqInvite.createMany({ data: companyIds.map((id) => ({ rfqId: rfq.id, companyId: id })), skipDuplicates: true });
      void this.notifySuppliers(rfq, companyIds);
    }
    return this.buyerGet(buyerId, rfq.id);
  }

  /** RFQ-202611-0042: month + running number. Retries if two buyers post at the same moment. */
  private async insert(buyerId: string, data: Omit<Prisma.RfqUncheckedCreateInput, 'number' | 'buyerId'>): Promise<Rfq> {
    const now = new Date();
    const prefix = `RFQ-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}-`;
    const used = await this.prisma.rfq.count({ where: { number: { startsWith: prefix } } });
    for (let attempt = 1; attempt <= 6; attempt++) {
      const number = prefix + String(used + attempt).padStart(4, '0');
      try {
        return await this.prisma.rfq.create({ data: { ...data, number, buyerId } });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ConflictException('Could not allocate an RFQ number. Please try again.');
  }

  async buyerList(buyerId: string, status?: RfqStatus): Promise<RfqSummary[]> {
    await this.expireDue();
    const rows = await this.prisma.rfq.findMany({
      where: { buyerId, ...(status && { status }) },
      include: { category: true, quotes: { select: { status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.summary(r, r.quotes));
  }

  async buyerGet(buyerId: string, id: string): Promise<BuyerRfq> {
    await this.expireDue();
    const r = await this.prisma.rfq.findFirst({
      where: { id, buyerId },
      include: {
        category: true,
        _count: { select: { invites: true } },
        quotes: { where: { status: { not: QuoteStatus.WITHDRAWN } }, include: { company: { include: { owner: true } } } },
      },
    });
    if (!r) throw new NotFoundException('Requirement not found');

    const lowest = Math.min(...r.quotes.map((q) => Number(q.unitPrice)));
    const fastest = Math.min(...r.quotes.map((q) => q.deliveryDays));
    const budget = num(r.budget);
    const quotes: BuyerQuote[] = r.quotes
      .map((q) => ({
        ...this.quoteView(q, r.quantity),
        company: toCompanySummary(q.company),
        isLowestPrice: r.quotes.length > 1 && Number(q.unitPrice) === lowest,
        isFastest: r.quotes.length > 1 && q.deliveryDays === fastest,
        withinBudget: budget == null ? null : Number(q.unitPrice) * r.quantity <= budget,
      }))
      .sort((a, b) => a.unitPrice - b.unitPrice);

    const won = r.status === RfqStatus.AWARDED ? r.quotes.find((q) => q.id === r.awardedQuoteId) : undefined;
    const awardedContact: Contact | null = won
      ? { name: won.company.name, email: won.company.email ?? won.company.owner.email, phone: won.company.phone ?? won.company.owner.phone }
      : null;

    return { ...this.summary(r, r.quotes), description: r.description, invitedCount: r._count.invites, quotes, awardedContact };
  }

  async award(buyerId: string, id: string, quoteId: string): Promise<BuyerRfq> {
    await this.expireDue();
    const rfq = await this.ownOpen(buyerId, id);
    const quote = await this.prisma.quote.findFirst({ where: { id: quoteId, rfqId: id }, include: { company: { include: { owner: true } } } });
    if (!quote || quote.status !== QuoteStatus.SUBMITTED) throw new BadRequestException('Choose one of the quotes on this requirement');

    const others = await this.prisma.quote.findMany({
      where: { rfqId: id, id: { not: quoteId }, status: QuoteStatus.SUBMITTED },
      include: { company: { include: { owner: true } } },
    });
    await this.prisma.$transaction([
      this.prisma.rfq.update({ where: { id }, data: { status: RfqStatus.AWARDED, awardedQuoteId: quoteId } }),
      this.prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.AWARDED } }),
      this.prisma.quote.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: QuoteStatus.NOT_SELECTED } }),
    ]);
    void this.notifyAward(rfq, quote.company, others.map((o) => o.company));
    return this.buyerGet(buyerId, id);
  }

  async close(buyerId: string, id: string): Promise<BuyerRfq> {
    await this.expireDue();
    await this.ownOpen(buyerId, id);
    await this.prisma.rfq.update({ where: { id }, data: { status: RfqStatus.CLOSED } });
    return this.buyerGet(buyerId, id);
  }

  private async ownOpen(buyerId: string, id: string): Promise<Rfq> {
    const rfq = await this.prisma.rfq.findFirst({ where: { id, buyerId } });
    if (!rfq) throw new NotFoundException('Requirement not found');
    if (rfq.status !== RfqStatus.OPEN) throw new ConflictException(`This requirement is already ${rfq.status.toLowerCase()}`);
    return rfq;
  }

  /* ───────────────────────── Supplier ───────────────────────── */

  private async approvedCompany(userId: string): Promise<Company> {
    const c = await this.companies.requireMine(userId);
    if (c.status !== CompanyStatus.ACTIVE) throw new ForbiddenException('Your company must be approved before you can see requirements');
    return c;
  }

  /** Invited RFQs (any status), plus open ones in categories the supplier sells in. */
  async inbox(userId: string, status?: RfqStatus): Promise<SupplierRfq[]> {
    const company = await this.approvedCompany(userId);
    await this.expireDue();
    const visible = await this.visibleCategories(company.id);
    const rows = await this.prisma.rfq.findMany({
      where: {
        buyerId: { not: userId },
        ...(status && { status }),
        OR: [{ invites: { some: { companyId: company.id } } }, { status: RfqStatus.OPEN, categoryId: { in: [...visible] } }],
      },
      include: { category: true, quotes: true, invites: { where: { companyId: company.id } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.supplierView(r, company.id, r.invites.length > 0));
  }

  async inboxGet(userId: string, id: string): Promise<SupplierRfq> {
    const company = await this.approvedCompany(userId);
    await this.expireDue();
    const r = await this.visibleRfq(company.id, userId, id);
    const invite = r.invites[0];
    if (invite && !invite.viewedAt) {
      await this.prisma.rfqInvite.update({ where: { id: invite.id }, data: { viewedAt: new Date() } });
    }
    return this.supplierView(r, company.id, !!invite, r.buyer);
  }

  async submitQuote(userId: string, id: string, dto: SubmitQuoteDto): Promise<SupplierRfq> {
    const company = await this.approvedCompany(userId);
    await this.expireDue();
    const r = await this.visibleRfq(company.id, userId, id);
    if (r.status !== RfqStatus.OPEN) throw new ConflictException('This requirement is no longer taking quotes');

    const mine = r.quotes.find((q) => q.companyId === company.id);
    if (mine && (mine.status === QuoteStatus.AWARDED || mine.status === QuoteStatus.NOT_SELECTED)) {
      throw new ConflictException('This quote can no longer be changed');
    }
    const fields = {
      unitPrice: dto.unitPrice,
      deliveryDays: dto.deliveryDays,
      material: dto.material ?? null,
      warranty: dto.warranty ?? null,
      paymentTerms: dto.paymentTerms ?? null,
      certificates: dto.certificates ?? null,
      note: dto.note ?? null,
      validUntil: dto.validForDays ? new Date(Date.now() + dto.validForDays * DAY) : null,
      status: QuoteStatus.SUBMITTED,
    };
    if (mine) {
      await this.prisma.quote.update({ where: { id: mine.id }, data: { ...fields, revision: { increment: 1 } } });
    } else {
      await this.prisma.quote.create({ data: { ...fields, rfqId: id, companyId: company.id } });
    }
    if (!mine || mine.status === QuoteStatus.WITHDRAWN) void this.notifyNewQuote(r, company);

    return this.inboxGet(userId, id);
  }

  async withdrawQuote(userId: string, id: string): Promise<SupplierRfq> {
    const company = await this.approvedCompany(userId);
    await this.expireDue();
    const r = await this.visibleRfq(company.id, userId, id);
    const mine = r.quotes.find((q) => q.companyId === company.id);
    if (!mine || mine.status !== QuoteStatus.SUBMITTED || r.status !== RfqStatus.OPEN) {
      throw new ConflictException('There is no open quote of yours to withdraw');
    }
    await this.prisma.quote.update({ where: { id: mine.id }, data: { status: QuoteStatus.WITHDRAWN } });
    return this.inboxGet(userId, id);
  }

  private async visibleCategories(companyId: string): Promise<Set<string>> {
    const [graph, mine] = await Promise.all([this.matching.graph(), this.matching.sellerCategories(companyId)]);
    return graph.visibleTo(mine);
  }

  /** The RFQ if this supplier may see it (invited, or open in their categories). Own RFQs are never visible. */
  private async visibleRfq(companyId: string, userId: string, id: string) {
    const r = await this.prisma.rfq.findFirst({
      where: { id },
      include: { category: true, quotes: true, buyer: true, invites: { where: { companyId } } },
    });
    if (!r || r.buyerId === userId) throw new NotFoundException('Requirement not found');
    const invited = r.invites.length > 0;
    if (!invited && !(r.status === RfqStatus.OPEN && (await this.visibleCategories(companyId)).has(r.categoryId))) {
      throw new NotFoundException('Requirement not found');
    }
    return r;
  }

  /* ───────────────────────── Shared ───────────────────────── */

  /** Open RFQs past their closing time become EXPIRED. Cheap enough to run before each read. */
  private async expireDue() {
    await this.prisma.rfq.updateMany({
      where: { status: RfqStatus.OPEN, closesAt: { lt: new Date() } },
      data: { status: RfqStatus.EXPIRED },
    });
  }

  private summary(r: RfqRow, quotes: { status: QuoteStatus }[]): RfqSummary {
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      category: { id: r.category.id, name: r.category.name, slug: r.category.slug },
      quantity: r.quantity,
      unit: r.unit,
      city: r.city,
      state: r.state,
      budget: num(r.budget),
      status: r.status,
      closesAt: r.closesAt,
      createdAt: r.createdAt,
      quoteCount: quotes.filter(standing).length,
    };
  }

  private quoteView(q: QuoteRow, quantity: number): QuoteView {
    return {
      id: q.id,
      unitPrice: Number(q.unitPrice),
      total: Math.round(Number(q.unitPrice) * quantity * 100) / 100,
      deliveryDays: q.deliveryDays,
      material: q.material,
      warranty: q.warranty,
      paymentTerms: q.paymentTerms,
      certificates: q.certificates,
      note: q.note,
      validUntil: q.validUntil,
      revision: q.revision,
      status: q.status,
      updatedAt: q.updatedAt,
    };
  }

  private supplierView(r: RfqRow & { quotes: QuoteRow[] }, companyId: string, invited: boolean, buyer?: User): SupplierRfq {
    const mine = r.quotes.find((q) => q.companyId === companyId);
    const won = mine?.status === QuoteStatus.AWARDED;
    return {
      ...this.summary(r, r.quotes),
      description: r.description,
      invited,
      buyerLocation: `${r.city}, ${r.state}`,
      myQuote: mine ? this.quoteView(mine, r.quantity) : null,
      // The buyer's identity is shared only with the supplier they chose.
      buyerContact: won && buyer ? { name: buyer.name, email: buyer.email, phone: buyer.phone } : null,
    };
  }

  /* ───────────────────────── Email ───────────────────────── */

  private link(path: string) {
    return this.config.get('WEB_URL', { infer: true }).replace(/\/$/, '') + path;
  }

  private send(to: string | null | undefined, subject: string, text: string) {
    if (!to) return Promise.resolve();
    return this.mail.send({ to, subject, text }).catch((e) => this.logger.warn(`Email to ${to} failed: ${(e as Error).message}`));
  }

  private async notifySuppliers(rfq: Rfq, companyIds: string[]) {
    const companies = await this.prisma.company.findMany({ where: { id: { in: companyIds } }, include: { owner: true } });
    const budget = rfq.budget ? `\nBudget: ₹${Number(rfq.budget).toLocaleString('en-IN')}` : '';
    await Promise.all(
      companies.map((c) =>
        this.send(
          c.email ?? c.owner.email,
          `New requirement ${rfq.number}: ${rfq.title}`,
          `A buyer in ${rfq.city}, ${rfq.state} needs ${rfq.quantity.toLocaleString('en-IN')} ${rfq.unit}: ${rfq.title}.${budget}\n` +
            `Quotes close ${rfq.closesAt.toDateString()}.\n\nSend your quote: ${this.link(`/dashboard/rfqs/${rfq.id}`)}`,
        ),
      ),
    );
  }

  private async notifyNewQuote(rfq: Rfq & { buyer: User }, company: Company) {
    await this.send(
      rfq.buyer.email,
      `New quote on ${rfq.number} from ${company.name}`,
      `${company.name} sent a quote for "${rfq.title}".\n\nCompare quotes: ${this.link(`/account/rfqs/${rfq.id}`)}`,
    );
  }

  private async notifyAward(rfq: Rfq, winner: Company & { owner: User }, losers: (Company & { owner: User })[]) {
    const buyer = await this.prisma.user.findUnique({ where: { id: rfq.buyerId } });
    await Promise.all([
      this.send(
        winner.email ?? winner.owner.email,
        `You won ${rfq.number}: ${rfq.title}`,
        `The buyer chose your quote.\nBuyer: ${buyer?.name}\nEmail: ${buyer?.email}\nPhone: ${buyer?.phone ?? 'not given'}\n\nDetails: ${this.link(`/dashboard/rfqs/${rfq.id}`)}`,
      ),
      ...losers.map((c) =>
        this.send(c.email ?? c.owner.email, `${rfq.number} was awarded to another supplier`, `Thank you for quoting on "${rfq.title}". The buyer chose a different supplier this time.`),
      ),
    ]);
  }
}
