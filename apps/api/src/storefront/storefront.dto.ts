import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainStatus, StorefrontTheme } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateStorefrontDto {
  @ApiPropertyOptional({ enum: StorefrontTheme })
  @IsOptional()
  @IsEnum(StorefrontTheme)
  theme?: StorefrontTheme;

  @ApiPropertyOptional({ example: '#c2410c', description: 'Brand colour, #rrggbb' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'accent must be a colour like #c2410c' })
  accent?: string;

  @ApiPropertyOptional({ example: 'Precision valves since 1998' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @ApiPropertyOptional({ description: 'An uploaded photo (POST /me/media)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAbout?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showProducts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCertificates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showContact?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['ISO 9001:2015', 'CE'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean) : value))
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  certificates?: string[];
}

export class SetDomainDto {
  @ApiProperty({ example: 'www.acmevalves.in' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/\.$/, '') : value))
  @IsString()
  @MaxLength(253)
  @Matches(/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, { message: 'Enter a domain name like www.example.com' })
  host: string;
}

export class RejectDomainDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, 500)
  reason: string;
}

export class DomainQueryDto {
  @ApiPropertyOptional({ enum: DomainStatus, default: DomainStatus.PENDING_APPROVAL })
  @IsOptional()
  @IsEnum(DomainStatus)
  status?: DomainStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class HostQueryDto {
  @ApiProperty({ example: 'acme.digimart360.com' })
  @IsString()
  @MaxLength(260)
  host: string;
}

export class DomainCheckQueryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(260)
  domain: string;
}

// ── responses ──

export class StorefrontView {
  @ApiProperty({ enum: StorefrontTheme }) theme: StorefrontTheme;
  @ApiPropertyOptional({ nullable: true, type: String }) accent: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) tagline: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) bannerUrl: string | null;
  @ApiProperty() showAbout: boolean;
  @ApiProperty() showProducts: boolean;
  @ApiProperty() showCertificates: boolean;
  @ApiProperty() showContact: boolean;
  @ApiProperty({ type: [String] }) certificates: string[];
}

export class PublicStorefront extends StorefrontView {
  @ApiProperty() slug: string;
  @ApiProperty({ description: 'The address the site should be reached at: their own domain once approved, else the subdomain' })
  canonicalHost: string;
}

export class HostMatch {
  @ApiProperty() slug: string;
  @ApiProperty({ description: 'The address this site should be reached at' }) canonicalHost: string;
}

export class DomainView {
  @ApiProperty() id: string;
  @ApiProperty() host: string;
  @ApiProperty({ enum: DomainStatus }) status: DomainStatus;
  @ApiProperty({ description: 'TXT record name that proves ownership' }) txtName: string;
  @ApiProperty({ description: 'TXT record value' }) txtValue: string;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'CNAME target, if configured' }) cnameTarget: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) rejectionReason: string | null;
}

export class ModerationDomain extends DomainView {
  @ApiProperty() companyName: string;
  @ApiProperty() companySlug: string;
  @ApiProperty() ownerEmail: string;
  @ApiProperty() createdAt: Date;
}

export class ModerationDomainPage {
  @ApiProperty({ type: [ModerationDomain] }) items: ModerationDomain[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
}
