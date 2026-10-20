import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApartmentService } from '../apartment/apartment.service.js';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto.js';
import { UpdateMeterReadingDto } from './dto/update-meter-reading.dto.js';
import { BatchMeterReadingDto } from './dto/batch-meter-reading.dto.js';

@Injectable()
export class MeterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartmentService: ApartmentService,
  ) {}

  async create(dto: CreateMeterReadingDto, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { apartment: true },
    });

    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักนี้');
    }

    await this.apartmentService.validateOwnership(room.apartmentId, ownerId);

    // If previousElectricity is not provided, fetch the latest reading or room initial unit
    let previousElectricity = dto.previousElectricity;
    if (previousElectricity === undefined || previousElectricity === null) {
      const lastReading = await this.prisma.meterReading.findFirst({
        where: { roomId: dto.roomId, billingMonth: { lt: dto.billingMonth } },
        orderBy: { billingMonth: 'desc' },
      });
      previousElectricity = lastReading ? lastReading.currentElectricity : (room.initialElectricity ?? 0);
    }

    // If previousWater is not provided, fetch the latest reading or room initial unit
    let previousWater = dto.previousWater;
    if (previousWater === undefined || previousWater === null) {
      const lastReading = await this.prisma.meterReading.findFirst({
        where: { roomId: dto.roomId, billingMonth: { lt: dto.billingMonth } },
        orderBy: { billingMonth: 'desc' },
      });
      previousWater = lastReading ? lastReading.currentWater : (room.initialWater ?? 0);
    }

    if (dto.currentElectricity < previousElectricity) {
      throw new BadRequestException(
        `เลขมิเตอร์ไฟปัจจุบัน (${dto.currentElectricity}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${previousElectricity})`,
      );
    }

    if (dto.currentWater < previousWater) {
      throw new BadRequestException(
        `เลขมิเตอร์น้ำปัจจุบัน (${dto.currentWater}) ต้องไม่น้อยกว่าเลขครั้งก่อน (${previousWater})`,
      );
    }

    // คำนวณหน่วยที่ใช้
    const electricityUnits = Math.round((dto.currentElectricity - previousElectricity) * 100) / 100;
    const waterUnits = Math.round((dto.currentWater - previousWater) * 100) / 100;

    // อัตราค่าไฟ
    const electricityRate =
      dto.electricityRate ??
      room.customElectricityRate ??
      room.apartment.defaultElectricityRate ??
      7.0;

    // อัตราค่าน้ำ
    const waterRate =
      dto.waterRate ??
      room.customWaterRate ??
      room.apartment.defaultWaterRate ??
      18.0;

    const electricityCost = Math.round(electricityUnits * electricityRate * 100) / 100;

    // ตรวจสอบรูปแบบค่าน้ำ
    let waterCost = 0;
    if (room.apartment.waterBillingType === 'FLAT_RATE') {
      waterCost = room.apartment.flatWaterRate ?? 100;
    } else {
      waterCost = Math.round(waterUnits * waterRate * 100) / 100;
    }

    // ค่าเช่าห้องฐาน
    const baseRentPrice = dto.baseRentPrice ?? room.basePrice;
    const otherFees = dto.otherFees ?? (room.apartment.commonFee || 0);

    const totalAmount = Math.round((baseRentPrice + electricityCost + waterCost + otherFees) * 100) / 100;

    // ตรวจสอบว่าเคยมีบันทึกของเดือนนี้หรือยัง หากมีให้ update หากไม่มีให้ create
    const existing = await this.prisma.meterReading.findFirst({
      where: {
        roomId: dto.roomId,
        billingMonth: dto.billingMonth,
      },
    });

    if (existing) {
      return this.prisma.meterReading.update({
        where: { id: existing.id },
        data: {
          readingDate: dto.readingDate ? new Date(dto.readingDate) : new Date(),
          previousElectricity,
          currentElectricity: dto.currentElectricity,
          electricityUnits,
          electricityRate,
          electricityCost,
          previousWater,
          currentWater: dto.currentWater,
          waterUnits,
          waterRate,
          waterCost,
          baseRentPrice,
          otherFees,
          otherFeesNote: dto.otherFeesNote ?? null,
          totalAmount,
          status: dto.status || existing.status,
          note: dto.note ?? existing.note,
        },
      });
    }

    return this.prisma.meterReading.create({
      data: {
        roomId: dto.roomId,
        billingMonth: dto.billingMonth,
        readingDate: dto.readingDate ? new Date(dto.readingDate) : new Date(),
        previousElectricity,
        currentElectricity: dto.currentElectricity,
        electricityUnits,
        electricityRate,
        electricityCost,
        previousWater,
        currentWater: dto.currentWater,
        waterUnits,
        waterRate,
        waterCost,
        baseRentPrice,
        otherFees,
        otherFeesNote: dto.otherFeesNote ?? null,
        totalAmount,
        status: dto.status || 'UNPAID',
        note: dto.note ?? null,
      },
    });
  }

  async getLatestForRoom(roomId: string, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { apartment: true },
    });

    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักนี้');
    }

    await this.apartmentService.validateOwnership(room.apartmentId, ownerId);

    const latest = await this.prisma.meterReading.findFirst({
      where: { roomId },
      orderBy: { readingDate: 'desc' },
    });

    return {
      room,
      latestReading: latest,
      defaultElectricityRate: room.customElectricityRate ?? room.apartment.defaultElectricityRate,
      defaultWaterRate: room.customWaterRate ?? room.apartment.defaultWaterRate,
      waterBillingType: room.apartment.waterBillingType,
      flatWaterRate: room.apartment.flatWaterRate,
      baseRentPrice: room.basePrice,
    };
  }

  async findByApartmentAndMonth(apartmentId: string, billingMonth: string, ownerId: string) {
    await this.apartmentService.validateOwnership(apartmentId, ownerId);

    const rooms = await this.prisma.room.findMany({
      where: { apartmentId },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        meterReadings: {
          orderBy: { billingMonth: 'desc' },
        },
      },
    });

    const readings = rooms.map((room) => {
      // Current selected month reading (if already recorded)
      const currentMonthReading = room.meterReadings.find((m) => m.billingMonth === billingMonth) || null;

      // Find last recorded reading before the current month
      const pastReading = room.meterReadings.find((m) => m.billingMonth < billingMonth);

      // Determine baseline previous values: either from previous month or room initial meter setting
      const baselineElectricity = pastReading
        ? pastReading.currentElectricity
        : (room.initialElectricity ?? 0);

      const baselineWater = pastReading
        ? pastReading.currentWater
        : (room.initialWater ?? 0);

      const roomData = {
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        basePrice: room.basePrice,
        tenantName: room.tenantName,
        tenantPhone: room.tenantPhone,
        status: room.status,
        initialElectricity: room.initialElectricity ?? 0,
        initialWater: room.initialWater ?? 0,
        customElectricityRate: room.customElectricityRate,
        customWaterRate: room.customWaterRate,
        baselineElectricity,
        baselineWater,
      };

      const readingWithRoom = currentMonthReading
        ? {
            ...currentMonthReading,
            room: roomData,
          }
        : null;

      return {
        room: roomData,
        reading: readingWithRoom,
      };
    });

    // Summary statistics
    const recorded = readings.filter((r) => r.reading !== null);
    const totalElectricityUnits = recorded.reduce((acc, r) => acc + (r.reading?.electricityUnits || 0), 0);
    const totalWaterUnits = recorded.reduce((acc, r) => acc + (r.reading?.waterUnits || 0), 0);
    const totalRevenue = recorded.reduce((acc, r) => acc + (r.reading?.totalAmount || 0), 0);
    const paidCount = recorded.filter((r) => r.reading?.status === 'PAID').length;
    const unpaidCount = recorded.filter((r) => r.reading?.status === 'UNPAID').length;

    return {
      apartmentId,
      billingMonth,
      totalRooms: rooms.length,
      recordedRooms: recorded.length,
      unrecordedRooms: rooms.length - recorded.length,
      totalElectricityUnits: Math.round(totalElectricityUnits * 100) / 100,
      totalWaterUnits: Math.round(totalWaterUnits * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidCount,
      unpaidCount,
      items: readings,
    };
  }

  async findOne(id: string, ownerId: string) {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            apartment: {
              include: {
                owners: {
                  include: {
                    owner: {
                      select: {
                        name: true,
                        phoneNumber: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!reading) {
      throw new NotFoundException('ไม่พบข้อมูลบันทึกมิเตอร์นี้');
    }

    await this.apartmentService.validateOwnership(reading.room.apartmentId, ownerId);
    return reading;
  }

  async updateStatus(id: string, status: string, ownerId: string) {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!reading) {
      throw new NotFoundException('ไม่พบข้อมูลบันทึกมิเตอร์นี้');
    }

    await this.apartmentService.validateOwnership(reading.room.apartmentId, ownerId);

    return this.prisma.meterReading.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: UpdateMeterReadingDto, ownerId: string) {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: {
        room: {
          include: { apartment: true },
        },
      },
    });

    if (!reading) {
      throw new NotFoundException('ไม่พบข้อมูลบันทึกมิเตอร์นี้');
    }

    await this.apartmentService.validateOwnership(reading.room.apartmentId, ownerId);

    const prevElec = dto.previousElectricity ?? reading.previousElectricity;
    const currElec = dto.currentElectricity ?? reading.currentElectricity;
    const prevWater = dto.previousWater ?? reading.previousWater;
    const currWater = dto.currentWater ?? reading.currentWater;

    if (currElec < prevElec) {
      throw new BadRequestException('เลขมิเตอร์ไฟปัจจุบันต้องไม่น้อยกว่าเลขครั้งก่อน');
    }
    if (currWater < prevWater) {
      throw new BadRequestException('เลขมิเตอร์น้ำปัจจุบันต้องไม่น้อยกว่าเลขครั้งก่อน');
    }

    const electricityUnits = Math.round((currElec - prevElec) * 100) / 100;
    const waterUnits = Math.round((currWater - prevWater) * 100) / 100;

    const electricityRate = dto.electricityRate ?? reading.electricityRate;
    const waterRate = dto.waterRate ?? reading.waterRate;

    const electricityCost = Math.round(electricityUnits * electricityRate * 100) / 100;
    let waterCost = 0;
    if (reading.room.apartment.waterBillingType === 'FLAT_RATE') {
      waterCost = reading.room.apartment.flatWaterRate ?? 100;
    } else {
      waterCost = Math.round(waterUnits * waterRate * 100) / 100;
    }

    const baseRentPrice = dto.baseRentPrice ?? reading.baseRentPrice;
    const otherFees = dto.otherFees ?? reading.otherFees;
    const totalAmount = Math.round((baseRentPrice + electricityCost + waterCost + otherFees) * 100) / 100;

    return this.prisma.meterReading.update({
      where: { id },
      data: {
        ...(dto.billingMonth && { billingMonth: dto.billingMonth }),
        previousElectricity: prevElec,
        currentElectricity: currElec,
        electricityUnits,
        electricityRate,
        electricityCost,
        previousWater: prevWater,
        currentWater: currWater,
        waterUnits,
        waterRate,
        waterCost,
        baseRentPrice,
        otherFees,
        ...(dto.otherFeesNote !== undefined && { otherFeesNote: dto.otherFeesNote }),
        totalAmount,
        ...(dto.status && {
          status: dto.status,
          paidAt: dto.status === 'PAID' ? new Date() : null,
        }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    });
  }

  async remove(id: string, ownerId: string) {
    const reading = await this.prisma.meterReading.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!reading) {
      throw new NotFoundException('ไม่พบข้อมูลบันทึกมิเตอร์นี้');
    }

    await this.apartmentService.validateOwnership(reading.room.apartmentId, ownerId);

    await this.prisma.meterReading.delete({
      where: { id },
    });

    return { message: 'ลบบันทึกมิเตอร์เรียบร้อยแล้ว' };
  }

  async batchRecord(dto: BatchMeterReadingDto, ownerId: string) {
    await this.apartmentService.validateOwnership(dto.apartmentId, ownerId);

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
    });

    if (!apartment) {
      throw new NotFoundException('ไม่พบข้อมูลหอพักนี้');
    }

    const results = [];
    for (const item of dto.readings) {
      const room = await this.prisma.room.findUnique({
        where: { id: item.roomId },
      });

      if (!room || room.apartmentId !== dto.apartmentId) continue;

      let previousElectricity = item.previousElectricity;
      if (previousElectricity === undefined || previousElectricity === null) {
        const lastReading = await this.prisma.meterReading.findFirst({
          where: { roomId: item.roomId, billingMonth: { lt: dto.billingMonth } },
          orderBy: { billingMonth: 'desc' },
        });
        previousElectricity = lastReading ? lastReading.currentElectricity : (room.initialElectricity ?? 0);
      }

      let previousWater = item.previousWater;
      if (previousWater === undefined || previousWater === null) {
        const lastReading = await this.prisma.meterReading.findFirst({
          where: { roomId: item.roomId, billingMonth: { lt: dto.billingMonth } },
          orderBy: { billingMonth: 'desc' },
        });
        previousWater = lastReading ? lastReading.currentWater : (room.initialWater ?? 0);
      }

      const electricityUnits = Math.max(0, Math.round((item.currentElectricity - previousElectricity) * 100) / 100);
      const waterUnits = Math.max(0, Math.round((item.currentWater - previousWater) * 100) / 100);

      const electricityRate = room.customElectricityRate ?? apartment.defaultElectricityRate ?? 7.0;
      const waterRate = room.customWaterRate ?? apartment.defaultWaterRate ?? 18.0;

      const electricityCost = Math.round(electricityUnits * electricityRate * 100) / 100;
      let waterCost = 0;
      if (apartment.waterBillingType === 'FLAT_RATE') {
        waterCost = apartment.flatWaterRate ?? 100;
      } else {
        waterCost = Math.round(waterUnits * waterRate * 100) / 100;
      }

      const baseRentPrice = item.baseRentPrice ?? room.basePrice;
      const otherFees = item.otherFees ?? (apartment.commonFee || 0);
      const totalAmount = Math.round((baseRentPrice + electricityCost + waterCost + otherFees) * 100) / 100;

      const existing = await this.prisma.meterReading.findFirst({
        where: {
          roomId: item.roomId,
          billingMonth: dto.billingMonth,
        },
      });

      if (existing) {
        const updated = await this.prisma.meterReading.update({
          where: { id: existing.id },
          data: {
            previousElectricity,
            currentElectricity: item.currentElectricity,
            electricityUnits,
            electricityRate,
            electricityCost,
            previousWater,
            currentWater: item.currentWater,
            waterUnits,
            waterRate,
            waterCost,
            baseRentPrice,
            otherFees,
            otherFeesNote: item.otherFeesNote || null,
            totalAmount,
          },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.meterReading.create({
          data: {
            roomId: item.roomId,
            billingMonth: dto.billingMonth,
            previousElectricity,
            currentElectricity: item.currentElectricity,
            electricityUnits,
            electricityRate,
            electricityCost,
            previousWater,
            currentWater: item.currentWater,
            waterUnits,
            waterRate,
            waterCost,
            baseRentPrice,
            otherFees,
            otherFeesNote: item.otherFeesNote || null,
            totalAmount,
            status: 'UNPAID',
          },
        });
        results.push(created);
      }
    }

    return {
      message: `บันทึกมิเตอร์สำเร็จ ${results.length} ห้อง`,
      processedCount: results.length,
      items: results,
    };
  }
}
