import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus, RfqStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoryRef, CompanySummary } from '../catalog/dto/views';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/* ───────────── Requests ───────────── */

export class CreateRfqDto {
  @ApiProperty({ example: 'Industrial ball valves DN50, SS304' })
  @Transform(trim)
  @IsString()
  @Length(4, 120)
  title: string;

  @ApiProperty({ description: 'Most specific category that fits' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  quantity: number;

  @ApiPropertyOptional({ example: 'Piece', default: 'Piece' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 20)
  unit?: string;

  @ApiProperty({ example: 'Mumbai', description: 'Where the goods should be delivered' })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  state: string;

  @ApiPropertyOptional({ example: 1000000, description: 'Total budget in rupees. Suppliers see it; leave out to keep it private.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(99_999_999_999)
  budget?: number;

  @ApiPropertyOptional({ example: 'ASTM A351 CF8 body, flanged ends, with EN 10204 3.1 certificates.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ default: 7, description: 'Days until the RFQ stops taking quotes (1 to 30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  closesInDays?: number;

  @ApiPropertyOptional({ description: 'Started from this product page' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Ask this supplier in particular. They are always invited.' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class AwardRfqDto {
  @ApiProperty()
  @IsUUID()
  quoteId: string;
}

export class SubmitQuoteDto {
  @ApiProperty({ example: 1950, description: 'Rupees per unit' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999)
  unitPrice: number;

  @ApiProperty({ example: 7, description: 'Days from order to dispatch' })
  @IsInt()
  @Min(0)
  @Max(365)
  deliveryDays: number;

  @ApiPropertyOptional({ example: 'ASTM A351 CF8' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  material?: string;

  @ApiPropertyOptional({ example: '18 months replacement' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  warranty?: string;

  @ApiPropertyOptional({ example: '30% advance, 70% on dispatch' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'EN 10204 3.1 included' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  certificates?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: 'Days this price stays valid (1 to 90)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  validForDays?: number;
}

export class RfqListQueryDto {
  @ApiPropertyOptional({ enum: RfqStatus })
  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;
}

/* ───────────── Responses ───────────── */

export class RfqSummary {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'RFQ-202611-0042' }) number: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: CategoryRef }) category: CategoryRef;
  @ApiProperty() quantity: number;
  @ApiProperty() unit: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiPropertyOptional({ nullable: true, type: Number }) budget: number | null;
  @ApiProperty({ enum: RfqStatus }) status: RfqStatus;
  @ApiProperty() closesAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ description: 'Quotes currently standing (not withdrawn)' }) quoteCount: number;
}

export class QuoteView {
  @ApiProperty() id: string;
  @ApiProperty() unitPrice: number;
  @ApiProperty({ description: 'unitPrice × quantity' }) total: number;
  @ApiProperty() deliveryDays: number;
  @ApiPropertyOptional({ nullable: true, type: String }) material: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) warranty: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) paymentTerms: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) certificates: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) note: string | null;
  @ApiPropertyOptional({ nullable: true, type: Date }) validUntil: Date | null;
  @ApiProperty({ description: '1 for the first version; goes up each time the supplier revises' }) revision: number;
  @ApiProperty({ enum: QuoteStatus }) status: QuoteStatus;
  @ApiProperty() updatedAt: Date;
}

export class BuyerQuote extends QuoteView {
  @ApiProperty({ type: CompanySummary }) company: CompanySummary;
  @ApiProperty() isLowestPrice: boolean;
  @ApiProperty() isFastest: boolean;
  @ApiPropertyOptional({ nullable: true, type: Boolean, description: 'null when the RFQ has no budget' }) withinBudget: boolean | null;
}

export class Contact {
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true, type: String }) email: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) phone: string | null;
}

export class BuyerRfq extends RfqSummary {
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ description: 'Suppliers told about this RFQ' }) invitedCount: number;
  @ApiProperty({ type: [BuyerQuote], description: 'Standing quotes, lowest price first' }) quotes: BuyerQuote[];
  @ApiPropertyOptional({ nullable: true, type: Contact, description: 'The winning supplier\'s contact, once awarded' })
  awardedContact: Contact | null;
}

export class SupplierRfq extends RfqSummary {
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ description: 'true = sent to you; false = you found it in the open feed' }) invited: boolean;
  @ApiProperty({ description: 'Where the buyer is. The buyer\'s name and contact stay hidden until they award you' })
  buyerLocation: string;
  @ApiPropertyOptional({ nullable: true, type: QuoteView }) myQuote: QuoteView | null;
  @ApiPropertyOptional({ nullable: true, type: Contact, description: 'Only when you won' }) buyerContact: Contact | null;
}
