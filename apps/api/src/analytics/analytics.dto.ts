import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const ANALYTICS_DAYS = [7, 30, 90] as const;

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_DAYS, default: 30, description: 'Length of the period, ending today' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsIn(ANALYTICS_DAYS as unknown as number[])
  days?: number;
}

export const TRACK_KINDS = ['product', 'company', 'site'] as const;
export type TrackKind = (typeof TRACK_KINDS)[number];

/** Sent by our own website when a visitor opens a page. */
export class TrackDto {
  @ApiProperty({ enum: TRACK_KINDS, description: 'product = a product page; company = the supplier page on the marketplace; site = the supplier\'s own website' })
  @IsIn(TRACK_KINDS as unknown as string[])
  kind: TrackKind;

  @ApiProperty({ example: 'trunnion-mounted-ball-valve-class-600-konk' })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'slug must be lowercase letters, digits and dashes' })
  slug: string;
}

export class Metric {
  @ApiProperty() value: number;
  @ApiProperty({ description: 'Same measure in the period right before' }) previous: number;
  @ApiPropertyOptional({ nullable: true, type: Number, description: 'Whole-number % change; null when there is nothing earlier to compare with' })
  changePct: number | null;
}

export class DayPoint {
  @ApiProperty({ example: '2026-11-16' }) day: string;
  @ApiProperty() productViews: number;
  @ApiProperty() profileViews: number;
  @ApiProperty() siteViews: number;
}

export class TopProduct {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() views: number;
}

export class RfqActivity {
  @ApiProperty({ description: 'Requirements matched to you in the period' }) invited: number;
  @ApiProperty({ description: 'Of those, how many you opened' }) opened: number;
  @ApiProperty({ description: 'Quotes you sent in the period' }) quoted: number;
  @ApiProperty({ description: 'Quotes the buyer chose in the period' }) won: number;
}

export class AnalyticsReport {
  @ApiProperty() days: number;
  @ApiProperty({ example: '2026-10-18' }) from: string;
  @ApiProperty({ example: '2026-11-16' }) to: string;
  @ApiProperty() productViews: Metric;
  @ApiProperty() profileViews: Metric;
  @ApiProperty() siteViews: Metric;
  @ApiProperty({ type: [DayPoint], description: 'One entry per day, zeros included' }) series: DayPoint[];
  @ApiProperty({ type: [TopProduct] }) topProducts: TopProduct[];
  @ApiProperty() rfq: RfqActivity;
}
