import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Zap,
  Droplets,
  CheckCircle,
  Save,
  Calendar,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileText,
} from 'lucide-react';
import { useApartment } from '../contexts/ApartmentContext.js';
import api from '../services/api.js';
import type { MeterReading } from '../types/index.js';
import { MeterReadingSkeleton } from '../components/Skeleton.js';
import { BillModal } from '../components/BillModal.js';

interface RoomReadingState {
  roomId: string;
  roomNumber: string;
  floor: number | null;
  basePrice: number;
  tenantName: string | null;
  tenantPhone: string | null;
  previousElectricity: string;
  currentElectricity: string;
  electricityRate: number;
  previousWater: string;
  currentWater: string;
  waterRate: number;
  waterBillingType: 'PER_UNIT' | 'FLAT_RATE';
  flatWaterRate: number;
  commonFee: number;
  trashFee: number;
  otherFees: number;
  otherFeesNote: string;
  slipNote: string;
  isSaved: boolean;
  isSaving: boolean;
  error?: string | null;
  lastReadingId?: string;
  lastReading?: MeterReading | null;
}

export const MeterReadingPage: React.FC = () => {
  const { selectedApartment, isLoading: isApartmentLoading } = useApartment();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return (
      searchParams.get('month') ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })()
    );
  });

  const [roomStates, setRoomStates] = useState<RoomReadingState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFeesRoomIds, setExpandedFeesRoomIds] = useState<Record<string, boolean>>({});

  // Bill modal for instant preview
  const [activeBillReading, setActiveBillReading] = useState<MeterReading | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Load rooms and previous/current readings
  const loadData = async () => {
    if (!selectedApartment) return;
    setIsLoading(true);
    setGlobalMessage(null);

    try {
      // Get current month report with baseline data computed by server
      const monthlyRes = await api.get(
        `/meters/apartment/${selectedApartment.id}?month=${selectedMonth}`,
      );
      const monthlyItems: { room: any; reading: MeterReading | null }[] = monthlyRes.data.items;

      const states: RoomReadingState[] = [];

      for (const item of monthlyItems) {
        const r = item.room;
        const existingReading = item.reading;

        const electricityRate =
          r.customElectricityRate ?? selectedApartment.defaultElectricityRate ?? 7.0;
        const waterRate =
          r.customWaterRate ?? selectedApartment.defaultWaterRate ?? 18.0;
        const waterBillingType = selectedApartment.waterBillingType || 'PER_UNIT';
        const flatWaterRate = selectedApartment.flatWaterRate ?? 100;
        const defaultCommonFee = selectedApartment.commonFee ?? 0;
        const defaultTrashFee = selectedApartment.trashFee ?? 0;
        const defaultOtherFee = selectedApartment.defaultOtherFee ?? 0;
        const defaultOtherFeeNote = selectedApartment.defaultOtherFeeNote ?? '';
        const defaultRemarkTemplate = selectedApartment.remarkTemplate ?? '';

        // Baseline numbers from previous record or room initial meter setting
        const baselineElec = String(r.baselineElectricity ?? r.initialElectricity ?? 0);
        const baselineWater = String(r.baselineWater ?? r.initialWater ?? 0);

        if (existingReading) {
          states.push({
            roomId: r.id,
            roomNumber: r.roomNumber,
            floor: r.floor ?? 1,
            basePrice: existingReading.baseRentPrice ?? r.basePrice,
            tenantName: r.tenantName ?? null,
            tenantPhone: r.tenantPhone ?? null,
            previousElectricity: String(existingReading.previousElectricity),
            currentElectricity: String(existingReading.currentElectricity),
            electricityRate: existingReading.electricityRate ?? electricityRate,
            previousWater: String(existingReading.previousWater),
            currentWater: String(existingReading.currentWater),
            waterRate: existingReading.waterRate ?? waterRate,
            waterBillingType,
            flatWaterRate,
            commonFee: (existingReading.commonFee && existingReading.commonFee > 0) ? existingReading.commonFee : defaultCommonFee,
            trashFee: (existingReading.trashFee && existingReading.trashFee > 0) ? existingReading.trashFee : defaultTrashFee,
            otherFees: (existingReading.otherFees && existingReading.otherFees > 0) ? existingReading.otherFees : defaultOtherFee,
            otherFeesNote: existingReading.otherFeesNote || defaultOtherFeeNote,
            slipNote: existingReading.note || defaultRemarkTemplate,
            isSaved: true,
            isSaving: false,
            lastReadingId: existingReading.id,
            lastReading: existingReading,
          });
        } else {
          states.push({
            roomId: r.id,
            roomNumber: r.roomNumber,
            floor: r.floor ?? 1,
            basePrice: r.basePrice,
            tenantName: r.tenantName ?? null,
            tenantPhone: r.tenantPhone ?? null,
            previousElectricity: baselineElec,
            currentElectricity: '', // Let user put only the new number!
            electricityRate,
            previousWater: baselineWater,
            currentWater: '', // Let user put only the new number!
            waterRate,
            waterBillingType,
            flatWaterRate,
            commonFee: defaultCommonFee,
            trashFee: defaultTrashFee,
            otherFees: defaultOtherFee,
            otherFeesNote: defaultOtherFeeNote,
            slipNote: defaultRemarkTemplate,
            isSaved: false,
            isSaving: false,
          });
        }
      }

      setRoomStates(states);
    } catch (err) {
      console.error('Error loading meter data:', err);
      setGlobalMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลห้องพักและมิเตอร์ได้' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedApartment?.id, selectedMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    setSearchParams({ month: newMonth });
  };

  const handleInputChange = (
    roomId: string,
    field: keyof RoomReadingState,
    value: any,
  ) => {
    setRoomStates((prev) =>
      prev.map((item) => {
        if (item.roomId !== roomId) return item;
        return {
          ...item,
          [field]: value,
          isSaved: false,
          error: null,
        };
      }),
    );
  };

  const toggleFeesExpanded = (roomId: string) => {
    setExpandedFeesRoomIds((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  // Calculation helpers
  const calculateRoom = (state: RoomReadingState) => {
    const prevE = parseFloat(state.previousElectricity) || 0;
    const currE = parseFloat(state.currentElectricity);
    const hasCurrE = !isNaN(currE);
    const eUnits = hasCurrE && currE >= prevE ? Math.round((currE - prevE) * 100) / 100 : 0;
    const eCost = Math.round(eUnits * state.electricityRate * 100) / 100;

    const prevW = parseFloat(state.previousWater) || 0;
    const currW = parseFloat(state.currentWater);
    const hasCurrW = !isNaN(currW);
    const wUnits = hasCurrW && currW >= prevW ? Math.round((currW - prevW) * 100) / 100 : 0;

    let wCost = 0;
    if (state.waterBillingType === 'FLAT_RATE') {
      wCost = state.flatWaterRate;
    } else {
      wCost = Math.round(wUnits * state.waterRate * 100) / 100;
    }

    const basePrice = parseFloat(String(state.basePrice)) || 0;
    const commonFee = Number(state.commonFee) || 0;
    const trashFee = Number(state.trashFee) || 0;
    const otherFees = Number(state.otherFees) || 0;
    const total = Math.round((basePrice + eCost + wCost + commonFee + trashFee + otherFees) * 100) / 100;

    return { eUnits, eCost, wUnits, wCost, basePrice, commonFee, trashFee, otherFees, total, hasCurrE, hasCurrW };
  };

  // Single room save
  const handleSaveSingleRoom = async (roomId: string) => {
    const state = roomStates.find((r) => r.roomId === roomId);
    if (!state) return;

    // Syntax validation
    const prevE = parseFloat(state.previousElectricity) || 0;
    const currE = parseFloat(state.currentElectricity);
    const prevW = parseFloat(state.previousWater) || 0;
    const currW = parseFloat(state.currentWater);
    const baseP = parseFloat(String(state.basePrice));

    if (isNaN(currE) || currE < 0) {
      setRoomError(roomId, 'กรุณากรอกเลขมิเตอร์ไฟใหม่ให้ถูกต้อง');
      return;
    }
    if (currE < prevE) {
      setRoomError(roomId, `เลขมิเตอร์ไฟใหม่ (${currE}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${prevE})`);
      return;
    }

    if (isNaN(currW) || currW < 0) {
      setRoomError(roomId, 'กรุณากรอกเลขมิเตอร์น้ำใหม่ให้ถูกต้อง');
      return;
    }
    if (currW < prevW) {
      setRoomError(roomId, `เลขมิเตอร์น้ำใหม่ (${currW}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${prevW})`);
      return;
    }

    if (isNaN(baseP) || baseP < 0) {
      setRoomError(roomId, 'ราคาค่าเช่าห้องต้องไม่ติดลบ');
      return;
    }

    // Set saving
    setRoomStates((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, isSaving: true, error: null } : r)),
    );

    try {
      const res = await api.post('/meters', {
        roomId: state.roomId,
        billingMonth: selectedMonth,
        previousElectricity: prevE,
        currentElectricity: currE,
        electricityRate: state.electricityRate,
        previousWater: prevW,
        currentWater: currW,
        waterRate: state.waterRate,
        baseRentPrice: baseP,
        commonFee: Number(state.commonFee) || 0,
        trashFee: Number(state.trashFee) || 0,
        otherFees: Number(state.otherFees) || 0,
        otherFeesNote: state.otherFeesNote.trim() || undefined,
        note: state.slipNote.trim() || undefined,
      });

      setRoomStates((prev) =>
        prev.map((r) =>
          r.roomId === roomId
            ? {
                ...r,
                isSaving: false,
                isSaved: true,
                lastReadingId: res.data.id,
                lastReading: res.data,
                error: null,
              }
            : r,
        ),
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกมิเตอร์';
      setRoomError(roomId, msg);
    }
  };

  const setRoomError = (roomId: string, error: string) => {
    setRoomStates((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, isSaving: false, error } : r)),
    );
  };

  // Save all rooms batch
  const handleSaveAll = async () => {
    if (!selectedApartment) return;

    // Validate that rooms have inputs
    const unenteredRooms = roomStates.filter(
      (r) => r.currentElectricity.trim() === '' || r.currentWater.trim() === '',
    );
    if (unenteredRooms.length > 0) {
      setGlobalMessage({
        type: 'error',
        text: `กรุณากรอกเลขมิเตอร์ใหม่ให้ครบทุกห้อง (ห้องที่ยังไม่ได้กรอก: ${unenteredRooms.map((r) => r.roomNumber).join(', ')})`,
      });
      return;
    }

    // Validate all rooms
    for (const r of roomStates) {
      const prevE = parseFloat(r.previousElectricity) || 0;
      const currE = parseFloat(r.currentElectricity);
      const prevW = parseFloat(r.previousWater) || 0;
      const currW = parseFloat(r.currentWater);
      if (currE < prevE) {
        setGlobalMessage({
          type: 'error',
          text: `ห้อง ${r.roomNumber}: เลขมิเตอร์ไฟใหม่ (${currE}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${prevE})`,
        });
        return;
      }
      if (currW < prevW) {
        setGlobalMessage({
          type: 'error',
          text: `ห้อง ${r.roomNumber}: เลขมิเตอร์น้ำใหม่ (${currW}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${prevW})`,
        });
        return;
      }
    }

    setIsLoading(true);
    setGlobalMessage(null);

    try {
      const batchPayload = {
        apartmentId: selectedApartment.id,
        billingMonth: selectedMonth,
        readings: roomStates.map((r) => ({
          roomId: r.roomId,
          previousElectricity: parseFloat(r.previousElectricity) || 0,
          currentElectricity: parseFloat(r.currentElectricity) || 0,
          previousWater: parseFloat(r.previousWater) || 0,
          currentWater: parseFloat(r.currentWater) || 0,
          baseRentPrice: parseFloat(String(r.basePrice)) || 0,
          commonFee: Number(r.commonFee) || 0,
          trashFee: Number(r.trashFee) || 0,
          otherFees: Number(r.otherFees) || 0,
          otherFeesNote: r.otherFeesNote.trim() || undefined,
          note: r.slipNote.trim() || undefined,
        })),
      };

      await api.post('/meters/batch', batchPayload);
      setGlobalMessage({ type: 'success', text: `บันทึกมิเตอร์ทุกห้องประจำเดือน ${selectedMonth} สำเร็จเรียบร้อย!` });
      await loadData();
    } catch (err: any) {
      setGlobalMessage({
        type: 'error',
        text: err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลแบบกลุ่ม',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSlip = (state: RoomReadingState) => {
    if (!state.lastReading) return;
    setActiveBillReading({
      ...state.lastReading,
      commonFee: (state.lastReading.commonFee && state.lastReading.commonFee > 0) ? state.lastReading.commonFee : (Number(state.commonFee) || selectedApartment?.commonFee || 0),
      trashFee: (state.lastReading.trashFee && state.lastReading.trashFee > 0) ? state.lastReading.trashFee : (Number(state.trashFee) || selectedApartment?.trashFee || 0),
      otherFees: state.lastReading.otherFees ?? (Number(state.otherFees) || 0),
      otherFeesNote: state.lastReading.otherFeesNote || state.otherFeesNote || selectedApartment?.defaultOtherFeeNote || '',
      note: state.lastReading.note || state.slipNote || selectedApartment?.remarkTemplate || '',
      room: {
        id: state.roomId,
        roomNumber: state.roomNumber,
        floor: state.floor,
        basePrice: state.basePrice,
        tenantName: state.tenantName,
        tenantPhone: state.tenantPhone,
        apartmentId: selectedApartment?.id || '',
        status: 'OCCUPIED',
        apartment: selectedApartment || undefined,
      },
    });
    setIsBillModalOpen(true);
  };

  if ((isApartmentLoading && !selectedApartment) || (isLoading && roomStates.length === 0)) {
    return <MeterReadingSkeleton />;
  }

  if (!selectedApartment) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-slate-600">กรุณาเลือกหอพักก่อนจดมิเตอร์</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Month Controller */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              จดมิเตอร์น้ำ - ไฟฟ้า
            </h2>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-base font-bold flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-600" /> จดมิเตอร์
            </span>
          </div>
          <p className="text-base text-slate-600 mt-1">
            หอพัก: <strong className="text-slate-900">{selectedApartment.name}</strong>
            {selectedApartment.nickname ? ` (${selectedApartment.nickname})` : ''} — กรอกเลขมิเตอร์ใหม่ พร้อมกำหนดค่าขยะ ส่วนกลาง ค่าอื่นๆ และหมายเหตุบนสลิปได้
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-2 text-sm sm:text-base text-slate-600">
            <span>⚡ ไฟ: <strong>{selectedApartment.defaultElectricityRate} บ./หน่วย</strong></span>
            <span>•</span>
            <span>💧 น้ำ: <strong>{selectedApartment.waterBillingType === 'FLAT_RATE' ? `เหมาจ่าย ${selectedApartment.flatWaterRate} บ./ด.` : `${selectedApartment.defaultWaterRate} บ./หน่วย`}</strong></span>
            {selectedApartment.commonFee ? (
              <>
                <span>•</span>
                <span>ส่วนกลาง: <strong>{selectedApartment.commonFee} บ.</strong></span>
              </>
            ) : null}
            {selectedApartment.trashFee ? (
              <>
                <span>•</span>
                <span>ขยะ: <strong>{selectedApartment.trashFee} บ.</strong></span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-50 p-2 sm:p-3 rounded-2xl border border-slate-200">
            <Calendar className="w-5 h-5 text-indigo-600 ml-1 shrink-0" />
            <span className="text-base font-bold text-slate-700 shrink-0">รอบบิล:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="flex-1 sm:flex-none min-w-0 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <button
            onClick={handleSaveAll}
            disabled={isLoading || roomStates.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>บันทึกทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {globalMessage && (
        <div
          className={`p-4 rounded-2xl border font-bold text-base sm:text-lg flex items-center gap-2 ${
            globalMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {globalMessage.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
          )}
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* Instructions for landlord */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-base flex items-start gap-3">
        <Zap className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-lg font-bold">✨ สะดวกขึ้น: กรอกเฉพาะ "เลขมิเตอร์ใหม่" ของเดือนนี้!</strong>
          ระบบจะดึงเลขครั้งก่อนมาคำนวณให้อัตโนมัติ พร้อมดึงเทมเพลตค่าขยะ ส่วนกลาง ค่าอื่นๆ และหมายเหตุบนสลิปของหอพักมาให้ และสามารถปรับแก้รายห้องได้ทันที
        </div>
      </div>

      {/* Room Meter Cards */}
      {roomStates.length > 0 ? (
        <div className="space-y-4">
          {roomStates.map((state) => {
            const { eUnits, eCost, wUnits, wCost, basePrice, commonFee, trashFee, otherFees, total } =
              calculateRoom(state);
            const isFeesExpanded = expandedFeesRoomIds[state.roomId] || false;

            return (
              <div
                key={state.roomId}
                className={`bg-white rounded-3xl p-5 sm:p-7 border-2 transition-all ${
                  state.isSaved
                    ? 'border-emerald-300 shadow-xs'
                    : 'border-slate-200 shadow-md'
                }`}
              >
                {/* Room Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                      {state.roomNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          ห้อง {state.roomNumber}
                        </span>
                        {state.floor && (
                          <span className="text-sm font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg">
                            ชั้น {state.floor}
                          </span>
                        )}
                        {state.isSaved && (
                          <span className="inline-flex items-center gap-1 text-sm font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                            <Check className="w-4 h-4 text-emerald-600" /> บันทึกแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-slate-500">
                        ผู้เช่า: <strong className="text-slate-700">{state.tenantName || 'ห้องว่าง'}</strong> | ค่าเช่าห้องฐาน:{' '}
                        <strong className="text-indigo-600">฿{basePrice.toLocaleString('th-TH')}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions: View Slip & Single Save Button */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {state.isSaved && state.lastReading && (
                      <button
                        type="button"
                        onClick={() => handleOpenSlip(state)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-base font-bold transition-all shadow-xs"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>ดูสลิปบิล</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveSingleRoom(state.roomId)}
                      disabled={state.isSaving}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-bold transition-all shadow-xs ${
                        state.isSaved
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {state.isSaving ? (
                        <span>กำลังบันทึก...</span>
                      ) : state.isSaved ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-600" />
                          <span>บันทึกแล้ว (อัปเดต)</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>บันทึกห้องนี้</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message for room */}
                {state.error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-base flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Inputs Grid: Electricity & Water */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* Electricity Meter Card */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-lg">
                        <Zap className="w-5 h-5 text-amber-600" />
                        <span>มิเตอร์ไฟฟ้า</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                        {state.electricityRate} บ./หน่วย
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                      {/* Previous number from database (Read-only reference) */}
                      <div>
                        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          เลขครั้งก่อน (ในระบบ)
                        </span>
                        <div className="bg-slate-100/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-lg font-bold text-slate-600 flex items-center justify-between">
                          <span>{state.previousElectricity}</span>
                          <span className="text-xs text-slate-600">หน่วย</span>
                        </div>
                      </div>

                      {/* Current number input */}
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-slate-900 mb-1">
                          เลขจดใหม่ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={state.previousElectricity}
                          placeholder={`≥ ${state.previousElectricity}`}
                          value={state.currentElectricity}
                          onChange={(e) =>
                            handleInputChange(state.roomId, 'currentElectricity', e.target.value)
                          }
                          className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2 text-lg sm:text-xl font-extrabold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>

                    {/* Calculated units & cost */}
                    <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between text-base">
                      <span className="font-medium text-amber-900">
                        ใช้ไป: <strong className="text-lg font-bold text-amber-700">{eUnits}</strong> หน่วย
                      </span>
                      <span className="font-extrabold text-amber-900 text-lg">
                        = ฿{eCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Water Meter Card */}
                  <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sky-900 font-bold text-lg">
                        <Droplets className="w-5 h-5 text-sky-600" />
                        <span>มิเตอร์น้ำประปา</span>
                      </div>
                      <span className="text-sm font-semibold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg">
                        {state.waterBillingType === 'FLAT_RATE'
                          ? `เหมาจ่าย ${state.flatWaterRate} บ.`
                          : `${state.waterRate} บ./หน่วย`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                      {/* Previous number from database (Read-only reference) */}
                      <div>
                        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          เลขครั้งก่อน (ในระบบ)
                        </span>
                        <div className="bg-slate-100/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-lg font-bold text-slate-600 flex items-center justify-between">
                          <span>{state.previousWater}</span>
                          <span className="text-xs text-slate-600">หน่วย</span>
                        </div>
                      </div>

                      {/* Current number input */}
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-slate-900 mb-1">
                          เลขจดใหม่ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={state.previousWater}
                          placeholder={`≥ ${state.previousWater}`}
                          value={state.currentWater}
                          onChange={(e) =>
                            handleInputChange(state.roomId, 'currentWater', e.target.value)
                          }
                          className="w-full bg-white border-2 border-sky-400 rounded-xl px-3 py-2 text-lg sm:text-xl font-extrabold text-sky-950 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    </div>

                    {/* Calculated units & cost */}
                    <div className="mt-3 pt-3 border-t border-sky-200/80 flex items-center justify-between text-base">
                      <span className="font-medium text-sky-900">
                        {state.waterBillingType === 'FLAT_RATE' ? (
                          <span>เหมาจ่ายรายเดือน</span>
                        ) : (
                          <>
                            ใช้ไป: <strong className="text-lg font-bold text-sky-700">{wUnits}</strong> หน่วย
                          </>
                        )}
                      </span>
                      <span className="font-extrabold text-sky-900 text-lg">
                        = ฿{wCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Fees & Remarks Dropdown/Accordion */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleFeesExpanded(state.roomId)}
                    className="flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm sm:text-base transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>
                        ค่าขยะ, ส่วนกลาง, ค่าใช้จ่ายอื่นๆ และหมายเหตุบนสลิป
                      </span>
                      {(commonFee > 0 || trashFee > 0 || otherFees > 0 || state.slipNote) && (
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                          มีรายการเพิ่มเติม
                        </span>
                      )}
                    </div>
                    {isFeesExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {isFeesExpanded && (
                    <div className="mt-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
                      {/* Fees row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ค่าส่วนกลาง (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={state.commonFee}
                            onChange={(e) =>
                              handleInputChange(state.roomId, 'commonFee', Number(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ค่าขยะ (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={state.trashFee}
                            onChange={(e) =>
                              handleInputChange(state.roomId, 'trashFee', Number(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ค่าใช้จ่ายอื่นๆ (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={state.otherFees}
                            onChange={(e) =>
                              handleInputChange(state.roomId, 'otherFees', Number(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      {/* Remarks for other fees */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          หมายเหตุสำหรับค่าใช้จ่ายอื่นๆ (จะแสดงในรายการบิล)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ค่าที่จอดรถ, ค่าล้างแอร์, ค่าคีย์การ์ด"
                          value={state.otherFeesNote}
                          onChange={(e) =>
                            handleInputChange(state.roomId, 'otherFeesNote', e.target.value)
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      {/* Slip Remarks for room */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          หมายเหตุบนสลิปสำหรับห้องนี้ (Remarks on Slip)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="ข้อความหมายเหตุที่จะพิมพ์ลงบนสลิปของห้องนี้ เช่น ชำระเงินก่อนวันที่ 5"
                          value={state.slipNote}
                          onChange={(e) =>
                            handleInputChange(state.roomId, 'slipNote', e.target.value)
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          *ดึงมาจากเทมเพลตของหอพักเริ่มต้น สามารถพิมพ์เพิ่มเติมหรือแก้ไขเฉพาะห้องนี้ได้
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Summary Footer for Room */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 rounded-b-3xl">
                  <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base text-slate-700">
                    <span>
                      ห้อง: <strong>฿{basePrice.toLocaleString('th-TH')}</strong>
                    </span>
                    <span>+</span>
                    <span>
                      ไฟ: <strong>฿{eCost.toLocaleString('th-TH')}</strong>
                    </span>
                    <span>+</span>
                    <span>
                      น้ำ: <strong>฿{wCost.toLocaleString('th-TH')}</strong>
                    </span>
                    {commonFee > 0 && (
                      <>
                        <span>+</span>
                        <span>
                          ส่วนกลาง: <strong>฿{commonFee}</strong>
                        </span>
                      </>
                    )}
                    {trashFee > 0 && (
                      <>
                        <span>+</span>
                        <span>
                          ขยะ: <strong>฿{trashFee}</strong>
                        </span>
                      </>
                    )}
                    {otherFees > 0 && (
                      <>
                        <span>+</span>
                        <span>
                          อื่นๆ: <strong>฿{otherFees}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-slate-700">รวมบิล:</span>
                    <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                      ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <p className="text-xl text-slate-500">ยังไม่มีห้องพักในหอพักนี้</p>
        </div>
      )}

      {/* Bill Preview Modal */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        reading={activeBillReading}
        apartment={selectedApartment}
        apartmentName={selectedApartment.name}
        apartmentNickname={selectedApartment.nickname}
      />
    </div>
  );
};
