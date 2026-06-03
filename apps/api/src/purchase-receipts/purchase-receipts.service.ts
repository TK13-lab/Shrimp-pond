import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import {
  Material,
  Prisma,
  PurchaseReceipt,
  PurchaseReceiptItem,
  ReceiptStatus,
  Role
} from '@prisma/client';
import { createHash } from 'crypto';

import { AuthUserProfile } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseReceiptDto,
  CreatePurchaseReceiptItemDto
} from './dto/create-purchase-receipt.dto';

type RequestMeta = {
  deviceId?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
};

type MaterialRecord = Pick<Material, 'defaultUnit' | 'farmId' | 'id' | 'name'>;

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

type SerializedPurchaseReceipt = {
  approvedAt: string | null;
  approvedById: string | null;
  clientRequestId: string | null;
  createdAt: string;
  createdById: string;
  farmId: string;
  id: string;
  items: SerializedPurchaseReceiptItem[];
  note: string | null;
  receiptCode: string;
  receiptDate: string;
  rejectReason: string | null;
  rejectedAt: string | null;
  status: string;
  submittedAt: string | null;
  submittedById: string | null;
  supplierName: string | null;
  totalAmount: string;
  updatedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
};

type ReceiptWithItems = PurchaseReceipt & {
  items: PurchaseReceiptItem[];
};

@Injectable()
export class PurchaseReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

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
            include: {
              items: true
            }
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
        include: {
          items: true
        }
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
      include: {
        items: true
      }
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

  private async loadReceiptEntityById(receiptId: string): Promise<ReceiptWithItems> {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: {
        id: receiptId
      },
      include: {
        items: true
      }
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

  private serializeReceipt(receipt: ReceiptWithItems): SerializedPurchaseReceipt {
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
      submittedById: receipt.submittedById,
      approvedById: receipt.approvedById,
      submittedAt: this.serializeDate(receipt.submittedAt),
      approvedAt: this.serializeDate(receipt.approvedAt),
      rejectedAt: this.serializeDate(receipt.rejectedAt),
      voidedAt: this.serializeDate(receipt.voidedAt),
      rejectReason: receipt.rejectReason,
      voidReason: receipt.voidReason,
      clientRequestId: receipt.clientRequestId,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
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
    receipt: ReceiptWithItems
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
}
