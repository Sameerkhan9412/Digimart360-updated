import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, Matches, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating'] as const;
export type Sort = (typeof SORTS)[number];

const bool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' ? true : value === false || value === 'false' || value === '0' ? false : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Query string for GET /products. Every filter is optional and they combine with AND. */
export class ListingQueryDto {
  @ApiPropertyOptional({ example: 'ss ball valve 2 inch', description: 'Free text. Matches names, summaries, specs and descriptions.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ example: 'ball-valves', description: 'Category slug. Includes all sub-categories.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: 'Ahmedabad' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiPropertyOptional({ example: 500, description: 'Rupees. Keeps products whose range reaches this price.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Rupees. Keeps products whose range starts at or below this price.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only "DM Trusted" suppliers' })
  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  trusted?: boolean;

  @ApiPropertyOptional({ description: 'Only suppliers with a verified GSTIN' })
  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  gstVerified?: boolean;

  @ApiPropertyOptional({ description: 'Only suppliers that export' })
  @IsOptional()
  @Transform(bool)
  @IsBoolean()
  exporter?: boolean;

  @ApiPropertyOptional({ example: 'acme-fluid-systems', description: 'Only this supplier (company slug)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  company?: string;

  @ApiPropertyOptional({ enum: SORTS, default: 'relevance' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: Sort;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize?: number;
}

export class SuggestQueryDto {
  @ApiPropertyOptional({ example: 'ball va' })
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  q: string;
}

export const MAX_COMPARE = 4;

/** `?slugs=a,b,c`: one to four product slugs. */
export class CompareQueryDto {
  @ApiPropertyOptional({ example: 'ss304-ball-valve-k3x9p,gate-valve-a1b2c', description: 'Comma-separated product slugs (1 to 4)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_COMPARE)
  @Matches(/^[a-z0-9][a-z0-9-]{0,119}$/, { each: true, message: 'each slug must be a valid product slug' })
  slugs: string[];
}
