import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateDestinationDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(2_147_483_647) sortOrder?: number;
}

export class UpdateDestinationDto {
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(2_147_483_647) sortOrder?: number;
}
