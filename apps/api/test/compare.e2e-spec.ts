import { NestExpressApplication } from '@nestjs/platform-express';
import { api, createApp } from './app';

describe('Product comparison (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let slugs: string[];

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    const page = (await http.get('/products?pageSize=5').expect(200)).body;
    slugs = page.items.map((p: { slug: string }) => p.slug);
  });

  afterAll(() => app.close());

  it('returns the products asked for, in that order, with every specification', async () => {
    const asked = [slugs[2], slugs[0], slugs[1]];
    const res = (await http.get(`/products/compare?slugs=${asked.join(',')}`).expect(200)).body;
    expect(res.map((p: { slug: string }) => p.slug)).toEqual(asked);
    const detail = (await http.get(`/products/${asked[0]}`).expect(200)).body;
    expect(res[0].specs).toEqual(detail.specs); // all of them, not the 6 shown on cards
    expect(res[0]).toMatchObject({ price: expect.any(Object), company: { name: expect.any(String), city: expect.any(String) }, category: { name: expect.any(String) } });
  });

  it('leaves out unknown products and repeats', async () => {
    const res = (await http.get(`/products/compare?slugs=${slugs[0]},no-such-product,${slugs[0]}`).expect(200)).body;
    expect(res.map((p: { slug: string }) => p.slug)).toEqual([slugs[0]]);
    expect((await http.get('/products/compare?slugs=no-such-product').expect(200)).body).toEqual([]);
  });

  it('accepts one to four products and nothing odd', async () => {
    await http.get('/products/compare').expect(400);
    await http.get('/products/compare?slugs=').expect(400);
    await http.get(`/products/compare?slugs=${slugs.slice(0, 5).join(',')}`).expect(400);
    await http.get('/products/compare?slugs=Not%20A%20Slug!').expect(400);
  });
});
