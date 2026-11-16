import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { istDay } from '../src/analytics/analytics.dates';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp, signIn } from './app';

/** Uses two approved demo suppliers; their view counters are cleared first. */
describe('Supplier analytics (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let prisma: PrismaService;
  let owner: string;
  let other: string;
  let productSlug: string;
  let productName: string;
  const slug = 'bharat-electro-corp';
  const today = istDay(new Date());
  const key = () => process.env.INTERNAL_API_KEY as string;

  /** What our website sends when a visitor opens a page. */
  const track = (body: object, ip: string, withKey = true) =>
    request(app.getHttpServer())
      .post('/api/v1/internal/track')
      .set({ ...(withKey && { 'X-Internal-Key': key() }), 'X-Client-IP': ip })
      .send(body);

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    prisma = app.get(PrismaService);
    owner = (await signIn(app, `owner@${slug}.demo.digimart360.local`)).accessToken;
    other = (await signIn(app, 'owner@kaveri-textiles.demo.digimart360.local')).accessToken;
    const products = (await http.get('/me/products', owner).expect(200)).body as { slug: string; name: string; status: string }[];
    const live = products.find((p) => p.status === 'ACTIVE')!;
    productSlug = live.slug;
    productName = live.name;
    await prisma.productDailyView.deleteMany({});
    await prisma.companyDailyView.deleteMany({});
  });

  afterAll(() => app.close());

  it('only our own website may record views', async () => {
    await track({ kind: 'product', slug: productSlug }, '203.0.113.20', false).expect(404);
    await track({ kind: 'nonsense', slug: productSlug }, '203.0.113.20').expect(400);
    await track({ kind: 'product', slug: 'Not A Slug!' }, '203.0.113.20').expect(400);
    expect(await prisma.productDailyView.count()).toBe(0);
  });

  it('counts a view once per visitor and half hour, and ignores unknown pages', async () => {
    await track({ kind: 'product', slug: productSlug }, '203.0.113.21').expect(202);
    await track({ kind: 'product', slug: productSlug }, '203.0.113.21').expect(202); // a reload
    await track({ kind: 'product', slug: productSlug }, '203.0.113.22').expect(202); // someone else
    await track({ kind: 'product', slug: 'no-such-product' }, '203.0.113.23').expect(202); // ignored, not revealed
    const row = await prisma.productDailyView.findFirstOrThrow({ where: { product: { slug: productSlug } } });
    expect(row.count).toBe(2);
    expect(await prisma.productDailyView.count()).toBe(1);

    await track({ kind: 'company', slug }, '203.0.113.21').expect(202);
    await track({ kind: 'site', slug }, '203.0.113.21').expect(202);
    await track({ kind: 'site', slug }, '203.0.113.22').expect(202);
    const kinds = await prisma.companyDailyView.findMany({ orderBy: { kind: 'asc' } });
    expect(kinds.map((k) => [k.kind, k.count])).toEqual([['PROFILE', 1], ['SITE', 2]]);
  });

  it('shows the supplier their own numbers, zero-filled by day', async () => {
    const r = (await http.get('/me/analytics', owner).expect(200)).body;
    expect(r.days).toBe(30);
    expect(r.series).toHaveLength(30);
    expect(r.series[29].day).toBe(today);
    expect(r.series[29]).toMatchObject({ productViews: 2, profileViews: 1, siteViews: 2 });
    expect(r.series[0]).toMatchObject({ productViews: 0, profileViews: 0, siteViews: 0 });
    expect(r.productViews).toEqual({ value: 2, previous: 0, changePct: null });
    expect(r.profileViews.value).toBe(1);
    expect(r.siteViews.value).toBe(2);
    expect(r.topProducts[0]).toMatchObject({ slug: productSlug, name: productName, views: 2 });
    expect(r.rfq).toEqual({ invited: expect.any(Number), opened: expect.any(Number), quoted: expect.any(Number), won: expect.any(Number) });
    expect(r.rfq.opened).toBeLessThanOrEqual(r.rfq.invited);
  });

  it('keeps suppliers apart and compares with the period before', async () => {
    const mine = (await http.get('/me/analytics?days=7', owner).expect(200)).body;
    expect(mine.series).toHaveLength(7);
    expect(mine.productViews.value).toBe(2);

    const theirs = (await http.get('/me/analytics', other).expect(200)).body;
    expect(theirs.productViews.value).toBe(0);
    expect(theirs.topProducts).toEqual([]);
    expect(JSON.stringify(theirs)).not.toContain(productSlug);

    // Views from the previous period show up as "previous" and a change.
    const product = await prisma.product.findFirstOrThrow({ where: { slug: productSlug }, select: { id: true } });
    const prior = new Date(`${today}T00:00:00Z`);
    prior.setUTCDate(prior.getUTCDate() - 9); // outside the last 7 days, inside the 7 before
    await prisma.productDailyView.create({ data: { productId: product.id, day: prior, count: 1 } });
    const compared = (await http.get('/me/analytics?days=7', owner).expect(200)).body;
    expect(compared.productViews).toEqual({ value: 2, previous: 1, changePct: 100 });
  });

  it('needs a sign-in, a company and a sensible period', async () => {
    await http.get('/me/analytics').expect(401);
    await http.get('/me/analytics?days=5', owner).expect(400);
    const buyer = (await signIn(app, 'analytics-buyer@example.com')).accessToken;
    await http.get('/me/analytics', buyer).expect(403);
    await prisma.user.deleteMany({ where: { email: 'analytics-buyer@example.com' } });
  });
});
