import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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

export class QueryMaterialsDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @Transform(({ value }) => normalizeBoolean(value))
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
