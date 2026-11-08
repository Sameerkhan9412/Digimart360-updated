import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

/** Indian GSTIN: 2-digit state code, PAN, entity number, Z, checksum. */
export const GSTIN_PATTERN = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Fluid Systems' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ example: 'Acme Fluid Systems Pvt Ltd' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  legalName?: string;

  @ApiPropertyOptional({ example: '27AABCA1234F1Z5', description: 'Verified by DIGI MART before the GST badge shows' })
  @IsOptional()
  @Transform(upper)
  @Matches(GSTIN_PATTERN, { message: 'gstin must be a valid 15-character GSTIN, e.g. 27AABCA1234F1Z5' })
  gstin?: string;

  @ApiProperty({ enum: BusinessType, isArray: true, example: ['MANUFACTURER', 'EXPORTER'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsEnum(BusinessType, { each: true })
  businessTypes: BusinessType[];

  @ApiPropertyOptional({ example: 2011 })
  @IsOptional()
  @IsInt()
  @Min(1850)
  @Max(new Date().getFullYear())
  yearEstablished?: number;

  @ApiPropertyOptional({ example: 'Manufacturer of industrial ball, gate and check valves…' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ example: '+919822012345' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phone must be in E.164 format, e.g. +919822012345' })
  phone?: string;

  @ApiPropertyOptional({ example: 'sales@acmeflow.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://www.acmeflow.com' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  website?: string;

  @ApiPropertyOptional({ example: 'Plot F-12, MIDC Bhosari' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @ApiProperty({ example: 'Pune' })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  state: string;

  @ApiPropertyOptional({ example: '411026' })
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'pincode must be a 6-digit Indian PIN code' })
  pincode?: string;

  @ApiPropertyOptional({ example: ['UAE', 'Kenya'], description: 'Countries you export to' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  exportsTo?: string[];
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
