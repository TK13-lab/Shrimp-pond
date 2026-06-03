import { Transform } from 'class-transformer';
import { ReceiptStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class QueryPurchaseReceiptsDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsDateString()
  from?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsDateString()
  to?: string;
}
