import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsISO8601, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

export class TripDayDto {
  @IsInt() @Min(1) day!: number;
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class TripDestinationDto {
  @IsString() destinationId!: string;
  @IsInt() @Min(0) position!: number;
  @IsBoolean() isPrimary!: boolean;
}

export class CreateTripDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsString() @MaxLength(160) name!: string;
  @IsString() @MaxLength(2000) summary!: string;
  @IsInt() @Min(1) durationDays!: number;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TripDayDto) itinerary!: TripDayDto[];
  @IsArray() @IsString({ each: true }) inclusions!: string[];
  @IsArray() @IsString({ each: true }) exclusions!: string[];
  @IsString() @MaxLength(500) meetingPoint!: string;
  @IsString() @MaxLength(4000) terms!: string;
  @IsString() @MaxLength(4000) cancellationPolicy!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TripDestinationDto) destinations!: TripDestinationDto[];
}

export class UpdateTripDto {
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @IsOptional() @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TripDayDto) itinerary?: TripDayDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) inclusions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) exclusions?: string[];
  @IsOptional() @IsString() @MaxLength(500) meetingPoint?: string;
  @IsOptional() @IsString() @MaxLength(4000) terms?: string;
  @IsOptional() @IsString() @MaxLength(4000) cancellationPolicy?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TripDestinationDto) destinations?: TripDestinationDto[];
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class CreateTripScheduleDto {
  @IsString() tripId!: string;
  @IsISO8601() departureAt!: string;
  @IsInt() @Min(1) capacity!: number;
  @IsInt() @Min(0) priceIdr!: number;
  @IsInt() @Min(1) minimumPax!: number;
}

export class UpdateTripScheduleDto {
  @IsOptional() @IsISO8601() departureAt?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) priceIdr?: number;
  @IsOptional() @IsInt() @Min(1) minimumPax?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
