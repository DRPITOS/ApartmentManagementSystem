import React from 'react';
import { Printer, CheckCircle, Clock } from 'lucide-react';
import { Modal } from './Modal.js';
import type { MeterReading } from '../types/index.js';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: MeterReading | null;
  apartmentName?: string;
  apartmentNickname?: string | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  reading,
  apartmentName,
  apartmentNickname,
}) => {
  if (!reading) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = reading.status === 'PAID';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ใบแจ้งค่าเช่าและค่าสาธารณูปโภค" maxWidth="max-w-2xl">
      <div id="printable-bill" className="bg-white rounded-xl p-2 sm:p-4 text-slate-800">
        {/* Header */}
        <div className="text-center pb-5 border-b-2 border-dashed border-slate-200">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-950">
            {apartmentName || reading.room?.apartment?.name || 'หอพัก / อพาร์ตเมนต์'}
          </h2>
          {(apartmentNickname || reading.room?.apartment?.nickname) && (
            <p className="text-base sm:text-lg text-indigo-600 font-medium mt-1">
              ({apartmentNickname || reading.room?.apartment?.nickname})
            </p>
          )}
          <div className="inline-block mt-3 px-4 py-1.5 bg-slate-100 rounded-full text-base font-semibold text-slate-700">
            รอบบิลประจำเดือน: {reading.billingMonth}
          </div>
        </div>

        {/* Room & Tenant Info */}
        <div className="grid grid-cols-2 gap-4 my-5 bg-slate-50 p-4 rounded-xl text-base sm:text-lg">
          <div>
            <span className="text-slate-500 block text-sm sm:text-base">ห้องพัก</span>
            <span className="font-bold text-xl sm:text-2xl text-slate-900">
              ห้อง {reading.room?.roomNumber}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-sm sm:text-base">ผู้เช่า</span>
            <span className="font-semibold text-slate-900">
              {reading.room?.tenantName || 'ไม่ระบุชื่อ'}
            </span>
            {reading.room?.tenantPhone && (
              <span className="block text-sm text-slate-500">{reading.room.tenantPhone}</span>
            )}
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
          <table className="w-full text-left text-base sm:text-lg">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">รายการ</th>
                <th className="py-3 px-4 text-center">เลขมิเตอร์ / หน่วย</th>
                <th className="py-3 px-4 text-right">ราคา/หน่วย</th>
                <th className="py-3 px-4 text-right">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* ค่าเช่าห้อง */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-900">ค่าเช่าห้องพัก</td>
                <td className="py-3 px-4 text-center text-slate-500">1 เดือน</td>
                <td className="py-3 px-4 text-right text-slate-500">
                  {reading.baseRentPrice.toLocaleString('th-TH')}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {reading.baseRentPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* ค่าไฟฟ้า */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <span>⚡ ค่าไฟฟ้า</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {reading.previousElectricity} ➔ {reading.currentElectricity}
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">
                  {reading.electricityUnits} หน่วย
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  {reading.electricityRate} ฿
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {reading.electricityCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* ค่าน้ำประปา */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-1.5 text-sky-700">
                    <span>💧 ค่าน้ำประปา</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {reading.previousWater} ➔ {reading.currentWater}
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">
                  {reading.waterUnits} หน่วย
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  {reading.waterRate} ฿
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {reading.waterCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* ค่าใช้จ่ายอื่นๆ หรือค่าส่วนกลาง */}
              {reading.otherFees > 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-900" colSpan={3}>
                    {reading.otherFeesNote || 'ค่าส่วนกลาง / ค่าขยะ'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {reading.otherFees.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-indigo-50/80 font-bold border-t-2 border-indigo-200 text-indigo-950">
              <tr>
                <td className="py-4 px-4 text-lg sm:text-xl" colSpan={3}>
                  ยอดรวมที่ต้องชำระทั้งสิ้น
                </td>
                <td className="py-4 px-4 text-right text-xl sm:text-2xl text-indigo-700">
                  ฿{reading.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-6">
          <div className="flex items-center gap-2">
            {isPaid ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full font-bold text-base">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> ชำระเงินเรียบร้อยแล้ว
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 px-3.5 py-1.5 rounded-full font-bold text-base">
                <Clock className="w-5 h-5 text-amber-600" /> รอชำระเงิน
              </span>
            )}
          </div>
          <div className="text-right text-sm text-slate-500">
            วันที่บันทึก: {new Date(reading.readingDate).toLocaleDateString('th-TH')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base transition-colors"
          >
            ปิด
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-base shadow-sm transition-colors"
          >
            <Printer className="w-5 h-5" /> พิมพ์บิล / ส่งผู้เช่า
          </button>
        </div>
      </div>
    </Modal>
  );
};
