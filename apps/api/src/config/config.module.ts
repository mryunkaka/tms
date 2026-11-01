import { Global, Module } from '@nestjs/common';
import { loadEnv } from './env.js';
import { APP_ENV } from './env.token.js';

@Global()
@Module({ providers: [{ provide: APP_ENV, useFactory: loadEnv }], exports: [APP_ENV] })
export class ConfigModule {}
