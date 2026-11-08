import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { OtpSender } from '../notifications/otp-senders';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService, TooManyRequests } from './otp.service';

const config = {
  get: (k: string) => ({ OTP_TTL_MINUTES: 10, JWT_ACCESS_SECRET: 's'.repeat(40) })[k],
} as unknown as ConfigService;

function setup() {
  const rows: Record<string, any> = {};
  const prisma = {
    otpChallenge: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }) => (rows.c = { id: 'c1', attempts: 0, consumedAt: null, ...data })),
      findUnique: jest.fn(async () => rows.c ?? null),
      delete: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const sent: { to: string; code: string }[] = [];
  const sender: OtpSender = { channel: OtpChannel.EMAIL, send: jest.fn(async (to, code) => void sent.push({ to, code })) };
  const service = new OtpService(prisma as unknown as PrismaService, config as never, [sender]);
  return { service, prisma, sender, sent, rows };
}

describe('OtpService', () => {
  it('sends a 6-digit code and stores only its hash', async () => {
    const { service, prisma, sent } = setup();
    const res = await service.request(OtpChannel.EMAIL, 'a@b.co');

    expect(res).toEqual({ challengeId: 'c1', expiresIn: 600, resendAfter: 60 });
    expect(sent[0].code).toMatch(/^\d{6}$/);
    const stored = prisma.otpChallenge.create.mock.calls[0][0].data;
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(sent[0].code);
  });

  it('refuses a second code within 60 seconds', async () => {
    const { service, prisma } = setup();
    prisma.otpChallenge.findMany.mockResolvedValue([{ createdAt: new Date(Date.now() - 20_000) }]);
    await expect(service.request(OtpChannel.EMAIL, 'a@b.co')).rejects.toBeInstanceOf(TooManyRequests);
  });

  it('refuses a sixth code within an hour', async () => {
    const { service, prisma } = setup();
    const old = new Date(Date.now() - 10 * 60_000);
    prisma.otpChallenge.findMany.mockResolvedValue(Array(5).fill({ createdAt: old }));
    await expect(service.request(OtpChannel.EMAIL, 'a@b.co')).rejects.toThrow('Try again in an hour');
  });

  it('rejects channels with no sender yet (WhatsApp)', async () => {
    const { service } = setup();
    await expect(service.request(OtpChannel.WHATSAPP, '+919800000000')).rejects.toThrow('not available yet');
  });

  it('deletes the challenge and reports 503 if delivery fails', async () => {
    const { service, prisma, sender } = setup();
    (sender.send as jest.Mock).mockRejectedValueOnce(new Error('SMTP down'));
    await expect(service.request(OtpChannel.EMAIL, 'a@b.co')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.otpChallenge.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('accepts the right code once', async () => {
    const { service, sent, prisma } = setup();
    await service.request(OtpChannel.EMAIL, 'a@b.co');

    await expect(service.verify('c1', sent[0].code)).resolves.toEqual({ channel: 'EMAIL', destination: 'a@b.co' });
    expect(prisma.otpChallenge.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'c1', consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it('rejects a wrong code and says how many attempts are left', async () => {
    const { service, sent } = setup();
    await service.request(OtpChannel.EMAIL, 'a@b.co');
    const wrong = sent[0].code === '000000' ? '111111' : '000000';
    await expect(service.verify('c1', wrong)).rejects.toThrow('Incorrect code. 4 attempts left.');
  });

  it('locks the code after 5 attempts (counted atomically)', async () => {
    const { service, sent, prisma } = setup();
    await service.request(OtpChannel.EMAIL, 'a@b.co');
    prisma.otpChallenge.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.verify('c1', sent[0].code)).rejects.toBeInstanceOf(TooManyRequests);
  });

  it('rejects expired and already-used codes', async () => {
    const { service, sent, rows } = setup();
    await service.request(OtpChannel.EMAIL, 'a@b.co');
    rows.c.expiresAt = new Date(Date.now() - 1000);
    await expect(service.verify('c1', sent[0].code)).rejects.toBeInstanceOf(BadRequestException);
    rows.c.expiresAt = new Date(Date.now() + 60_000);
    rows.c.consumedAt = new Date();
    await expect(service.verify('c1', sent[0].code)).rejects.toThrow('already used');
  });

  it('a lost race to consume the code is rejected', async () => {
    const { service, sent, prisma } = setup();
    await service.request(OtpChannel.EMAIL, 'a@b.co');
    prisma.otpChallenge.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(service.verify('c1', sent[0].code)).rejects.toThrow('already used');
  });
});
