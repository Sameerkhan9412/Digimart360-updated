import { Body, Controller, Get, HttpCode, HttpStatus, Ip, NotFoundException, Post, Query, Req } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CompaniesService } from '../catalog/companies/companies.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { hasInternalKey } from '../common/guards/throttle.guard';
import { AnalyticsService } from './analytics.service';
import { ANALYTICS_DAYS, AnalyticsQueryDto, AnalyticsReport, TrackDto } from './analytics.dto';

/** Called by our own website, never by a browser: it needs the secret internal key. */
@ApiTags('analytics')
@Controller('internal')
export class TrackController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('track')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Always accepted; whether a view was counted is not revealed' })
  async track(@Req() req: Request, @Body() dto: TrackDto, @Ip() ip: string): Promise<void> {
    // Pretend the route does not exist for anyone but our own website.
    if (!hasInternalKey(req)) throw new NotFoundException();
    await this.analytics.track(dto.kind, dto.slug, ip);
  }
}

/** The signed-in supplier's own numbers. */
@ApiTags('supplier')
@ApiBearerAuth()
@Controller('me/analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly companies: CompaniesService,
  ) {}

  /** Views of your products, supplier page and website, plus how you are doing on requirements. */
  @Get()
  @ApiOkResponse({ type: AnalyticsReport })
  async mine(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto): Promise<AnalyticsReport> {
    const company = await this.companies.requireMine(user.id);
    return this.analytics.report(company.id, query.days ?? ANALYTICS_DAYS[1]);
  }
}
