import { Module } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { RoomController } from './room.controller.js';
import { ApartmentModule } from '../apartment/apartment.module.js';

@Module({
  imports: [ApartmentModule],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
