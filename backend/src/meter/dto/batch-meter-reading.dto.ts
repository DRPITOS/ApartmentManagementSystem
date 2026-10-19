import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchSingleReadingItem {
  @IsString({ message: 'รหัสห้องพักต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสห้องพัก' })
  roomId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousElectricity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentElectricity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousWater!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentWater!: number;

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
}

export class BatchMeterReadingDto {
  @IsString({ message: 'รหัสหอพักต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสหอพัก' })
  apartmentId!: string;

  @IsString({ message: 'รอบบิลต้องเป็นข้อความ เช่น 2026-10' })
  @IsNotEmpty({ message: 'กรุณาระบุรอบบิล' })
  billingMonth!: string;

  @IsArray({ message: 'รายการจดมิเตอร์ต้องเป็นอาเรย์' })
  @ValidateNested({ each: true })
  @Type(() => BatchSingleReadingItem)
  readings!: BatchSingleReadingItem[];
}
