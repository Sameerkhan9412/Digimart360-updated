import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

/** True when the request carries our own website's secret key (a visitor can never send it). */
export function hasInternalKey(req: Pick<Request, 'headers'>): boolean {
  const key = process.env.INTERNAL_API_KEY;
  if (!key || key.length < 32) return false;
  const sent = req.headers['x-internal-key'];
  return typeof sent === 'string' && sent.length === key.length && timingSafeEqual(Buffer.from(sent), Buffer.from(key));
}

/** Set on requests where our website vouched for the visitor's address. */
const FORWARDED = Symbol('forwardedClientIp');

/**
 * Our Next.js website calls this API from its own servers, so every visitor would share one IP.
 * It sends the visitor's address in `X-Client-IP` together with the secret `X-Internal-Key`.
 * Only then do we believe the header: `req.ip` becomes the visitor's address, so rate limits,
 * OTP records and logs all see the real visitor. Without the key the header is ignored.
 */
export function trustForwardedClientIp(req: Request, _res: Response, next: NextFunction): void {
  const claimed = req.headers['x-client-ip'];
  if (typeof claimed === 'string' && isIP(claimed.trim()) && hasInternalKey(req)) {
    Object.defineProperty(req, 'ip', { value: claimed.trim(), configurable: true });
    (req as unknown as Record<symbol, boolean>)[FORWARDED] = true;
  }
  next();
}

/**
 * Per-IP rate limiting. Our website's own server-side calls that do not name a visitor
 * (cached catalog pages) are not limited; calls made for a visitor are limited per visitor.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (hasInternalKey(req) && !(req as unknown as Record<symbol, boolean>)[FORWARDED]) return true;
    return super.shouldSkip(context);
  }
}
