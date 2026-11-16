import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service';
import { api, createApp, outbox } from './app';

describe('Sign in with a WhatsApp code', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof api>;
  let prisma: PrismaService;
  const phone = '+919811100001';
  const squatted = '+919811100002';

  async function codeFor(number: string) {
    await prisma.otpChallenge.deleteMany({ where: { destination: number } });
    const req = await http.post('/auth/otp/phone', { phone: number }).expect(202);
    const code = [...outbox].reverse().find((m) => m.to === number)!.code;
    return { challengeId: req.body.challengeId as string, code };
  }

  beforeAll(async () => {
    app = await createApp();
    http = api(app);
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { phone: { in: [phone, squatted] } } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: { in: [phone, squatted] } } });
    await app.close();
  });

  it('offers WhatsApp next to email', async () => {
    const { body } = await http.get('/auth/config').expect(200);
    expect(body.otpChannels).toEqual(expect.arrayContaining(['EMAIL', 'WHATSAPP']));
  });

  it('rejects numbers without a country code and ignores spaces and dashes', async () => {
    await http.post('/auth/otp/phone', { phone: '9811100001' }).expect(400);
    await http.post('/auth/otp/phone', { phone: 'not a number' }).expect(400);
    await prisma.otpChallenge.deleteMany({ where: { destination: phone } });
    await http.post('/auth/otp/phone', { phone: '+91 98111-00001' }).expect(202);
    expect(outbox.some((m) => m.to === phone)).toBe(true);
  });

  it('a new number gets a phone-only account, and the same number signs in again later', async () => {
    const first = await codeFor(phone);
    await http.post('/auth/otp/verify', { ...first, code: '000000' }).expect(400);
    const res = await http.post('/auth/otp/verify', { ...first, name: 'Asha Verma', role: 'SUPPLIER' }).expect(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user).toMatchObject({ phone, phoneVerified: true, email: null, name: 'Asha Verma', role: 'SUPPLIER' });

    // The code works once.
    await http.post('/auth/otp/verify', first).expect(400);

    const again = await codeFor(phone);
    const back = await http.post('/auth/otp/verify', { ...again, role: 'BUYER' }).expect(200);
    expect(back.body.isNewUser).toBe(false);
    expect(back.body.user.id).toBe(res.body.user.id);
    expect(back.body.user.role).toBe('SUPPLIER'); // the role in the request is ignored for existing accounts

    // The new account works like any other.
    const me = await http.get('/users/me', back.body.accessToken).expect(200);
    expect(me.body.phone).toBe(phone);
  });

  it('an unverified number typed into a profile does not block its real owner', async () => {
    // Someone saves a number in their profile without ever proving it.
    const email = 'squatter@example.com';
    await prisma.otpChallenge.deleteMany({ where: { destination: email } });
    const req = await http.post('/auth/otp/email', { email }).expect(202);
    const emailCode = [...outbox].reverse().find((m) => m.to === email)!.code;
    const user = await http.post('/auth/otp/verify', { challengeId: req.body.challengeId, code: emailCode }).expect(200);
    await http.patch('/users/me', { phone: squatted }, user.body.accessToken).expect(200);
    expect((await http.get('/users/me', user.body.accessToken).expect(200)).body.phoneVerified).toBe(false);

    // The real owner proves the number and gets their own account.
    const code = await codeFor(squatted);
    const res = await http.post('/auth/otp/verify', code).expect(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.id).not.toBe(user.body.user.id);
    expect(res.body.user.phone).toBe(squatted);

    // The squatter keeps their account, minus the number.
    expect((await http.get('/users/me', user.body.accessToken).expect(200)).body.phone).toBeNull();
    await prisma.user.deleteMany({ where: { email } });
  });

  it('changing the number on a profile makes it unverified again', async () => {
    const code = await codeFor(phone);
    const { body } = await http.post('/auth/otp/verify', code).expect(200);
    expect(body.user.phoneVerified).toBe(true);
    const moved = await http.patch('/users/me', { phone: '+919811100003' }, body.accessToken).expect(200);
    expect(moved.body).toMatchObject({ phone: '+919811100003', phoneVerified: false });
    await prisma.user.deleteMany({ where: { phone: '+919811100003' } });
  });
});
