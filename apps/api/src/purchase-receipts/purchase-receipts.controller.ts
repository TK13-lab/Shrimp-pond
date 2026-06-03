import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUserProfile, HttpRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { QueryPurchaseReceiptsDto } from './dto/query-purchase-receipts.dto';
import { PurchaseReceiptsService } from './purchase-receipts.service';

@Controller('purchase-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseReceiptsController {
  constructor(
    private readonly purchaseReceiptsService: PurchaseReceiptsService
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findAll(
    @CurrentUser() user: AuthUserProfile,
    @Query() query: QueryPurchaseReceiptsDto
  ) {
    return this.purchaseReceiptsService.findAll(user, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findOne(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) receiptId: string
  ) {
    return this.purchaseReceiptsService.findOne(user, receiptId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  create(
    @CurrentUser() user: AuthUserProfile,
    @Body() createPurchaseReceiptDto: CreatePurchaseReceiptDto,
    @Req() request: HttpRequest
  ) {
    return this.purchaseReceiptsService.create(user, createPurchaseReceiptDto, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      idempotencyKey: this.getHeaderValue(request, 'x-idempotency-key'),
      ipAddress: this.getRequestIp(request)
    });
  }

  @Patch(':id/submit')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  submit(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) receiptId: string,
    @Req() request: HttpRequest
  ) {
    return this.purchaseReceiptsService.submit(user, receiptId, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  approve(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) receiptId: string,
    @Req() request: HttpRequest
  ) {
    return this.purchaseReceiptsService.approve(user, receiptId, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
  }

  private getHeaderValue(request: HttpRequest, key: string): string | null {
    const value = request.headers[key];

    if (!value) {
      return null;
    }

    return Array.isArray(value) ? value[0] : value;
  }

  private getRequestIp(request: HttpRequest): string | null {
    const forwarded = request.headers['x-forwarded-for'];

    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded;
    }

    return request.ip ?? null;
  }
}
