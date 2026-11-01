import { Body, Controller, Inject, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/auth.decorators.js';
import { APP_ENV } from '../config/env.token.js';
import type { AppEnv } from '../config/env.js';
import { BookingLookupDto, CreateBookingDto } from './booking.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('api/v1/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService, @Inject(APP_ENV) private readonly env: AppEnv) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Body() input: CreateBookingDto, @Req() req: Request) { this.checkOrigin(req); return this.bookings.create(input); }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('lookup')
  status(@Body() input: BookingLookupDto, @Req() req: Request) { this.checkOrigin(req); return this.bookings.status(input.code, input.email, input.phone); }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('cancel')
  cancel(@Body() input: BookingLookupDto, @Req() req: Request) { this.checkOrigin(req); return this.bookings.cancel(input.code, input.email, input.phone); }

  private checkOrigin(req: Request) {
    if (req.headers.origin !== this.env.WEB_ORIGIN) throw new UnauthorizedException('Origin tidak diizinkan.');
  }
}
