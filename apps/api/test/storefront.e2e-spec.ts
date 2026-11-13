import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp, signIn } from './app';

/** Uses two approved demo suppliers. */
describe('Storefronts (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let prisma: PrismaService;
  let slug: string;
  let otherSlug: string;
  let owner: string;
  let other: string;
  let admin: string;
  let domainId: string;

  const ownerEmail = (s: string) => `owner@${s}.demo.digimart360.local`;

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    prisma = app.get(PrismaService);
    // Suppliers no other suite signs in as (sign-in codes are limited per email).
    slug = 'bharat-electro-corp';
    otherSlug = 'kaveri-textiles';
    owner = (await signIn(app, ownerEmail(slug))).accessToken;
    other = (await signIn(app, ownerEmail(otherSlug))).accessToken;
    admin = (await signIn(app, 'admin@digimart360.local')).accessToken;
  });

  afterAll(() => app.close());

  it('requires sign-in for settings; the public lookups are open', async () => {
    await http.get('/me/storefront').expect(401);
    await http.get('/me/domain').expect(401);
    await http.get('/admin/domains', owner).expect(403);
    await http.get(`/storefronts/${slug}`).expect(200);
  });

  it('a supplier without saved settings gets the defaults', async () => {
    const { body } = await http.get('/me/storefront', owner).expect(200);
    expect(body).toMatchObject({ theme: 'MERIDIAN', accent: null, showAbout: true, certificates: [] });
  });

  it('validates and saves branding', async () => {
    await http.patch('/me/storefront', { accent: 'orange' }, owner).expect(400);
    await http.patch('/me/storefront', { theme: 'NEON' }, owner).expect(400);
    await http.patch('/me/storefront', { theme: null }, owner).expect(400);
    await http.patch('/me/storefront', { showAbout: null }, owner).expect(400);
    await http.patch('/me/storefront', { bannerUrl: 'https://evil.example/x.jpg' }, owner).expect(400);
    const { body } = await http
      .patch('/me/storefront', { theme: 'FORGE', accent: '#C2410C', tagline: 'Precision since 1998', showContact: false, certificates: ['ISO 9001:2015', ' CE '] }, owner)
      .expect(200);
    expect(body).toMatchObject({ theme: 'FORGE', accent: '#c2410c', showContact: false, showAbout: true, certificates: ['ISO 9001:2015', 'CE'] });
    // A partial save keeps everything else.
    const again = await http.patch('/me/storefront', { tagline: 'New line' }, owner).expect(200);
    expect(again.body).toMatchObject({ theme: 'FORGE', tagline: 'New line' });
    // null clears a field; leaving it out keeps it.
    const cleared = await http.patch('/me/storefront', { accent: null, tagline: null }, owner).expect(200);
    expect(cleared.body).toMatchObject({ theme: 'FORGE', accent: null, tagline: null });
    await http.patch('/me/storefront', { tagline: 'New line' }, owner).expect(200);
    const pub = (await http.get(`/storefronts/${slug}`).expect(200)).body;
    expect(pub).toMatchObject({ slug, theme: 'FORGE', canonicalHost: `${slug}.digimart.test` });
  });

  it('maps hosts to suppliers', async () => {
    const hit = await http.get(`/storefronts/by-host?host=${slug}.digimart.test:3001`).expect(200);
    expect(hit.body).toEqual({ slug, canonicalHost: `${slug}.digimart.test` });
    await http.get('/storefronts/by-host?host=www.digimart.test').expect(404);
    await http.get('/storefronts/by-host?host=digimart.test').expect(404);
    await http.get('/storefronts/by-host?host=nobody-here.digimart.test').expect(404);
    await http.get('/storefronts/by-host?host=a.b.digimart.test').expect(404);
    await http.get('/storefronts/by-host?host=unknown-domain.example').expect(404);
    await http.get(`/internal/certificate-allowed?domain=${slug}.digimart.test`).expect(200);
    await http.get('/internal/certificate-allowed?domain=unknown-domain.example').expect(404);
  });

  it('custom domain: add, prove ownership, wait for approval, go live', async () => {
    expect((await http.get('/me/domain', owner).expect(200)).body).toEqual({});
    await http.put('/me/domain', { host: 'localhost' }, owner).expect(400);
    await http.put('/me/domain', { host: `shop.${'digimart.test'}` }, owner).expect(400);

    const { body } = await http.put('/me/domain', { host: 'WWW.Acme-Valves.example.' }, owner).expect(200);
    domainId = body.id;
    expect(body).toMatchObject({
      host: 'www.acme-valves.example',
      status: 'PENDING_DNS',
      txtName: '_digimart-verify.www.acme-valves.example',
      cnameTarget: 'sites.digimart.test',
    });
    expect(body.txtValue).toMatch(/^dm-verify-/);

    await http.put('/me/domain', { host: 'www.acme-valves.example' }, other).expect(409);
    // The TXT record does not exist, so ownership cannot be proven.
    await http.post('/me/domain/check', {}, owner).expect(400);
    // Not live while waiting.
    await http.get('/storefronts/by-host?host=www.acme-valves.example').expect(404);
    await http.post(`/admin/domains/${domainId}/approve`, {}, admin).expect(409);

    // Pretend DNS check succeeded (real DNS is not available in tests).
    await prisma.customDomain.update({ where: { id: domainId }, data: { status: 'PENDING_APPROVAL', verifiedAt: new Date() } });
    const queue = (await http.get('/admin/domains', admin).expect(200)).body;
    expect(queue.items.map((d: { id: string }) => d.id)).toContain(domainId);
    expect(queue.items.find((d: { id: string }) => d.id === domainId)).toMatchObject({ companySlug: slug, ownerEmail: ownerEmail(slug) });

    await http.post(`/admin/domains/${domainId}/reject`, { reason: 'short' }, admin).expect(400);
    await http.post(`/admin/domains/${domainId}/approve`, {}, admin).expect(200);

    expect((await http.get('/storefronts/by-host?host=www.acme-valves.example').expect(200)).body).toEqual({
      slug,
      canonicalHost: 'www.acme-valves.example',
    });
    // The subdomain now points visitors to the supplier's own address.
    expect((await http.get(`/storefronts/by-host?host=${slug}.digimart.test`).expect(200)).body.canonicalHost).toBe('www.acme-valves.example');
    expect((await http.get(`/storefronts/${slug}`).expect(200)).body.canonicalHost).toBe('www.acme-valves.example');
    await http.get('/internal/certificate-allowed?domain=www.acme-valves.example').expect(200);
  });

  it('rejecting shows the reason; removing the domain frees the name', async () => {
    await http.post(`/admin/domains/${domainId}/reject`, { reason: 'This domain belongs to another business.' }, admin).expect(200);
    const mine = (await http.get('/me/domain', owner).expect(200)).body;
    expect(mine).toMatchObject({ status: 'REJECTED', rejectionReason: 'This domain belongs to another business.' });
    await http.get('/storefronts/by-host?host=www.acme-valves.example').expect(404);

    await http.delete('/me/domain', owner).expect(204);
    expect((await http.get('/me/domain', owner).expect(200)).body).toEqual({});
    await http.put('/me/domain', { host: 'www.acme-valves.example' }, other).expect(200);
    await http.delete('/me/domain', other).expect(204);
  });

  it('a supplier whose company is not approved cannot connect a domain', async () => {
    const pending = (await signIn(app, 'newbie@storefront-test.example', { name: 'Newbie' })).accessToken;
    await http.post('/me/company', { name: 'Newbie Traders', businessTypes: ['TRADER'], city: 'Pune', state: 'Maharashtra' }, pending).expect(201);
    await http.put('/me/domain', { host: 'www.newbie.example' }, pending).expect(400);
    await http.get('/storefronts/newbie-traders').expect(404);
  });
});
