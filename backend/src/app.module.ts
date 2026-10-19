import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisCacheModule } from './cache/redis-cache.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ApartmentModule } from './apartment/apartment.module.js';
import { RoomModule } from './room/room.module.js';
import { MeterModule } from './meter/meter.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RedisCacheModule,
    AuthModule,
    ApartmentModule,
    RoomModule,
    MeterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
