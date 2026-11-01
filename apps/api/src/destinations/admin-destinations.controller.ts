import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/auth.decorators.js';
import { CreateDestinationDto, UpdateDestinationDto } from './destination.dto.js';
import { DestinationsService } from './destinations.service.js';

@Controller('api/v1/admin/destinations')
@Roles('ADMIN')
export class AdminDestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Get()
  list() { return this.destinations.listAdmin(); }

  @Post()
  create(@Body() input: CreateDestinationDto, @Req() req: Request & { user: { sub: string } }) { return this.destinations.create(input, req.user.sub); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateDestinationDto, @Req() req: Request & { user: { sub: string } }) { return this.destinations.update(id, input, req.user.sub); }

  @Delete(':id')
  archive(@Param('id') id: string, @Req() req: Request & { user: { sub: string } }) { return this.destinations.archive(id, req.user.sub); }
}
