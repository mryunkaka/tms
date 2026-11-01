import { Body, Controller, Delete, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/auth.decorators.js';
import { CreateTripScheduleDto, UpdateTripScheduleDto } from './trip.dto.js';
import { TripsService } from './trips.service.js';

@Controller('api/v1/admin/schedules')
@Roles('ADMIN')
export class AdminSchedulesController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@Body() input: CreateTripScheduleDto, @Req() req: Request & { user: { sub: string } }) {
    const { tripId, ...schedule } = input;
    return this.trips.createSchedule(tripId, schedule, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateTripScheduleDto, @Req() req: Request & { user: { sub: string } }) {
    return this.trips.updateSchedule(id, input, req.user.sub);
  }

  @Delete(':id')
  archive(@Param('id') id: string, @Req() req: Request & { user: { sub: string } }) {
    return this.trips.updateSchedule(id, { isActive: false }, req.user.sub);
  }
}
