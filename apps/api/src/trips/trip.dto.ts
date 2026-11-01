import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

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
