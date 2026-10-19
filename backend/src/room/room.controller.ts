import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RoomService } from './room.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { BatchCreateRoomsDto } from './dto/batch-create-rooms.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentOwner } from '../auth/current-owner.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('apartment/:apartmentId')
  findByApartment(
    @Param('apartmentId') apartmentId: string,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.roomService.findByApartment(apartmentId, ownerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.roomService.findOne(id, ownerId);
  }

  @Post()
  create(@Body() dto: CreateRoomDto, @CurrentOwner('id') ownerId: string) {
    return this.roomService.create(dto, ownerId);
  }

  @Post('batch')
  batchCreate(@Body() dto: BatchCreateRoomsDto, @CurrentOwner('id') ownerId: string) {
    return this.roomService.batchCreate(dto, ownerId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.roomService.update(id, dto, ownerId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.roomService.remove(id, ownerId);
  }
}
