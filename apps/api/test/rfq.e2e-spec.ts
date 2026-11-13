import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp, signIn } from './app';

/** Uses the demo catalog: live ball valves from several approved suppliers. */
describe('RFQs (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let buyer: string;
  let supplierA: string;
  let supplierB: string;
  let categoryId: string;
  let slugs: string[];
  let rfqId: string;
  let quoteA: string;
  let quoteB: string;

  const ownerEmail = (slug: string) => `owner@${slug}.demo.digimart360.local`;

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    categoryId = (await http.get('/categories/ball-valves').expect(200)).body.id;
    const list = (await http.get('/products?category=ball-valves&pageSize=48').expect(200)).body.items;
    slugs = [...new Set<string>(list.map((p: { company: { slug: string } }) => p.company.slug))];
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    buyer = (await signIn(app, 'buyer@rfq-test.example', { name: 'Rahul Buyer' })).accessToken;
    supplierA = (await signIn(app, ownerEmail(slugs[0]))).accessToken;
    supplierB = (await signIn(app, ownerEmail(slugs[1]))).accessToken;
  });
  afterAll(() => app.close());

  const requirement = (extra: object = {}) => ({
    title: 'Industrial ball valves DN50, SS304',
    categoryId,
    quantity: 500,
    unit: 'Piece',
    city: 'Mumbai',
    state: 'Maharashtra',
    budget: 1_000_000,
    description: 'Flanged, with EN 10204 3.1 certificates.',
    ...extra,
  });

  it('needs a signed-in buyer and valid input', async () => {
    await http.post('/rfqs', requirement()).expect(401);
    await http.post('/rfqs', requirement({ quantity: 0 }), buyer).expect(400);
    await http.post('/rfqs', requirement({ categoryId: '00000000-0000-4000-8000-000000000000' }), buyer).expect(400);
  });

  it('posts a requirement and invites matching suppliers', async () => {
    const { body } = await http.post('/rfqs', requirement(), buyer).expect(201);
    rfqId = body.id;
    expect(body.number).toMatch(/^RFQ-\d{6}-\d{4}$/);
    expect(body).toMatchObject({ status: 'OPEN', quantity: 500, budget: 1_000_000, quoteCount: 0, quotes: [] });
    expect(body.invitedCount).toBeGreaterThanOrEqual(3);
    expect(body.invitedCount).toBeLessThanOrEqual(15);
    expect((await http.get('/me/rfqs', buyer).expect(200)).body).toHaveLength(1);
  });

  it('shows it to invited suppliers without revealing the buyer', async () => {
    const inbox = (await http.get('/me/rfq-inbox', supplierA).expect(200)).body;
    const mine = inbox.find((r: { id: string }) => r.id === rfqId);
    expect(mine).toMatchObject({ invited: true, buyerLocation: 'Mumbai, Maharashtra', myQuote: null, buyerContact: null });
    expect(JSON.stringify(mine)).not.toMatch(/rfq-test\.example|Rahul/);
  });

  it('keeps requirements private to their buyer and to approved suppliers', async () => {
    const stranger = (await signIn(app, 'stranger@rfq-test.example')).accessToken;
    await http.get(`/me/rfqs/${rfqId}`, stranger).expect(404);
    await http.get(`/me/rfqs/${rfqId}`, supplierA).expect(404); // suppliers use the inbox, not the buyer view
    await http.get('/me/rfq-inbox', stranger).expect(403); // no company yet
    await http.get(`/me/rfq-inbox/${rfqId}`, buyer).expect(403);
    await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 100, deliveryDays: 1 }, stranger).expect(403);
  });

  it('suppliers send quotes; the buyer compares them', async () => {
    await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: -5, deliveryDays: 7 }, supplierA).expect(400);
    const a = await http
      .put(`/me/rfq-inbox/${rfqId}/quote`, {
        unitPrice: 1950, deliveryDays: 7, material: 'ASTM A351 CF8', warranty: '18 months', paymentTerms: '30% advance', validForDays: 14,
      }, supplierA)
      .expect(200);
    expect(a.body.myQuote).toMatchObject({ unitPrice: 1950, total: 975_000, revision: 1, status: 'SUBMITTED' });
    await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 1880, deliveryDays: 16, material: 'SS304' }, supplierB).expect(200);

    const { body } = await http.get(`/me/rfqs/${rfqId}`, buyer).expect(200);
    expect(body.quoteCount).toBe(2);
    expect(body.quotes.map((q: { unitPrice: number }) => q.unitPrice)).toEqual([1880, 1950]); // lowest first
    const [low, fast] = body.quotes;
    expect(low).toMatchObject({ isLowestPrice: true, isFastest: false, total: 940_000, withinBudget: true });
    expect(fast).toMatchObject({ isLowestPrice: false, isFastest: true });
    quoteA = fast.id;
    quoteB = low.id;
  });

  it("a supplier never sees another supplier's quote", async () => {
    const view = (await http.get(`/me/rfq-inbox/${rfqId}`, supplierA).expect(200)).body;
    expect(view.myQuote.unitPrice).toBe(1950);
    expect(view.quoteCount).toBe(2); // they know there is competition, nothing more
    expect(JSON.stringify(view)).not.toContain('1880');
  });

  it('a supplier can revise or withdraw while the requirement is open', async () => {
    const revised = await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 1900, deliveryDays: 7 }, supplierA).expect(200);
    expect(revised.body.myQuote).toMatchObject({ unitPrice: 1900, revision: 2 });

    const out = await http.post(`/me/rfq-inbox/${rfqId}/quote/withdraw`, {}, supplierA).expect(200);
    expect(out.body.myQuote.status).toBe('WITHDRAWN');
    expect((await http.get(`/me/rfqs/${rfqId}`, buyer).expect(200)).body.quoteCount).toBe(1);

    const back = await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 1950, deliveryDays: 7 }, supplierA).expect(200);
    expect(back.body.myQuote).toMatchObject({ status: 'SUBMITTED', revision: 3 });
    quoteA = back.body.myQuote.id;
  });

  it('awarding picks a winner, informs the others, and shares contact details only with the winner', async () => {
    await http.post(`/me/rfqs/${rfqId}/award`, { quoteId: '00000000-0000-4000-8000-000000000000' }, buyer).expect(400);
    await http.post(`/me/rfqs/${rfqId}/award`, { quoteId: quoteA }, supplierB).expect(404);

    const won = (await http.post(`/me/rfqs/${rfqId}/award`, { quoteId: quoteA }, buyer).expect(200)).body;
    expect(won.status).toBe('AWARDED');
    expect(won.awardedContact).toMatchObject({ name: expect.any(String) });
    expect(won.awardedContact.email).toBeTruthy();

    const winnerView = (await http.get(`/me/rfq-inbox/${rfqId}`, supplierA).expect(200)).body;
    expect(winnerView.myQuote.status).toBe('AWARDED');
    expect(winnerView.buyerContact).toMatchObject({ name: 'Rahul Buyer', email: 'buyer@rfq-test.example' });

    const loserView = (await http.get(`/me/rfq-inbox/${rfqId}`, supplierB).expect(200)).body;
    expect(loserView.myQuote.status).toBe('NOT_SELECTED');
    expect(loserView.buyerContact).toBeNull();

    await http.post(`/me/rfqs/${rfqId}/award`, { quoteId: quoteB }, buyer).expect(409);
    await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 1, deliveryDays: 1 }, supplierB).expect(409);
    await http.put(`/me/rfq-inbox/${rfqId}/quote`, { unitPrice: 1, deliveryDays: 1 }, supplierA).expect(409);
  });

  it('closing stops quotes; an RFQ past its date expires on its own', async () => {
    const closed = await http.post('/rfqs', requirement({ title: 'Ball valves, second lot' }), buyer).expect(201);
    await http.post(`/me/rfqs/${closed.body.id}/close`, {}, buyer).expect(200);
    await http.put(`/me/rfq-inbox/${closed.body.id}/quote`, { unitPrice: 10, deliveryDays: 1 }, supplierA).expect(409);
    await http.post(`/me/rfqs/${closed.body.id}/close`, {}, buyer).expect(409);

    const old = await http.post('/rfqs', requirement({ title: 'Ball valves, third lot', closesInDays: 1 }), buyer).expect(201);
    await app.get(PrismaService).rfq.update({ where: { id: old.body.id }, data: { closesAt: new Date(Date.now() - 1000) } });
    expect((await http.get(`/me/rfqs/${old.body.id}`, buyer).expect(200)).body.status).toBe('EXPIRED');
    await http.put(`/me/rfq-inbox/${old.body.id}/quote`, { unitPrice: 10, deliveryDays: 1 }, supplierA).expect(409);
  });

  it('a named supplier is always invited, even outside the category', async () => {
    const other = (await http.get('/categories').expect(200)).body
      .flatMap((g: { children: { slug: string; id: string }[] }) => g.children)
      .find((c: { slug: string }) => !['ball-valves', 'valves-fittings'].includes(c.slug));
    const company = (await http.get(`/companies/${slugs[2]}`).expect(200)).body;
    const { body } = await http.post('/rfqs', requirement({ categoryId: other.id, companyId: company.id, title: 'Something unrelated' }), buyer).expect(201);
    const theirs = (await signIn(app, ownerEmail(slugs[2]))).accessToken;
    const inbox = (await http.get('/me/rfq-inbox', theirs).expect(200)).body;
    expect(inbox.find((r: { id: string }) => r.id === body.id)).toMatchObject({ invited: true });
  });

  it('buyers cannot ask their own company for a quote', async () => {
    const own = (await http.get(`/companies/${slugs[0]}`).expect(200)).body;
    await http.post('/rfqs', requirement({ companyId: own.id }), supplierA).expect(400);
  });
});
