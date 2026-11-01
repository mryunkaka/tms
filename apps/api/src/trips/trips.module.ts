import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TripsController } from './trips.controller.js';
import { AdminTripsController } from './admin-trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({ imports: [DatabaseModule], controllers: [TripsController, AdminTripsController], providers: [TripsService] })
export class TripsModule {}
