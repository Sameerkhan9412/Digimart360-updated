import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CompanyProfile } from '../dto/views';
import { CompaniesService } from './companies.service';

@ApiTags('catalog')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** Public supplier profile. Their products: GET /products?company=<slug>. */
  @Get(':slug')
  @Public()
  @ApiOkResponse({ type: CompanyProfile })
  profile(@Param('slug') slug: string): Promise<CompanyProfile> {
    return this.companies.profile(slug);
  }
}
