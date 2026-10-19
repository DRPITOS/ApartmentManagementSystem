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
  commonFee?: number | null;
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
  otherFees: number;
  otherFeesNote?: string | null;
  totalAmount: number;
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  paidAt?: string | null;
  note?: string | null;
  room?: Room & { apartment?: Apartment };
}

export interface ApartmentMonthlyReport {
  apartmentId: string;
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
    };
    reading: MeterReading | null;
  }[];
}
