import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import {
  InventoryTransactionType,
  Material,
  Prisma,
  PurchaseReceiptItem,
  ReceiptStatus,
  ReferenceType,
  Role,
  User
} from '@prisma/client';
import { createHash } from 'crypto';

import { AuthUserProfile } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseReceiptDto,
  CreatePurchaseReceiptItemDto
} from './dto/create-purchase-receipt.dto';
import { QueryPurchaseReceiptsDto } from './dto/query-purchase-receipts.dto';

const receiptActorSelect = {
  id: true,
  fullName: true,
  username: true,
  role: true
} satisfies Prisma.UserSelect;

const receiptDetailInclude = {
  items: true,
  createdBy: {
    select: receiptActorSelect
  },
  submittedBy: {
    select: receiptActorSelect
  },
  approvedBy: {
    select: receiptActorSelect
  }
} satisfies Prisma.PurchaseReceiptInclude;

const receiptSummaryInclude = {
  createdBy: {
    select: receiptActorSelect
  },
  submittedBy: {
    select: receiptActorSelect
  },
  approvedBy: {
    select: receiptActorSelect
  },
  _count: {
    select: {
      items: true
    }
  }
} satisfies Prisma.PurchaseReceiptInclude;

type RequestMeta = {
  deviceId?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
};

type MaterialRecord = Pick<Material, 'defaultUnit' | 'farmId' | 'id' | 'name'>;
type ReceiptActorRecord = Pick<User, 'fullName' | 'id' | 'role' | 'username'>;
type ReceiptSummaryRecord = Prisma.PurchaseReceiptGetPayload<{
  include: typeof receiptSummaryInclude;
}>;
type ReceiptWithRelations = Prisma.PurchaseReceiptGetPayload<{
  include: typeof receiptDetailInclude;
}>;
type SerializedReceiptActor = {
  fullName: string;
  id: string;
  role: Role;
  username: string;
};

type SerializedPurchaseReceiptItem = {
  createdAt: string;
  id: string;
  lineTotal: string;
  materialId: string | null;
  materialName: string;
  quantity: string;
  receiptId: string;
  unit: string;
  unitPrice: string;
};

type SerializedPurchaseReceiptSummary = {
  approvedAt: string | null;
  approvedBy: SerializedReceiptActor | null;
  approvedById: string | null;
  createdAt: string;
  createdBy: SerializedReceiptActor;
  createdById: string;
  farmId: string;
  id: string;
  itemCount: number;
  receiptCode: string;
  receiptDate: string;
  rejectReason: string | null;
  rejectedAt: string | null;
  status: string;
  submittedAt: string | null;
  submittedBy: SerializedReceiptActor | null;
  submittedById: string | null;
  supplierName: string | null;
  totalAmount: string;
  updatedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
};

type SerializedPurchaseReceipt = {
  approvedAt: string | null;
  approvedBy: SerializedReceiptActor | null;
  approvedById: string | null;
  clientRequestId: string | null;
  createdAt: string;
  createdBy: SerializedReceiptActor;
  createdById: string;
  farmId: string;
  id: string;
  itemCount: number;
  items: SerializedPurchaseReceiptItem[];
  note: string | null;
  receiptCode: string;
  receiptDate: string;
  rejectReason: string | null;
  rejectedAt: string | null;
  status: string;
  submittedAt: string | null;
  submittedBy: SerializedReceiptActor | null;
  submittedById: string | null;
  supplierName: string | null;
  totalAmount: string;
  updatedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
};

type InventoryApprovalLine = {
  materialId: string;
  materialName: string;
  quantityChange: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  unit: string;
  unitPrice: Prisma.Decimal;
};

@Injectable()
export class PurchaseReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUserProfile, query: QueryPurchaseReceiptsDto) {
    const where = this.buildReceiptListWhere(user, query);

