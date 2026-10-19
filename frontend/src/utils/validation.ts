import { z } from 'zod';

// Zod schemas with friendly Thai syntax error messages
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง ตัวอย่าง: owner@example.com'),
  password: z
    .string()
    .min(1, 'กรุณากรอกรหัสผ่าน')
    .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง ตัวอย่าง: owner@example.com'),
  password: z
    .string()
    .min(1, 'กรุณากรอกรหัสผ่าน')
    .min(6, 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  name: z
    .string()
    .min(1, 'กรุณากรอกชื่อ-นามสกุล')
    .min(2, 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^0[0-9]{8,9}$/.test(val.replace(/[-\s]/g, '')), {
      message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)',
    }),
});

export const apartmentSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อหอพัก'),
  nickname: z.string().optional(),
  address: z.string().optional(),
  defaultElectricityRate: z
    .number({ message: 'กรุณากรอกราคาค่าไฟต่อหน่วยเป็นตัวเลข' })
    .min(0, 'ราคาค่าไฟต้องไม่ติดลบ'),
  defaultWaterRate: z
    .number({ message: 'กรุณากรอกราคาค่าน้ำต่อหน่วยเป็นตัวเลข' })
    .min(0, 'ราคาค่าน้ำต้องไม่ติดลบ'),
  waterBillingType: z.enum(['PER_UNIT', 'FLAT_RATE']),
  flatWaterRate: z
    .number({ message: 'กรุณากรอกราคาค่าน้ำเหมาจ่ายเป็นตัวเลข' })
    .min(0, 'ราคาค่าน้ำเหมาจ่ายต้องไม่ติดลบ')
    .optional(),
  commonFee: z
    .number({ message: 'ค่าส่วนกลางต้องเป็นตัวเลข' })
    .min(0, 'ค่าส่วนกลางต้องไม่ติดลบ')
    .optional(),
});

export const roomSchema = z.object({
  apartmentId: z.string().min(1, 'กรุณาระบุหอพัก'),
  roomNumber: z.string().min(1, 'กรุณากรอกหมายเลขห้อง'),
  floor: z.number().int().min(1, 'ชั้นต้องมากกว่าหรือเท่ากับ 1').optional(),
  basePrice: z
    .number({ message: 'กรุณากรอกราคาค่าเช่าห้อง' })
    .min(0, 'ราคาค่าเช่าห้องต้องไม่ติดลบ'),
  customElectricityRate: z
    .number()
    .min(0, 'ราคาค่าไฟต้องไม่ติดลบ')
    .nullable()
    .optional(),
  customWaterRate: z
    .number()
    .min(0, 'ราคาค่าน้ำต้องไม่ติดลบ')
    .nullable()
    .optional(),
  tenantName: z.string().optional(),
  tenantPhone: z.string().optional(),
  status: z.enum(['OCCUPIED', 'VACANT', 'MAINTENANCE']),
});

export const meterReadingSchema = z.object({
  roomId: z.string().min(1, 'กรุณาระบุห้องพัก'),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบรอบบิลต้องเป็น ปปปป-ดด (เช่น 2026-10)'),
  previousElectricity: z.number().min(0, 'เลขมิเตอร์ไฟครั้งก่อนต้องไม่ติดลบ'),
  currentElectricity: z.number().min(0, 'เลขมิเตอร์ไฟปัจจุบันต้องไม่ติดลบ'),
  previousWater: z.number().min(0, 'เลขมิเตอร์น้ำครั้งก่อนต้องไม่ติดลบ'),
  currentWater: z.number().min(0, 'เลขมิเตอร์น้ำปัจจุบันต้องไม่ติดลบ'),
  baseRentPrice: z.number().min(0, 'ค่าเช่าห้องต้องไม่ติดลบ').optional(),
  otherFees: z.number().min(0, 'ค่าใช้จ่ายอื่นต้องไม่ติดลบ').optional(),
  otherFeesNote: z.string().optional(),
}).refine((data) => data.currentElectricity >= data.previousElectricity, {
  message: 'เลขมิเตอร์ไฟปัจจุบันต้องไม่น้อยกว่าครั้งก่อน',
  path: ['currentElectricity'],
}).refine((data) => data.currentWater >= data.previousWater, {
  message: 'เลขมิเตอร์น้ำปัจจุบันต้องไม่น้อยกว่าครั้งก่อน',
  path: ['currentWater'],
});

// Helper validation functions for instant field-level syntax checks
export function validateEmailSyntax(email: string): string | null {
  if (!email || !email.trim()) return 'กรุณากรอกอีเมล';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@domain.com';
  return null;
}

export function validatePasswordSyntax(password: string): string | null {
  if (!password) return 'กรุณากรอกรหัสผ่าน';
  if (password.length < 6) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  return null;
}

export function validatePhoneSyntax(phone?: string): string | null {
  if (!phone || !phone.trim()) return null;
  const clean = phone.replace(/[-\s]/g, '');
  if (!/^0[0-9]{8,9}$/.test(clean)) return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
  return null;
}

export function validateNumberSyntax(
  val: any,
  fieldNameThai: string,
  allowZero = true,
): string | null {
  if (val === '' || val === null || val === undefined) return `กรุณากรอก${fieldNameThai}`;
  const num = Number(val);
  if (isNaN(num)) return `${fieldNameThai}ต้องเป็นตัวเลข`;
  if (allowZero && num < 0) return `${fieldNameThai}ต้องไม่ติดลบ`;
  if (!allowZero && num <= 0) return `${fieldNameThai}ต้องมากกว่า 0`;
  return null;
}
