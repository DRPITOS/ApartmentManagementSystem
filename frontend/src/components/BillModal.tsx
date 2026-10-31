import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  FileDown,
  Loader2,
  Edit3,
  QrCode,
  Save,
  X,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Modal } from './Modal.js';
import type { MeterReading, Room, Apartment } from '../types/index.js';
import api from '../services/api.js';
import { generatePromptPayQrDataUrl, formatPromptPayDisplay } from '../utils/promptpay.js';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: MeterReading | null;
  room?: (Partial<Room> & { apartment?: Partial<Apartment> }) | null;
  apartmentName?: string;
  apartmentNickname?: string | null;
  onToggleStatus?: (readingId: string, currentStatus: string) => Promise<void>;
  isUpdatingStatus?: boolean;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  reading: initialReading,
  room: propRoom,
  apartmentName,
  apartmentNickname: _apartmentNickname,
  onToggleStatus,
  isUpdatingStatus = false,
}) => {
  const [reading, setReading] = useState<MeterReading | null>(initialReading);
  const [isExporting, setIsExporting] = useState<'image' | 'pdf' | null>(null);

  // Remarks state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // PromptPay state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isSettingPromptPay, setIsSettingPromptPay] = useState(false);
  const [promptPayNumber, setPromptPayNumber] = useState('');
  const [promptPayName, setPromptPayName] = useState('');
  const [isSavingPromptPay, setIsSavingPromptPay] = useState(false);

  const room = reading?.room || propRoom;
  const apt = room?.apartment;

  // Sync initial reading
  useEffect(() => {
    setReading(initialReading);
    if (initialReading) {
      const defaultNote =
        initialReading.note !== undefined && initialReading.note !== null
          ? initialReading.note
          : initialReading.room?.apartment?.remarkTemplate || apt?.remarkTemplate || '';
      setNoteText(defaultNote);

      const aptPromptPay =
        initialReading.room?.apartment?.promptPayNumber ||
        apt?.promptPayNumber ||
        '';
      const aptPromptPayName =
        initialReading.room?.apartment?.promptPayName ||
        apt?.promptPayName ||
        '';
      setPromptPayNumber(aptPromptPay);
      setPromptPayName(aptPromptPayName);
    }
  }, [initialReading, apt?.remarkTemplate, apt?.promptPayNumber, apt?.promptPayName]);

  // Generate QR Code when reading or promptPayNumber changes
  useEffect(() => {
    let isCancelled = false;
    const loadQr = async () => {
      if (!promptPayNumber || !reading) {
        setQrDataUrl(null);
        return;
      }
      try {
        const url = await generatePromptPayQrDataUrl(promptPayNumber, reading.totalAmount, 300);
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate PromptPay QR:', err);
        if (!isCancelled) {
          setQrDataUrl(null);
        }
      }
    };

    loadQr();
    return () => {
      isCancelled = true;
    };
  }, [promptPayNumber, reading]);

  if (!reading) return null;

  const isPaid = reading.status === 'PAID';

  const handleSaveNote = async () => {
    if (!reading) return;
    setIsSavingNote(true);
    try {
      const res = await api.put(`/meters/${reading.id}`, {
        note: noteText.trim(),
      });
      setReading((prev) => (prev ? { ...prev, note: res.data.note } : null));
      setIsEditingNote(false);
    } catch (_err) {
      alert('ไม่สามารถบันทึกหมายเหตุได้');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSavePromptPay = async () => {
    const aptId = apt?.id || reading.room?.apartmentId;
    if (!aptId) {
      setIsSettingPromptPay(false);
      return;
    }
    setIsSavingPromptPay(true);
    try {
      await api.put(`/apartments/${aptId}`, {
        promptPayNumber: promptPayNumber.trim() || undefined,
        promptPayName: promptPayName.trim() || undefined,
      });
      setIsSettingPromptPay(false);
    } catch (_err) {
      alert('ไม่สามารถบันทึกข้อมูลพร้อมเพย์ได้');
    } finally {
      setIsSavingPromptPay(false);
    }
  };

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

    // Create an isolated standard-width container (700px) offscreen
    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'fixed';
    exportContainer.style.left = '-9999px';
    exportContainer.style.top = '0';
    exportContainer.style.width = '700px';
    exportContainer.style.minWidth = '700px';
    exportContainer.style.maxWidth = '700px';
    exportContainer.style.zIndex = '-9999';
    exportContainer.style.backgroundColor = '#ffffff';

    const clone = billElement.cloneNode(true) as HTMLElement;
    clone.style.width = '700px';
    clone.style.minWidth = '700px';
    clone.style.maxWidth = '700px';
    clone.style.padding = '28px';
    clone.style.borderRadius = '0';
    clone.style.boxShadow = 'none';
    clone.style.backgroundColor = '#ffffff';

    // Remove any interactive or no-print buttons in the clone
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // Ensure all tables and elements in clone expand to full standard width
    clone.querySelectorAll('.overflow-x-auto').forEach((el) => {
      (el as HTMLElement).style.overflow = 'visible';
    });

    exportContainer.appendChild(clone);
    document.body.appendChild(exportContainer);

    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      try {
        return await toPng(clone, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
      } catch (err) {
        console.warn('html-to-image retry with font skipping:', err);
        return await toPng(clone, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
        });
      }
    } finally {
      document.body.removeChild(exportContainer);
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const printableWidth = pageWidth - margin * 2;
      const rawHeight = (img.height * printableWidth) / img.width;

      const maxHeight = pageHeight - margin * 2;
      let finalWidth = printableWidth;
      let finalHeight = rawHeight;
      let posX = margin;
      let posY = margin;

      if (rawHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = (img.width * finalHeight) / img.height;
        posX = margin + (printableWidth - finalWidth) / 2;
      } else {
        posY = Math.max(margin, (pageHeight - finalHeight) / 2);
      }

      pdf.addImage(dataUrl, 'PNG', posX, posY, finalWidth, finalHeight);
      const roomNum = room?.roomNumber || reading.room?.roomNumber || 'room';
      pdf.save(`บิลค่าเช่า-ห้อง-${roomNum}-${reading.billingMonth}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(null);
    }
  };

  const displayNote = noteText || reading.note || apt?.remarkTemplate || '';

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
        className="bg-white rounded-xl p-2 sm:p-5 text-slate-800 print:p-0 print:text-black"
      >
        {/* Header */}
        <div className="text-center pb-4 border-b-2 border-dashed border-slate-200">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-indigo-950">
            {apartmentName ||
              apt?.name ||
              reading.room?.apartment?.name ||
              'หอพัก / อพาร์ตเมนต์'}
          </h2>
          <div className="inline-block mt-2 px-4 py-1 bg-slate-100 rounded-full text-sm sm:text-base font-semibold text-slate-700">
            รอบบิลประจำเดือน: {reading.billingMonth}
          </div>
        </div>

        {/* Room & Tenant Info */}
        <div className="grid grid-cols-2 gap-4 my-4 bg-slate-50 p-4 rounded-xl text-base sm:text-lg">
          <div>
            <span className="text-slate-500 block text-xs sm:text-sm">
              ห้องพัก
            </span>
            <span className="font-extrabold text-2xl sm:text-3xl text-indigo-950">
              {room?.roomNumber || reading.room?.roomNumber || '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs sm:text-sm">
              ผู้เช่า
            </span>
            <span className="font-bold text-slate-900 text-lg">
              {room?.tenantName || reading.room?.tenantName || 'ไม่ระบุชื่อ'}
            </span>
            {(room?.tenantPhone || reading.room?.tenantPhone) && (
              <span className="block text-xs sm:text-sm text-slate-500">
                โทร: {room?.tenantPhone || reading.room?.tenantPhone}
              </span>
            )}
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto mb-4">
          <table className="w-full text-left text-sm sm:text-base min-w-[480px]">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-3 sm:px-4">รายการ</th>
                <th className="py-3 px-3 sm:px-4 text-center">จำนวน / หน่วย</th>
                <th className="py-3 px-3 sm:px-4 text-right">ราคา/หน่วย</th>
                <th className="py-3 px-3 sm:px-4 text-right">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* ค่าเช่าห้อง */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900">
                  ค่าเช่าห้องพัก
                </td>
                <td className="py-3 px-3 sm:px-4 text-center text-slate-500">
                  1 เดือน
                </td>
                <td className="py-3 px-3 sm:px-4 text-right text-slate-500">
                  {reading.baseRentPrice.toLocaleString('th-TH')}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                  {reading.baseRentPrice.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {/* ค่าไฟฟ้า */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 sm:px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <span>⚡ ค่าไฟฟ้า</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    เลขมิเตอร์: {reading.previousElectricity} ➔ {reading.currentElectricity}
                  </div>
                </td>
                <td className="py-3 px-3 sm:px-4 text-center font-semibold text-slate-800">
                  {reading.electricityUnits} หน่วย
                </td>
                <td className="py-3 px-3 sm:px-4 text-right text-slate-500">
                  {reading.electricityRate} ฿
                </td>
                <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                  {reading.electricityCost.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {/* ค่าน้ำประปา */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 sm:px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-1.5 text-sky-800 font-bold">
                    <span>💧 ค่าน้ำประปา</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    เลขมิเตอร์: {reading.previousWater} ➔ {reading.currentWater}
                  </div>
                </td>
                <td className="py-3 px-3 sm:px-4 text-center font-semibold text-slate-800">
                  {reading.waterUnits} หน่วย
                </td>
                <td className="py-3 px-3 sm:px-4 text-right text-slate-500">
                  {reading.waterRate} ฿
                </td>
                <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                  {reading.waterCost.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {/* ค่าส่วนกลาง */}
              {reading.commonFee > 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 sm:px-4 font-medium text-slate-900">
                    ค่าส่วนกลาง
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-center text-slate-500">
                    1 เดือน
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-500">
                    {reading.commonFee.toLocaleString('th-TH')}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                    {reading.commonFee.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}

              {/* ค่าขยะ */}
              {reading.trashFee > 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 sm:px-4 font-medium text-slate-900">
                    ค่าขยะ
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-center text-slate-500">
                    1 เดือน
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right text-slate-500">
                    {reading.trashFee.toLocaleString('th-TH')}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                    {reading.trashFee.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}

              {/* ค่าใช้จ่ายอื่นๆ */}
              {reading.otherFees > 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td
                    className="py-3 px-3 sm:px-4 font-medium text-slate-900"
                    colSpan={3}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ค่าใช้จ่ายอื่นๆ</span>
                      {reading.otherFeesNote && (
                        <span className="text-slate-600 font-semibold">
                          ({reading.otherFeesNote})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900">
                    {reading.otherFees.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-indigo-50/90 font-bold border-t-2 border-indigo-200 text-indigo-950">
              <tr>
                <td className="py-3.5 px-3 sm:px-4 text-base sm:text-xl" colSpan={3}>
                  ยอดรวมที่ต้องชำระทั้งสิ้น
                </td>
                <td className="py-3.5 px-3 sm:px-4 text-right text-xl sm:text-2xl text-indigo-700">
                  ฿
                  {reading.totalAmount.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks and PromptPay Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {/* Slip Remarks Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                  <span>📌 หมายเหตุ (Remarks)</span>
                </span>

                {/* Edit remarks button (no-print) */}
                <div className="no-print">
                  {!isEditingNote ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไขหมายเหตุบนสลิปของห้องนี้"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={isSavingNote}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {isSavingNote ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>บันทึก</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteText(reading.note || '');
                          setIsEditingNote(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditingNote ? (
                <div className="no-print mt-1">
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="พิมพ์หมายเหตุสำหรับสลิปห้องนี้..."
                    className="w-full bg-white border border-indigo-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="text-xs text-slate-500 block mt-1">
                    *หมายเหตุนี้จะถูกบันทึกและแสดงบนสลิปของห้องนี้
                  </span>
                </div>
              ) : (
                <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {displayNote || (
                    <span className="text-slate-400 italic">ไม่มีหมายเหตุเพิ่มเติม</span>
                  )}
                </p>
              )}
            </div>

            <div className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-200/80">
              วันที่บันทึกบิล: {new Date(reading.readingDate).toLocaleDateString('th-TH')}
            </div>
          </div>

          {/* PromptPay QR Code Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center text-center">
            {promptPayNumber ? (
              <div className="w-full flex flex-col items-center">
                {/* PromptPay Brand Header */}
                <div className="w-full max-w-[240px] bg-[#00264d] text-white py-1 px-3 rounded-t-xl flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-sm tracking-wide">
                    PromptPay พร้อมเพย์
                  </span>
                </div>

                {/* QR Box */}
                <div className="bg-white p-3 border-2 border-[#00264d] rounded-b-xl shadow-xs flex flex-col items-center max-w-[240px] w-full">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="PromptPay QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center bg-slate-100 rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  )}

                  <div className="mt-2 text-center w-full">
                    <span className="text-xs font-bold text-slate-500 block">
                      สแกนจ่ายผ่านแอปธนาคาร
                    </span>
                    <span className="text-base font-extrabold text-[#00264d] block">
                      ฿{reading.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 block mt-0.5 truncate max-w-full">
                      {promptPayName || apartmentName || apt?.name}
                    </span>
                    <span className="text-xs text-slate-500 block font-mono">
                      {formatPromptPayDisplay(promptPayNumber)}
                    </span>
                  </div>
                </div>

                {/* Edit PromptPay (no-print) */}
                <div className="no-print mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingPromptPay(!isSettingPromptPay)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                  >
                    เปลี่ยนข้อมูลพร้อมเพย์
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 px-2">
                <QrCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <span className="font-bold text-slate-700 block text-base">
                  ยังไม่ได้ใส่ QR พร้อมเพย์
                </span>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                  ใส่เบอร์หรือเลขพร้อมเพย์เพื่อให้ระบบสร้าง QR Code สแกนจ่ายบนสลิปอัตโนมัติ
                </p>

                <div className="no-print mt-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingPromptPay(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>ใส่ QR พร้อมเพย์บนสลิป</span>
                  </button>
                </div>
              </div>
            )}

            {/* PromptPay Config Drawer (no-print) */}
            {isSettingPromptPay && (
              <div className="no-print w-full mt-3 p-3 bg-white border border-indigo-200 rounded-xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950">
                    ⚙️ ตั้งค่าพร้อมเพย์ของหอพัก
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSettingPromptPay(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    เบอร์มือถือ หรือ เลขบัตร ปชช.
                  </label>
                  <input
                    type="text"
                    value={promptPayNumber}
                    onChange={(e) => setPromptPayNumber(e.target.value)}
                    placeholder="เช่น 0812345678 หรือ 1234567890123"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    ชื่อบัญชีผู้รับเงิน (แสดงบนสลิป)
                  </label>
                  <input
                    type="text"
                    value={promptPayName}
                    onChange={(e) => setPromptPayName(e.target.value)}
                    placeholder="เช่น นาย สมศักดิ์ ใจดี"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSavePromptPay}
                    disabled={isSavingPromptPay}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {isSavingPromptPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>บันทึกพร้อมเพย์</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            {onToggleStatus ? (
              <button
                type="button"
                onClick={() => onToggleStatus(reading.id, reading.status)}
                disabled={isUpdatingStatus}
                title="คลิกเพื่อสลับสถานะการชำระเงิน"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-base transition-all cursor-pointer ${
                  isUpdatingStatus
                    ? 'bg-slate-200 text-slate-700 cursor-wait'
                    : isPaid
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {isUpdatingStatus ? (
                  <span className="inline-flex items-center justify-center px-4 tracking-widest text-indigo-600 font-black text-xl leading-none">
                    <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                ) : isPaid ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>ชำระเงินเรียบร้อยแล้ว</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span>รอชำระเงิน</span>
                  </>
                )}
              </button>
            ) : isPaid ? (
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
          <div className="text-right text-xs sm:text-sm text-slate-500">
            สถานะบิล: {isPaid ? 'จ่ายแล้ว' : 'รอชำระ'}
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
