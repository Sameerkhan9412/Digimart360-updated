import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind one reverse proxy (Caddy) in production: use its X-Forwarded-For for client IPs.
  app.set('trust proxy', 1);
  const config = app.get(ConfigService<Env, true>);

  app.use(helmet());
  app.enableShutdownHooks();

  // Every route lives under /api/v1/... Mobile apps that are already
  // installed keep calling v1 after a v2 ships, so never break v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Browsers need CORS; native mobile apps ignore it.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({ origin: origins.length ? origins : false });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const docs = new DocumentBuilder()
    .setTitle('DIGI MART 360 API')
    .setDescription('Shared backend for the DIGI MART 360 web app and mobile apps.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docs));

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(
    `API on http://localhost:${port}/api/v1 · docs on http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}
void bootstrap();
