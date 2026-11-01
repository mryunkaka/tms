import { Controller, Get } from '@nestjs/common';
import { Roles } from './auth/auth.decorators.js';

@Controller('api/v1/admin')
@Roles('ADMIN')
export class AdminController {
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }
}
