import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DestinationsController } from './destinations.controller.js';
import { AdminDestinationsController } from './admin-destinations.controller.js';
import { DestinationsService } from './destinations.service.js';

@Module({ imports: [DatabaseModule], controllers: [DestinationsController, AdminDestinationsController], providers: [DestinationsService] })
export class DestinationsModule {}
