import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';

/**
 * Per-IP rate limiting, except for our own servers. The Next.js website
 * renders pages on the server, so all its requests come from one IP; it
 * sends `X-Internal-Key: <INTERNAL_API_KEY>` and is not throttled.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const key = process.env.INTERNAL_API_KEY;
    if (key && key.length >= 32) {
      const sent = context.switchToHttp().getRequest().headers['x-internal-key'];
      if (typeof sent === 'string' && sent.length === key.length && timingSafeEqual(Buffer.from(sent), Buffer.from(key))) {
        return true;
      }
    }
    return super.shouldSkip(context);
  }
}
