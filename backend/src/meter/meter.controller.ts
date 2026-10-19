import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MeterService } from './meter.service.js';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto.js';
import { UpdateMeterReadingDto } from './dto/update-meter-reading.dto.js';
import { BatchMeterReadingDto } from './dto/batch-meter-reading.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentOwner } from '../auth/current-owner.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('meters')
export class MeterController {
  constructor(private readonly meterService: MeterService) {}

  @Post()
  create(
    @Body() dto: CreateMeterReadingDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.meterService.create(dto, ownerId);
  }

  @Post('batch')
  batchRecord(
    @Body() dto: BatchMeterReadingDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.meterService.batchRecord(dto, ownerId);
  }

  @Get('latest/:roomId')
  getLatest(
    @Param('roomId') roomId: string,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.meterService.getLatestForRoom(roomId, ownerId);
  }

  @Get('apartment/:apartmentId')
  findByApartmentAndMonth(
    @Param('apartmentId') apartmentId: string,
    @Query('month') month: string,
    @CurrentOwner('id') ownerId: string,
  ) {
    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    return this.meterService.findByApartmentAndMonth(apartmentId, selectedMonth, ownerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.meterService.findOne(id, ownerId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.meterService.updateStatus(id, status, ownerId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeterReadingDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.meterService.update(id, dto, ownerId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.meterService.remove(id, ownerId);
  }
}
