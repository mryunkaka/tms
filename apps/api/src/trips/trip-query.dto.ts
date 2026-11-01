import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Matches, Max, Min } from 'class-validator';

export class TripQueryDto {
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) destination?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minDuration?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxDuration?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2_147_483_647) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2_147_483_647) maxPrice?: number;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
