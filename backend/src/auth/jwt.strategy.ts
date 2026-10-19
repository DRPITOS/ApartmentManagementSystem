import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'apartment_system_super_secret_jwt_key_2026'),
    });
  }

  async validate(payload: JwtPayload) {
    const owner = await this.prisma.owner.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
      },
    });

    if (!owner) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้นี้ในระบบ กรุณาเข้าสู่ระบบใหม่');
    }

    return owner;
  }
}
