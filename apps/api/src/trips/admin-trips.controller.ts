import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/auth.decorators.js';
import { CreateTripDto } from './trip.dto.js';
import { TripsService } from './trips.service.js';

@Controller('api/v1/admin/trips')
@Roles('ADMIN')
export class AdminTripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@Body() input: CreateTripDto, @Req() req: Request & { user: { sub: string } }) {
    return this.trips.createDraft(input, req.user.sub);
  }
}
