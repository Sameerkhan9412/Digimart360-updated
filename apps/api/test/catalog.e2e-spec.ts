import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { api, createApp, signIn } from './app';

/**
 * Runs against a freshly migrated test database loaded with the demo catalog
 * (prisma/seed-demo.ts): 9 live ball valves from 8 suppliers, one supplier pending approval.
 */
describe('Catalog API (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
  });
  afterAll(() => app.close());

  describe('categories', () => {
    it('serves the tree with rolled-up live product counts', async () => {
      const { body } = await http.get('/categories').expect(200);
      expect(body).toHaveLength(10);
      const machinery = body.find((c: any) => c.slug === 'industrial-machinery');
      expect(machinery.productCount).toBe(20);
      expect(machinery.children.find((c: any) => c.slug === 'valves-and-fittings').productCount).toBe(18);
    });

    it('serves a category page with breadcrumb and SEO text', async () => {
      const { body } = await http.get('/categories/ball-valves').expect(200);
      expect(body.breadcrumb.map((b: any) => b.slug)).toEqual(['industrial-machinery', 'valves-and-fittings', 'ball-valves']);
      expect(body.productCount).toBe(9);
      expect(body.seoTitle).toBe('Ball Valves Manufacturers & Suppliers in India | DIGI MART 360');
      expect(body.seoDescription).toContain('9 ball valves');
    });

    it('404s for unknown categories', () => http.get('/categories/no-such-thing').expect(404));
  });

  describe('listing & search', () => {
    it('lists a category with its sub-categories, plus facets', async () => {
      const { body } = await http.get('/products?category=valves-and-fittings&pageSize=48').expect(200);
      expect(body.total).toBe(18);
      expect(body.items).toHaveLength(18);
      expect(body.facets.cities.find((c: any) => c.value === 'Pune').count).toBe(6);
      const card = body.items[0];
      expect(card).toMatchObject({ price: { unit: expect.any(String) }, company: { slug: expect.any(String) }, category: { slug: expect.any(String) } });
      expect(card.specs.length).toBeLessThanOrEqual(6);
    });

    it('filters by city; the city facet still shows every city', async () => {
      const { body } = await http.get('/products?category=ball-valves&city=ahmedabad').expect(200);
      expect(body.total).toBe(2);
      expect(body.items.every((p: any) => p.company.city === 'Ahmedabad')).toBe(true);
      expect(body.facets.cities.length).toBeGreaterThan(5);
    });

    it('filters by trust, business type and price range', async () => {
      expect((await http.get('/products?category=ball-valves&trusted=true').expect(200)).body.total).toBe(6);
      expect((await http.get('/products?category=ball-valves&businessType=EXPORTER').expect(200)).body.total).toBe(5);
      const { body } = await http.get('/products?category=ball-valves&minPrice=1000&maxPrice=3000').expect(200);
      for (const p of body.items) {
        expect(p.price.min).toBeLessThanOrEqual(3000);
        expect(p.price.max).toBeGreaterThanOrEqual(1000);
      }
    });

    it('sorts by price both ways', async () => {
      const asc = (await http.get('/products?category=ball-valves&sort=price_asc').expect(200)).body.items;
      expect(asc[0].name).toBe('PVC Ball Valve for Drip Irrigation');
      const desc = (await http.get('/products?category=ball-valves&sort=price_desc').expect(200)).body.items;
      expect(desc[0].name).toBe('Trunnion Mounted Ball Valve, Class 600');
    });

    it('paginates without overlap', async () => {
      const p1 = (await http.get('/products?category=ball-valves&pageSize=4&page=1').expect(200)).body;
      const p2 = (await http.get('/products?category=ball-valves&pageSize=4&page=2').expect(200)).body;
      expect(p1.total).toBe(9);
      const ids = new Set([...p1.items, ...p2.items].map((p: any) => p.id));
      expect(ids.size).toBe(8);
    });

    it('full-text search matches all words and understands plurals', async () => {
      const { body } = await http.get('/products?q=brass+valves').expect(200);
      expect(body.items.map((p: any) => p.name).sort()).toEqual(['Brass Spring Check Valve', 'Forged Brass Ball Valve, Lever Handle']);
    });

    it('ranks a name that starts with the query first', async () => {
      const { body } = await http.get('/products?q=marine').expect(200);
      expect(body.items[0].name).toBe('Marine Bronze Ball Valve, Flanged');
    });

    it('matches partial words and searches specs', async () => {
      expect((await http.get('/products?q=trunn').expect(200)).body.total).toBe(1);
      const { body } = await http.get('/products?q=API+6D').expect(200);
      expect(body.items.map((p: any) => p.name)).toContain('Trunnion Mounted Ball Valve, Class 600');
    });

    it('treats % and _ in the query as plain text', async () => {
      const { body } = await http.get('/products?q=100%25_x').expect(200);
      expect(body.total).toBe(0);
    });

    it('rejects bad filters with a clear message', async () => {
      const { body } = await http.get('/products?pageSize=500&businessType=SPACESHIP').expect(400);
      expect(body.message.join(' ')).toMatch(/pageSize must not be greater than 48/);
    });

    it('suggests categories, products and suppliers while typing', async () => {
      const { body } = await http.get('/search/suggest?q=ball').expect(200);
      expect(body.categories[0]).toEqual({ name: 'Ball Valves', slug: 'ball-valves' });
      expect(body.products.length).toBeGreaterThan(0);
    });
  });

  describe('product & supplier pages', () => {
    it('serves a product with all specs, breadcrumb, more from supplier and related', async () => {
      const { body } = await http.get('/products/2-ss304-flanged-ball-valve-class-150-acme').expect(200);
      expect(body.specs).toHaveLength(6);
      expect(body.breadcrumb).toHaveLength(3);
      expect(body.company).toMatchObject({ slug: 'acme-fluid-systems', gstVerified: true, trustSeal: true, exporter: true });
      expect(body.moreFromCompany).toHaveLength(4);
      expect(body.related.every((p: any) => p.company.slug !== 'acme-fluid-systems')).toBe(true);
    });

    it('serves a public supplier profile', async () => {
      const { body } = await http.get('/companies/acme-fluid-systems').expect(200);
      expect(body).toMatchObject({ productCount: 6, gstVerified: true, yearsInBusiness: expect.any(Number) });
      expect(body).not.toHaveProperty('gstin');
      expect(body).not.toHaveProperty('phone');
    });

    it('lists every public URL for the sitemap, and nothing pending', async () => {
      const { body } = await http.get('/sitemap').expect(200);
      expect(body.categories).toHaveLength(163);
      expect(body.products).toHaveLength(25);
      expect(body.companies.map((c: any) => c.slug)).not.toContain('nashik-steel-fabricators');
    });

    it('hides suppliers awaiting approval and their products', async () => {
      await http.get('/companies/nashik-steel-fabricators').expect(404);
      await http.get('/products/pre-engineered-steel-shed-nash').expect(404);
      expect((await http.get('/products?q=steel+shed').expect(200)).body.total).toBe(0);
    });
  });

  describe('supplier → admin → public life cycle', () => {
    let supplier: string;
    let admin: string;
    let productId: string;
    let companyId: string;
    let categoryId: string;

    beforeAll(async () => {
      categoryId = (await http.get('/categories/gate-valves').expect(200)).body.id;
      supplier = (await signIn(app, 'founder@sunrise-valves.example', { name: 'Sunrise Founder' })).accessToken;
      admin = (await signIn(app, 'admin@digimart360.local')).accessToken;
    });

    it('a buyer creates a company and becomes a supplier', async () => {
      const { body } = await http
        .post('/me/company', { name: 'Sunrise Valves', gstin: '27aabcs1234h1z9', businessTypes: ['MANUFACTURER'], city: 'Pune', state: 'Maharashtra' }, supplier)
        .expect(201);
      companyId = body.id;
      expect(body).toMatchObject({ slug: 'sunrise-valves', status: 'PENDING', gstin: '27AABCS1234H1Z9', gstVerified: false });
      await http.post('/me/company', { name: 'Again', businessTypes: ['TRADER'], city: 'Pune', state: 'MH' }, supplier).expect(409);
    });

    it('validates GSTIN and price ranges', async () => {
      const bad = await http.patch('/me/company', { gstin: '12345' }, supplier).expect(400);
      expect(bad.body.message.join(' ')).toMatch(/valid 15-character GSTIN/);
      await http.post('/me/products', { name: 'Odd Price Valve', categoryId, priceMin: 500, priceMax: 100 }, supplier).expect(400);
    });

    it('a new product waits for review and is not public', async () => {
      const { body } = await http
        .post('/me/products', {
          name: 'Sunrise Knife Gate Valve', categoryId, summary: 'For slurry lines', priceMin: 7200, moq: 10,
          specs: [{ label: 'Body', value: 'CF8M' }],
        }, supplier)
        .expect(201);
      productId = body.id;
      expect(body).toMatchObject({ status: 'PENDING_REVIEW', price: { min: 7200, max: 7200 } });
      expect((await http.get('/products?q=knife').expect(200)).body.total).toBe(0);
      expect((await http.get('/me/products', supplier).expect(200)).body).toHaveLength(1);
    });

    it('buyers and suppliers cannot use admin routes', async () => {
      await http.get('/admin/catalog/products', supplier).expect(403);
      await http.get('/admin/catalog/products').expect(401);
    });

    it('admin approves the company and the product; it goes live', async () => {
      const queue = (await http.get('/admin/catalog/products', admin).expect(200)).body;
      expect(queue.items.map((p: any) => p.id)).toContain(productId);

      await http.patch(`/admin/catalog/companies/${companyId}`, { status: 'ACTIVE', gstVerified: true }, admin).expect(200);
      await http.post(`/admin/catalog/products/${productId}/approve`, {}, admin).expect(200);

      const { body } = await http.get('/products?q=knife').expect(200);
      expect(body.total).toBe(1);
      expect(body.items[0].company).toMatchObject({ slug: 'sunrise-valves', gstVerified: true });
      expect((await http.get('/categories/gate-valves').expect(200)).body.productCount).toBe(3);
    });

    it('a price change stays live; a content change goes back to review', async () => {
      const price = await http.patch(`/me/products/${productId}`, { priceMax: 9000 }, supplier).expect(200);
      expect(price.body).toMatchObject({ status: 'ACTIVE', price: { min: 7200, max: 9000 } });

      const renamed = await http.patch(`/me/products/${productId}`, { name: 'Sunrise Knife Gate Valve, Bi-directional' }, supplier).expect(200);
      expect(renamed.body.status).toBe('PENDING_REVIEW');
      expect(renamed.body.slug).toBe(price.body.slug);
      expect((await http.get('/products?q=knife').expect(200)).body.total).toBe(0);
    });

    it('a full-form save with only a price change does not trigger a new review', async () => {
      const cur = (await http.get(`/me/products/${productId}`, supplier).expect(200)).body;
      const res = await http
        .patch(`/me/products/${productId}`, {
          name: cur.name, categoryId: cur.category.id, summary: cur.summary ?? '', description: cur.description ?? '',
          specs: cur.specs, images: cur.images, priceMin: 7300, priceMax: 7300,
        }, supplier)
        .expect(200);
      expect(res.body.status).toBe(cur.status);
    });

    it('rejection reaches the supplier with a reason; resubmitting works', async () => {
      await http.post(`/admin/catalog/products/${productId}/reject`, { reason: 'Add a photo of the actual valve.' }, admin).expect(200);
      const mine = (await http.get(`/me/products/${productId}`, supplier).expect(200)).body;
      expect(mine).toMatchObject({ status: 'REJECTED', rejectionReason: 'Add a photo of the actual valve.' });

      const resubmitted = await http.patch(`/me/products/${productId}`, { submit: true }, supplier).expect(200);
      expect(resubmitted.body).toMatchObject({ status: 'PENDING_REVIEW', rejectionReason: null });
    });

    it('DM Trusted suppliers skip review', async () => {
      await http.patch(`/admin/catalog/companies/${companyId}`, { trustSeal: true }, admin).expect(200);
      const { body } = await http.post('/me/products', { name: 'Sunrise Plug Valve', categoryId, priceMin: 4100 }, supplier).expect(201);
      expect(body.status).toBe('ACTIVE');
      await http.get(`/products/${body.slug}`).expect(200);
    });

    it("another supplier can't see or touch these products", async () => {
      const other = (await signIn(app, 'owner@rival.example')).accessToken;
      await http.post('/me/company', { name: 'Rival Valves', businessTypes: ['TRADER'], city: 'Surat', state: 'Gujarat' }, other).expect(201);
      await http.get(`/me/products/${productId}`, other).expect(404);
      await http.patch(`/me/products/${productId}`, { priceMin: 1 }, other).expect(404);
      await http.delete(`/me/products/${productId}`, other).expect(404);
    });

    it('uploads product photos, checks their real type, and only accepts your own', async () => {
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const key = process.env.INTERNAL_API_KEY as string;
      const upload = (file: Buffer, name: string, token = supplier) =>
        request(app.getHttpServer()).post('/api/v1/me/uploads/images').set('X-Internal-Key', key).set('Authorization', `Bearer ${token}`).attach('file', file, name);

      await request(app.getHttpServer()).post('/api/v1/me/uploads/images').attach('file', png, 'a.png').expect(401);
      const disguised = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 'logo.png').expect(400);
      expect(disguised.body.message).toMatch(/JPEG, PNG or WebP/);
      await upload(Buffer.alloc(5 * 1024 * 1024 + 10, 1), 'big.jpg').expect(413);

      const ok = await upload(png, 'photo.exe').expect(201);
      expect(ok.body).toMatchObject({ contentType: 'image/png', size: png.length });
      expect(ok.body.url).toContain(`/media/companies/${companyId}/`);
      expect(ok.body.url).toMatch(/\.png$/);

      const served = await request(app.getHttpServer()).get(new URL(ok.body.url).pathname).expect(200);
      expect(served.headers['x-content-type-options']).toBe('nosniff');
      expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');

      const product = await http.patch(`/me/products/${productId}`, { images: [ok.body.url] }, supplier).expect(200);
      expect(product.body.images).toEqual([ok.body.url]);
      await http.patch(`/me/products/${productId}`, { images: ['https://evil.example/x.png'] }, supplier).expect(400);
      await http.patch(`/me/products/${productId}`, { images: [ok.body.url.replace(companyId, 'other-company')] }, supplier).expect(400);
    });

    it('archiving hides a product; restoring brings it back as a draft', async () => {
      await http.post(`/admin/catalog/products/${productId}/approve`, {}, admin).expect(200);
      await http.delete(`/me/products/${productId}`, supplier).expect(200);
      expect((await http.get('/products?q=knife').expect(200)).body.total).toBe(0);
      await http.patch(`/me/products/${productId}`, { priceMin: 1 }, supplier).expect(409);
      const restored = await http.post(`/me/products/${productId}/restore`, {}, supplier).expect(201);
      expect(restored.body.status).toBe('DRAFT');
    });
  });
});
