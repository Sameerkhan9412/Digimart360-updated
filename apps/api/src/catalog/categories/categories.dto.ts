import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ball Valves' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({ example: 'ball-valves', description: 'Defaults to a slug of the name' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug may contain lowercase letters, digits and single hyphens' })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ description: 'Leave empty for a top-level group' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '⚙️' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Overrides the generated <title>' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'Overrides the generated meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(170)
  seoDescription?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
