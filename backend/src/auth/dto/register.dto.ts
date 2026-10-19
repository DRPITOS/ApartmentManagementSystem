import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้องตามรูปแบบ (Invalid email format)' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล (Email is required)' })
  email!: string;

  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ (Password must be a string)' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร (Password must be at least 6 characters)' })
  password!: string;

  @IsString({ message: 'ชื่อเจ้าของต้องเป็นข้อความ (Name must be a string)' })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ-นามสกุล (Name is required)' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'เบอร์โทรศัพท์ต้องเป็นข้อความ (Phone number must be a string)' })
  phoneNumber?: string;
}
