import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService, hashToken, ttlToSeconds } from './auth.service';
import { GoogleService } from './google.service';
import { OtpService } from './otp.service';

const baseUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'rahul@example.com',
  emailVerifiedAt: new Date('2026-01-01'),
  phone: null,
  name: 'Rahul',
  avatarUrl: null,
  googleId: null,
  role: Role.BUYER,
  status: UserStatus.ACTIVE,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function setup() {
  // Tiny in-memory user table so updates build on what was created or found.
  const rows = new Map<string, User>();
  const keep = (u: User | null) => (u && rows.set(u.id, u), u);
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(async ({ data }) => keep({ ...baseUser, ...data, id: 'new-id' })),
      update: jest.fn(async ({ where, data }) => keep({ ...(rows.get(where.id) ?? baseUser), ...data })),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const otp = { verify: jest.fn().mockResolvedValue({ channel: 'EMAIL', destination: 'rahul@example.com' }), request: jest.fn() };
  const google = {
    enabled: true,
    verify: jest.fn().mockResolvedValue({ googleId: 'g-123', email: 'rahul@example.com', name: 'Rahul S', avatarUrl: 'https://x/p.png' }),
  };
  const jwt = new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: 900 } });
  const config = { get: (k: string) => ({ JWT_ACCESS_TTL: '15m', REFRESH_TOKEN_TTL_DAYS: 30 })[k] } as unknown as ConfigService;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt,
    new UsersService(prisma as unknown as PrismaService),
    otp as unknown as OtpService,
    google as unknown as GoogleService,
    config as never,
  );
  // Rows returned by findUnique are remembered too.
  const origFind = prisma.user.findUnique;
  prisma.user.findUnique = jest.fn(async (...a: unknown[]) => keep(await origFind(...a))) as never;
  Object.assign(prisma.user.findUnique, {
    mockResolvedValue: (v: unknown) => origFind.mockResolvedValue(v),
    mockResolvedValueOnce: (v: unknown) => origFind.mockResolvedValueOnce(v),
  });
  return { service, prisma, otp, google, jwt };
}

const verifyDto = { challengeId: '7f1d6a5e-2a58-4c55-9f0c-6b1f6f0a1b2c', code: '123456' };

describe('ttlToSeconds', () => {
  it('converts duration strings', () => {
    expect(ttlToSeconds('15m')).toBe(900);
    expect(ttlToSeconds('1h')).toBe(3600);
    expect(ttlToSeconds('2d')).toBe(172800);
  });
});

describe('AuthService · email OTP', () => {
  it('first sign-in creates a verified account with the chosen role', async () => {
    const { service, prisma, jwt } = setup();
    const res = await service.verifyOtp({ ...verifyDto, name: 'Rahul Sharma', role: Role.SUPPLIER });

    expect(res.isNewUser).toBe(true);
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: 'rahul@example.com', name: 'Rahul Sharma', role: Role.SUPPLIER, emailVerifiedAt: expect.any(Date),
    });
    expect(jwt.verify(res.accessToken)).toMatchObject({ sub: 'new-id', role: Role.SUPPLIER });
    expect(res.user.emailVerified).toBe(true);
  });

  it('derives a name from the email when none is given', async () => {
    const { service, prisma, otp } = setup();
    otp.verify.mockResolvedValue({ channel: 'EMAIL', destination: 'priya.mehta@example.com' });
    await service.verifyOtp(verifyDto);
    expect(prisma.user.create.mock.calls[0][0].data.name).toBe('Priya Mehta');
  });

  it('existing account signs in; role in the request is ignored', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(baseUser);
    const res = await service.verifyOtp({ ...verifyDto, role: Role.SUPPLIER });
    expect(res.isNewUser).toBe(false);
    expect(res.user.role).toBe(Role.BUYER);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('suspended accounts cannot sign in', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, status: UserStatus.SUSPENDED });
    await expect(service.verifyOtp(verifyDto)).rejects.toThrow('suspended');
  });

  it('stores only the hash of the refresh token', async () => {
    const { service, prisma } = setup();
    const res = await service.verifyOtp(verifyDto);
    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashToken(res.refreshToken));
  });

  it('two simultaneous first sign-ins end up on one account', async () => {
    const { service, prisma } = setup();
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    prisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
    const res = await service.verifyOtp(verifyDto);
    expect(res.user.id).toBe(baseUser.id);
  });
});

describe('AuthService · Google', () => {
  it('links Google to an existing account with the same email', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser);
    const res = await service.signInWithGoogle({ idToken: 'x'.repeat(120) });

    expect(res.isNewUser).toBe(false);
    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ googleId: 'g-123', avatarUrl: 'https://x/p.png' });
    expect(res.user.hasGoogle).toBe(true);
  });

  it('creates a new account from the Google profile', async () => {
    const { service, prisma } = setup();
    const res = await service.signInWithGoogle({ idToken: 'x'.repeat(120), role: Role.SUPPLIER });
    expect(res.isNewUser).toBe(true);
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({ googleId: 'g-123', name: 'Rahul S', role: Role.SUPPLIER });
  });

  it('a returning Google user signs straight in', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, googleId: 'g-123' });
    const res = await service.signInWithGoogle({ idToken: 'x'.repeat(120) });
    expect(res.isNewUser).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('AuthService · refresh tokens', () => {
  const stored = (over = {}) => ({
    id: 'rt1', userId: baseUser.id, deviceName: 'Pixel 8', revokedAt: null,
    expiresAt: new Date(Date.now() + 86400_000), user: baseUser, ...over,
  });

  it('rotates: old revoked, new pair issued, device kept', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(stored());
    const res = await service.refresh('old-refresh-token-value');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { id: 'rt1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(res.refreshToken).not.toBe('old-refresh-token-value');
    expect(prisma.refreshToken.create.mock.calls[0][0].data.deviceName).toBe('Pixel 8');
  });

  it('reuse of a revoked token signs the user out everywhere', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(stored({ revokedAt: new Date() }));
    await expect(service.refresh('stolen-token-value-xx')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: baseUser.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('a lost refresh race is treated as reuse', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(stored());
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.refresh('raced-token-value-xxx')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('expired refresh tokens are rejected', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(stored({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(service.refresh('expired-token-value-x')).rejects.toThrow('Session expired');
  });
});
