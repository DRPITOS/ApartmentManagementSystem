import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.owner.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้วในระบบ (Email already exists)');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const owner = await this.prisma.owner.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: dto.name.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: owner.id,
      email: owner.email,
      name: owner.name,
    });

    return {
      message: 'ลงทะเบียนสำเร็จ (Registered successfully)',
      owner,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const owner = await this.prisma.owner.findUnique({
      where: { email },
    });

    if (!owner) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง (Invalid email or password)');
    }

    const isMatch = await bcrypt.compare(dto.password, owner.password);
    if (!isMatch) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง (Invalid email or password)');
    }

    const token = await this.jwtService.signAsync({
      sub: owner.id,
      email: owner.email,
      name: owner.name,
    });

    return {
      message: 'เข้าสู่ระบบสำเร็จ (Login successful)',
      owner: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        phoneNumber: owner.phoneNumber,
        createdAt: owner.createdAt,
      },
      accessToken: token,
    };
  }

  async getProfile(ownerId: string) {
    const owner = await this.prisma.owner.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: { apartments: true },
        },
      },
    });

    if (!owner) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');
    }

    return owner;
  }
}
