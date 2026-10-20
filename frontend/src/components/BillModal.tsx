import React, { useState } from 'react';
import {
  Printer,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  FileDown,
  Loader2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Modal } from './Modal.js';
import type { MeterReading, Room } from '../types/index.js';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: MeterReading | null;
  room?: (Partial<Room> & { apartment?: { name?: string; nickname?: string } }) | null;
  apartmentName?: string;
  apartmentNickname?: string | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  reading,
  room: propRoom,
  apartmentName,
  apartmentNickname: _apartmentNickname,
}) => {
  const [isExporting, setIsExporting] = useState<'image' | 'pdf' | null>(null);

  if (!reading) return null;

  const room = reading.room || propRoom;
  const isPaid = reading.status === 'PAID';

  const handlePrint = () => {
    document.body.classList.add('printing-bill');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-bill');
    }, 1000);
  };

  const generateBillDataUrl = async (): Promise<string> => {
    const billElement = document.getElementById('printable-bill');
    if (!billElement) throw new Error('ไม่พบข้อมูลเอกสารบิล');

    try {
      return await toPng(billElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
    } catch (err) {
      console.warn('html-to-image retry with font skipping:', err);
      return await toPng(billElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
    }
  };

  const handleSaveImage = async () => {
    if (isExporting) return;
    try {
      setIsExporting('image');
      const dataUrl = await generateBillDataUrl();
      const link = document.createElement('a');
      const roomNum = room?.roomNumber || reading.room?.roomNumber || 'room';
      link.download = `บิลค่าเช่า-ห้อง-${roomNum}-${reading.billingMonth}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(null);
    }
  };

  const handleSavePdf = async () => {
    if (isExporting) return;
    try {
      setIsExporting('pdf');
      const dataUrl = await generateBillDataUrl();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for PDF'));
      });

      // A4 dimensions: 210mm x 297mm
      const pageWidth = 210;
      const margin = 12;
      const printableWidth = pageWidth - margin * 2; // 186mm
      const imgHeight = (img.height * printableWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', margin, margin, printableWidth, imgHeight);
      const roomNum = room?.roomNumber || reading.room?.roomNumber || 'room';
      pdf.save(`บิลค่าเช่า-ห้อง-${roomNum}-${reading.billingMonth}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ใบแจ้งค่าเช่าและค่าสาธารณูปโภค"
      maxWidth="max-w-2xl"
    >
      {/* Printable / Exportable Bill Area */}
      <div
        id="printable-bill"
        className="bg-white rounded-xl p-2 sm:p-4 text-slate-800 print:p-0 print:text-black"
      >
        {/* Header */}
        <div className="text-center pb-5 border-b-2 border-dashed border-slate-200">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-950">
            {apartmentName ||
              room?.apartment?.name ||
              reading.room?.apartment?.name ||
              'หอพัก / อพาร์ตเมนต์'}
          </h2>
          <div className="inline-block mt-3 px-4 py-1.5 bg-slate-100 rounded-full text-base font-semibold text-slate-700">
            รอบบิลประจำเดือน: {reading.billingMonth}
          </div>
        </div>

        {/* Room & Tenant Info */}
        <div className="grid grid-cols-2 gap-4 my-5 bg-slate-50 p-4 rounded-xl text-base sm:text-lg">
          <div>
            <span className="text-slate-500 block text-sm sm:text-base">
              ห้องพัก
            </span>
            <span className="font-bold text-xl sm:text-2xl text-slate-900">
              {room?.roomNumber || reading.room?.roomNumber || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-sm sm:text-base">
              ผู้เช่า
            </span>
            <span className="font-semibold text-slate-900">
              {room?.tenantName || reading.room?.tenantName || 'ไม่ระบุชื่อ'}
            </span>
            {(room?.tenantPhone || reading.room?.tenantPhone) && (
              <span className="block text-sm text-slate-500">
                {room?.tenantPhone || reading.room?.tenantPhone}
              </span>
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
                <td className="py-3 px-4 font-medium text-slate-900">
                  ค่าเช่าห้องพัก
                </td>
                <td className="py-3 px-4 text-center text-slate-500">
                  1 เดือน
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  {reading.baseRentPrice.toLocaleString('th-TH')}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {reading.baseRentPrice.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
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
                  {reading.electricityCost.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
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
                  {reading.waterCost.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {/* ค่าใช้จ่ายอื่นๆ หรือค่าส่วนกลาง */}
              {reading.otherFees > 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td
                    className="py-3 px-4 font-medium text-slate-900"
                    colSpan={3}
                  >
                    {reading.otherFeesNote || 'ค่าส่วนกลาง / ค่าขยะ'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {reading.otherFees.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
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
                  ฿
                  {reading.totalAmount.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            {isPaid ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-3.5 py-1.5 rounded-full font-bold text-base">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                ชำระเงินเรียบร้อยแล้ว
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 px-3.5 py-1.5 rounded-full font-bold text-base">
                <Clock className="w-5 h-5 text-amber-600" />
                รอชำระเงิน
              </span>
            )}
          </div>
          <div className="text-right text-sm text-slate-500">
            วันที่บันทึก:{' '}
            {new Date(reading.readingDate).toLocaleDateString('th-TH')}
          </div>
        </div>
      </div>

      {/* Action Buttons (Excluded from printable bill) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-100">
        <button
          onClick={handlePrint}
          disabled={isExporting !== null}
          title="พิมพ์ผ่านเครื่องพิมพ์ (Print)"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์เอกสาร</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isExporting !== null}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-base transition-colors disabled:opacity-50 cursor-pointer"
          >
            ปิด
          </button>
          <button
            onClick={handleSaveImage}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-base shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting === 'image' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
            <span>บันทึกเป็นรูปภาพ</span>
          </button>
          <button
            onClick={handleSavePdf}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-base shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting === 'pdf' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileDown className="w-5 h-5" />
            )}
            <span>บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
