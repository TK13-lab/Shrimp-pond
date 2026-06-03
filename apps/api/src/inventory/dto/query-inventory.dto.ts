import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class QueryInventoryDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsUUID(4)
  materialId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
