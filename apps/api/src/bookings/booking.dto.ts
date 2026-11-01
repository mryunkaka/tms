import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsNotEmpty, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export class BookingParticipantDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() @MaxLength(160) fullName!: string;
}

export class CreateBookingDto {
  @IsString() @IsNotEmpty() scheduleId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() @MaxLength(160) bookerName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsEmail() @MaxLength(254) email!: string;
  @Matches(/^\+?[0-9]{8,15}$/) phone!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => BookingParticipantDto) participants!: BookingParticipantDto[];
}

export class BookingContactDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsEmail() @MaxLength(254) email!: string;
  @Matches(/^\+?[0-9]{8,15}$/) phone!: string;
}

export class BookingLookupDto extends BookingContactDto {
  @Matches(/^[A-Z0-9_-]{16}$/) code!: string;
}
