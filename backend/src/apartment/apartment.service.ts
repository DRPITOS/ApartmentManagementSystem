import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisCacheService } from '../cache/redis-cache.service.js';
import { CreateApartmentDto } from './dto/create-apartment.dto.js';
import { UpdateApartmentDto } from './dto/update-apartment.dto.js';
import { AddCoOwnerDto } from './dto/add-co-owner.dto.js';

@Injectable()
export class ApartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async findAllForOwner(ownerId: string) {
    const cacheKey = `owner:${ownerId}:apartments`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const memberships = await this.prisma.apartmentOwner.findMany({
      where: { ownerId },
      include: {
        apartment: {
          include: {
            _count: {
              select: {
                rooms: true,
                owners: true,
              },
            },
            rooms: {
              select: {
                id: true,
                status: true,
                basePrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const apartments = memberships.map((m) => {
      const apt = m.apartment;
      const totalRooms = apt.rooms.length;
      const occupiedRooms = apt.rooms.filter((r) => r.status === 'OCCUPIED').length;
      const vacantRooms = apt.rooms.filter((r) => r.status === 'VACANT').length;
      const totalRentPotential = apt.rooms.reduce((acc, r) => acc + (r.basePrice || 0), 0);

      return {
        id: apt.id,
        name: apt.name,
        nickname: apt.nickname,
        address: apt.address,
        defaultElectricityRate: apt.defaultElectricityRate,
        defaultWaterRate: apt.defaultWaterRate,
        waterBillingType: apt.waterBillingType,
        flatWaterRate: apt.flatWaterRate,
        commonFee: apt.commonFee,
        createdAt: apt.createdAt,
        updatedAt: apt.updatedAt,
        role: m.role,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        totalRentPotential,
        ownersCount: apt._count.owners,
      };
    });

    await this.cache.set(cacheKey, apartments, 120); // cache for 2 minutes
    return apartments;
  }

  async findOne(apartmentId: string, ownerId: string) {
    await this.validateOwnership(apartmentId, ownerId);

    const cacheKey = `apartment:${apartmentId}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        owners: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            meterReadings: {
              orderBy: { billingMonth: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('ไม่พบข้อมูลหอพักนี้');
    }

    await this.cache.set(cacheKey, apartment, 120);
    return apartment;
  }

  async create(dto: CreateApartmentDto, ownerId: string) {
    const apartment = await this.prisma.apartment.create({
      data: {
        name: dto.name.trim(),
        nickname: dto.nickname?.trim() || null,
        address: dto.address?.trim() || null,
        defaultElectricityRate: dto.defaultElectricityRate,
        defaultWaterRate: dto.defaultWaterRate,
        waterBillingType: dto.waterBillingType || 'PER_UNIT',
        flatWaterRate: dto.flatWaterRate ?? 100,
        commonFee: dto.commonFee ?? 0,
        owners: {
          create: {
            ownerId,
            role: 'PRIMARY_OWNER',
          },
        },
      },
      include: {
        owners: true,
      },
    });

    await this.invalidateOwnerCache(ownerId);
    return apartment;
  }

  async update(apartmentId: string, dto: UpdateApartmentDto, ownerId: string) {
    await this.validateOwnership(apartmentId, ownerId);

    const updated = await this.prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname ? dto.nickname.trim() : null }),
        ...(dto.address !== undefined && { address: dto.address ? dto.address.trim() : null }),
        ...(dto.defaultElectricityRate !== undefined && { defaultElectricityRate: dto.defaultElectricityRate }),
        ...(dto.defaultWaterRate !== undefined && { defaultWaterRate: dto.defaultWaterRate }),
        ...(dto.waterBillingType !== undefined && { waterBillingType: dto.waterBillingType }),
        ...(dto.flatWaterRate !== undefined && { flatWaterRate: dto.flatWaterRate }),
        ...(dto.commonFee !== undefined && { commonFee: dto.commonFee }),
      },
    });

    await this.cache.del(`apartment:${apartmentId}`);
    await this.invalidateAllOwnersOfApartment(apartmentId);
    return updated;
  }

  async remove(apartmentId: string, ownerId: string) {
    const membership = await this.validateOwnership(apartmentId, ownerId);

    if (membership.role !== 'PRIMARY_OWNER') {
      throw new ForbiddenException('เฉพาะเจ้าของหลัก (Primary Owner) เท่านั้นที่สามารถลบหอพักได้');
    }

    await this.prisma.apartment.delete({
      where: { id: apartmentId },
    });

    await this.cache.del(`apartment:${apartmentId}`);
    await this.invalidateAllOwnersOfApartment(apartmentId);
    return { message: 'ลบหอพักเรียบร้อยแล้ว' };
  }

  async addCoOwner(apartmentId: string, dto: AddCoOwnerDto, requesterOwnerId: string) {
    await this.validateOwnership(apartmentId, requesterOwnerId);

    const targetOwner = await this.prisma.owner.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!targetOwner) {
      throw new NotFoundException(`ไม่พบบัญชีผู้ใช้ที่มีอีเมล ${dto.email} กรุณาให้เจ้าของร่วมสมัครบัญชีก่อน`);
    }

    const existing = await this.prisma.apartmentOwner.findUnique({
      where: {
        apartmentId_ownerId: {
          apartmentId,
          ownerId: targetOwner.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('ผู้ใช้นี้เป็นเจ้าของหอพักนี้อยู่แล้ว');
    }

    const created = await this.prisma.apartmentOwner.create({
      data: {
        apartmentId,
        ownerId: targetOwner.id,
        role: dto.role || 'CO_OWNER',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    await this.cache.del(`apartment:${apartmentId}`);
    await this.invalidateOwnerCache(targetOwner.id);
    await this.invalidateOwnerCache(requesterOwnerId);

    return {
      message: `เพิ่มเจ้าของร่วม ${targetOwner.name} สำเร็จ`,
      coOwner: created,
    };
  }

  async removeCoOwner(apartmentId: string, targetOwnerId: string, requesterOwnerId: string) {
    const requester = await this.validateOwnership(apartmentId, requesterOwnerId);

    if (requester.role !== 'PRIMARY_OWNER' && requesterOwnerId !== targetOwnerId) {
      throw new ForbiddenException('ไม่มีสิทธิ์ลบเจ้าของร่วม');
    }

    const totalOwners = await this.prisma.apartmentOwner.count({
      where: { apartmentId },
    });

    if (totalOwners <= 1) {
      throw new ForbiddenException('ไม่สามารถลบเจ้าของคนสุดท้ายได้ หากต้องการลบ กรุณาลบหอพักทั้งโครงการ');
    }

    await this.prisma.apartmentOwner.delete({
      where: {
        apartmentId_ownerId: {
          apartmentId,
          ownerId: targetOwnerId,
        },
      },
    });

    await this.cache.del(`apartment:${apartmentId}`);
    await this.invalidateOwnerCache(targetOwnerId);
    await this.invalidateOwnerCache(requesterOwnerId);

    return { message: 'นำเจ้าของร่วมออกจากหอพักเรียบร้อยแล้ว' };
  }

  async validateOwnership(apartmentId: string, ownerId: string) {
    const membership = await this.prisma.apartmentOwner.findUnique({
      where: {
        apartmentId_ownerId: {
          apartmentId,
          ownerId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงหรือจัดการหอพักนี้ (Access Denied)');
    }

    return membership;
  }

  private async invalidateOwnerCache(ownerId: string) {
    await this.cache.del(`owner:${ownerId}:apartments`);
  }

  private async invalidateAllOwnersOfApartment(apartmentId: string) {
    const owners = await this.prisma.apartmentOwner.findMany({
      where: { apartmentId },
      select: { ownerId: true },
    });
    for (const o of owners) {
      await this.invalidateOwnerCache(o.ownerId);
    }
  }
}
