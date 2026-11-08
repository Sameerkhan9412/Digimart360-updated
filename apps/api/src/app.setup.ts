import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Env } from './config/env.validation';

/** Everything that shapes HTTP behaviour. Shared by main.ts and the end-to-end tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService<Env, true>);

  // Behind one reverse proxy (Caddy) in production: use its X-Forwarded-For for client IPs.
  app.set('trust proxy', 1);
  app.use(helmet());

  // Every route lives under /api/v1/... Mobile apps that are already
  // installed keep calling v1 after a v2 ships, so never break v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Browsers need CORS; native mobile apps ignore it.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({ origin: origins.length ? origins : false });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
