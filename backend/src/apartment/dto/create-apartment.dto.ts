import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApartmentDto {
  @IsString({ message: 'ชื่อหอพักต้องเป็นข้อความ (Apartment name must be a string)' })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อหอพัก (Apartment name is required)' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'ชื่อเล่น/ชื่อย่อหอพักต้องเป็นข้อความ (Nickname must be a string)' })
  nickname?: string;

  @IsOptional()
  @IsString({ message: 'ที่อยู่ต้องเป็นข้อความ (Address must be a string)' })
  address?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าไฟต่อหน่วยต้องเป็นตัวเลข (Electricity rate must be a number)' })
  @Min(0, { message: 'ราคาค่าไฟต่อหน่วยต้องไม่ติดลบ (Electricity rate cannot be negative)' })
  defaultElectricityRate!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าน้ำต่อหน่วยต้องเป็นตัวเลข (Water rate must be a number)' })
  @Min(0, { message: 'ราคาค่าน้ำต่อหน่วยต้องไม่ติดลบ (Water rate cannot be negative)' })
  defaultWaterRate!: number;

  @IsOptional()
  @IsIn(['PER_UNIT', 'FLAT_RATE'], { message: 'รูปแบบการคิดค่าน้ำต้องเป็น PER_UNIT หรือ FLAT_RATE' })
  waterBillingType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าน้ำเหมาจ่ายต้องเป็นตัวเลข (Flat water rate must be a number)' })
  @Min(0, { message: 'ราคาค่าน้ำเหมาจ่ายต้องไม่ติดลบ (Flat water rate cannot be negative)' })
  flatWaterRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ค่าส่วนกลางต้องเป็นตัวเลข (Common fee must be a number)' })
  @Min(0, { message: 'ค่าส่วนกลางต้องไม่ติดลบ (Common fee cannot be negative)' })
  commonFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์ไฟเริ่มต้นต้องเป็นตัวเลข (Default initial electricity must be a number)' })
  @Min(0, { message: 'เลขมิเตอร์ไฟเริ่มต้นต้องไม่ติดลบ (Default initial electricity cannot be negative)' })
  defaultInitialElectricity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'เลขมิเตอร์น้ำเริ่มต้นต้องเป็นตัวเลข (Default initial water must be a number)' })
  @Min(0, { message: 'เลขมิเตอร์น้ำเริ่มต้นต้องไม่ติดลบ (Default initial water cannot be negative)' })
  defaultInitialWater?: number;
}
