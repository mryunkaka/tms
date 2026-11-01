import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { BookingStatus } from '../generated/prisma/enums.js';

export class AdminBookingQueryDto {
  @IsOptional() @IsIn(['PENDING_DP', 'DP_PAID', 'PAID_IN_FULL', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'REFUND_PENDING', 'REFUNDED']) status?: BookingStatus;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
