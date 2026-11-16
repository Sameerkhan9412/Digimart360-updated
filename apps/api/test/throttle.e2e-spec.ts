import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from './app';

/** Auth routes allow 10 requests a minute per visitor. An invalid body is cheap and still counts. */
describe('Rate limits per visitor', () => {
  let app: NestExpressApplication;
  const key = () => process.env.INTERNAL_API_KEY as string;
  const hit = (headers: Record<string, string>) =>
    request(app.getHttpServer()).post('/api/v1/auth/otp/phone').set(headers).send({});

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("limits each visitor the website names, separately from other visitors", async () => {
    const a = { 'X-Internal-Key': key(), 'X-Client-IP': '203.0.113.10' };
    for (let i = 0; i < 10; i++) await hit(a).expect(400);
    await hit(a).expect(429);
    // Another visitor is unaffected.
    await hit({ 'X-Internal-Key': key(), 'X-Client-IP': '203.0.113.11' }).expect(400);
  });

  it('still lets the website make calls that name no visitor (cached pages) without limit', async () => {
    for (let i = 0; i < 15; i++) await hit({ 'X-Internal-Key': key() }).expect(400);
  });

  it('ignores a claimed client address when the internal key is missing or wrong', async () => {
    // Every request really comes from one address, so spoofing different IPs cannot dodge the limit.
    for (let i = 0; i < 10; i++) await hit({ 'X-Client-IP': `198.51.100.${i + 1}` }).expect(400);
    await hit({ 'X-Client-IP': '198.51.100.99' }).expect(429);
    await hit({ 'X-Internal-Key': 'x'.repeat(40), 'X-Client-IP': '198.51.100.98' }).expect(429);
  });

  it('ignores a malformed client address', async () => {
    // The key is valid but the address is not an IP: treated as a call that names no visitor.
    for (let i = 0; i < 12; i++) await hit({ 'X-Internal-Key': key(), 'X-Client-IP': 'not-an-ip' }).expect(400);
  });
});
