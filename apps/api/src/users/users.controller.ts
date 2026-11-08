import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { PublicUser, UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The signed-in user's profile. Apps call this on launch to restore the session. */
  @Get('me')
  @ApiOkResponse({ type: PublicUser })
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.users.findById(user.id);
  }

  /** Update your name or phone number, e.g. during onboarding after first sign-in. */
  @Patch('me')
  @ApiOkResponse({ type: PublicUser })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto): Promise<PublicUser> {
    return this.users.updateMe(user.id, dto);
  }
}
