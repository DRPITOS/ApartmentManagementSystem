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
import { ApartmentService } from './apartment.service.js';
import { CreateApartmentDto } from './dto/create-apartment.dto.js';
import { UpdateApartmentDto } from './dto/update-apartment.dto.js';
import { AddCoOwnerDto } from './dto/add-co-owner.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentOwner } from '../auth/current-owner.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('apartments')
export class ApartmentController {
  constructor(private readonly apartmentService: ApartmentService) {}

  @Get()
  findAll(@CurrentOwner('id') ownerId: string) {
    return this.apartmentService.findAllForOwner(ownerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.apartmentService.findOne(id, ownerId);
  }

  @Post()
  create(@Body() dto: CreateApartmentDto, @CurrentOwner('id') ownerId: string) {
    return this.apartmentService.create(dto, ownerId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApartmentDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.apartmentService.update(id, dto, ownerId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOwner('id') ownerId: string) {
    return this.apartmentService.remove(id, ownerId);
  }

  @Post(':id/owners')
  addCoOwner(
    @Param('id') id: string,
    @Body() dto: AddCoOwnerDto,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.apartmentService.addCoOwner(id, dto, ownerId);
  }

  @Delete(':id/owners/:targetOwnerId')
  removeCoOwner(
    @Param('id') id: string,
    @Param('targetOwnerId') targetOwnerId: string,
    @CurrentOwner('id') ownerId: string,
  ) {
    return this.apartmentService.removeCoOwner(id, targetOwnerId, ownerId);
  }
}
