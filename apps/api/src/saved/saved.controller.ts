import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CompanySummary } from '../catalog/dto/views';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SavedService } from './saved.service';

/** The signed-in person's shortlist of suppliers. */
@ApiTags('buyer')
@ApiBearerAuth()
@Controller('me/saved-suppliers')
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  @ApiOkResponse({ type: [CompanySummary] })
  list(@CurrentUser() user: AuthUser): Promise<CompanySummary[]> {
    return this.saved.list(user.id);
  }

  @Get('ids')
  @ApiOkResponse({ type: [String], description: 'Ids of every saved supplier' })
  ids(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.saved.ids(user.id);
  }

  @Put(':companyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  save(@CurrentUser() user: AuthUser, @Param('companyId', ParseUUIDPipe) companyId: string): Promise<void> {
    return this.saved.save(user.id, companyId);
  }

  @Delete(':companyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@CurrentUser() user: AuthUser, @Param('companyId', ParseUUIDPipe) companyId: string): Promise<void> {
    return this.saved.remove(user.id, companyId);
  }
}
