import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp, signIn } from './app';

describe('Saved suppliers (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let prisma: PrismaService;
  let buyer: string;
  let owner: string;
  let acme: string;
  let kaveri: string;
  const email = 'saved-buyer@example.com';

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    prisma = app.get(PrismaService);
    buyer = (await signIn(app, email)).accessToken;
    owner = (await signIn(app, 'owner@bharat-electro-corp.demo.digimart360.local')).accessToken;
    acme = (await http.get('/companies/bharat-electro-corp').expect(200)).body.id;
    kaveri = (await http.get('/companies/kaveri-textiles').expect(200)).body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('needs a sign-in', async () => {
    await http.get('/me/saved-suppliers').expect(401);
    await http.put(`/me/saved-suppliers/${acme}`, {}).expect(401);
  });

  it('saves, lists newest first, and saving twice changes nothing', async () => {
    expect((await http.get('/me/saved-suppliers', buyer).expect(200)).body).toEqual([]);
    await http.put(`/me/saved-suppliers/${acme}`, {}, buyer).expect(204);
    await http.put(`/me/saved-suppliers/${acme}`, {}, buyer).expect(204);
    await http.put(`/me/saved-suppliers/${kaveri}`, {}, buyer).expect(204);
    const list = (await http.get('/me/saved-suppliers', buyer).expect(200)).body;
    expect(list.map((c: { slug: string }) => c.slug)).toEqual(['kaveri-textiles', 'bharat-electro-corp']);
    expect(list[0]).toMatchObject({ id: kaveri, name: expect.any(String), city: expect.any(String) });
    expect(new Set((await http.get('/me/saved-suppliers/ids', buyer).expect(200)).body)).toEqual(new Set([acme, kaveri]));
  });

  it('removes, and removing something not saved is fine', async () => {
    await http.delete(`/me/saved-suppliers/${acme}`, buyer).expect(204);
    await http.delete(`/me/saved-suppliers/${acme}`, buyer).expect(204);
    expect((await http.get('/me/saved-suppliers/ids', buyer).expect(200)).body).toEqual([kaveri]);
  });

  it('keeps each person\'s list private', async () => {
    expect((await http.get('/me/saved-suppliers/ids', owner).expect(200)).body).toEqual([]);
  });

  it('refuses unknown suppliers, your own company, and hides suppliers that are no longer live', async () => {
    await http.put('/me/saved-suppliers/not-a-uuid', {}, buyer).expect(400);
    await http.put('/me/saved-suppliers/00000000-0000-4000-8000-000000000000', {}, buyer).expect(404);
    await http.put(`/me/saved-suppliers/${acme}`, {}, owner).expect(400);

    await prisma.company.update({ where: { id: kaveri }, data: { status: 'SUSPENDED' } });
    try {
      expect((await http.get('/me/saved-suppliers', buyer).expect(200)).body).toEqual([]);
      await http.put(`/me/saved-suppliers/${kaveri}`, {}, buyer).expect(404);
    } finally {
      await prisma.company.update({ where: { id: kaveri }, data: { status: 'ACTIVE' } });
    }
    expect((await http.get('/me/saved-suppliers', buyer).expect(200)).body).toHaveLength(1); // still saved
  });
});
