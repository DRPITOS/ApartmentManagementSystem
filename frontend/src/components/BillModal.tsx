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
  Calendar,
  CreditCard,
  AlertCircle,
  Banknote,
  AlertTriangle,
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
  onReadingUpdated?: (updatedReading: MeterReading) => void;
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

const formatThaiMonthYear = (monthStr?: string): string => {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || '';
  const [y, m] = monthStr.split('-');
  const mIndex = parseInt(m, 10) - 1;
  const thMonth = THAI_MONTHS[mIndex] || monthStr;
  const thYear = parseInt(y, 10) + 543;
  return `${thMonth} ${thYear}`;
};

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

const BANK_SHORTCUTS = [
  'โอนเข้า ธ.กสิกรไทย',
  'โอนเข้า ธ.ไทยพาณิชย์',
  'โอนเข้า ธ.กรุงเทพ',
  'โอนเข้า ธ.กรุงไทย',
  'โอนเข้า พร้อมเพย์',
  'ชำระเงินสด',
];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  reading: initialReading,
  room: propRoom,
  apartment: propApartment,
  apartmentName,
  apartmentNickname: _apartmentNickname,
  onToggleStatus,
  onReadingUpdated,
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

  // Payment Status & Remarks state
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIALLY_PAID' | 'UNPAID'>('UNPAID');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentRemarkInput, setPaymentRemarkInput] = useState<string>('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Meter reading date state (default today, adjustable by user)
  const [readingDate, setReadingDate] = useState<string>(() => {
    if (initialReading?.readingDate) {
      try {
        return new Date(initialReading.readingDate).toISOString().split('T')[0];
      } catch {}
    }
    return new Date().toISOString().split('T')[0];
  });

  const room = reading?.room || propRoom;
  const apt = room?.apartment || propApartment;

  // Sync initial reading
  useEffect(() => {
    setReading(initialReading);
    if (initialReading) {
      if (initialReading.readingDate) {
        try {
          setReadingDate(new Date(initialReading.readingDate).toISOString().split('T')[0]);
        } catch {}
      } else {
        setReadingDate(new Date().toISOString().split('T')[0]);
      }
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

      const currentStatus = (initialReading.status as any) || 'UNPAID';
      setPaymentStatus(
        currentStatus === 'PARTIALLY_PAID'
          ? 'PARTIALLY_PAID'
          : currentStatus === 'PAID'
          ? 'PAID'
          : 'UNPAID'
      );
      setPaidAmountInput(
        initialReading.paidAmount !== null && initialReading.paidAmount !== undefined
          ? String(initialReading.paidAmount)
          : ''
      );
      setPaymentRemarkInput(initialReading.paymentRemark || '');
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
  const isPartiallyPaid = reading.status === 'PARTIALLY_PAID';
  const roomNum = room?.roomNumber || reading.room?.roomNumber || '-';

  const handleSaveNote = async () => {
    if (!reading) return;
    setIsSavingNote(true);
    try {
      const res = await api.put(`/meters/${reading.id}`, {
        note: noteText.trim(),
      });
      const updated = { ...reading, note: res.data.note };
      setReading(updated);
      onReadingUpdated?.(updated);
      setIsEditingNote(false);
    } catch (_err) {
      alert('ไม่สามารถบันทึกหมายเหตุได้');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleUpdateReadingDate = async (newDateStr: string) => {
    setReadingDate(newDateStr);
    if (!reading) return;
    try {
      await api.put(`/meters/${reading.id}`, {
        readingDate: newDateStr,
      });
      const updated = { ...reading, readingDate: new Date(newDateStr).toISOString() };
      setReading(updated);
      onReadingUpdated?.(updated);
    } catch (err) {
      console.error('Failed to update reading date:', err);
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

  const handleSavePaymentDetails = async () => {
    if (!reading) return;
    setIsSavingPayment(true);
    try {
      let finalPaidAmount: number | null = null;
      if (paymentStatus === 'PAID') {
        finalPaidAmount = effectiveTotal;
      } else if (paymentStatus === 'PARTIALLY_PAID') {
        finalPaidAmount = parseFloat(paidAmountInput) || 0;
      } else {
        finalPaidAmount = 0;
      }

      const res = await api.patch(`/meters/${reading.id}/status`, {
        status: paymentStatus,
        paidAmount: finalPaidAmount,
        paymentRemark: paymentRemarkInput.trim() || null,
      });

      const updated: MeterReading = {
        ...reading,
        status: res.data.status,
        paidAmount: res.data.paidAmount,
        paymentRemark: res.data.paymentRemark,
      };

      setReading(updated);
      onReadingUpdated?.(updated);
      setIsEditingPayment(false);
    } catch (err) {
      console.error('Failed to update payment details:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleAddBankRemark = (shortcut: string) => {
    setPaymentRemarkInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return shortcut;
      if (trimmed.includes(shortcut)) return trimmed;
      return `${trimmed}, ${shortcut}`;
    });
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

    const billWidth = 940;
    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'fixed';
    exportContainer.style.left = '-9999px';
    exportContainer.style.top = '0';
    exportContainer.style.width = `${billWidth}px`;
    exportContainer.style.minWidth = `${billWidth}px`;
    exportContainer.style.maxWidth = `${billWidth}px`;
    exportContainer.style.zIndex = '-9999';
    exportContainer.style.backgroundColor = '#ffffff';

    const clone = billElement.cloneNode(true) as HTMLElement;
    clone.style.width = `${billWidth}px`;
    clone.style.minWidth = `${billWidth}px`;
    clone.style.maxWidth = `${billWidth}px`;
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
  const thaiReadingDate = formatThaiFullDate(readingDate || reading.readingDate);
  const thaiDueDate = formatThaiDueDate(reading.billingMonth);

  const remainingBalance = Math.max(0, effectiveTotal - (Number(reading.paidAmount) || 0));
  const previousLeftover = reading.previousLeftover || (room as any)?.previousLeftover;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ใบเรียกเก็บเงิน - ห้อง ${roomNum}`}
      maxWidth="max-w-5xl"
    >
            {/* Previous Month Leftover Warning Tab (Explicitly EXCLUDED from receipt / no-print) */}
      {previousLeftover && previousLeftover.totalLeftoverAmount > 0 && (
        <div className="no-print mb-4 p-4 rounded-2xl bg-amber-50/95 border-2 border-amber-400 text-amber-950 shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-200/90 flex items-center justify-center shrink-0 text-amber-800 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-amber-950">
                  ⚠️ แจ้งเตือน: ห้องนี้มียอดค้างชำระจากเดือนที่แล้ว
                </span>
                <span className="text-xs font-bold text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                  รอบบิล {formatThaiMonthYear(previousLeftover.latestMonth)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">ยอดค้างสะสม:</span>
                <span className="text-base sm:text-lg font-black text-red-600 bg-white px-3 py-0.5 rounded-lg border border-amber-300 shadow-2xs font-mono">
                  ฿{previousLeftover.totalLeftoverAmount.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  บาท
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-800 mt-1 font-medium">
              🔒 <em>แจ้งเตือนเฉพาะผู้ใช้งานในระบบเท่านั้น (จะไม่ปรากฏบนใบเสร็จหรือสลิปของห้องนี้)</em>
            </p>

            {previousLeftover.items && previousLeftover.items.length > 0 && (
              <div className="mt-2.5 bg-white/90 rounded-xl p-3 border border-amber-200/90 space-y-1.5 text-xs">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>รายการรอบบิลที่ยังมียอดค้าง:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {previousLeftover.items.length} รอบบิล
                  </span>
                </div>
                {previousLeftover.items.map((item: any) => (
                  <div
                    key={item.readingId}
                    className="flex flex-wrap items-center justify-between py-1 border-b border-amber-100 last:border-0 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        รอบบิล {formatThaiMonthYear(item.billingMonth)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'PARTIALLY_PAID'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.status === 'PARTIALLY_PAID' ? 'จ่ายบางส่วน' : 'ยังไม่ชำระ'}
                      </span>
                      {item.paymentRemark && (
                        <span className="text-slate-500 text-[11px]">
                          ({item.paymentRemark})
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600 font-mono text-sm">
                        ฿{item.leftoverAmount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outer Scroll Container for smaller screens */}
      <div className="overflow-x-auto pb-2">
        {/* Printable / Exportable Bill Area matching receipt_template.png */}
        <div
          id="printable-bill"
          className="bg-white border-[3px] border-[#1a56db] p-6 sm:p-8 text-slate-800 print:p-4 print:border-[3px] print:border-[#1a56db] select-text relative w-[940px] min-w-[940px] max-w-[940px] mx-auto"
        >
          <div className="flex">
            {/* Left Vertical Room Label */}
            <div className="w-12 sm:w-14 flex-shrink-0 flex items-center justify-center -ml-3 sm:-ml-4 select-none">
              <div
                className="transform -rotate-90 whitespace-nowrap text-2xl sm:text-3xl font-black text-slate-900 tracking-wider"
                style={{ transformOrigin: 'center center' }}
              >
                ห้อง {roomNum}
              </div>
            </div>

            {/* Main Content Column */}
            <div className="flex-1 min-w-0 pr-1">
              {/* Header: ใบเรียกเก็บเงิน + ห้อง X */}
              <div className="flex items-center justify-center gap-8 sm:gap-12 mb-4 sm:mb-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] underline underline-offset-4 tracking-wide">
                  ใบเรียกเก็บเงิน
                </h2>
                <div className="bg-[#dbeafe] px-7 sm:px-9 py-1 sm:py-1.5 rounded-xs text-xl sm:text-2xl font-bold text-slate-900 border border-blue-200/60 shadow-2xs">
                  ห้อง {roomNum}
                </div>
              </div>

              {/* Date Row */}
              <div className="flex items-center justify-between text-base sm:text-lg font-semibold mb-3 sm:mb-4 px-1">
                <div className="flex items-center gap-8 sm:gap-12">
                  <span className="text-slate-800 font-medium">จดวันที่</span>
                  <span className="text-slate-900 font-bold">{thaiReadingDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#c2410c] font-bold">วันที่ต้องชำระ</span>
                  <span className="bg-[#fef08a] px-3 py-0.5 underline font-bold text-slate-900 border border-amber-300/80 rounded-xs">
                    {thaiDueDate}
                  </span>
                </div>
              </div>

              {/* Itemized Rows */}
              <div className="space-y-2 sm:space-y-2.5 text-base sm:text-lg px-1 my-2">
                {/* ค่าไฟ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-56 sm:w-64">
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
                  <div className="flex items-center justify-between w-56 sm:w-64">
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
                  <div className="flex items-center justify-between w-56 sm:w-64">
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

                {/* อัตราค่าน้ำต่อหน่วย (ไม่แสดงบรรทัดค่าเช่าห้องในใบเสร็จ) */}
                <div className="flex items-center justify-end">
                  <div className="text-right text-slate-700 font-medium">
                    (ค่าน้ำหน่วยละ{' '}
                    <span className="font-bold text-slate-900 mx-1">
                      {reading.waterRate}
                    </span>{' '}
                    บาท)
                  </div>
                </div>

                {/* ค่าใช้จ่ายอื่นๆ / หมายเหตุพิเศษ (ตัวหนังสือสีแดงตาม template) */}
                {effectiveOtherFees > 0 && (
                  <div className="flex items-start justify-between text-red-600 font-semibold pt-1">
                    <div className="whitespace-pre-wrap leading-relaxed max-w-[420px]">
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

              {/* Total Row - plenty of space with 940px container */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-2xl font-bold text-emerald-800 whitespace-nowrap">
                    รวมยอดที่ต้องจ่าย
                  </span>
                  <span className="bg-[#fef08a] px-3.5 sm:px-4 py-1 text-xl sm:text-3xl font-black text-slate-900 border border-amber-300 rounded-xs mx-1">
                    {effectiveTotal.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-base sm:text-xl font-bold text-slate-800">
                    บาท
                  </span>
                </div>

                {effectiveCommonFee > 0 && (
                  <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800 whitespace-nowrap">
                    <span className="whitespace-nowrap">ค่ารักษามิเตอร์น้ำ+ไฟ+ไฟส่วนกลาง</span>
                    <span className="font-bold text-slate-900 text-base sm:text-xl">
                      {effectiveCommonFee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span>บาท</span>
                  </div>
                )}
              </div>

              {/* Payment Status & Remark Stamp / Section on the Slip */}
              {(isPartiallyPaid || (isPaid && reading.paymentRemark) || reading.paymentRemark) && (
                <div
                  className={`mt-3 px-4 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-sm ${
                    isPaid
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : isPartiallyPaid
                      ? 'bg-sky-50/90 border-sky-300 text-sky-950'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-200/80 font-bold text-xs sm:text-sm text-emerald-900 border border-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                        ชำระเงินเรียบร้อยแล้ว
                      </span>
                    ) : isPartiallyPaid ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-sky-200/80 font-bold text-xs sm:text-sm text-sky-900 border border-sky-300">
                          <Banknote className="w-3.5 h-3.5 text-sky-700" />
                          ชำระแล้วบางส่วน
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-sky-950">
                          ฿{(reading.paidAmount ?? 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          บาท
                        </span>
                        <span className="text-xs sm:text-sm text-slate-600">
                          (คงค้างชำระ:{' '}
                          <span className="text-red-600 font-bold">
                            ฿{remainingBalance.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>{' '}
                          บาท)
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-200/80 font-bold text-xs sm:text-sm text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        รอชำระเงิน
                      </span>
                    )}
                  </div>

                  {reading.paymentRemark && (
                    <div className="text-xs sm:text-sm font-medium text-slate-800 bg-white/90 px-3 py-0.5 rounded border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 font-semibold mr-1">ช่องทาง/หมายเหตุ:</span>
                      <span className="font-bold text-slate-900">{reading.paymentRemark}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Section: PromptPay QR on the left + Bank Transfer / Remarks on the right */}
              <div className="flex items-start gap-6 sm:gap-8 mt-4 pt-3 border-t border-slate-200 px-1">
                {/* PromptPay Left Column */}
                <div className="w-40 sm:w-48 flex-shrink-0 flex flex-col items-center text-center">
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
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded text-slate-400 p-2 text-center text-xs">
                      <QrCode className="w-8 h-8 text-slate-300 mb-1" />
                      <span>ไม่มี QR Code</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">(ระบุเลขพร้อมเพย์)</span>
                    </div>
                  )}

                  <div className="text-center mt-1">
                    <span className="text-[#059669] font-bold text-xs block">
                      สแกน QR เพื่อโอนเข้าบัญชี
                    </span>
                    <span className="text-slate-700 font-semibold text-xs block mt-0.5 truncate max-w-[190px]">
                      ชื่อ: {promptPayName || apt?.promptPayName || apartmentName || apt?.name || 'เจ้าของห้องพัก'}
                    </span>
                  </div>
                </div>

                {/* Bank Accounts & Remarks Right Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center text-xs sm:text-base text-[#4a154b] font-medium leading-relaxed pt-2">
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
          {/* Status Display and Quick Drawer Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingPayment(!isEditingPayment)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-sm transition-all cursor-pointer border ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                  : isPartiallyPaid
                  ? 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
                  : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
              }`}
              title="คลิกเพื่อบันทึกสถานะการชำระเงิน หรือระบุธนาคาร/ยอดเงิน"
            >
              {isPaid ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>ชำระแล้ว</span>
                </>
              ) : isPartiallyPaid ? (
                <>
                  <Banknote className="w-4 h-4 text-sky-600" />
                  <span>ชำระบางส่วน (฿{(reading.paidAmount ?? 0).toLocaleString()})</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>รอชำระเงิน</span>
                </>
              )}
              <Edit3 className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>

            {onToggleStatus && !isEditingPayment && (
              <button
                type="button"
                onClick={() => onToggleStatus(reading.id, reading.status)}
                disabled={isUpdatingStatus}
                title="สลับสถานะ ชำระแล้ว / รอชำระ แบบรวดเร็ว"
                className="text-xs text-slate-500 hover:text-indigo-600 underline font-medium cursor-pointer ml-1"
              >
                {isUpdatingStatus ? 'กำลังสลับ...' : 'สลับด่วน'}
              </button>
            )}
          </div>

          {/* Quick Date Adjustment */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">จดวันที่:</span>
            <input
              type="date"
              value={readingDate}
              onChange={(e) => handleUpdateReadingDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              title="ปรับเปลี่ยนวันที่จดมิเตอร์บนบิลนี้ (บันทึกอัตโนมัติ)"
            />
          </div>

          {/* Action Drawers Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingPayment(!isEditingPayment);
                if (!isEditingPayment) {
                  setIsEditingNote(false);
                  setIsSettingPromptPay(false);
                }
              }}
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isEditingPayment
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isEditingPayment ? 'ปิดระบุการชำระเงิน' : 'ระบุธนาคาร/ยอดชำระ'}</span>
              {isEditingPayment ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditingNote(!isEditingNote);
                if (!isEditingNote) {
                  setIsEditingPayment(false);
                  setIsSettingPromptPay(false);
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingNote ? 'ปิดแก้ไขหมายเหตุ' : 'แก้ไขหมายเหตุ/บัญชี'}</span>
              {isEditingNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSettingPromptPay(!isSettingPromptPay);
                if (!isSettingPromptPay) {
                  setIsEditingPayment(false);
                  setIsEditingNote(false);
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isSettingPromptPay ? 'ปิดตั้งค่าพร้อมเพย์' : 'ตั้งค่าพร้อมเพย์'}</span>
              {isSettingPromptPay ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Payment Status & Remark Drawer */}
        {isEditingPayment && (
          <div className="p-4 bg-white border border-indigo-200 rounded-xl space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <span className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                บันทึกการชำระเงิน และระบุหมายเหตุ/ธนาคารที่โอนเงินเข้า
              </span>
              <button
                type="button"
                onClick={() => setIsEditingPayment(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Selection Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกสถานะการชำระเงิน:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PAID');
                    setPaidAmountInput(String(effectiveTotal));
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>ชำระครบแล้ว</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PARTIALLY_PAID');
                    if (!paidAmountInput || Number(paidAmountInput) === effectiveTotal) {
                      setPaidAmountInput(String(Math.round(effectiveTotal / 2)));
                    }
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>ชำระบางส่วน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('UNPAID');
                    setPaidAmountInput('0');
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'UNPAID'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>รอชำระเงิน</span>
                </button>
              </div>
            </div>

            {/* Partial Paid Amount Field (Shown when PARTIALLY_PAID) */}
            {paymentStatus === 'PARTIALLY_PAID' && (
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-sky-950 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
                    จำนวนเงินที่ผู้เช่าจ่ายมาแล้ว (บาท):
                  </label>
                  <div className="text-xs text-sky-800">
                    ยอดเต็ม:{' '}
                    <span className="font-bold">
                      {effectiveTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>{' '}
                    บาท
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={effectiveTotal}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      placeholder="เช่น 2000"
                      className="w-full bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-sm font-bold text-sky-950 focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">บาท</span>
                  </div>
                  <div className="bg-white border border-sky-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 whitespace-nowrap">
                    ค้างชำระอีก:{' '}
                    <span className="text-red-600 font-bold font-mono">
                      {Math.max(0, effectiveTotal - (parseFloat(paidAmountInput) || 0)).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>{' '}
                    บาท
                  </div>
                </div>
              </div>
            )}

            {/* Payment Remark Input with Quick Bank Badges */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                หมายเหตุการชำระเงิน / ระบุธนาคารที่ได้รับเงิน:
              </label>
              <input
                type="text"
                value={paymentRemarkInput}
                onChange={(e) => setPaymentRemarkInput(e.target.value)}
                placeholder="เช่น โอนเข้า ธ.กสิกรไทย 2,000 บ., เงินสด 1,500 บ."
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />

              {/* Quick Bank Shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">ปุ่มลัดธนาคาร/ช่องทาง:</span>
                {BANK_SHORTCUTS.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => handleAddBankRemark(bank)}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    + {bank}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                *ข้อมูลนี้จะถูกบันทึกเข้าระบบ และแสดงในสลิป/ใบเสร็จนี้
              </span>
              <button
                type="button"
                onClick={handleSavePaymentDetails}
                disabled={isSavingPayment}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isSavingPayment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>บันทึกสถานะและการชำระเงิน</span>
              </button>
            </div>
          </div>
        )}

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
