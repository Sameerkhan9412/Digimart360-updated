import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AwardRfqDto, BuyerRfq, CreateRfqDto, RfqListQueryDto, RfqSummary, SubmitQuoteDto, SupplierRfq } from './rfq.dto';
import { RfqService } from './rfq.service';

/** Buyer side: post a requirement, compare quotes, award one. Any signed-in user can post. */
@ApiTags('rfq')
@ApiBearerAuth()
@Controller()
export class RfqController {
  constructor(private readonly rfqs: RfqService) {}

  /** Post a requirement. Matching suppliers are told by email straight away. */
  @Post('rfqs')
  @Throttle({ default: { ttl: 86_400_000, limit: 10 } })
  @ApiCreatedResponse({ type: BuyerRfq })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRfqDto): Promise<BuyerRfq> {
    return this.rfqs.create(user.id, dto);
  }

  @Get('me/rfqs')
  @ApiOkResponse({ type: [RfqSummary] })
  list(@CurrentUser() user: AuthUser, @Query() q: RfqListQueryDto): Promise<RfqSummary[]> {
    return this.rfqs.buyerList(user.id, q.status);
  }

  /** One of your requirements with every standing quote, lowest price first. */
  @Get('me/rfqs/:id')
  @ApiOkResponse({ type: BuyerRfq })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<BuyerRfq> {
    return this.rfqs.buyerGet(user.id, id);
  }

  /** Choose a winner. The others are told they were not selected, and you get the winner's contact details. */
  @Post('me/rfqs/:id/award')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: BuyerRfq })
  award(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AwardRfqDto): Promise<BuyerRfq> {
    return this.rfqs.award(user.id, id, dto.quoteId);
  }

  /** Stop taking quotes without choosing one. */
  @Post('me/rfqs/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: BuyerRfq })
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<BuyerRfq> {
    return this.rfqs.close(user.id, id);
  }
}

/** Supplier side: requirements sent to you (or open in your categories), and your quotes. */
@ApiTags('supplier')
@ApiBearerAuth()
@Controller('me/rfq-inbox')
export class RfqInboxController {
  constructor(private readonly rfqs: RfqService) {}

  @Get()
  @ApiOkResponse({ type: [SupplierRfq] })
  list(@CurrentUser() user: AuthUser, @Query() q: RfqListQueryDto): Promise<SupplierRfq[]> {
    return this.rfqs.inbox(user.id, q.status);
  }

  @Get(':id')
  @ApiOkResponse({ type: SupplierRfq })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<SupplierRfq> {
    return this.rfqs.inboxGet(user.id, id);
  }

  /** Send a quote, or replace yours while the requirement is open. */
  @Put(':id/quote')
  @ApiOkResponse({ type: SupplierRfq })
  quote(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitQuoteDto): Promise<SupplierRfq> {
    return this.rfqs.submitQuote(user.id, id, dto);
  }

  @Post(':id/quote/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SupplierRfq })
  withdraw(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<SupplierRfq> {
    return this.rfqs.withdrawQuote(user.id, id);
  }
}
