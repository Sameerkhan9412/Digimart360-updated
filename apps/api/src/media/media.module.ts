import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompaniesService } from '../catalog/companies/companies.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Env } from '../config/env.validation';
import { CloudinaryStorage, LocalDiskStorage, Storage } from './storage';

@Global()
@Module({
  controllers: [MediaController],
  providers: [MediaService, CompaniesService, {
      provide: Storage,
      inject: [ConfigService],
      // Cloudinary when CLOUDINARY_URL is set, otherwise the local uploads folder.
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('CLOUDINARY_URL', { infer: true }) ? new CloudinaryStorage(config) : new LocalDiskStorage(config),
    }],
  exports: [MediaService, Storage],
})
export class MediaModule {}
