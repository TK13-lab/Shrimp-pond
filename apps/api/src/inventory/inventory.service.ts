import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { AuthUserProfile } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryInventoryTransactionsDto } from './dto/query-inventory-transactions.dto';

const inventoryTransactionInclude = {
  material: {
    select: {
      id: true,
      name: true
    }
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true
    }
  }
} satisfies Prisma.InventoryTransactionInclude;

type InventoryTransactionRecord = Prisma.InventoryTransactionGetPayload<{
  include: typeof inventoryTransactionInclude;
}>;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findBalances(user: AuthUserProfile, query: QueryInventoryDto) {
    const where: Prisma.InventoryBalanceWhereInput = {};

    where.currentQuantity = {
      gt: new Prisma.Decimal(0)
    };

    if (user.role !== Role.ADMIN || user.farmId) {
      where.farmId = this.requireScopedFarmId(user);
    }

    if (query.materialId) {
      where.materialId = query.materialId;
    }

    if (query.search) {
      where.materialName = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    const balances = await this.prisma.inventoryBalance.findMany({
      where,
      orderBy: [{ materialName: 'asc' }, { unit: 'asc' }]
    });

    return {
      items: balances.map((balance) => ({
        id: balance.id,
        farmId: balance.farmId,
        materialId: balance.materialId,
        materialName: balance.materialName,
        unit: balance.unit,
        currentQuantity: balance.currentQuantity.toString(),
        averagePrice: balance.averagePrice.toString(),
        totalValue: balance.currentQuantity.mul(balance.averagePrice).toString(),
        updatedAt: balance.updatedAt.toISOString()
      }))
    };
  }

  async findTransactions(
    user: AuthUserProfile,
    query: QueryInventoryTransactionsDto
  ) {
    const where = this.buildTransactionsWhere(user, query);

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where,
      include: inventoryTransactionInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    return {
      items: transactions.map((transaction) =>
        this.serializeTransaction(transaction)
      )
    };
  }

  private buildTransactionsWhere(
    user: AuthUserProfile,
    query: QueryInventoryTransactionsDto
  ): Prisma.InventoryTransactionWhereInput {
    const where: Prisma.InventoryTransactionWhereInput = {};

    if (user.role !== Role.ADMIN || user.farmId) {
      where.farmId = this.requireScopedFarmId(user);
    }

    if (query.materialId) {
      where.materialId = query.materialId;
    }

    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query.referenceType) {
      where.referenceType = query.referenceType;
    }

    if (query.referenceId) {
      where.referenceId = query.referenceId;
    }

    const createdAt = this.buildCreatedAtWhere(query);

    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private buildCreatedAtWhere(
    query: QueryInventoryTransactionsDto
  ): Prisma.DateTimeFilter | undefined {
    if (!query.from && !query.to) {
      return undefined;
    }

    const gte = query.from ? this.startOfUtcDay(query.from) : undefined;
    const lte = query.to ? this.endOfUtcDay(query.to) : undefined;

    if (gte && lte && gte.getTime() > lte.getTime()) {
      throw new BadRequestException('Khoảng ngày không hợp lệ');
    }

    return {
      gte,
      lte
    };
  }

  private startOfUtcDay(value: string): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);

    return date;
  }

  private endOfUtcDay(value: string): Date {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);

    return date;
  }

  private serializeTransaction(transaction: InventoryTransactionRecord) {
    return {
      id: transaction.id,
      farmId: transaction.farmId,
      materialId: transaction.materialId,
      materialName: transaction.material.name,
      transactionType: transaction.transactionType,
      quantityChange: transaction.quantityChange.toString(),
      unit: transaction.unit,
      unitPrice: transaction.unitPrice.toString(),
      totalAmount: transaction.totalAmount.toString(),
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      createdById: transaction.createdById,
      createdBy: {
        id: transaction.createdBy.id,
        fullName: transaction.createdBy.fullName,
        username: transaction.createdBy.username,
        role: transaction.createdBy.role
      },
      createdAt: transaction.createdAt.toISOString()
    };
  }

  private requireScopedFarmId(user: AuthUserProfile): string {
    if (!user.farmId) {
      throw new ForbiddenException('Tài khoản chưa được gán trại');
    }

    return user.farmId;
  }
}
