export interface Owner {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  createdAt?: string;
}

export interface Apartment {
  id: string;
  name: string;
  nickname?: string | null;
  address?: string | null;
  defaultElectricityRate: number; // บาท / หน่วย
  defaultWaterRate: number; // บาท / หน่วย
  waterBillingType: 'PER_UNIT' | 'FLAT_RATE';
  flatWaterRate?: number | null;
  commonFee?: number | null; // ค่าส่วนกลาง
  trashFee?: number | null; // ค่าขยะ
  defaultOtherFee?: number | null; // ค่าใช้จ่ายอื่นๆ เริ่มต้น
  defaultOtherFeeNote?: string | null; // หมายเหตุค่าใช้จ่ายอื่นๆ เริ่มต้น
  remarkTemplate?: string | null; // เทมเพลตหมายเหตุท้ายสลิป
  promptPayNumber?: string | null; // เบอร์หรือเลขพร้อมเพย์
  promptPayName?: string | null; // ชื่อบัญชีพร้อมเพย์
  defaultInitialElectricity?: number | null;
  defaultInitialWater?: number | null;
  role?: string;
  totalRooms?: number;
  occupiedRooms?: number;
  vacantRooms?: number;
  totalRentPotential?: number;
  ownersCount?: number;
  owners?: {
    id: string;
    role: string;
    owner: Owner;
  }[];
  rooms?: Room[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  apartmentId: string;
  roomNumber: string;
  floor?: number | null;
  basePrice: number; // ค่าเช่าห้องฐาน
  customElectricityRate?: number | null;
  customWaterRate?: number | null;
  initialElectricity?: number | null;
  initialWater?: number | null;
  tenantName?: string | null;
  tenantPhone?: string | null;
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
  meterReadings?: MeterReading[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MeterReading {
  id: string;
  roomId: string;
  billingMonth: string; // YYYY-MM
  readingDate: string;
  previousElectricity: number;
  currentElectricity: number;
  electricityUnits: number;
  electricityRate: number;
  electricityCost: number;
  previousWater: number;
  currentWater: number;
  waterUnits: number;
  waterRate: number;
  waterCost: number;
  baseRentPrice: number;
  commonFee: number;
  trashFee: number;
  otherFees: number;
  otherFeesNote?: string | null;
  totalAmount: number;
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  paidAt?: string | null;
  note?: string | null; // หมายเหตุบนสลิปสำหรับห้องนี้
  room?: Room & { apartment?: Apartment };
}

export interface ApartmentMonthlyReport {
  apartmentId: string;
  apartment?: Apartment;
  billingMonth: string;
  totalRooms: number;
  recordedRooms: number;
  unrecordedRooms: number;
  totalElectricityUnits: number;
  totalWaterUnits: number;
  totalRevenue: number;
  paidCount: number;
  unpaidCount: number;
  items: {
    room: {
      id: string;
      roomNumber: string;
      floor?: number | null;
      basePrice: number;
      tenantName?: string | null;
      tenantPhone?: string | null;
      status: string;
      initialElectricity?: number;
      initialWater?: number;
      customElectricityRate?: number | null;
      customWaterRate?: number | null;
      baselineElectricity?: number;
      baselineWater?: number;
      apartment?: Apartment;
    };
    reading: MeterReading | null;
  }[];
}
