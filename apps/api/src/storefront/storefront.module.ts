import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { StorefrontAdminController, StorefrontMeController, StorefrontPublicController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

/** Supplier websites: themes and branding, subdomains, custom domains with staff approval. */
@Module({
  imports: [CatalogModule],
  controllers: [StorefrontPublicController, StorefrontMeController, StorefrontAdminController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
