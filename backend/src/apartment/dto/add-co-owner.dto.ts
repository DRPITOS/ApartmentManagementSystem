import { IsEmail, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class AddCoOwnerDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้องตามรูปแบบ (Invalid email format)' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมลของเจ้าของร่วม (Email is required)' })
  email!: string;

  @IsOptional()
  @IsIn(['PRIMARY_OWNER', 'CO_OWNER'], { message: 'บทบาทต้องเป็น PRIMARY_OWNER หรือ CO_OWNER' })
  role?: string;
}
