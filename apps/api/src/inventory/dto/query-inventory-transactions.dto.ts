import { Transform } from 'class-transformer';
import {
  InventoryTransactionType,
  ReferenceType
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class QueryInventoryTransactionsDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsUUID(4)
  materialId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  transactionType?: InventoryTransactionType;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsDateString()
  from?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsDateString()
  to?: string;
}
