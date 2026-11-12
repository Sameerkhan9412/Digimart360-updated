import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import path from 'node:path';
import { Env } from './config/env.validation';

/** Everything that shapes HTTP behaviour. Shared by main.ts and the end-to-end tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService<Env, true>);

  // Behind one reverse proxy (Caddy) in production: use its X-Forwarded-For for client IPs.
  app.set('trust proxy', 1);
  app.use(helmet());

  // Uploaded photos. Served outside /api so URLs stay stable; files get random names, so cache them for a year.
  app.useStaticAssets(path.resolve(config.get('UPLOAD_DIR', { infer: true })), {
    prefix: '/media/',
    index: false,
    dotfiles: 'deny',
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // the website and apps load these from another origin
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });

  // Every route lives under /api/v1/... Mobile apps that are already
  // installed keep calling v1 after a v2 ships, so never break v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Browsers need CORS; native mobile apps ignore it.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({ origin: origins.length ? origins : false });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
