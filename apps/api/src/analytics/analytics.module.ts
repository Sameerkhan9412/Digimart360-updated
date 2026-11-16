import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AnalyticsController, TrackController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/** What suppliers see about their reach: product, supplier-page and website views, plus requirement activity. */
@Module({
  imports: [CatalogModule],
  controllers: [TrackController, AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
