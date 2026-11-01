import { Body, Controller, Get, Patch, Post, Req, Param } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/auth.decorators.js';
import { CreateTripDto, UpdateTripDto } from './trip.dto.js';
import { TripsService } from './trips.service.js';

@Controller('api/v1/admin/trips')
@Roles('ADMIN')
export class AdminTripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list() { return this.trips.listAdmin(); }

  @Post()
  create(@Body() input: CreateTripDto, @Req() req: Request & { user: { sub: string } }) {
    return this.trips.createDraft(input, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateTripDto, @Req() req: Request & { user: { sub: string } }) {
    return this.trips.update(id, input, req.user.sub);
  }
}
