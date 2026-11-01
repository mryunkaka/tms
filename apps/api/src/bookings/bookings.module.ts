import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { BookingExpiryScheduler } from './booking-expiry.scheduler.js';
import { AdminBookingsController } from './admin-bookings.controller.js';

@Module({ imports: [DatabaseModule, ConfigModule], controllers: [BookingsController, AdminBookingsController], providers: [BookingsService, BookingExpiryScheduler] })
export class BookingsModule {}
