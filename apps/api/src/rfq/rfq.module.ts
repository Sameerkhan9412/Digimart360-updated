import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { MatchingService } from './matching.service';
import { RfqController, RfqInboxController } from './rfq.controller';
import { RfqService } from './rfq.service';

/** Requirements (RFQs): buyers post, matched suppliers quote, buyers compare and award. */
@Module({
  imports: [CatalogModule],
  controllers: [RfqController, RfqInboxController],
  providers: [RfqService, MatchingService],
})
export class RfqModule {}
