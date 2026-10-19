import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString({ message: 'รหัสหอพักต้องเป็นข้อความ (Apartment ID must be a string)' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสหอพัก (Apartment ID is required)' })
  apartmentId!: string;

  @IsString({ message: 'หมายเลขห้องต้องเป็นข้อความ (Room number must be a string)' })
  @IsNotEmpty({ message: 'กรุณากรอกเลขห้อง (Room number is required)' })
  roomNumber!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ชั้นต้องเป็นตัวเลข (Floor must be a number)' })
  floor?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าเช่าห้องต้องเป็นตัวเลข (Base price must be a number)' })
  @Min(0, { message: 'ราคาค่าเช่าห้องต้องไม่ติดลบ (Base price cannot be negative)' })
  basePrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าไฟเฉพาะห้องต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาค่าไฟต้องไม่ติดลบ' })
  customElectricityRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าน้ำเฉพาะห้องต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาค่าน้ำต้องไม่ติดลบ' })
  customWaterRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์ไฟเริ่มต้นต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์ไฟเริ่มต้นต้องไม่ติดลบ' })
  initialElectricity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์น้ำเริ่มต้นต้องเป็นตัวเลข' })
  @Min(0, { message: 'เลขมิเตอร์น้ำเริ่มต้นต้องไม่ติดลบ' })
  initialWater?: number;

  @IsOptional()
  @IsString({ message: 'ชื่อผู้เช่าต้องเป็นข้อความ' })
  tenantName?: string;

  @IsOptional()
  @IsString({ message: 'เบอร์ติดต่อผู้เช่าต้องเป็นข้อความ' })
  tenantPhone?: string;

  @IsOptional()
  @IsIn(['OCCUPIED', 'VACANT', 'MAINTENANCE'], { message: 'สถานะห้องต้องเป็น OCCUPIED, VACANT หรือ MAINTENANCE' })
  status?: string;
}
