import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SpecInput {
  @ApiProperty({ example: 'Material' })
  @Transform(trim)
  @IsString()
  @Length(1, 40)
  label: string;

  @ApiProperty({ example: 'SS304 / CF8' })
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  value: string;
}

export class CreateProductDto {
  @ApiProperty({ example: '2" SS304 Flanged Ball Valve, Class 150' })
  @Transform(trim)
  @IsString()
  @Length(4, 120)
  name: string;

  @ApiProperty({ description: 'Category id. Pick the most specific (leaf) category.' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Investment-cast CF8 body with PTFE seats. Full bore, lockable lever.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ example: 2500, description: 'Rupees, up to 2 decimals. Omit both prices for "Ask for price".' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999)
  priceMin?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999)
  priceMax?: number;

  @ApiPropertyOptional({ example: 'Piece', default: 'Piece' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 20)
  priceUnit?: string;

  @ApiPropertyOptional({ example: 50, description: 'Minimum order quantity, in priceUnit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  moq?: number;

  @ApiPropertyOptional({ type: [SpecInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => SpecInput)
  specs?: SpecInput[];

  @ApiPropertyOptional({ type: [String], description: 'URLs returned by POST /me/uploads/images. First one is the cover.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  images?: string[];

  @ApiPropertyOptional({ default: true, description: 'true = send for review now; false = save as draft' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class OwnProductsQueryDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
