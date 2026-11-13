import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { OtpChannel } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { OTP_SENDERS, OtpSender } from '../src/notifications/otp-senders';
import { useTestEnv } from './load-env';

useTestEnv();

/** Codes "sent" during the tests, newest last. */
export const outbox: { to: string; code: string }[] = [];
const captureEmail: OtpSender = {
  channel: OtpChannel.EMAIL,
  send: async (to, code) => void outbox.push({ to, code }),
};

export async function createApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(OTP_SENDERS)
    .useValue([captureEmail])
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

/** HTTP client for /api/v1 that skips per-IP rate limits like our own web server does. */
export function api(app: NestExpressApplication) {
  const key = process.env.INTERNAL_API_KEY as string;
  const http = request(app.getHttpServer());
  const wrap = (t: request.Test, token?: string) => {
    t.set('X-Internal-Key', key);
    return token ? t.set('Authorization', `Bearer ${token}`) : t;
  };
  return {
    get: (p: string, token?: string) => wrap(http.get('/api/v1' + p), token),
    post: (p: string, body?: object, token?: string) => wrap(http.post('/api/v1' + p), token).send(body ?? {}),
    patch: (p: string, body: object, token?: string) => wrap(http.patch('/api/v1' + p), token).send(body),
    put: (p: string, body: object, token?: string) => wrap(http.put('/api/v1' + p), token).send(body),
    delete: (p: string, token?: string) => wrap(http.delete('/api/v1' + p), token),
  };
}

/** Sign in by email code the way a client would. Returns tokens + user. */
export async function signIn(app: NestExpressApplication, email: string, extra: object = {}) {
  const client = api(app);
  // Suites share one database and sign in as the same people (the admin, demo suppliers); forget earlier
  // codes so the per-email cooldown (60 s) and hourly cap don't make suites depend on run order.
  await app.get(PrismaService).otpChallenge.deleteMany({ where: { destination: email } });
  const req = await client.post('/auth/otp/email', { email }).expect(202);
  const code = [...outbox].reverse().find((m) => m.to === email)!.code;
  const res = await client.post('/auth/otp/verify', { challengeId: req.body.challengeId, code, ...extra }).expect(200);
  return res.body as { accessToken: string; refreshToken: string; user: { id: string; role: string } };
}
