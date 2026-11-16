import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus, ProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { CompanySummary, OwnProduct } from '../dto/views';

export class AdminProductsQueryDto {
  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.PENDING_REVIEW })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class AdminCompaniesQueryDto {
  @ApiPropertyOptional({ enum: CompanyStatus, default: CompanyStatus.PENDING })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;
}

export class RejectProductDto {
  @ApiProperty({ example: 'Photos show a different product. Please upload photos of this valve.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(10, 500)
  reason: string;
}

export class ModerateCompanyDto {
  @ApiPropertyOptional({ enum: CompanyStatus, description: 'ACTIVE makes the company and its live products public' })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({ description: 'Mark the GSTIN as checked (shows the GST badge)' })
  @IsOptional()
  @IsBoolean()
  gstVerified?: boolean;

  @ApiPropertyOptional({ description: '"DM Trusted": inspected. Their products skip review.' })
  @IsOptional()
  @IsBoolean()
  trustSeal?: boolean;
}

export class ModerationProduct extends OwnProduct {}

export class ModerationProductPage {
  @ApiProperty({ type: [ModerationProduct] }) items: ModerationProduct[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
}

export class ModerationCompany extends CompanySummary {
  @ApiProperty({ enum: CompanyStatus }) status: CompanyStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) gstin: string | null;
  @ApiProperty({ description: 'Empty when the owner signed up by phone' }) ownerEmail: string;
  @ApiProperty() productCount: number;
  @ApiProperty() createdAt: Date;
}

export class ModerationCompanyPage {
  @ApiProperty({ type: [ModerationCompany] }) items: ModerationCompany[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
}
