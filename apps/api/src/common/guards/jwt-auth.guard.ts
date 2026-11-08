import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AccessPayload {
  sub: string;
  role: Role;
}

/**
 * Reads `Authorization: Bearer <access token>`. Header tokens (not cookies)
 * work the same from a browser, an Android app and an iOS app.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
