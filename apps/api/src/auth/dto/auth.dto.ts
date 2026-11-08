import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PublicUser } from '../../users/users.service';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Roles a person can pick when their account is first created. Admins are made by seed or another admin. */
export const SELF_SIGNUP_ROLES = [Role.BUYER, Role.SUPPLIER] as const;
type SignupRole = (typeof SELF_SIGNUP_ROLES)[number];

class NewAccountFields {
  @ApiPropertyOptional({ enum: SELF_SIGNUP_ROLES, default: Role.BUYER, description: 'Used only when this sign-in creates the account' })
  @IsOptional()
  @IsIn(SELF_SIGNUP_ROLES)
  role?: SignupRole;

  @ApiPropertyOptional({ example: 'Pixel 8 · Android app', description: 'Shown in the list of signed-in devices' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class EmailOtpRequestDto {
  @ApiProperty({ example: 'rahul@relianceinfra.example' })
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class OtpRequestResponse {
  @ApiProperty({ description: 'Send this back with the code to /auth/otp/verify' })
  challengeId: string;

  @ApiProperty({ description: 'Seconds until the code expires' })
  expiresIn: number;

  @ApiProperty({ description: 'Seconds before another code can be requested' })
  resendAfter: number;
}

export class OtpVerifyDto extends NewAccountFields {
  @ApiProperty()
  @IsUUID()
  challengeId: string;

  @ApiProperty({ example: '048213' })
  @Matches(/^\d{6}$/, { message: 'code must be the 6 digits from the email' })
  code: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Used only when this sign-in creates the account' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;
}

export class GoogleSignInDto extends NewAccountFields {
  @ApiProperty({ description: 'ID token from Google Identity Services (web) or the Google Sign-In SDK (Android / iOS)' })
  @IsString()
  @MinLength(100)
  @MaxLength(4096)
  idToken: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'The refresh token from sign-in or a previous refresh' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}

export class TokensResponse {
  @ApiProperty({ description: 'Send as `Authorization: Bearer <accessToken>`' })
  accessToken: string;

  @ApiProperty({ description: 'Seconds until the access token expires' })
  expiresIn: number;

  @ApiProperty({
    description:
      'Single-use. Store it securely (Keychain / Android Keystore on mobile) and exchange it at /auth/refresh for new tokens.',
  })
  refreshToken: string;

  @ApiProperty({ description: 'True when this sign-in created the account. Show onboarding (company, phone) next.' })
  isNewUser: boolean;

  @ApiProperty()
  user: PublicUser;
}

export class AuthConfigResponse {
  @ApiProperty({ description: 'Whether "Continue with Google" should be shown' })
  google: boolean;

  @ApiProperty({ example: ['EMAIL'], description: 'Channels that can deliver sign-in codes' })
  otpChannels: string[];
}
