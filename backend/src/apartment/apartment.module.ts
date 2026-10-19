import { Module } from '@nestjs/common';
import { ApartmentService } from './apartment.service.js';
import { ApartmentController } from './apartment.controller.js';

@Module({
  controllers: [ApartmentController],
  providers: [ApartmentService],
  exports: [ApartmentService],
})
export class ApartmentModule {}
