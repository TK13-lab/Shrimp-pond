import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';
import { Role } from '@prisma/client';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateUserDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsUUID('4')
  farmId?: string;
}
