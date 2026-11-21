import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CompanyStatus, ProductStatus, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, changePct, eachDay, istDay, istStart, periodEndingToday } from './analytics.dates';
import { AnalyticsReport, DayPoint, Metric, TopProduct, TrackKind } from './analytics.dto';

/** The same visitor opening the same page again within this long counts once. */
const REPEAT_WINDOW_MS = 30 * 60_000;
const MAX_REMEMBERED = 20_000;

/**
 * Remembers who looked at what recently, so reloading a page does not inflate a supplier's numbers.
 * Held in memory on purpose: it only needs to cover a short window, and after a restart the worst case
 * is a few repeat views counted twice. Nothing here identifies a person beyond the process's lifetime.
 */
export class RecentViews {
  private readonly seen = new Map<string, number>();

  /** True the first time `key` is seen within the window (and remembers it). */
  firstSight(key: string, now = Date.now()): boolean {
    const until = this.seen.get(key);
    if (until !== undefined && until > now) return false;
    if (this.seen.size >= MAX_REMEMBERED) {
      for (const [k, t] of this.seen) if (t <= now) this.seen.delete(k);
      if (this.seen.size >= MAX_REMEMBERED) this.seen.clear();
    }
    this.seen.set(key, now + REPEAT_WINDOW_MS);
    return true;
  }
}

interface DayRow {
  day: string;
  views: number;
}

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly recent = new RecentViews();
  private readonly log = new Logger(AnalyticsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.purgeOld().catch((e) => this.log.warn(`purge failed: ${e}`)), 24 * 3600_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Daily counters older than about 13 months are never shown (the longest report is 90 days); drop them. */
  async purgeOld(now = new Date()): Promise<number> {
    const cutoff = new Date(`${addDays(istDay(now), -400)}T00:00:00Z`);
    const [a, b] = await this.prisma.$transaction([
      this.prisma.productDailyView.deleteMany({ where: { day: { lt: cutoff } } }),
      this.prisma.companyDailyView.deleteMany({ where: { day: { lt: cutoff } } }),
    ]);
    return a.count + b.count;
  }

  /**
   * Count one view of a live product, supplier page or supplier website.
   * Unknown, unapproved or hidden targets are ignored silently, so this cannot be used to probe the catalogue.
   * Returns whether a view was added.
   */
  async track(kind: TrackKind, slug: string, visitor?: string, now = new Date()): Promise<boolean> {
    if (visitor && !this.recent.firstSight(`${visitor}|${kind}|${slug}`, now.getTime())) return false;
    const day = istDay(now);

    if (kind === 'product') {
      const product = await this.prisma.product.findFirst({
        where: { slug, status: ProductStatus.ACTIVE, company: { status: CompanyStatus.ACTIVE } },
        select: { id: true },
      });
      if (!product) return false;
      await this.prisma.$executeRaw`
        INSERT INTO "product_daily_views" ("productId", "day", "count")
        VALUES (${product.id}::uuid, ${day}::date, 1)
        ON CONFLICT ("productId", "day") DO UPDATE SET "count" = "product_daily_views"."count" + 1`;
      return true;
    }

    const company = await this.prisma.company.findFirst({ where: { slug, status: CompanyStatus.ACTIVE }, select: { id: true } });
    if (!company) return false;
    const type = kind === 'site' ? 'SITE' : 'PROFILE';
    await this.prisma.$executeRaw`
      INSERT INTO "company_daily_views" ("companyId", "kind", "day", "count")
      VALUES (${company.id}::uuid, ${type}::"CompanyViewKind", ${day}::date, 1)
      ON CONFLICT ("companyId", "kind", "day") DO UPDATE SET "count" = "company_daily_views"."count" + 1`;
    return true;
  }

  async report(companyId: string, days: number, now = new Date()): Promise<AnalyticsReport> {
    const p = periodEndingToday(days, now);
    const fromTs = istStart(p.from);
    const toTs = istStart(addDays(p.to, 1)); // exclusive

    const [productDaily, companyDaily, top, invited, opened, quoted, won] = await Promise.all([
      // Both periods in one read: this period and the one before it.
      this.prisma.$queryRaw<DayRow[]>`
        SELECT v."day"::text AS day, SUM(v."count")::int AS views
        FROM "product_daily_views" v JOIN "products" p ON p."id" = v."productId"
        WHERE p."companyId" = ${companyId}::uuid AND v."day" BETWEEN ${p.prevFrom}::date AND ${p.to}::date
        GROUP BY v."day"`,
      this.prisma.$queryRaw<(DayRow & { kind: 'PROFILE' | 'SITE' })[]>`
        SELECT "day"::text AS day, "kind"::text AS kind, SUM("count")::int AS views
        FROM "company_daily_views"
        WHERE "companyId" = ${companyId}::uuid AND "day" BETWEEN ${p.prevFrom}::date AND ${p.to}::date
        GROUP BY "day", "kind"`,
      this.prisma.$queryRaw<TopProduct[]>`
        SELECT p."id", p."name", p."slug", SUM(v."count")::int AS views
        FROM "product_daily_views" v JOIN "products" p ON p."id" = v."productId"
        WHERE p."companyId" = ${companyId}::uuid AND v."day" BETWEEN ${p.from}::date AND ${p.to}::date
        GROUP BY p."id", p."name", p."slug"
        ORDER BY views DESC, p."name" ASC
        LIMIT 10`,
      this.prisma.rfqInvite.count({ where: { companyId, notifiedAt: { gte: fromTs, lt: toTs } } }),
      this.prisma.rfqInvite.count({ where: { companyId, notifiedAt: { gte: fromTs, lt: toTs }, viewedAt: { not: null } } }),
      this.prisma.quote.count({ where: { companyId, createdAt: { gte: fromTs, lt: toTs } } }),
      this.prisma.quote.count({ where: { companyId, status: QuoteStatus.AWARDED, updatedAt: { gte: fromTs, lt: toTs } } }),
    ]);

    const byDay = (rows: DayRow[]) => new Map(rows.map((r) => [r.day, Number(r.views)]));
    const product = byDay(productDaily);
    const profile = byDay(companyDaily.filter((r) => r.kind === 'PROFILE'));
    const site = byDay(companyDaily.filter((r) => r.kind === 'SITE'));

    const sum = (m: Map<string, number>, from: string, to: string) => {
      let n = 0;
      for (const [d, v] of m) if (d >= from && d <= to) n += v;
      return n;
    };
    const metric = (m: Map<string, number>): Metric => {
      const value = sum(m, p.from, p.to);
      const previous = sum(m, p.prevFrom, p.prevTo);
      return { value, previous, changePct: changePct(value, previous) };
    };

    const series: DayPoint[] = eachDay(p.from, p.to).map((day) => ({
      day,
      productViews: product.get(day) ?? 0,
      profileViews: profile.get(day) ?? 0,
      siteViews: site.get(day) ?? 0,
    }));

    return {
      days: p.days,
      from: p.from,
      to: p.to,
      productViews: metric(product),
      profileViews: metric(profile),
      siteViews: metric(site),
      series,
      topProducts: top.map((t) => ({ ...t, views: Number(t.views) })),
      rfq: { invited, opened, quoted, won },
    };
  }
}
