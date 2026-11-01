import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators.js';

@Controller('api/v1/health')
export class HealthController {
  @Get()
  @Public()
  health() {
    return { status: 'ok' };
  }
}
