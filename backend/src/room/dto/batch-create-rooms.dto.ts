import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleBatchRoomItem {
  @IsString({ message: 'หมายเลขห้องต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณากรอกเลขห้อง' })
  roomNumber!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'ชั้นต้องเป็นตัวเลข' })
  floor?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'ราคาค่าเช่าห้องต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาค่าเช่าห้องต้องไม่ติดลบ' })
  basePrice!: number;

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
}

export class BatchCreateRoomsDto {
  @IsString({ message: 'รหัสหอพักต้องเป็นข้อความ' })
  @IsNotEmpty({ message: 'กรุณาระบุรหัสหอพัก' })
  apartmentId!: string;

  @IsArray({ message: 'รายการห้องต้องเป็นอาเรย์' })
  @ValidateNested({ each: true })
  @Type(() => SingleBatchRoomItem)
  rooms!: SingleBatchRoomItem[];
}
