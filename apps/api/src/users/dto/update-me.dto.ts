import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'E.164 format. Will be verified by WhatsApp OTP later.' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phone must be in E.164 format, e.g. +919876543210' })
  phone?: string;
}
