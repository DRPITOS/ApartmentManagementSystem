import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { ApartmentService } from '../apartment/apartment.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { BatchCreateRoomsDto } from './dto/batch-create-rooms.dto.js';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly apartmentService: ApartmentService,
  ) {}

  async findByApartment(apartmentId: string, ownerId: string) {
    await this.apartmentService.validateOwnership(apartmentId, ownerId);

    return this.prisma.room.findMany({
      where: { apartmentId },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        meterReadings: {
          orderBy: { billingMonth: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(roomId: string, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        apartment: true,
        meterReadings: {
          orderBy: { billingMonth: 'desc' },
          take: 12,
        },
      },
    });

    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักนี้');
    }

    await this.apartmentService.validateOwnership(room.apartmentId, ownerId);
    return room;
  }

  async create(dto: CreateRoomDto, ownerId: string) {
    await this.apartmentService.validateOwnership(dto.apartmentId, ownerId);

    const existing = await this.prisma.room.findUnique({
      where: {
        apartmentId_roomNumber: {
          apartmentId: dto.apartmentId,
          roomNumber: dto.roomNumber.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`ห้องหมายเลข ${dto.roomNumber} มีอยู่ในหอพักนี้แล้ว`);
    }

    const apt = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
      select: { defaultInitialElectricity: true, defaultInitialWater: true },
    });

    const room = await this.prisma.room.create({
      data: {
        apartmentId: dto.apartmentId,
        roomNumber: dto.roomNumber.trim(),
        floor: dto.floor ?? 1,
        basePrice: dto.basePrice,
        customElectricityRate: dto.customElectricityRate ?? null,
        customWaterRate: dto.customWaterRate ?? null,
        initialElectricity: dto.initialElectricity ?? apt?.defaultInitialElectricity ?? 0,
        initialWater: dto.initialWater ?? apt?.defaultInitialWater ?? 0,
        tenantName: dto.tenantName?.trim() || null,
        tenantPhone: dto.tenantPhone?.trim() || null,
        status: dto.status || 'OCCUPIED',
      },
    });

    await this.cache.del(`apartment:${dto.apartmentId}`);
    return room;
  }

  async batchCreate(dto: BatchCreateRoomsDto, ownerId: string) {
    await this.apartmentService.validateOwnership(dto.apartmentId, ownerId);

    const apt = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
      select: { defaultInitialElectricity: true, defaultInitialWater: true },
    });
    const defaultElec = apt?.defaultInitialElectricity ?? 0;
    const defaultWater = apt?.defaultInitialWater ?? 0;

    const results = [];
    for (const r of dto.rooms) {
      const existing = await this.prisma.room.findUnique({
        where: {
          apartmentId_roomNumber: {
            apartmentId: dto.apartmentId,
            roomNumber: r.roomNumber.trim(),
          },
        },
      });

      if (!existing) {
        const created = await this.prisma.room.create({
          data: {
            apartmentId: dto.apartmentId,
            roomNumber: r.roomNumber.trim(),
            floor: r.floor ?? 1,
            basePrice: r.basePrice,
            initialElectricity: r.initialElectricity ?? defaultElec,
            initialWater: r.initialWater ?? defaultWater,
            status: 'OCCUPIED',
          },
        });
        results.push(created);
      }
    }

    await this.cache.del(`apartment:${dto.apartmentId}`);
    return {
      message: `สร้างห้องพักสำเร็จ ${results.length} ห้อง`,
      createdCount: results.length,
      rooms: results,
    };
  }

  async update(roomId: string, dto: UpdateRoomDto, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักนี้');
    }

    await this.apartmentService.validateOwnership(room.apartmentId, ownerId);

    if (dto.roomNumber && dto.roomNumber.trim() !== room.roomNumber) {
      const duplicate = await this.prisma.room.findUnique({
        where: {
          apartmentId_roomNumber: {
            apartmentId: room.apartmentId,
            roomNumber: dto.roomNumber.trim(),
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(`ห้องหมายเลข ${dto.roomNumber} มีอยู่ในหอพักนี้แล้ว`);
      }
    }

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(dto.roomNumber !== undefined && { roomNumber: dto.roomNumber.trim() }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.customElectricityRate !== undefined && { customElectricityRate: dto.customElectricityRate }),
        ...(dto.customWaterRate !== undefined && { customWaterRate: dto.customWaterRate }),
        ...(dto.initialElectricity !== undefined && { initialElectricity: dto.initialElectricity }),
        ...(dto.initialWater !== undefined && { initialWater: dto.initialWater }),
        ...(dto.tenantName !== undefined && { tenantName: dto.tenantName ? dto.tenantName.trim() : null }),
        ...(dto.tenantPhone !== undefined && { tenantPhone: dto.tenantPhone ? dto.tenantPhone.trim() : null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.cache.del(`apartment:${room.apartmentId}`);
    return updated;
  }

  async remove(roomId: string, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักนี้');
    }

    await this.apartmentService.validateOwnership(room.apartmentId, ownerId);

    await this.prisma.room.delete({
      where: { id: roomId },
    });

    await this.cache.del(`apartment:${room.apartmentId}`);
    return { message: 'ลบห้องพักเรียบร้อยแล้ว' };
  }
}
