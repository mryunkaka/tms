import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';

@Injectable()
export class BookingExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpiryScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly bookings: BookingsService) {}

  onModuleInit() {
    this.timer = setInterval(() => { void this.run(); }, 60_000);
    this.timer.unref();
    void this.run();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    try {
      await this.bookings.expireDue();
    } catch {
      this.logger.error('Booking expiry job failed.');
    }
  }
}
