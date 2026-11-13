import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  DomainCheckQueryDto,
  DomainQueryDto,
  DomainView,
  HostMatch,
  HostQueryDto,
  ModerationDomainPage,
  PublicStorefront,
  RejectDomainDto,
  SetDomainDto,
  StorefrontView,
  UpdateStorefrontDto,
} from './storefront.dto';
import { StorefrontService } from './storefront.service';

/** Public side: which website lives at an address, and how it looks. */
@ApiTags('storefront')
@Controller()
export class StorefrontPublicController {
  constructor(private readonly storefronts: StorefrontService) {}

  /** The website server calls this with the request's Host header. 404 = show the marketplace. */
  @Public()
  @Get('storefronts/by-host')
  @ApiOkResponse({ type: HostMatch })
  byHost(@Query() q: HostQueryDto): Promise<HostMatch> {
    return this.storefronts.match(q.host);
  }

  @Public()
  @Get('storefronts/:slug')
  @ApiOkResponse({ type: PublicStorefront })
  bySlug(@Param('slug') slug: string): Promise<PublicStorefront> {
    return this.storefronts.publicBySlug(slug);
  }

  /** Caddy asks before requesting a certificate for a new host. 200 = yes, 404 = no. */
  @Public()
  @Get('internal/certificate-allowed')
  async certificateAllowed(@Query() q: DomainCheckQueryDto): Promise<{ allowed: true }> {
    if (!(await this.storefronts.certificateAllowed(q.domain))) throw new NotFoundException();
    return { allowed: true };
  }
}

/** The signed-in supplier's website settings and custom domain. */
@ApiTags('storefront')
@ApiBearerAuth()
@Controller('me')
export class StorefrontMeController {
  constructor(private readonly storefronts: StorefrontService) {}

  @Get('storefront')
  @ApiOkResponse({ type: StorefrontView })
  get(@CurrentUser() user: AuthUser): Promise<StorefrontView> {
    return this.storefronts.mine(user.id);
  }

  @Patch('storefront')
  @ApiOkResponse({ type: StorefrontView })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateStorefrontDto): Promise<StorefrontView> {
    return this.storefronts.update(user.id, dto);
  }

  /** null when no domain has been added. */
  @Get('domain')
  @ApiOkResponse({ type: DomainView })
  domain(@CurrentUser() user: AuthUser): Promise<DomainView | null> {
    return this.storefronts.myDomain(user.id);
  }

  /** Add your own domain (or change it). You then publish a TXT record and press "check". */
  @Put('domain')
  @ApiOkResponse({ type: DomainView })
  setDomain(@CurrentUser() user: AuthUser, @Body() dto: SetDomainDto): Promise<DomainView> {
    return this.storefronts.setDomain(user.id, dto);
  }

  @Post('domain/check')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DomainView })
  check(@CurrentUser() user: AuthUser): Promise<DomainView> {
    return this.storefronts.checkDomain(user.id);
  }

  @Delete('domain')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser): Promise<void> {
    return this.storefronts.removeDomain(user.id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/domains')
export class StorefrontAdminController {
  constructor(private readonly storefronts: StorefrontService) {}

  /** Domains by status; defaults to those waiting for approval. */
  @Get()
  @ApiOkResponse({ type: ModerationDomainPage })
  list(@Query() q: DomainQueryDto): Promise<ModerationDomainPage> {
    return this.storefronts.domains(q.status, q.page);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DomainView })
  approve(@Param('id', ParseUUIDPipe) id: string): Promise<DomainView> {
    return this.storefronts.approveDomain(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: DomainView })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDomainDto): Promise<DomainView> {
    return this.storefronts.rejectDomain(id, dto.reason);
  }
}
