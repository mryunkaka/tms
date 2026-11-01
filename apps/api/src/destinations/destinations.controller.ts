import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.decorators.js';
import { DestinationsService } from './destinations.service.js';

@Controller('api/v1/destinations')
export class DestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Public()
  @Get()
  list() {
    return this.destinations.publicTree();
  }
}
