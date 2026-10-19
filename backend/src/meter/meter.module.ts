import { Module } from '@nestjs/common';
import { MeterService } from './meter.service.js';
import { MeterController } from './meter.controller.js';
import { ApartmentModule } from '../apartment/apartment.module.js';

@Module({
  imports: [ApartmentModule],
  controllers: [MeterController],
  providers: [MeterService],
  exports: [MeterService],
})
export class MeterModule {}
