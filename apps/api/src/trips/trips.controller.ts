import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/auth.decorators.js';
import { TripQueryDto } from './trip-query.dto.js';
import { TripsService } from './trips.service.js';

@Controller('api/v1/trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Public()
  @Get()
  list(@Query() query: TripQueryDto) { return this.trips.listPublic(query); }

  @Public()
  @Get(':slug')
  detail(@Param('slug') slug: string) { return this.trips.detailPublic(slug); }
}
