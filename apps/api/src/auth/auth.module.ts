import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_ENV } from '../config/env.token.js';
import { ConfigModule } from '../config/config.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './auth.guard.js';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({ imports: [ConfigModule], inject: [APP_ENV], useFactory: (env: { JWT_ACCESS_SECRET: string; ACCESS_TOKEN_TTL_SECONDS: number }) => ({ secret: env.JWT_ACCESS_SECRET, signOptions: { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS } }) }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AuthModule {}
