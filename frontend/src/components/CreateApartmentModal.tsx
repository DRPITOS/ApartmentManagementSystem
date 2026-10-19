import React, { useState } from 'react';
import { Modal } from './Modal.js';
import { Input } from './Input.js';
import api from '../services/api.js';
import { useApartment } from '../contexts/ApartmentContext.js';
import { apartmentSchema } from '../utils/validation.js';

interface CreateApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateApartmentModal: React.FC<CreateApartmentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { fetchApartments, setSelectedApartment } = useApartment();

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    address: '',
    defaultElectricityRate: '7.0',
    defaultWaterRate: '18.0',
    waterBillingType: 'PER_UNIT' as 'PER_UNIT' | 'FLAT_RATE',
    flatWaterRate: '100',
    commonFee: '0',
    defaultInitialElectricity: '0',
    defaultInitialWater: '0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Front-end syntax & validation checking before sending to back-end
    const parsedData = {
      name: formData.name.trim(),
      nickname: formData.nickname.trim() || undefined,
      address: formData.address.trim() || undefined,
      defaultElectricityRate: Number(formData.defaultElectricityRate),
      defaultWaterRate: Number(formData.defaultWaterRate),
      waterBillingType: formData.waterBillingType,
      flatWaterRate: formData.waterBillingType === 'FLAT_RATE' ? Number(formData.flatWaterRate) : undefined,
      commonFee: Number(formData.commonFee || 0),
      defaultInitialElectricity: formData.defaultInitialElectricity !== '' ? Number(formData.defaultInitialElectricity) : 0,
      defaultInitialWater: formData.defaultInitialWater !== '' ? Number(formData.defaultInitialWater) : 0,
    };

    const validationResult = apartmentSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/apartments', parsedData);
      await fetchApartments();
      setSelectedApartment(res.data);
      onClose();
      // Reset form
      setFormData({
        name: '',
        nickname: '',
        address: '',
        defaultElectricityRate: '7.0',
        defaultWaterRate: '18.0',
        waterBillingType: 'PER_UNIT',
        flatWaterRate: '100',
        commonFee: '0',
        defaultInitialElectricity: '0',
        defaultInitialWater: '0',
      });
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างหอพัก กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มโครงการหอพักใหม่" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-base">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="ชื่อหอพัก"
            name="name"
            placeholder="เช่น หอพักสุขสบายแมนชั่น"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <Input
            label="ชื่อเล่น / ชื่อย่อหอพัก"
            name="nickname"
            placeholder="เช่น ตึก A, หอหลัง ม."
            value={formData.nickname}
            onChange={handleChange}
            error={errors.nickname}
            helperText="ช่วยจำกรณีมีหลายหอพัก"
          />
        </div>

        <Input
          label="ที่อยู่ / ที่ตั้งหอพัก"
          name="address"
          placeholder="เช่น 123/45 ซอยพหลโยธิน แขวงลาดยาว เขตจตุจักร กทม."
          value={formData.address}
          onChange={handleChange}
          error={errors.address}
        />

        {/* Pricing Configuration */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <h4 className="font-bold text-slate-900 text-lg">
            ⚙️ กำหนดราคาค่าน้ำ - ค่าไฟฟ้า (สามารถแก้ไขได้ตลอดเวลา)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ราคาค่าไฟฟ้าต่อหน่วย"
              name="defaultElectricityRate"
              type="number"
              step="0.1"
              min="0"
              placeholder="7.0"
              value={formData.defaultElectricityRate}
              onChange={handleChange}
              error={errors.defaultElectricityRate}
              unitSuffix="บาท/หน่วย"
              required
            />

            <div>
              <label className="block text-base font-medium text-slate-800 mb-1.5">
                รูปแบบการคิดค่าน้ำประปา
              </label>
              <select
                name="waterBillingType"
                value={formData.waterBillingType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base sm:text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
              >
                <option value="PER_UNIT">คิดตามหน่วยจริง (บาท/หน่วย)</option>
                <option value="FLAT_RATE">เหมาจ่ายรายเดือน (บาท/เดือน)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.waterBillingType === 'PER_UNIT' ? (
              <Input
                label="ราคาค่าน้ำต่อหน่วย"
                name="defaultWaterRate"
                type="number"
                step="0.1"
                min="0"
                placeholder="18.0"
                value={formData.defaultWaterRate}
                onChange={handleChange}
                error={errors.defaultWaterRate}
                unitSuffix="บาท/หน่วย"
                required
              />
            ) : (
              <Input
                label="ราคาค่าน้ำเหมาจ่ายต่อเดือน"
                name="flatWaterRate"
                type="number"
                min="0"
                placeholder="100"
                value={formData.flatWaterRate}
                onChange={handleChange}
                error={errors.flatWaterRate}
                unitSuffix="บาท/เดือน"
                required
              />
            )}

            <Input
              label="ค่าส่วนกลาง / ค่าขยะ (ถ้ามี)"
              name="commonFee"
              type="number"
              min="0"
              placeholder="0"
              value={formData.commonFee}
              onChange={handleChange}
              error={errors.commonFee}
              unitSuffix="บาท/เดือน"
            />
          </div>
        </div>

        {/* Initial Meter Reading Baseline */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔢</span>
            <div>
              <h4 className="font-bold text-amber-950 text-base sm:text-lg">
                เลขมิเตอร์เริ่มต้น (สำหรับห้องพักที่สร้างใหม่ในหอนี้)
              </h4>
              <p className="text-xs sm:text-sm text-amber-800">
                ระบบจะใช้เลขนี้เป็นเลขตั้งต้นตอนสร้างห้องพัก (สามารถปรับเปลี่ยนรายห้องได้ในภายหลัง)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Input
              label="⚡ เลขมิเตอร์ไฟเริ่มต้น (ค่าตั้งต้น)"
              name="defaultInitialElectricity"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={formData.defaultInitialElectricity}
              onChange={handleChange}
              error={errors.defaultInitialElectricity}
              unitSuffix="หน่วย"
              helperText="เลขมิเตอร์ไฟครั้งล่าสุด"
            />

            <Input
              label="💧 เลขมิเตอร์น้ำเริ่มต้น (ค่าตั้งต้น)"
              name="defaultInitialWater"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={formData.defaultInitialWater}
              onChange={handleChange}
              error={errors.defaultInitialWater}
              unitSuffix="หน่วย"
              helperText="เลขมิเตอร์น้ำครั้งล่าสุด"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังสร้างหอพัก...' : 'บันทึกสร้างหอพัก'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
