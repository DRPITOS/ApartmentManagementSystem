import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { Input } from '../components/Input.js';
import { loginSchema } from '../utils/validation.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Front-end syntax validation
    const validationResult = loginSchema.safeParse({ email: email.trim(), password });
    if (!validationResult.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of validationResult.error.issues) {
        if (issue.path[0] === 'email') fieldErrors.email = issue.message;
        if (issue.path[0] === 'password') fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
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
          ระบบจัดการหอพัก & น้ำไฟ
        </h2>
        <p className="mt-2 text-center text-base text-slate-600 font-medium">
          เข้าสู่ระบบสำหรับเจ้าของหอพัก (Owner Login)
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
              label="อีเมลเจ้าของหอพัก"
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              required
              autoFocus
            />

            <Input
              label="รหัสผ่าน"
              type="password"
              placeholder="กรอกรหัสผ่าน 6 ตัวขึ้นไป"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-md shadow-indigo-200 text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 mt-6"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-base text-slate-600">
              ยังไม่มีบัญชีเจ้าของหอพัก?{' '}
              <Link
                to="/register"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 ml-1"
              >
                สมัครใช้งานฟรี
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
