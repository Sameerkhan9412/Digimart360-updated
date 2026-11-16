import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  AuthConfigResponse,
  EmailOtpRequestDto,
  PhoneOtpRequestDto,
  GoogleSignInDto,
  OtpRequestResponse,
  OtpVerifyDto,
  RefreshDto,
  TokensResponse,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
// Stricter limit on auth routes: 10 requests per minute per IP.
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Which sign-in methods this server offers. Apps call this before showing the sign-in screen. */
  @Get('config')
  @Public()
  @SkipThrottle()
  @ApiOkResponse({ type: AuthConfigResponse })
  config(): AuthConfigResponse {
    return this.auth.getConfig();
  }

  /** Email a 6-digit sign-in code. Works for new and existing accounts alike. */
  @Post('otp/email')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: OtpRequestResponse })
  @ApiTooManyRequestsResponse({ description: 'Asked again within 60 s, or more than 5 times in an hour' })
  requestEmailOtp(@Body() dto: EmailOtpRequestDto, @Ip() ip: string): Promise<OtpRequestResponse> {
    return this.auth.requestEmailOtp(dto.email, ip);
  }

  /** WhatsApp a 6-digit sign-in code to a phone number. Works for new and existing accounts alike. */
  @Post('otp/phone')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: OtpRequestResponse })
  @ApiTooManyRequestsResponse({ description: 'Asked again within 60 s, or more than 5 times in an hour' })
  requestPhoneOtp(@Body() dto: PhoneOtpRequestDto, @Ip() ip: string): Promise<OtpRequestResponse> {
    return this.auth.requestPhoneOtp(dto.phone, ip);
  }

  /** Check the code and sign in. Creates the account on first sign-in. */
  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensResponse })
  verifyOtp(@Body() dto: OtpVerifyDto): Promise<TokensResponse> {
    return this.auth.verifyOtp(dto);
  }

  /** Sign in with a Google ID token from the web or the Android / iOS SDK. */
  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensResponse })
  google(@Body() dto: GoogleSignInDto): Promise<TokensResponse> {
    return this.auth.signInWithGoogle(dto);
  }

  /** Exchange a refresh token for a new access token and a new refresh token. */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensResponse })
  refresh(@Body() dto: RefreshDto): Promise<TokensResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Sign out this device. */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  /** Sign out every device on this account. */
  @Post('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.revokeAll(user.id);
  }
}
