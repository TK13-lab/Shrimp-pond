import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';

function normalizeBoolean(value: unknown): unknown {
  if (typeof value === 'boolean' || value === undefined) {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return value;
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class QueryUsersDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Transform(({ value }) => normalizeBoolean(value))
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
