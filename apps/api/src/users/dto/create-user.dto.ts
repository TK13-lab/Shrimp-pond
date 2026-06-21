import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';
import { Role } from '@prisma/client';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateUserDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsEnum(Role)
  role!: Role;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsUUID('4')
  farmId?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
