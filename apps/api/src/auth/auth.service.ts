import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpChannel, Prisma, Role, User, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { AccessPayload } from '../common/guards/jwt-auth.guard';
import { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { GoogleSignInDto, OtpVerifyDto, TokensResponse } from './dto/auth.dto';
import { GoogleService } from './google.service';
import { OtpService } from './otp.service';

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export function ttlToSeconds(ttl: string): number {
  return Number(ttl.slice(0, -1)) * UNITS[ttl.slice(-1)];
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'New user';
}

/**
 * Sign-in for web and mobile alike:
 * - Email OTP or Google ID token proves who the person is; the first sign-in creates the account.
 * - A short-lived JWT access token (default 15 min) is sent as a bearer header.
 * - An opaque refresh token per device, stored only as a hash, rotates on every use.
 *   Reusing a rotated refresh token signs the user out everywhere (it was copied).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly google: GoogleService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  getConfig(): { google: boolean; otpChannels: string[] } {
    return { google: this.google.enabled, otpChannels: [OtpChannel.EMAIL] };
  }

  requestEmailOtp(email: string, ip?: string) {
    return this.otp.request(OtpChannel.EMAIL, email, ip);
  }

  async verifyOtp(dto: OtpVerifyDto): Promise<TokensResponse> {
    const { channel, destination } = await this.otp.verify(dto.challengeId, dto.code);
    if (channel !== OtpChannel.EMAIL) throw new UnauthorizedException('Unsupported sign-in channel');

    const existing = await this.prisma.user.findUnique({ where: { email: destination } });
    if (existing) {
      const user = existing.emailVerifiedAt
        ? existing
        : await this.prisma.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } });
      return this.signIn(user, false, dto.deviceName);
    }

    const user = await this.createUser({
      email: destination,
      emailVerifiedAt: new Date(),
      name: dto.name?.trim() || nameFromEmail(destination),
      role: dto.role ?? Role.BUYER,
    });
    return this.signIn(user, true, dto.deviceName);
  }

  async signInWithGoogle(dto: GoogleSignInDto): Promise<TokensResponse> {
    const g = await this.google.verify(dto.idToken);

    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: g.googleId } });
    if (byGoogle) return this.signIn(byGoogle, false, dto.deviceName);

    // Same verified email already has an account (e.g. from email OTP): link Google to it.
    const byEmail = await this.prisma.user.findUnique({ where: { email: g.email } });
    if (byEmail) {
      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: g.googleId,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          avatarUrl: byEmail.avatarUrl ?? g.avatarUrl,
        },
      });
      return this.signIn(linked, false, dto.deviceName);
    }

    const user = await this.createUser({
      email: g.email,
      emailVerifiedAt: new Date(),
      googleId: g.googleId,
      name: g.name,
      avatarUrl: g.avatarUrl,
      role: dto.role ?? Role.BUYER,
    });
    return this.signIn(user, true, dto.deviceName);
  }

  async refresh(refreshToken: string): Promise<TokensResponse> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Refresh token is invalid');

    if (stored.revokedAt) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('Refresh token was already used. Please sign in again.');
    }
    if (stored.expiresAt <= new Date()) throw new UnauthorizedException('Session expired. Please sign in again.');
    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is suspended. Contact support.');
    }

    // Claim the token atomically so two parallel refreshes can't both succeed.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('Refresh token was already used. Please sign in again.');
    }
    return this.issueTokens(stored.user, false, stored.deviceName ?? undefined);
  }

  /** Signs out the device that owns this refresh token. Unknown tokens are ignored. */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (e) {
      // Two first sign-ins raced; the other one created the account.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.user.findUniqueOrThrow({ where: { email: data.email } });
      }
      throw e;
    }
  }

  private async signIn(user: User, isNewUser: boolean, deviceName?: string): Promise<TokensResponse> {
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is suspended. Contact support.');
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(updated, isNewUser, deviceName);
  }

  private async issueTokens(user: User, isNewUser: boolean, deviceName?: string): Promise<TokensResponse> {
    const payload: AccessPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        deviceName,
        expiresAt: new Date(Date.now() + days * 86400_000),
      },
    });

    return {
      accessToken,
      expiresIn: ttlToSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true })),
      refreshToken,
      isNewUser,
      user: this.users.toPublic(user),
    };
  }
}
