import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { AdminBookingQueryDto } from './admin-booking-query.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('api/v1/admin/bookings')
@Roles('ADMIN')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@Query() query: AdminBookingQueryDto) { return this.bookings.listAdmin(query); }
}
