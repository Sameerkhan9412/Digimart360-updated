import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppThrottlerGuard } from './common/guards/throttle.guard';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RfqModule } from './rfq/rfq.module';
import { StorefrontModule } from './storefront/storefront.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // Default limit for every route: 100 requests per minute per IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MediaModule,
    CatalogModule,
    RfqModule,
    StorefrontModule,
    AnalyticsModule,
  ],
  providers: [
    // Order matters: rate limit, then authenticate, then check role.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
