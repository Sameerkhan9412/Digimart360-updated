import { Global, Module } from '@nestjs/common';
import { CompaniesService } from '../catalog/companies/companies.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalDiskStorage, Storage } from './storage';

@Global()
@Module({
  controllers: [MediaController],
  providers: [MediaService, CompaniesService, { provide: Storage, useClass: LocalDiskStorage }],
  exports: [MediaService, Storage],
})
export class MediaModule {}
