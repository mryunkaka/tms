import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminController } from './admin.controller.js';

@Module({ imports: [DatabaseModule, AuthModule], controllers: [HealthController, AdminController] })
export class AppModule {}
