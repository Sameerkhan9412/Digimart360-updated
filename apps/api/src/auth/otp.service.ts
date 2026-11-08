import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Env } from '../config/env.validation';
import { OTP_SENDERS, OtpSender } from '../notifications/otp-senders';
import { PrismaService } from '../prisma/prisma.service';

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;

export interface OtpRequestResult {
  challengeId: string;
  expiresIn: number;
  resendAfter: number;
}

export class TooManyRequests extends HttpException {
  constructor(message: string, retryAfter?: number) {
    super({ statusCode: 429, error: 'Too Many Requests', message, retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * One-time codes, independent of how they're delivered.
 * - 6 digits, valid OTP_TTL_MINUTES, at most OTP_MAX_ATTEMPTS guesses.
 * - Only an HMAC of the code is stored, so a database leak reveals no codes.
 * - Per-destination limits: one code per minute, five per hour.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @Inject(OTP_SENDERS) private readonly senders: OtpSender[],
  ) {}

  async request(channel: OtpChannel, destination: string, ip?: string): Promise<OtpRequestResult> {
    const sender = this.senders.find((s) => s.channel === channel);
    if (!sender) throw new BadRequestException(`Sign-in codes by ${channel.toLowerCase()} are not available yet`);

    const now = Date.now();
    const recent = await this.prisma.otpChallenge.findMany({
      where: { destination, createdAt: { gte: new Date(now - 3600_000) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent[0]) {
      const wait = OTP_RESEND_SECONDS - Math.floor((now - recent[0].createdAt.getTime()) / 1000);
      if (wait > 0) throw new TooManyRequests(`Please wait ${wait} seconds before requesting another code`, wait);
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      throw new TooManyRequests('Too many codes requested for this address. Try again in an hour.', 3600);
    }

    const ttl = this.config.get('OTP_TTL_MINUTES', { infer: true });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        channel,
        destination,
        codeHash: this.hash(destination, code),
        expiresAt: new Date(now + ttl * 60_000),
        ip,
      },
    });

    try {
      await sender.send(destination, code, ttl);
    } catch (e) {
      this.logger.error(`OTP delivery failed via ${channel}`, e instanceof Error ? e.stack : String(e));
      await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
      throw new ServiceUnavailableException('We could not send the code. Please try again in a minute.');
    }

    return { challengeId: challenge.id, expiresIn: ttl * 60, resendAfter: OTP_RESEND_SECONDS };
  }

  /** Returns the verified destination, or throws. A code works once. */
  async verify(challengeId: string, code: string): Promise<{ channel: OtpChannel; destination: string }> {
    const ch = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!ch || ch.consumedAt || ch.expiresAt <= new Date()) {
      throw new BadRequestException('This code has expired or was already used. Request a new one.');
    }

    // Count the attempt before checking, atomically, so parallel guesses can't exceed the limit.
    const counted = await this.prisma.otpChallenge.updateMany({
      where: { id: ch.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) throw new TooManyRequests('Too many wrong attempts. Request a new code.');

    if (!this.matches(ch.codeHash, this.hash(ch.destination, code))) {
      const left = OTP_MAX_ATTEMPTS - (ch.attempts + 1);
      throw new BadRequestException(
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Request a new one.',
      );
    }

    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { id: ch.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('This code has expired or was already used. Request a new one.');
    }
    return { channel: ch.channel, destination: ch.destination };
  }

  private hash(destination: string, code: string): string {
    return createHmac('sha256', this.config.get('JWT_ACCESS_SECRET', { infer: true }))
      .update(`otp:${destination}:${code}`)
      .digest('hex');
  }

  private matches(a: string, b: string): boolean {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length === y.length && timingSafeEqual(x, y);
  }
}
