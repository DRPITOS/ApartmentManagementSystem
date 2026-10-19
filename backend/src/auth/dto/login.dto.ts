import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้องตามรูปแบบ (Invalid email format)' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล (Email is required)' })
  email!: string;

  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ (Password must be a string)' })
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน (Password is required)' })
  password!: string;
}
