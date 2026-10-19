import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Input } from '../components/Input.js';
import { registerSchema } from '../utils/validation.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Front-end syntax checking before sending to back-end
    const validationResult = registerSchema.safeParse({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phoneNumber: formData.phoneNumber.trim() || undefined,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || 'การสมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Building2 className="w-9 h-9" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          สมัครบัญชีเจ้าของหอพัก
        </h2>
        <p className="mt-2 text-center text-base text-slate-600 font-medium">
          ระบบจัดการหอพักและค่าน้ำค่าไฟสำหรับเจ้าของและผู้ร่วมบริหาร
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-3xl sm:px-10 border border-slate-200">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-base">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="ชื่อ - นามสกุล เจ้าของ"
              name="name"
              placeholder="เช่น นายวิทยา มั่นคง"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              autoFocus
            />

            <Input
              label="อีเมล (ใช้เข้าสู่ระบบ)"
              name="email"
              type="email"
              placeholder="owner@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <Input
              label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              name="password"
              type="password"
              placeholder="กำหนดรหัสผ่านปลอดภัย"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <Input
              label="เบอร์โทรศัพท์ติดต่อ"
              name="phoneNumber"
              type="tel"
              placeholder="เช่น 0812345678"
              value={formData.phoneNumber}
              onChange={handleChange}
              error={errors.phoneNumber}
              helperText="สำหรับติดต่อหรือแสดงในหัวบิลเรียกเก็บเงิน"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-md shadow-indigo-200 text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 mt-6"
            >
              <UserPlus className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังสร้างบัญชี...' : 'ลงทะเบียนเจ้าของ'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-base text-slate-600">
              มีบัญชีผู้ใช้อยู่แล้ว?{' '}
              <Link
                to="/login"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 ml-1"
              >
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
