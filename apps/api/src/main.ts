import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // The interactive docs list every route, so they are off in production unless asked for.
  const docsOn = config.get('NODE_ENV', { infer: true }) !== 'production' || config.get('ENABLE_API_DOCS', { infer: true }) === 'true';
  if (docsOn) {
    const docs = new DocumentBuilder()
      .setTitle('DIGI MART 360 API')
      .setDescription('Shared backend for the DIGI MART 360 web app and mobile apps.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docs));
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API on http://localhost:${port}/api/v1${docsOn ? ` · docs on http://localhost:${port}/api/docs` : ''}`, 'Bootstrap');
}
void bootstrap();
