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
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await api.patch(`/meters/${readingId}/status`, { status: nextStatus });
      await fetchMonthlyData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะการชำระเงิน');
    }
  };

  const handleOpenBill = (reading: MeterReading) => {
    setActiveBillReading(reading);
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
                ส่วนกลาง: {selectedApartment.commonFee} บ./ห้อง
              </span>
            ) : null}
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
          <p className="text-sm text-slate-500 mt-1">ค่าเช่า + ค่าน้ำ + ค่าไฟ</p>
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
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              รายการห้องพักประจำรอบบิล ({report?.items?.length || 0} ห้อง)
            </h3>
            <p className="text-base text-slate-500">
              แสดงสถานะค่าเช่า ค่าน้ำ ค่าไฟ และยอดรวมที่ต้องชำระ
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base sm:text-lg">
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
                        {/*<div className="text-sm sm:text-base text-slate-500">*/}
                        {/*  {room.tenantName ? `ผู้เช่า: ${room.tenantName}` : 'ห้องว่าง (ยังไม่มีผู้เช่า)'}*/}
                        {/*</div>*/}
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
                          `฿${reading.totalAmount.toLocaleString('th-TH')}`
                        ) : (
                          <span className="text-slate-400 text-base font-normal">-</span>
                        )}
                      </td>

                      {/* Payment Status Toggle */}
                      <td className="py-4 px-5 text-center">
                        {isRecorded ? (
                          <button
                            onClick={() => handleToggleStatus(reading.id, reading.status)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold transition-all ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="คลิกเพื่อสลับสถานะการชำระเงิน"
                          >
                            {isPaid ? (
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
                            onClick={() => handleOpenBill(reading)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-base transition-colors"
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
        apartmentName={selectedApartment.name}
        apartmentNickname={selectedApartment.nickname}
      />
    </div>
  );
};
