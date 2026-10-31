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
  ChevronDown,
  ChevronUp,
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
  apartment?: Partial<Apartment> | null;
  apartmentName?: string;
  apartmentNickname?: string | null;
  onToggleStatus?: (readingId: string, currentStatus: string) => Promise<void>;
  isUpdatingStatus?: boolean;
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const formatThaiFullDate = (dateStr?: string | Date): string => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const d = isNaN(date.getTime()) ? new Date() : date;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

const formatThaiDueDate = (billingMonthStr?: string): string => {
  if (billingMonthStr && /^\d{4}-\d{2}$/.test(billingMonthStr)) {
    const [yStr, mStr] = billingMonthStr.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return `1 ${THAI_MONTHS[month - 1]} ${year + 543}`;
  }
  const now = new Date();
  let m = now.getMonth() + 1;
  let y = now.getFullYear();
  if (m > 11) {
    m = 0;
    y += 1;
  }
  return `1 ${THAI_MONTHS[m]} ${y + 543}`;
};

const formatSlipFileName = (
  billingMonthStr: string | undefined,
  roomNumber: string | number,
  ext: 'png' | 'pdf'
): string => {
  let monthName = 'Bill';
  let yearStr = new Date().getFullYear().toString();

  if (billingMonthStr && /^\d{4}-\d{2}$/.test(billingMonthStr)) {
    const [y, m] = billingMonthStr.split('-');
    const mIndex = parseInt(m, 10) - 1;
    if (mIndex >= 0 && mIndex < 12) {
      monthName = ENGLISH_MONTHS[mIndex];
    }
    yearStr = y;
  }

  const cleanRoom = roomNumber ? `Room ${roomNumber}` : 'Room';
  return `${monthName} ${yearStr} ${cleanRoom}.${ext}`;
};

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  reading: initialReading,
  room: propRoom,
  apartment: propApartment,
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
  const apt = room?.apartment || propApartment;

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

  // Fallback calculation for commonFee and trashFee
  const defaultCommonFee = apt?.commonFee ?? 0;
  const defaultTrashFee = apt?.trashFee ?? 0;

  const effectiveCommonFee =
    reading?.commonFee !== undefined && reading?.commonFee !== null && Number(reading.commonFee) > 0
      ? Number(reading.commonFee)
      : Number(defaultCommonFee) || 0;

  const effectiveTrashFee =
    reading?.trashFee !== undefined && reading?.trashFee !== null && Number(reading.trashFee) > 0
      ? Number(reading.trashFee)
      : Number(defaultTrashFee) || 0;

  const effectiveOtherFees = Number(reading?.otherFees) || 0;
  const effectiveOtherFeesNote = reading?.otherFeesNote || apt?.defaultOtherFeeNote || '';

  const effectiveTotal = reading
    ? Number(reading.baseRentPrice || 0) +
      Number(reading.electricityCost || 0) +
      Number(reading.waterCost || 0) +
      effectiveCommonFee +
      effectiveTrashFee +
      effectiveOtherFees
    : 0;

  // Generate QR Code when reading or promptPayNumber changes
  useEffect(() => {
    let isCancelled = false;
    const loadQr = async () => {
      if (!promptPayNumber || !reading || effectiveTotal <= 0) {
        setQrDataUrl(null);
        return;
      }
      try {
        const url = await generatePromptPayQrDataUrl(promptPayNumber, effectiveTotal, 300);
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
  }, [promptPayNumber, reading, effectiveTotal]);

  if (!reading) return null;

  const isPaid = reading.status === 'PAID';
  const roomNum = room?.roomNumber || reading.room?.roomNumber || '-';

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

    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'fixed';
    exportContainer.style.left = '-9999px';
    exportContainer.style.top = '0';
    exportContainer.style.width = '740px';
    exportContainer.style.minWidth = '740px';
    exportContainer.style.maxWidth = '740px';
    exportContainer.style.zIndex = '-9999';
    exportContainer.style.backgroundColor = '#ffffff';

    const clone = billElement.cloneNode(true) as HTMLElement;
    clone.style.width = '740px';
    clone.style.minWidth = '740px';
    clone.style.maxWidth = '740px';
    clone.style.backgroundColor = '#ffffff';

    // Remove any interactive or no-print buttons in the clone
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

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
    if (isExporting || !reading) return;
    try {
      setIsExporting('image');
      const dataUrl = await generateBillDataUrl();
      const link = document.createElement('a');
      link.download = formatSlipFileName(reading.billingMonth, roomNum, 'png');
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
    if (isExporting || !reading) return;
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
      const margin = 10;
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
      pdf.save(formatSlipFileName(reading.billingMonth, roomNum, 'pdf'));
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(null);
    }
  };

  const displayNote = noteText || reading.note || apt?.remarkTemplate || '';
  const thaiReadingDate = formatThaiFullDate(reading.readingDate);
  const thaiDueDate = formatThaiDueDate(reading.billingMonth);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ใบเรียกเก็บเงิน - ห้อง ${roomNum}`}
      maxWidth="max-w-3xl"
    >
      {/* Outer Scroll Container for smaller screens */}
      <div className="overflow-x-auto pb-2">
        {/* Printable / Exportable Bill Area matching receipt_template.png */}
        <div
          id="printable-bill"
          className="bg-white border-[3px] border-[#1a56db] p-5 sm:p-7 text-slate-800 print:p-4 print:border-[3px] print:border-[#1a56db] select-text relative min-w-[650px] max-w-[740px] mx-auto"
        >
          <div className="flex">
            {/* Left Vertical Room Label */}
            <div className="w-10 sm:w-12 flex-shrink-0 flex items-center justify-center -ml-2 sm:-ml-3 select-none">
              <div
                className="transform -rotate-90 whitespace-nowrap text-xl sm:text-2xl font-black text-slate-900 tracking-wider"
                style={{ transformOrigin: 'center center' }}
              >
                ห้อง {roomNum}
              </div>
            </div>

            {/* Main Content Column */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Header: ใบเรียกเก็บเงิน + ห้อง X */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-4 sm:mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1e3a8a] underline underline-offset-4 tracking-wide">
                  ใบเรียกเก็บเงิน
                </h2>
                <div className="bg-[#dbeafe] px-6 sm:px-8 py-1 sm:py-1.5 rounded-xs text-lg sm:text-xl font-bold text-slate-900 border border-blue-200/60 shadow-2xs">
                  ห้อง {roomNum}
                </div>
              </div>

              {/* Date Row */}
              <div className="flex items-center justify-between text-sm sm:text-base font-semibold mb-3 sm:mb-4 px-1">
                <div className="flex items-center gap-6 sm:gap-10">
                  <span className="text-slate-800 font-medium">จดวันที่</span>
                  <span className="text-slate-900 font-bold">{thaiReadingDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#c2410c] font-bold">วันที่ต้องชำระ</span>
                  <span className="bg-[#fef08a] px-2.5 py-0.5 underline font-bold text-slate-900 border border-amber-300/80 rounded-xs">
                    {thaiDueDate}
                  </span>
                </div>
              </div>

              {/* Itemized Rows */}
              <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base px-1 my-2">
                {/* ค่าไฟ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-48 sm:w-56">
                    <span className="font-medium text-slate-800">ค่าไฟ</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {reading.electricityCost.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </span>
                  </div>
                  <div className="text-right text-slate-700 font-medium">
                    (เลขที่จด{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.currentElectricity}
                    </span>{' '}
                    จำนวน{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.electricityUnits}
                    </span>{' '}
                    หน่วย)
                  </div>
                </div>

                {/* ค่าน้ำ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-48 sm:w-56">
                    <span className="font-medium text-slate-800">ค่าน้ำ</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {reading.waterCost.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </span>
                  </div>
                  <div className="text-right text-slate-700 font-medium">
                    (เลขที่จด{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.currentWater}
                    </span>{' '}
                    จำนวน{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.waterUnits}
                    </span>{' '}
                    หน่วย)
                  </div>
                </div>

                {/* ค่าขยะ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-48 sm:w-56">
                    <span className="font-medium text-slate-800">ค่าขยะ</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {effectiveTrashFee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </span>
                  </div>
                  <div className="text-right text-slate-700 font-medium">
                    (ค่าไฟหน่วยละ{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.electricityRate}
                    </span>{' '}
                    บาท)
                  </div>
                </div>

                {/* ค่าเช่าห้อง */}
                {reading.baseRentPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-between w-48 sm:w-56">
                      <span className="font-medium text-slate-800">ค่าเช่าห้อง</span>
                      <span className="font-semibold text-slate-900 text-right">
                        {reading.baseRentPrice.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        บาท
                      </span>
                    </div>
                    <div className="text-right text-slate-700 font-medium">
                      (ค่าน้ำหน่วยละ{' '}
                      <span className="font-bold text-slate-900 mx-1">
                        {reading.waterRate}
                      </span>{' '}
                      บาท)
                    </div>
                  </div>
                )}

                {/* If no baseRentPrice, still show water rate */}
                {reading.baseRentPrice <= 0 && (
                  <div className="flex items-center justify-end">
                    <div className="text-right text-slate-700 font-medium">
                      (ค่าน้ำหน่วยละ{' '}
                      <span className="font-bold text-slate-900 mx-1">
                        {reading.waterRate}
                      </span>{' '}
                      บาท)
                    </div>
                  </div>
                )}

                {/* ค่าใช้จ่ายอื่นๆ / หมายเหตุพิเศษ (ตัวหนังสือสีแดงตาม template) */}
                {effectiveOtherFees > 0 && (
                  <div className="flex items-start justify-between text-red-600 font-semibold pt-1">
                    <div className="whitespace-pre-wrap leading-relaxed max-w-[340px]">
                      {effectiveOtherFeesNote || 'ค่าใช้จ่ายอื่นๆ'}
                    </div>
                    <div className="text-right font-bold">
                      {effectiveOtherFees.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </div>
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 px-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl font-bold text-emerald-800 whitespace-nowrap">
                    รวมยอดที่ต้องจ่าย
                  </span>
                  <span className="bg-[#fef08a] px-3 py-0.5 text-lg sm:text-2xl font-black text-slate-900 border border-amber-300 rounded-xs mx-1">
                    {effectiveTotal.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-800">
                    บาท
                  </span>
                </div>

                {effectiveCommonFee > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base font-semibold text-slate-800">
                    <span>ค่ารักษามิเตอร์น้ำ+ไฟ+ไฟส่วนกลาง</span>
                    <span className="font-bold text-slate-900 text-sm sm:text-lg">
                      {effectiveCommonFee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span>บาท</span>
                  </div>
                )}
              </div>

              {/* Bottom Section: PromptPay QR on the left + Bank Transfer / Remarks on the right */}
              <div className="flex items-start gap-4 sm:gap-6 mt-4 pt-3 border-t border-slate-200 px-1">
                {/* PromptPay Left Column */}
                <div className="w-36 sm:w-44 flex-shrink-0 flex flex-col items-center text-center">
                  {/* PromptPay Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 border border-slate-400 rounded-xs bg-white shadow-2xs mb-1.5">
                    <span className="text-[11px] font-black text-[#00264d] tracking-tight">Prompt</span>
                    <span className="text-[11px] font-black text-[#0072ce] tracking-tight">Pay</span>
                  </div>

                  {/* QR Code */}
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="PromptPay QR Code"
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                    />
                  ) : (
                    <div className="w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-400 p-2 text-center text-xs">
                      <QrCode className="w-8 h-8 text-slate-300 mb-1" />
                      <span>ไม่มี QR Code</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">(ระบุเลขพร้อมเพย์)</span>
                    </div>
                  )}

                  <div className="text-center mt-1">
                    <span className="text-[#059669] font-bold text-xs block">
                      สแกน QR เพื่อโอนเข้าบัญชี
                    </span>
                    <span className="text-slate-700 font-semibold text-xs block mt-0.5 truncate max-w-[170px]">
                      ชื่อ: {promptPayName || apt?.promptPayName || apartmentName || apt?.name || 'เจ้าของห้องพัก'}
                    </span>
                  </div>
                </div>

                {/* Bank Accounts & Remarks Right Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center text-xs sm:text-sm text-[#4a154b] font-medium leading-relaxed pt-2">
                  <div className="whitespace-pre-wrap font-sans">
                    {displayNote ? (
                      displayNote
                    ) : (
                      <>
                        <div>โอนเงินเข้าบัญชีตามข้อมูลที่ระบุ</div>
                        <div>แล้วนำหลักฐานการโอนส่งให้เจ้าของบ้านด้วยครับ</div>
                        <div>ชำระล่าช้าเกินกำหนดคิดค่าปรับเพิ่มวันละ 100 บาท</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Settings Bar (Excluded from Print/Save) */}
      <div className="no-print mt-4 space-y-3">
        {/* Status & Quick Settings Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            {onToggleStatus ? (
              <button
                type="button"
                onClick={() => onToggleStatus(reading.id, reading.status)}
                disabled={isUpdatingStatus}
                title="คลิกเพื่อสลับสถานะการชำระเงิน"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm transition-all cursor-pointer ${
                  isUpdatingStatus
                    ? 'bg-slate-200 text-slate-700 cursor-wait'
                    : isPaid
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {isUpdatingStatus ? (
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-black text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังอัปเดต...</span>
                  </span>
                ) : isPaid ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>ชำระเงินเรียบร้อยแล้ว</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>รอชำระเงิน</span>
                  </>
                )}
              </button>
            ) : isPaid ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                ชำระเงินเรียบร้อยแล้ว
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 px-3 py-1 rounded-full font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                รอชำระเงิน
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNote(!isEditingNote)}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingNote ? 'ปิดแก้ไขหมายเหตุ' : 'แก้ไขหมายเหตุ/บัญชี'}</span>
              {isEditingNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setIsSettingPromptPay(!isSettingPromptPay)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isSettingPromptPay ? 'ปิดตั้งค่าพร้อมเพย์' : 'ตั้งค่าพร้อมเพย์'}</span>
              {isSettingPromptPay ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Edit Note Drawer */}
        {isEditingNote && (
          <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                📝 แก้ไขหมายเหตุ / รายการบัญชีธนาคารบนสลิปของห้องนี้
              </span>
              <button
                type="button"
                onClick={() => setIsEditingNote(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="พิมพ์ข้อมูลบัญชีธนาคาร หรือหมายเหตุสำหรับสลิปห้องนี้..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-sans"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                *ข้อความนี้จะแสดงด้านขวาของ QR Code ในใบเรียกเก็บเงิน
              </span>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>บันทึกหมายเหตุ</span>
              </button>
            </div>
          </div>
        )}

        {/* Edit PromptPay Drawer */}
        {isSettingPromptPay && (
          <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                ⚙️ ตั้งค่าพร้อมเพย์ของหอพัก (PromptPay)
              </span>
              <button
                type="button"
                onClick={() => setIsSettingPromptPay(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  เบอร์มือถือ (10 หลัก) หรือ เลขบัตร ปชช./นิติบุคคล (13 หลัก)
                </label>
                <input
                  type="text"
                  value={promptPayNumber}
                  onChange={(e) => setPromptPayNumber(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  ชื่อบัญชีผู้รับเงิน (แสดงใต้ QR Code)
                </label>
                <input
                  type="text"
                  value={promptPayName}
                  onChange={(e) => setPromptPayName(e.target.value)}
                  placeholder="เช่น นาย วิทยา งามเหลือ"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {promptPayNumber ? `ฟอร์แมต: ${formatPromptPayDisplay(promptPayNumber)}` : '*ยังไม่ได้ระบุพร้อมเพย์'}
              </span>
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

      {/* Action Buttons (Excluded from printable bill) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-200">
        <button
          onClick={handlePrint}
          disabled={isExporting !== null}
          title="พิมพ์ผ่านเครื่องพิมพ์ (Print)"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์เอกสาร</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isExporting !== null}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            ปิด
          </button>
          <button
            onClick={handleSaveImage}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting === 'image' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>บันทึกเป็นรูปภาพ</span>
          </button>
          <button
            onClick={handleSavePdf}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
