import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Droplets,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Calendar,
  RefreshCw,
  QrCode,
  Loader2,
} from 'lucide-react';
import { useApartment } from '../contexts/ApartmentContext.js';
import api from '../services/api.js';
import type { ApartmentMonthlyReport, MeterReading } from '../types/index.js';
import { BillModal } from '../components/BillModal.js';
import { DashboardSkeleton } from '../components/Skeleton.js';

export const DashboardPage: React.FC = () => {
  const { selectedApartment, isLoading: isApartmentLoading } = useApartment();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport] = useState<ApartmentMonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBillReading, setActiveBillReading] = useState<MeterReading | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [updatingReadingId, setUpdatingReadingId] = useState<string | null>(null);

  const fetchMonthlyData = async () => {
    if (!selectedApartment) return;
    setIsLoading(true);
    try {
      const res = await api.get(
        `/meters/apartment/${selectedApartment.id}?month=${selectedMonth}`,
      );
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load dashboard report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedApartment?.id, selectedMonth]);

  const handleToggleStatus = async (readingId: string, currentStatus: string) => {
    if (updatingReadingId) return;
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    setUpdatingReadingId(readingId);
    try {
      await api.patch(`/meters/${readingId}/status`, { status: nextStatus });
      await fetchMonthlyData();
      if (activeBillReading && activeBillReading.id === readingId) {
        setActiveBillReading((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะการชำระเงิน');
    } finally {
      setUpdatingReadingId(null);
    }
  };

  const handleOpenBill = (reading: MeterReading, room?: any) => {
    setActiveBillReading({
      ...reading,
      room: {
        ...(room || reading.room),
        apartment: selectedApartment,
      },
    });
    setIsBillModalOpen(true);
  };

  // Skeleton state on refresh or while initial data loads
  if ((isApartmentLoading && !selectedApartment) || (isLoading && !report)) {
    return <DashboardSkeleton />;
  }

  if (!selectedApartment) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-slate-600">กรุณาเลือกหอพักเพื่อดูข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Apartment Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {selectedApartment.name}
            </h2>
            {selectedApartment.nickname && (
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-base font-bold">
                {selectedApartment.nickname}
              </span>
            )}
          </div>
          <p className="text-base text-slate-500 mt-1">
            {selectedApartment.address || 'ไม่ได้ระบุที่อยู่'}
          </p>
          {/* Active rates badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 text-sm sm:text-base font-semibold border border-amber-200">
              <Zap className="w-4 h-4 text-amber-600" /> ค่าไฟ: {selectedApartment.defaultElectricityRate} บ./หน่วย
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 text-sky-800 text-sm sm:text-base font-semibold border border-sky-200">
              <Droplets className="w-4 h-4 text-sky-600" />
              {selectedApartment.waterBillingType === 'FLAT_RATE'
                ? `ค่าน้ำเหมา: ${selectedApartment.flatWaterRate} บ./เดือน`
                : `ค่าน้ำ: ${selectedApartment.defaultWaterRate} บ./หน่วย`}
            </span>
            {selectedApartment.commonFee ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-sm sm:text-base font-medium">
                ส่วนกลาง: {selectedApartment.commonFee} บ.
              </span>
            ) : null}
            {selectedApartment.trashFee ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-sm sm:text-base font-medium border border-emerald-200">
                ค่าขยะ: {selectedApartment.trashFee} บ.
              </span>
            ) : null}
            {selectedApartment.promptPayNumber && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-sm sm:text-base font-bold border border-indigo-200">
                <QrCode className="w-4 h-4 text-indigo-600" /> พร้อมเพย์: {selectedApartment.promptPayNumber}
              </span>
            )}
          </div>
        </div>

        {/* Month Selector */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-5 h-5 text-indigo-600 ml-1 shrink-0" />
            <span className="text-base font-bold text-slate-700 shrink-0">รอบบิล:</span>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 max-w-[170px] sm:max-w-none bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={fetchMonthlyData}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base sm:text-lg font-semibold text-slate-600">ยอดรวมประจำเดือน</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            ฿{(report?.totalRevenue || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-sm text-slate-500 mt-1">ค่าเช่า + ค่าน้ำ + ค่าไฟ + ค่าบริการ</p>
        </div>

        {/* Electricity Consumption */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base sm:text-lg font-semibold text-slate-600">ไฟฟ้ารวม</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">
            {(report?.totalElectricityUnits || 0).toLocaleString('th-TH')} <span className="text-lg font-bold text-slate-600">หน่วย</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">คิดเป็นค่าไฟรวมทุกห้อง</p>
        </div>

        {/* Water Consumption */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base sm:text-lg font-semibold text-slate-600">น้ำประปารวม</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-700">
            {(report?.totalWaterUnits || 0).toLocaleString('th-TH')} <span className="text-lg font-bold text-slate-600">หน่วย</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">คิดเป็นค่าน้ำรวมทุกห้อง</p>
        </div>

        {/* Paid / Unpaid Status */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base sm:text-lg font-semibold text-slate-600">สถานะการชำระ</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {report?.paidCount || 0}
            </span>
            <span className="text-base font-medium text-slate-400">/</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-600">
              {report?.unpaidCount || 0} ยังไม่จ่าย
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            จดมิเตอร์แล้ว {report?.recordedRooms || 0} จาก {report?.totalRooms || 0} ห้อง
          </p>
        </div>
      </div>

      {/* Quick Meter Action Callout */}
      <div className="bg-linear-to-r from-indigo-900 to-indigo-700 text-white rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-200/50">
        <div>
          <h3 className="text-xl sm:text-2xl font-black">
            📝 บันทึกมิเตอร์ประจำเดือน {selectedMonth}
          </h3>
          <p className="text-base sm:text-lg text-indigo-100 mt-1">
            เหลืออีก {report?.unrecordedRooms || 0} ห้องที่ยังไม่ได้จดมิเตอร์น้ำไฟรอบนี้
          </p>
        </div>
        <Link
          to={`/meters?month=${selectedMonth}`}
          className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-lg flex items-center justify-center gap-2 shadow-md transition-all hover:scale-102"
        >
          <Zap className="w-6 h-6 text-slate-950" />
          <span>เปิดหน้าจดมิเตอร์ทันที</span>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Room Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-7 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900">
              รายการห้องพักประจำรอบบิล ({report?.items?.length || 0} ห้อง)
            </h3>
            <p className="text-base text-slate-500">
              แสดงสถานะค่าเช่า ค่าน้ำ ค่าไฟ ค่าบริการ และยอดรวมที่ต้องชำระ
            </p>
          </div>
          <Link
            to="/rooms"
            className="text-base font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>จัดการห้องพักทั้งหมด</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {report?.items && report.items.length > 0 ? (
          <>
            {/* Mobile View: Stacked on new lines (< md screens) */}
            <div className="block md:hidden divide-y divide-slate-150">
              {report.items.map(({ room, reading }) => {
                const isRecorded = reading !== null;
                const isPaid = reading?.status === 'PAID';

                return (
                  <div key={room.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                    {/* Top Row: Room & Tenant on left, Status & Bill Button on right */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900 text-lg flex items-center gap-1.5">
                          <span>ห้อง {room.roomNumber}</span>
                          {room.floor && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              ชั้น {room.floor}
                            </span>
                          )}
                        </div>
                        {room.tenantName && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            ผู้เช่า: <span className="font-medium text-slate-700">{room.tenantName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Payment Status */}
                        {isRecorded ? (
                          <button
                            onClick={() => handleToggleStatus(reading.id, reading.status)}
                            disabled={updatingReadingId === reading.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              updatingReadingId === reading.id
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                            title="คลิกเพื่อสลับสถานะการชำระเงิน"
                          >
                            {updatingReadingId === reading.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ชำระแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>รอชำระ</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            รอบันทึก
                          </span>
                        )}

                        {/* View Bill */}
                        {isRecorded ? (
                          <button
                            onClick={() => handleOpenBill(reading, room)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>ดูบิล</span>
                          </button>
                        ) : (
                          <Link
                            to={`/meters?month=${selectedMonth}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
                          >
                            จดมิเตอร์
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Breakdown Details on New Line */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-500 block">ค่าเช่าห้อง</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ฿{room.basePrice.toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">⚡ ค่าไฟฟ้า</span>
                        {isRecorded ? (
                          <div>
                            <span className="font-bold text-amber-700 block">
                              {reading.electricityUnits} หน่วย
                            </span>
                            <span className="text-[11px] text-slate-500">
                              (฿{reading.electricityCost.toLocaleString('th-TH')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">ยังไม่จด</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block">💧 ค่าน้ำประปา</span>
                        {isRecorded ? (
                          <div>
                            <span className="font-bold text-sky-700 block">
                              {reading.waterUnits} หน่วย
                            </span>
                            <span className="text-[11px] text-slate-500">
                              (฿{reading.waterCost.toLocaleString('th-TH')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">ยังไม่จด</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Total Amount on New Line */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-500">
                        ยอดรวมสุทธิ:
                      </span>
                      <div className="text-right">
                        {isRecorded ? (
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-base font-black text-indigo-950">
                              ฿{reading.totalAmount.toLocaleString('th-TH')}
                            </span>
                            {(reading.commonFee > 0 || reading.trashFee > 0 || reading.otherFees > 0) && (
                              <span className="text-[10px] text-slate-400">
                                (รวมค่าบริการ)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm lg:text-base">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-4 px-5">ห้อง / ผู้เช่า</th>
                  <th className="py-4 px-5">ค่าเช่าห้อง</th>
                  <th className="py-4 px-5">ไฟฟ้า (หน่วย/บาท)</th>
                  <th className="py-4 px-5">น้ำประปา (หน่วย/บาท)</th>
                  <th className="py-4 px-5 text-right">ยอดรวมสุทธิ</th>
                  <th className="py-4 px-5 text-center">สถานะ</th>
                  <th className="py-4 px-5 text-center">ใบเสร็จ / บิล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.items.map(({ room, reading }) => {
                  const isRecorded = reading !== null;
                  const isPaid = reading?.status === 'PAID';

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Room & Tenant */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-lg">
                          ห้อง {room.roomNumber}
                        </div>
                        {room.tenantName && (
                          <div className="text-xs text-slate-500">
                            {room.tenantName}
                          </div>
                        )}
                      </td>

                      {/* Base Room Rent */}
                      <td className="py-4 px-5 font-semibold text-slate-800">
                        ฿{room.basePrice.toLocaleString('th-TH')}
                      </td>

                      {/* Electricity */}
                      <td className="py-4 px-5">
                        {isRecorded ? (
                          <div>
                            <span className="font-bold text-amber-700">
                              {reading.electricityUnits} หน่วย
                            </span>
                            <span className="text-sm text-slate-500 block">
                              (฿{reading.electricityCost.toLocaleString('th-TH')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-base italic">ยังไม่จดมิเตอร์</span>
                        )}
                      </td>

                      {/* Water */}
                      <td className="py-4 px-5">
                        {isRecorded ? (
                          <div>
                            <span className="font-bold text-sky-700">
                              {reading.waterUnits} หน่วย
                            </span>
                            <span className="text-sm text-slate-500 block">
                              (฿{reading.waterCost.toLocaleString('th-TH')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-base italic">ยังไม่จดมิเตอร์</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-5 text-right font-black text-slate-900 text-xl">
                        {isRecorded ? (
                          <div>
                            <div>฿{reading.totalAmount.toLocaleString('th-TH')}</div>
                            {(reading.commonFee > 0 || reading.trashFee > 0 || reading.otherFees > 0) && (
                              <div className="text-xs text-slate-400 font-normal">
                                รวมค่าบริการเพิ่มเติม
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-base font-normal">-</span>
                        )}
                      </td>

                      {/* Payment Status Toggle */}
                      <td className="py-4 px-5 text-center">
                        {isRecorded ? (
                          <button
                            onClick={() => handleToggleStatus(reading.id, reading.status)}
                            disabled={updatingReadingId === reading.id}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold transition-all cursor-pointer ${
                              updatingReadingId === reading.id
                                ? 'bg-slate-100 text-slate-700 border border-slate-300 shadow-xs cursor-wait'
                                : isPaid
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="คลิกเพื่อสลับสถานะการชำระเงิน"
                          >
                            {updatingReadingId === reading.id ? (
                              <span className="inline-flex items-center justify-center px-4 tracking-widest text-indigo-600 font-black text-xl leading-none">
                                <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
                                <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
                                <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
                              </span>
                            ) : isPaid ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span>ชำระแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-5 h-5 text-amber-600" />
                                <span>รอชำระ</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">รอบันทึก</span>
                        )}
                      </td>

                      {/* View Bill Action */}
                      <td className="py-4 px-5 text-center">
                        {isRecorded ? (
                          <button
                            onClick={() => handleOpenBill(reading, room)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-base transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>ดูบิล</span>
                          </button>
                        ) : (
                          <Link
                            to={`/meters?month=${selectedMonth}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-base transition-colors"
                          >
                            จดมิเตอร์
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">ยังไม่มีห้องพักในหอพักนี้</p>
            <Link
              to="/rooms"
              className="mt-3 inline-block font-bold text-indigo-600 hover:text-indigo-800 text-base"
            >
              + เพิ่มห้องพักแรกของคุณ
            </Link>
          </div>
        )}
      </div>

      {/* Bill Print Modal */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        reading={activeBillReading}
        apartment={selectedApartment}
        apartmentName={selectedApartment.name}
        apartmentNickname={selectedApartment.nickname}
        onToggleStatus={handleToggleStatus}
        isUpdatingStatus={activeBillReading ? updatingReadingId === activeBillReading.id : false}
      />
    </div>
  );
};
