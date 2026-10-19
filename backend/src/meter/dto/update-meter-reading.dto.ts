import { IsNumber, IsOptional, IsString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMeterReadingDto {
  @IsOptional()
  @IsString()
  billingMonth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousElectricity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentElectricity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  electricityRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousWater?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentWater?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waterRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRentPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherFees?: number;

  @IsOptional()
  @IsString()
  otherFeesNote?: string;

  @IsOptional()
  @IsIn(['UNPAID', 'PAID', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
