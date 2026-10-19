import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Zap,
  Droplets,
  DollarSign,
  Users,
  Edit2,
  Trash2,
  CheckCircle,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { useApartment } from '../contexts/ApartmentContext.js';
import api from '../services/api.js';
import type { Apartment } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { Input } from '../components/Input.js';
import { CreateApartmentModal } from '../components/CreateApartmentModal.js';
import { validateEmailSyntax, validateNumberSyntax } from '../utils/validation.js';
import { ApartmentListSkeleton } from '../components/Skeleton.js';

export const ApartmentListPage: React.FC = () => {
  const { apartments, selectedApartment, setSelectedApartment, fetchApartments, isLoading } =
    useApartment();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Co-owner modal states
  const [coOwnerApt, setCoOwnerApt] = useState<Apartment | null>(null);
  const [isCoOwnerModalOpen, setIsCoOwnerModalOpen] = useState(false);
  const [coOwnerList, setCoOwnerList] = useState<any[]>([]);
  const [coOwnerEmail, setCoOwnerEmail] = useState('');
  const [coOwnerError, setCoOwnerError] = useState<string | null>(null);
  const [coOwnerSuccess, setCoOwnerSuccess] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    address: '',
    defaultElectricityRate: '',
    defaultWaterRate: '',
    waterBillingType: 'PER_UNIT' as 'PER_UNIT' | 'FLAT_RATE',
    flatWaterRate: '',
    commonFee: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenEdit = (apt: Apartment) => {
    setEditingApartment(apt);
    setEditForm({
      name: apt.name,
      nickname: apt.nickname || '',
      address: apt.address || '',
      defaultElectricityRate: String(apt.defaultElectricityRate),
      defaultWaterRate: String(apt.defaultWaterRate),
      waterBillingType: apt.waterBillingType,
      flatWaterRate: apt.flatWaterRate ? String(apt.flatWaterRate) : '100',
      commonFee: apt.commonFee ? String(apt.commonFee) : '0',
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApartment) return;

    // Syntax validation
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'กรุณากรอกชื่อหอพัก';
    const elecErr = validateNumberSyntax(editForm.defaultElectricityRate, 'ราคาค่าไฟ', true);
    if (elecErr) errors.defaultElectricityRate = elecErr;

    if (editForm.waterBillingType === 'PER_UNIT') {
      const waterErr = validateNumberSyntax(editForm.defaultWaterRate, 'ราคาค่าน้ำ', true);
      if (waterErr) errors.defaultWaterRate = waterErr;
    } else {
      const flatErr = validateNumberSyntax(editForm.flatWaterRate, 'ราคาค่าน้ำเหมาจ่าย', true);
      if (flatErr) errors.flatWaterRate = flatErr;
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        nickname: editForm.nickname.trim() || undefined,
        address: editForm.address.trim() || undefined,
        defaultElectricityRate: Number(editForm.defaultElectricityRate),
        defaultWaterRate: Number(editForm.defaultWaterRate),
        waterBillingType: editForm.waterBillingType,
        flatWaterRate: Number(editForm.flatWaterRate),
        commonFee: Number(editForm.commonFee || 0),
      };

      const res = await api.put(`/apartments/${editingApartment.id}`, payload);
      await fetchApartments();
      if (selectedApartment?.id === editingApartment.id) {
        setSelectedApartment(res.data);
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApartment = async (apt: Apartment) => {
    if (
      !confirm(
        `คุณต้องการลบหอพัก "${apt.name}" หรือไม่?\nคำเตือน: ข้อมูลห้องพักและมิเตอร์ทั้งหมดของหอพักนี้จะถูกลบถาวร`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/apartments/${apt.id}`);
      await fetchApartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบหอพัก');
    }
  };

  // Co-owner management
  const handleOpenCoOwners = async (apt: Apartment) => {
    setCoOwnerApt(apt);
    setCoOwnerEmail('');
    setCoOwnerError(null);
    setCoOwnerSuccess(null);
    setIsCoOwnerModalOpen(true);

    try {
      const res = await api.get(`/apartments/${apt.id}`);
      setCoOwnerList(res.data.owners || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCoOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coOwnerApt) return;
    setCoOwnerError(null);
    setCoOwnerSuccess(null);

    const emailErr = validateEmailSyntax(coOwnerEmail);
    if (emailErr) {
      setCoOwnerError(emailErr);
      return;
    }

    try {
      const res = await api.post(`/apartments/${coOwnerApt.id}/owners`, {
        email: coOwnerEmail.trim(),
        role: 'CO_OWNER',
      });
      setCoOwnerSuccess(res.data.message || 'เพิ่มเจ้าของร่วมเรียบร้อยแล้ว');
      setCoOwnerEmail('');
      // Refresh co-owner list
      const aptRes = await api.get(`/apartments/${coOwnerApt.id}`);
      setCoOwnerList(aptRes.data.owners || []);
      await fetchApartments();
    } catch (err: any) {
      setCoOwnerError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มเจ้าของร่วม');
    }
  };

  const handleRemoveCoOwner = async (targetOwnerId: string, ownerName: string) => {
    if (!coOwnerApt) return;
    if (!confirm(`คุณต้องการนำ "${ownerName}" ออกจากการเป็นเจ้าของร่วมหรือไม่?`)) return;

    try {
      await api.delete(`/apartments/${coOwnerApt.id}/owners/${targetOwnerId}`);
      // Refresh
      const aptRes = await api.get(`/apartments/${coOwnerApt.id}`);
      setCoOwnerList(aptRes.data.owners || []);
      await fetchApartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการนำเจ้าของร่วมออก');
    }
  };

  if (isLoading && apartments.length === 0) {
    return <ApartmentListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              หอพัก & อัตราค่าน้ำค่าไฟ
            </h2>
            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-base font-bold">
              {apartments.length} โครงการ
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1">
            จัดการหอพัก กำหนดชื่อเล่น กำหนดราคาค่าไฟ-ค่าน้ำต่อหน่วย และบริหารจัดการเจ้าของร่วม (Co-owners)
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg shadow-md shadow-indigo-100 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>เพิ่มโครงการหอพักใหม่</span>
        </button>
      </div>

      {/* Apartment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {apartments.map((apt) => {
          const isSelected = selectedApartment?.id === apt.id;

          return (
            <div
              key={apt.id}
              className={`bg-white rounded-3xl p-5 sm:p-7 border-2 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 shadow-lg shadow-indigo-50 ring-4 ring-indigo-50'
                  : 'border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div>
                {/* Title & Nickname & Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                          {apt.name}
                        </h3>
                        {apt.nickname && (
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full text-base font-bold">
                            {apt.nickname}
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-slate-500 mt-0.5">
                        {apt.address || 'ไม่ได้ระบุที่อยู่'}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> หอพักปัจจุบัน
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedApartment(apt)}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition-colors shrink-0 self-start sm:self-auto"
                    >
                      สลับมาหอนี้
                    </button>
                  )}
                </div>

                {/* Rates & Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
                  {/* Electricity Rate */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-sm font-semibold text-amber-900 flex items-center gap-1 mb-1">
                      <Zap className="w-4 h-4 text-amber-600" /> ค่าไฟฟ้า
                    </span>
                    <strong className="text-xl sm:text-2xl font-black text-amber-800">
                      {apt.defaultElectricityRate}
                    </strong>
                    <span className="text-xs text-amber-900 block font-medium">บาท / หน่วย</span>
                  </div>

                  {/* Water Rate */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200">
                    <span className="text-sm font-semibold text-sky-900 flex items-center gap-1 mb-1">
                      <Droplets className="w-4 h-4 text-sky-600" /> ค่าน้ำประปา
                    </span>
                    <strong className="text-xl sm:text-2xl font-black text-sky-800">
                      {apt.waterBillingType === 'FLAT_RATE'
                        ? apt.flatWaterRate
                        : apt.defaultWaterRate}
                    </strong>
                    <span className="text-xs text-sky-900 block font-medium">
                      {apt.waterBillingType === 'FLAT_RATE' ? 'บาท / เดือน (เหมา)' : 'บาท / หน่วย'}
                    </span>
                  </div>

                  {/* Total Rooms */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 col-span-2 sm:col-span-1">
                    <span className="text-sm font-semibold text-indigo-900 flex items-center gap-1 mb-1">
                      <DollarSign className="w-4 h-4 text-indigo-600" /> ห้องพัก
                    </span>
                    <strong className="text-xl sm:text-2xl font-black text-indigo-800">
                      {apt.totalRooms || 0}
                    </strong>
                    <span className="text-xs text-indigo-900 block font-medium">
                      (มีผู้เช่า {apt.occupiedRooms || 0} ห้อง)
                    </span>
                  </div>
                </div>

                {/* Common fee note */}
                {apt.commonFee ? (
                  <p className="text-sm text-slate-500 mb-4">
                    ค่าส่วนกลาง: ฿{apt.commonFee} บาท/ห้อง/เดือน
                  </p>
                ) : null}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={() => handleOpenCoOwners(apt)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-semibold transition-colors"
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>เจ้าของร่วม ({apt.ownersCount || 1} คน)</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenEdit(apt)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-base font-bold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>แก้ไขราคา/ข้อมูล</span>
                  </button>
                  <button
                    onClick={() => handleDeleteApartment(apt)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="ลบหอพัก"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Apartment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`แก้ไขข้อมูลและอัตราค่าบริการ: ${editingApartment?.name}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ชื่อหอพัก"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              error={editErrors.name}
              required
            />
            <Input
              label="ชื่อเล่น / ชื่อย่อหอพัก"
              value={editForm.nickname}
              onChange={(e) => setEditForm((p) => ({ ...p, nickname: e.target.value }))}
              error={editErrors.nickname}
              helperText="เช่น ตึก A, หอหลัง ม."
            />
          </div>

          <Input
            label="ที่อยู่หอพัก"
            value={editForm.address}
            onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
            error={editErrors.address}
          />

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h4 className="font-bold text-slate-900 text-lg">
              ⚙️ ควบคุมราคาค่าน้ำ - ค่าไฟฟ้าต่อหน่วย
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="ราคาค่าไฟฟ้าต่อหน่วย"
                type="number"
                step="0.1"
                min="0"
                value={editForm.defaultElectricityRate}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, defaultElectricityRate: e.target.value }))
                }
                error={editErrors.defaultElectricityRate}
                unitSuffix="บาท/หน่วย"
                required
              />

              <div>
                <label className="block text-base font-medium text-slate-800 mb-1.5">
                  รูปแบบการคิดค่าน้ำประปา
                </label>
                <select
                  value={editForm.waterBillingType}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, waterBillingType: e.target.value as any }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base sm:text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
                >
                  <option value="PER_UNIT">คิดตามหน่วยจริง (บาท/หน่วย)</option>
                  <option value="FLAT_RATE">เหมาจ่ายรายเดือน (บาท/เดือน)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editForm.waterBillingType === 'PER_UNIT' ? (
                <Input
                  label="ราคาค่าน้ำต่อหน่วย"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editForm.defaultWaterRate}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, defaultWaterRate: e.target.value }))
                  }
                  error={editErrors.defaultWaterRate}
                  unitSuffix="บาท/หน่วย"
                  required
                />
              ) : (
                <Input
                  label="ราคาค่าน้ำเหมาจ่ายต่อเดือน"
                  type="number"
                  min="0"
                  value={editForm.flatWaterRate}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, flatWaterRate: e.target.value }))
                  }
                  error={editErrors.flatWaterRate}
                  unitSuffix="บาท/เดือน"
                  required
                />
              )}

              <Input
                label="ค่าส่วนกลางต่อห้อง"
                type="number"
                min="0"
                value={editForm.commonFee}
                onChange={(e) => setEditForm((p) => ({ ...p, commonFee: e.target.value }))}
                unitSuffix="บาท/เดือน"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-base disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Co-owners Modal */}
      <Modal
        isOpen={isCoOwnerModalOpen}
        onClose={() => setIsCoOwnerModalOpen(false)}
        title={`จัดการเจ้าของร่วม: ${coOwnerApt?.name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          <p className="text-base text-slate-600">
            หอพักนี้สามารถมีเจ้าของร่วมได้หลายคน (Multiple Owners) ผู้ที่ได้รับสิทธิ์จะสามารถดูแลและจัดการมิเตอร์น้ำไฟได้
          </p>

          {/* Add Co-Owner Form */}
          <form onSubmit={handleAddCoOwner} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>เพิ่มเจ้าของร่วมใหม่</span>
            </h4>

            {coOwnerError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-base">
                {coOwnerError}
              </div>
            )}
            {coOwnerSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-base">
                {coOwnerSuccess}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="กรอกอีเมลของเจ้าของร่วม..."
                  value={coOwnerEmail}
                  onChange={(e) => setCoOwnerEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-colors"
              >
                เพิ่ม
              </button>
            </div>
            <span className="text-xs text-slate-500 block mt-1.5">
              *เจ้าของร่วมต้องสมัครสมาชิกในระบบก่อนจึงจะเพิ่มได้
            </span>
          </form>

          {/* Existing Owners List */}
          <div>
            <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>รายชื่อผู้มีสิทธิ์ดูแลหอพักนี้ ({coOwnerList.length} คน)</span>
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {coOwnerList.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <span>{item.owner.name}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          item.role === 'PRIMARY_OWNER'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.role === 'PRIMARY_OWNER' ? 'เจ้าของหลัก' : 'เจ้าของร่วม'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">{item.owner.email}</span>
                  </div>

                  {item.role !== 'PRIMARY_OWNER' && (
                    <button
                      onClick={() => handleRemoveCoOwner(item.owner.id, item.owner.name)}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      นำออก
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Apartment Modal */}
      <CreateApartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