    const receipts = await this.prisma.purchaseReceipt.findMany({
      where,
      include: receiptSummaryInclude,
      orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }]
    });

    return {
      items: receipts.map((receipt) => this.serializeReceiptSummary(receipt))
    };
  }

  async findOne(
    user: AuthUserProfile,
    receiptId: string
  ): Promise<SerializedPurchaseReceipt> {
    const receipt = await this.loadReceiptEntityById(receiptId);

    this.assertCanViewReceipt(user, receipt);

    return this.serializeReceipt(receipt);
  }

  async create(
    user: AuthUserProfile,
    dto: CreatePurchaseReceiptDto,
    meta: RequestMeta
  ): Promise<SerializedPurchaseReceipt> {
    const farmId = await this.resolveWritableFarmId(user);
    const clientRequestId = this.resolveClientRequestId(dto, meta);
    const normalized = this.normalizeReceiptInput(dto, clientRequestId);
    const requestHash = this.buildRequestHash(user.id, farmId, normalized);

    const existingResponse = await this.resolveDuplicateIfExists(
      user.id,
      clientRequestId,
      requestHash
    );

    if (existingResponse) {
      return existingResponse;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.idempotencyKey.create({
            data: {
              userId: user.id,
              clientRequestId,
              requestHash
            }
          });

          const materialsById = await this.loadMaterialsById(
            tx,
            farmId,
            normalized.items
          );
          const receiptCode = await this.generateReceiptCode(
            tx,
            farmId,
            normalized.receiptDate
          );

          const receiptItemsData = this.buildReceiptItemsData(
            normalized.items,
            materialsById
          );
          const totalAmount = receiptItemsData.reduce(
            (sum, item) => sum.add(item.lineTotal),
            new Prisma.Decimal(0)
          );

          const createdReceipt = await tx.purchaseReceipt.create({
            data: {
              farmId,
              receiptCode,
              receiptDate: normalized.receiptDate,
              supplierName: normalized.supplierName,
              status: 'DRAFT',
              note: normalized.note,
              totalAmount,
              createdById: user.id,
              clientRequestId,
              items: {
                create: receiptItemsData.map((item) => ({
                  materialId: item.materialId,
                  materialName: item.materialName,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal
                }))
              }
            },
            include: receiptDetailInclude
          });

          const serialized = this.serializeReceipt(createdReceipt);

          await tx.idempotencyKey.update({
            where: {
              userId_clientRequestId: {
                userId: user.id,
                clientRequestId
              }
            },
            data: {
              responseEntityId: createdReceipt.id,
              responseBody: serialized
            }
          });

          await tx.auditLog.create({
            data: {
              farmId,
              userId: user.id,
              action: 'CREATE_RECEIPT',
              entityType: 'PURCHASE_RECEIPT',
              entityId: createdReceipt.id,
              oldValueJson: Prisma.JsonNull,
              newValueJson: {
                id: createdReceipt.id,
                receiptCode: createdReceipt.receiptCode,
                status: createdReceipt.status,
                totalAmount: serialized.totalAmount,
                itemCount: createdReceipt.items.length,
                supplierName: createdReceipt.supplierName,
                clientRequestId
              },
              deviceId: meta.deviceId ?? null,
              ipAddress: meta.ipAddress ?? null
            }
          });

          return serialized;
        });
      } catch (error) {
        if (this.isReceiptCodeConflict(error) && attempt < 4) {
          continue;
        }

        if (this.isIdempotencyConflict(error)) {
          const duplicate = await this.resolveDuplicateIfExists(
            user.id,
            clientRequestId,
            requestHash
          );

          if (duplicate) {
            return duplicate;
          }
        }

        throw error;
      }
    }

    throw new InternalServerErrorException('Không thể tạo mã phiếu nhập');
  }

  async submit(
    user: AuthUserProfile,
    receiptId: string,
    meta: RequestMeta
  ): Promise<SerializedPurchaseReceipt> {
    const receipt = await this.loadReceiptEntityById(receiptId);

    this.assertCanSubmitReceipt(user, receipt);

    if (receipt.status !== ReceiptStatus.DRAFT) {
      throw new ConflictException('Chỉ có thể gửi duyệt phiếu ở trạng thái nháp');
    }

    this.assertReceiptItemsValid(receipt.items);

    const submittedAt = new Date();

    const updatedReceipt = await this.prisma.$transaction(async (tx) => {
      const nextReceipt = await tx.purchaseReceipt.update({
        where: {
          id: receipt.id
        },
        data: {
          status: ReceiptStatus.SUBMITTED,
          submittedById: user.id,
          submittedAt
        },
        include: receiptDetailInclude
      });

      await tx.auditLog.create({
        data: {
          farmId: nextReceipt.farmId,
          userId: user.id,
          action: 'SUBMIT_RECEIPT',
          entityType: 'PURCHASE_RECEIPT',
          entityId: nextReceipt.id,
          oldValueJson: {
            id: receipt.id,
            receiptCode: receipt.receiptCode,
            status: receipt.status,
            submittedById: receipt.submittedById,
            submittedAt: this.serializeDate(receipt.submittedAt)
          },
          newValueJson: {
            id: nextReceipt.id,
            receiptCode: nextReceipt.receiptCode,
            status: nextReceipt.status,
            submittedById: nextReceipt.submittedById,
            submittedAt: this.serializeDate(nextReceipt.submittedAt)
          },
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return nextReceipt;
    });

    return this.serializeReceipt(updatedReceipt);
  }

  async approve(
    user: AuthUserProfile,
    receiptId: string,
    meta: RequestMeta
  ): Promise<SerializedPurchaseReceipt> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const approvedReceipt = await this.prisma.$transaction(
          async (tx) => {
            const receipt = await tx.purchaseReceipt.findUnique({
              where: {
                id: receiptId
              },
              include: receiptDetailInclude
            });

            if (!receipt) {
              throw new NotFoundException('Không tìm thấy phiếu nhập');
            }

            this.assertCanApproveReceipt(user, receipt);

            if (receipt.status !== ReceiptStatus.SUBMITTED) {
              throw new ConflictException(
                'Chỉ có thể duyệt phiếu ở trạng thái đã gửi'
              );
            }

            this.assertReceiptItemsValid(receipt.items);

            const inventoryLines = await this.buildInventoryApprovalLines(
              tx,
              receipt
            );
            const approvedAt = new Date();
            const statusUpdate = await tx.purchaseReceipt.updateMany({
              where: {
                id: receipt.id,
                status: ReceiptStatus.SUBMITTED
              },
              data: {
                status: ReceiptStatus.APPROVED,
                approvedById: user.id,
                approvedAt
              }
            });

            if (statusUpdate.count !== 1) {
              throw new ConflictException(
                'Phiếu nhập đã được xử lý bởi yêu cầu khác'
              );
            }

            for (const line of inventoryLines) {
              await this.createInventoryTransaction(
                tx,
                receipt.farmId,
                receipt.id,
                user.id,
                line
              );
              await this.applyStockInToInventoryBalance(tx, receipt.farmId, line);
            }

            const nextReceipt = await tx.purchaseReceipt.findUnique({
              where: {
                id: receipt.id
              },
              include: receiptDetailInclude
            });

            if (!nextReceipt) {
              throw new NotFoundException('Không tìm thấy phiếu nhập');
            }

            await tx.auditLog.create({
              data: {
                farmId: nextReceipt.farmId,
                userId: user.id,
                action: 'APPROVE_RECEIPT',
                entityType: 'PURCHASE_RECEIPT',
                entityId: nextReceipt.id,
                oldValueJson: {
                  id: receipt.id,
                  receiptCode: receipt.receiptCode,
                  status: receipt.status,
                  approvedById: receipt.approvedById,
                  approvedAt: this.serializeDate(receipt.approvedAt)
                },
                newValueJson: {
                  id: nextReceipt.id,
                  receiptCode: nextReceipt.receiptCode,
                  status: nextReceipt.status,
                  approvedById: nextReceipt.approvedById,
                  approvedAt: this.serializeDate(nextReceipt.approvedAt),
                  inventoryTransactionCount: inventoryLines.length,
                  inventoryLines: inventoryLines.map((line) => ({
                    materialId: line.materialId,
                    materialName: line.materialName,
                    quantityChange: line.quantityChange.toString(),
                    unit: line.unit,
                    unitPrice: line.unitPrice.toString(),
                    totalAmount: line.totalAmount.toString()
                  }))
                },
                deviceId: meta.deviceId ?? null,
                ipAddress: meta.ipAddress ?? null
              }
            });

            return nextReceipt;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
          }
        );

        return this.serializeReceipt(approvedReceipt);
      } catch (error) {
        if (
          attempt < 2 &&
          (this.isInventoryBalanceConflict(error) ||
            this.isSerializableWriteConflict(error))
        ) {
          continue;
        }

        this.rethrowApproveWriteError(error);
      }
    }

    throw new InternalServerErrorException('Không thể duyệt phiếu nhập');
  }

  private buildReceiptItemsData(
    items: ReturnType<PurchaseReceiptsService['normalizeReceiptInput']>['items'],
    materialsById: Map<string, MaterialRecord>
  ) {
    return items.map((item) => {
      const material = item.materialId ? materialsById.get(item.materialId) : null;
      const quantity = new Prisma.Decimal(item.quantity.toString());
      const unitPrice = new Prisma.Decimal(item.unitPrice.toString());
      const lineTotal = quantity.mul(unitPrice);

      return {
        materialId: material?.id ?? null,
        materialName: material?.name ?? item.materialName,
        quantity,
        unit: item.unit,
        unitPrice,
        lineTotal
      };
    });
  }

  private buildRequestHash(
    userId: string,
    farmId: string,
    normalized: ReturnType<PurchaseReceiptsService['normalizeReceiptInput']>
  ): string {
    const hashPayload = {
      userId,
      farmId,
      clientRequestId: normalized.clientRequestId,
      receiptDate: normalized.receiptDate.toISOString(),
      supplierName: normalized.supplierName,
      note: normalized.note,
      items: normalized.items.map((item) => ({
        materialId: item.materialId ?? null,
        materialName: item.materialName,
        quantity: item.quantity.toFixed(3),
        unit: item.unit,
        unitPrice: item.unitPrice.toFixed(2)
      }))
    };

    return createHash('sha256')
      .update(JSON.stringify(hashPayload))
      .digest('hex');
  }

  private async generateReceiptCode(
    tx: Prisma.TransactionClient,
    farmId: string,
    receiptDate: Date
  ): Promise<string> {
    const prefix = `PN-${this.formatDateToken(receiptDate)}`;
    const count = await tx.purchaseReceipt.count({
      where: {
        farmId,
        receiptCode: {
          startsWith: prefix
        }
      }
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private async loadMaterialsById(
    tx: Prisma.TransactionClient,
    farmId: string,
    items: ReturnType<PurchaseReceiptsService['normalizeReceiptInput']>['items']
  ): Promise<Map<string, MaterialRecord>> {
    const materialIds = Array.from(
      new Set(
        items
          .map((item) => item.materialId)
          .filter((materialId): materialId is string => Boolean(materialId))
      )
    );

    if (materialIds.length === 0) {
      return new Map();
    }

    const materials = await tx.material.findMany({
      where: {
        id: {
          in: materialIds
        },
        farmId
      },
      select: {
        id: true,
        farmId: true,
        name: true,
        defaultUnit: true
      }
    });

    if (materials.length !== materialIds.length) {
      throw new NotFoundException('Có vật tư không tồn tại trong trại');
    }

    return new Map(materials.map((material) => [material.id, material]));
  }

  private async buildInventoryApprovalLines(
    tx: Prisma.TransactionClient,
    receipt: ReceiptWithRelations
  ): Promise<InventoryApprovalLine[]> {
    const materialIds = this.resolveReceiptMaterialIdsForInventory(receipt.items);
    const materials = await tx.material.findMany({
      where: {
        id: {
          in: materialIds
        },
        farmId: receipt.farmId
      },
      select: {
        id: true,
        name: true
      }
    });
    const materialsById = new Map(
      materials.map((material) => [material.id, material])
    );

    if (materialsById.size !== materialIds.length) {
      throw new NotFoundException('Có vật tư không tồn tại trong trại');
    }

    const linesByMaterialId = new Map<string, InventoryApprovalLine>();

    for (const item of receipt.items) {
      const materialId = item.materialId;

      if (!materialId) {
        throw new BadRequestException(
          'Chỉ có thể duyệt các dòng vật tư đã liên kết danh mục'
        );
      }

      const material = materialsById.get(materialId);

      if (!material) {
        throw new NotFoundException('Có vật tư không tồn tại trong trại');
      }

      const existingLine = linesByMaterialId.get(materialId);

      if (existingLine) {
        if (existingLine.unit !== item.unit) {
          throw new BadRequestException(
            'Một vật tư trong cùng phiếu nhập phải dùng cùng đơn vị tính'
          );
        }

        existingLine.quantityChange = existingLine.quantityChange.add(
          item.quantity
        );
        existingLine.totalAmount = existingLine.totalAmount.add(item.lineTotal);
        existingLine.unitPrice = this.calculateUnitPrice(
          existingLine.totalAmount,
          existingLine.quantityChange
        );
        continue;
      }

      linesByMaterialId.set(materialId, {
        materialId,
        materialName: material.name,
        quantityChange: item.quantity,
        totalAmount: item.lineTotal,
        unit: item.unit,
        unitPrice: this.calculateUnitPrice(item.lineTotal, item.quantity)
      });
    }

    return Array.from(linesByMaterialId.values());
  }

  private resolveReceiptMaterialIdsForInventory(
    items: PurchaseReceiptItem[]
  ): string[] {
    const materialIds = Array.from(
      new Set(
        items.map((item) => {
          if (!item.materialId) {
            throw new BadRequestException(
              'Chỉ có thể duyệt các dòng vật tư đã liên kết danh mục'
            );
          }

          return item.materialId;
        })
      )
    );

    if (materialIds.length === 0) {
      throw new BadRequestException('Phiếu nhập phải có vật tư để cập nhật kho');
    }

    return materialIds;
  }

  private async createInventoryTransaction(
    tx: Prisma.TransactionClient,
    farmId: string,
    receiptId: string,
    userId: string,
    line: InventoryApprovalLine
  ): Promise<void> {
    await tx.inventoryTransaction.create({
      data: {
        farmId,
        materialId: line.materialId,
        transactionType: InventoryTransactionType.STOCK_IN,
        quantityChange: line.quantityChange,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalAmount: line.totalAmount,
        referenceType: ReferenceType.PURCHASE_RECEIPT,
        referenceId: receiptId,
        createdById: userId
      }
    });
  }

  private async applyStockInToInventoryBalance(
    tx: Prisma.TransactionClient,
    farmId: string,
    line: InventoryApprovalLine
  ): Promise<void> {
    const existingBalance = await tx.inventoryBalance.findUnique({
      where: {
        farmId_materialId_unit: {
          farmId,
          materialId: line.materialId,
          unit: line.unit
        }
      }
    });

    if (!existingBalance) {
      await tx.inventoryBalance.create({
        data: {
          farmId,
          materialId: line.materialId,
          materialName: line.materialName,
          unit: line.unit,
          currentQuantity: line.quantityChange,
          averagePrice: line.unitPrice
        }
      });
      return;
    }

    const nextQuantity = existingBalance.currentQuantity.add(line.quantityChange);
    const nextTotalValue = existingBalance.currentQuantity
      .mul(existingBalance.averagePrice)
      .add(line.totalAmount);
    const nextAveragePrice = nextQuantity.gt(0)
      ? nextTotalValue.div(nextQuantity)
      : new Prisma.Decimal(0);

    await tx.inventoryBalance.update({
      where: {
        farmId_materialId_unit: {
          farmId,
          materialId: line.materialId,
          unit: line.unit
        }
      },
      data: {
        materialName: line.materialName,
        currentQuantity: nextQuantity,
        averagePrice: nextAveragePrice
      }
    });
  }

  private calculateUnitPrice(
    totalAmount: Prisma.Decimal,
    quantity: Prisma.Decimal
  ): Prisma.Decimal {
    if (quantity.lte(0)) {
      throw new BadRequestException('Số lượng phải lớn hơn 0');
    }

    return totalAmount.div(quantity);
  }

  private normalizeReceiptInput(
    dto: CreatePurchaseReceiptDto,
    clientRequestId: string
  ) {
    const items = dto.items.map((item) => this.normalizeReceiptItem(item));

    return {
      clientRequestId,
      receiptDate: new Date(dto.receiptDate),
      supplierName: this.normalizeOptionalString(dto.supplierName),
      note: this.normalizeOptionalString(dto.note),
      items
    };
  }

  private normalizeReceiptItem(item: CreatePurchaseReceiptItemDto) {
    return {
      materialId: item.materialId?.trim() || null,
      materialName: item.materialName.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
      unitPrice: Number(item.unitPrice)
    };
  }

  private normalizeOptionalString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveClientRequestId(
    dto: CreatePurchaseReceiptDto,
    meta: RequestMeta
  ): string {
    const clientRequestId = dto.clientRequestId?.trim() || meta.idempotencyKey?.trim();

    if (!clientRequestId) {
      throw new BadRequestException(
        'Thiếu clientRequestId hoặc X-Idempotency-Key'
      );
    }

    return clientRequestId;
  }

  private async resolveDuplicateIfExists(
    userId: string,
    clientRequestId: string,
    requestHash: string
  ): Promise<SerializedPurchaseReceipt | null> {
    const idempotencyKey = await this.prisma.idempotencyKey.findUnique({
      where: {
        userId_clientRequestId: {
          userId,
          clientRequestId
        }
      }
    });

    if (idempotencyKey) {
      if (idempotencyKey.requestHash && idempotencyKey.requestHash !== requestHash) {
        throw new ConflictException(
          'clientRequestId đã được dùng cho dữ liệu khác'
        );
      }

      if (idempotencyKey.responseBody) {
        return idempotencyKey.responseBody as SerializedPurchaseReceipt;
      }

      if (idempotencyKey.responseEntityId) {
        return this.loadReceiptById(idempotencyKey.responseEntityId);
      }
    }

    const existingReceipt = await this.prisma.purchaseReceipt.findUnique({
      where: {
        createdById_clientRequestId: {
          createdById: userId,
          clientRequestId
        }
      },
      include: receiptDetailInclude
    });

    if (!existingReceipt) {
      return null;
    }

    return this.serializeReceipt(existingReceipt);
  }

  private async loadReceiptById(
    receiptId: string
  ): Promise<SerializedPurchaseReceipt> {
    const receipt = await this.loadReceiptEntityById(receiptId);

    return this.serializeReceipt(receipt);
  }

  private async loadReceiptEntityById(
    receiptId: string
  ): Promise<ReceiptWithRelations> {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: {
        id: receiptId
      },
      include: receiptDetailInclude
    });

    if (!receipt) {
      throw new NotFoundException('Không tìm thấy phiếu nhập');
    }

    return receipt;
  }

  private async resolveWritableFarmId(user: AuthUserProfile): Promise<string> {
    if (user.farmId) {
      return user.farmId;
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Tài khoản chưa được gán trại');
    }

    const farms = await this.prisma.farm.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 2
    });

    if (farms.length === 1) {
      return farms[0].id;
    }

    if (farms.length === 0) {
      throw new BadRequestException('Chưa có trại nào để tạo phiếu nhập');
    }

    throw new BadRequestException(
      'Admin cần được gán trại hoặc API cần mở rộng để chọn trại cụ thể'
    );
  }

  private requireScopedFarmId(user: AuthUserProfile): string {
    if (!user.farmId) {
      throw new ForbiddenException('Tài khoản chưa được gán trại');
    }

    return user.farmId;
  }

  private buildReceiptListWhere(
    user: AuthUserProfile,
    query: QueryPurchaseReceiptsDto
  ): Prisma.PurchaseReceiptWhereInput {
    const where = this.buildVisibleReceiptsWhere(user);
    const receiptDate = this.buildReceiptDateWhere(query);

    if (query.status) {
      where.status = query.status;
    }

    if (receiptDate) {
      where.receiptDate = receiptDate;
    }

    return where;
  }

  private buildVisibleReceiptsWhere(
    user: AuthUserProfile
  ): Prisma.PurchaseReceiptWhereInput {
    if (user.role === Role.ADMIN) {
      return user.farmId
        ? {
            farmId: user.farmId
          }
        : {};
    }

    if (user.role === Role.MANAGER) {
      return {
        farmId: this.requireScopedFarmId(user)
      };
    }

    return {
      farmId: this.requireScopedFarmId(user),
      createdById: user.id
    };
  }

  private buildReceiptDateWhere(
    query: QueryPurchaseReceiptsDto
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

  private serializeReceipt(receipt: ReceiptWithRelations): SerializedPurchaseReceipt {
    return {
      id: receipt.id,
      farmId: receipt.farmId,
      receiptCode: receipt.receiptCode,
      receiptDate: receipt.receiptDate.toISOString(),
      supplierName: receipt.supplierName,
      status: receipt.status,
      note: receipt.note,
      totalAmount: receipt.totalAmount.toString(),
      createdById: receipt.createdById,
      createdBy: this.serializeRequiredReceiptActor(receipt.createdBy),
      submittedById: receipt.submittedById,
      submittedBy: this.serializeReceiptActor(receipt.submittedBy),
      approvedById: receipt.approvedById,
      approvedBy: this.serializeReceiptActor(receipt.approvedBy),
      submittedAt: this.serializeDate(receipt.submittedAt),
      approvedAt: this.serializeDate(receipt.approvedAt),
      rejectedAt: this.serializeDate(receipt.rejectedAt),
      voidedAt: this.serializeDate(receipt.voidedAt),
      rejectReason: receipt.rejectReason,
      voidReason: receipt.voidReason,
      clientRequestId: receipt.clientRequestId,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
      itemCount: receipt.items.length,
      items: receipt.items.map((item) => ({
        id: item.id,
        receiptId: item.receiptId,
        materialId: item.materialId,
        materialName: item.materialName,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
        createdAt: item.createdAt.toISOString()
      }))
    };
  }

  private serializeReceiptSummary(
    receipt: ReceiptSummaryRecord
  ): SerializedPurchaseReceiptSummary {
    return {
      id: receipt.id,
      farmId: receipt.farmId,
      receiptCode: receipt.receiptCode,
      receiptDate: receipt.receiptDate.toISOString(),
      supplierName: receipt.supplierName,
      status: receipt.status,
      totalAmount: receipt.totalAmount.toString(),
      createdById: receipt.createdById,
      createdBy: this.serializeRequiredReceiptActor(receipt.createdBy),
      submittedById: receipt.submittedById,
      submittedBy: this.serializeReceiptActor(receipt.submittedBy),
      approvedById: receipt.approvedById,
      approvedBy: this.serializeReceiptActor(receipt.approvedBy),
      submittedAt: this.serializeDate(receipt.submittedAt),
      approvedAt: this.serializeDate(receipt.approvedAt),
      rejectedAt: this.serializeDate(receipt.rejectedAt),
      voidedAt: this.serializeDate(receipt.voidedAt),
      rejectReason: receipt.rejectReason,
      voidReason: receipt.voidReason,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
      itemCount: receipt._count.items
    };
  }

  private serializeReceiptActor(
    actor: ReceiptActorRecord | null | undefined
  ): SerializedReceiptActor | null {
    if (!actor) {
      return null;
    }

    return {
      id: actor.id,
      fullName: actor.fullName,
      username: actor.username,
      role: actor.role
    };
  }

  private serializeRequiredReceiptActor(
    actor: ReceiptActorRecord
  ): SerializedReceiptActor {
    return {
      id: actor.id,
      fullName: actor.fullName,
      username: actor.username,
      role: actor.role
    };
  }

  private serializeDate(value: Date | null): string | null {
    return value ? value.toISOString() : null;
  }

  private formatDateToken(date: Date): string {
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  private assertCanSubmitReceipt(
    user: AuthUserProfile,
    receipt: ReceiptWithRelations
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.MANAGER) {
      if (user.farmId !== receipt.farmId) {
        throw new ForbiddenException('Bạn không có quyền gửi duyệt phiếu này');
      }

      return;
    }

    if (receipt.createdById !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể gửi duyệt phiếu của mình');
    }

    if (user.farmId !== receipt.farmId) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt phiếu này');
    }
  }

  private assertCanApproveReceipt(
    user: AuthUserProfile,
    receipt: ReceiptWithRelations
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.MANAGER && user.farmId === receipt.farmId) {
      return;
    }

    throw new ForbiddenException('Bạn không có quyền duyệt phiếu nhập này');
  }

  private assertCanViewReceipt(
    user: AuthUserProfile,
    receipt: ReceiptWithRelations
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.MANAGER) {
      if (user.farmId !== receipt.farmId) {
        throw new ForbiddenException('Bạn không có quyền truy cập phiếu nhập này');
      }

      return;
    }

    if (receipt.createdById !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xem phiếu của mình');
    }

    if (user.farmId !== receipt.farmId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiếu nhập này');
    }
  }

  private assertReceiptItemsValid(items: PurchaseReceiptItem[]): void {
    if (items.length === 0) {
      throw new BadRequestException('Phiếu nhập phải có ít nhất 1 dòng vật tư');
    }

    for (const item of items) {
      if (!item.materialName.trim()) {
        throw new BadRequestException('Tên vật tư không được để trống');
      }

      if (!item.unit.trim()) {
        throw new BadRequestException('Đơn vị tính không được để trống');
      }

      if (item.quantity.lte(0)) {
        throw new BadRequestException('Số lượng phải lớn hơn 0');
      }

      if (item.unitPrice.lt(0)) {
        throw new BadRequestException('Đơn giá không được nhỏ hơn 0');
      }
    }
  }

  private isIdempotencyConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    return (
      target.includes('userId') ||
      target.includes('clientRequestId') ||
      target.includes('createdById')
    );
  }

  private isReceiptCodeConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    return target.includes('receiptCode') || target.includes('farmId');
  }

  private rethrowApproveWriteError(error: unknown): never {
    if (this.isInventoryTransactionConflict(error)) {
      throw new ConflictException('Phiếu này đã được cập nhật tồn kho');
    }

    throw error;
  }

  private isInventoryTransactionConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    return (
      target.includes('referenceType') &&
      target.includes('referenceId') &&
      target.includes('materialId')
    );
  }

  private isInventoryBalanceConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    return (
      target.includes('farmId') &&
      target.includes('materialId') &&
      target.includes('unit')
    );
  }

  private isSerializableWriteConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
