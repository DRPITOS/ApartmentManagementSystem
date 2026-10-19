import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeterReadingDto {
  @IsString({ message: 'รหัสห้องพักต้องเป็นข้อความ (Room ID must be a string)' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสห้องพัก (Room ID is required)' })
  roomId!: string;

  @IsString({ message: 'รอบบิลต้องเป็นข้อความ เช่น 2026-10 (Billing month must be format YYYY-MM)' })
  @IsNotEmpty({ message: 'กรุณาระบุรอบบิล (Billing month is required)' })
  billingMonth!: string;

  @IsOptional()
  @IsString({ message: 'วันที่จดมิเตอร์ต้องเป็นข้อความ ISO (Reading date must be a valid date string)' })
  readingDate?: string;

  // ไฟฟ้า
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์ไฟครั้งก่อนต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์ไฟครั้งก่อนต้องไม่ติดลบ' })
  previousElectricity!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์ไฟปัจจุบันต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์ไฟปัจจุบันต้องไม่ติดลบ' })
  currentElectricity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาต่อหน่วยไฟฟ้าต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาต่อหน่วยไฟฟ้าต้องไม่ติดลบ' })
  electricityRate?: number;

  // น้ำประปา
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์น้ำครั้งก่อนต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์น้ำครั้งก่อนต้องไม่ติดลบ' })
  previousWater!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์น้ำปัจจุบันต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์น้ำปัจจุบันต้องไม่ติดลบ' })
  currentWater!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาต่อหน่วยน้ำต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาต่อหน่วยน้ำต้องไม่ติดลบ' })
  waterRate?: number;

  // ค่าเช่าและค่าใช้จ่ายอื่น
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ค่าเช่าห้องต้องเป็นตัวเลข' })
  @Min(0, { message: 'ค่าเช่าห้องต้องไม่ติดลบ' })
  baseRentPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ค่าใช้จ่ายเพิ่มเติมต้องเป็นตัวเลข' })
  @Min(0, { message: 'ค่าใช้จ่ายเพิ่มเติมต้องไม่ติดลบ' })
  otherFees?: number;

  @IsOptional()
  @IsString({ message: 'หมายเหตุค่าใช้จ่ายเพิ่มเติมต้องเป็นข้อความ' })
  otherFeesNote?: string;

  @IsOptional()
  @IsIn(['UNPAID', 'PAID', 'CANCELLED'], { message: 'สถานะต้องเป็น UNPAID, PAID หรือ CANCELLED' })
  status?: string;

  @IsOptional()
  @IsString({ message: 'บันทึกช่วยจำต้องเป็นข้อความ' })
  note?: string;
}
