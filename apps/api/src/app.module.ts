import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminController } from './admin.controller.js';
import { DestinationsModule } from './destinations/destinations.module.js';
import { TripsModule } from './trips/trips.module.js';

@Module({ imports: [DatabaseModule, AuthModule, DestinationsModule, TripsModule], controllers: [HealthController, AdminController] })
export class AppModule {}
