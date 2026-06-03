import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUserProfile } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryInventoryTransactionsDto } from './dto/query-inventory-transactions.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findBalances(
    @CurrentUser() user: AuthUserProfile,
    @Query() query: QueryInventoryDto
  ) {
    return this.inventoryService.findBalances(user, query);
  }

  @Get('transactions')
  @Roles(Role.ADMIN, Role.MANAGER)
  findTransactions(
    @CurrentUser() user: AuthUserProfile,
    @Query() query: QueryInventoryTransactionsDto
  ) {
    return this.inventoryService.findTransactions(user, query);
  }
}
