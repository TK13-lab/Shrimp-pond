import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Material, Prisma, Role } from '@prisma/client';

import { AuthUserProfile } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialsDto } from './dto/query-materials.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

type RequestMeta = {
  deviceId?: string | null;
  ipAddress?: string | null;
};

type MaterialRecord = Pick<
  Material,
  'createdAt' | 'defaultUnit' | 'farmId' | 'id' | 'isActive' | 'name' | 'note' | 'updatedAt'
>;

type MaterialPayload = {
  createdAt: Date;
  defaultUnit: string;
  farmId: string;
  id: string;
  isActive: boolean;
  name: string;
  note: string | null;
  updatedAt: Date;
};

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUserProfile, query: QueryMaterialsDto) {
    const where: Prisma.MaterialWhereInput = {};

    if (user.role !== Role.ADMIN || user.farmId) {
      const farmId = this.requireScopedFarmId(user);
      where.farmId = farmId;
    }

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    if (user.role === Role.STAFF) {
      where.isActive = true;
    } else if (query.active !== undefined) {
      where.isActive = query.active;
    }

    const materials = await this.prisma.material.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { defaultUnit: 'asc' }]
    });

    return {
      items: materials.map((material) => this.serializeMaterial(material))
    };
  }

  async create(
    user: AuthUserProfile,
    createMaterialDto: CreateMaterialDto,
    meta: RequestMeta
  ) {
    const farmId = await this.resolveWritableFarmId(user);
    const normalized = this.normalizeMaterialInput(createMaterialDto);

    await this.ensureNoDuplicateMaterial({
      farmId,
      name: normalized.name,
      defaultUnit: normalized.defaultUnit
    });

    try {
      const material = await this.prisma.$transaction(async (tx) => {
        const createdMaterial = await tx.material.create({
          data: {
            farmId,
            name: normalized.name,
            defaultUnit: normalized.defaultUnit,
            note: normalized.note,
            isActive: true
          }
        });

        await tx.auditLog.create({
          data: {
            farmId,
            userId: user.id,
            action: 'CREATE_MATERIAL',
            entityType: 'MATERIAL',
            entityId: createdMaterial.id,
            oldValueJson: Prisma.JsonNull,
            newValueJson: this.buildAuditPayload(createdMaterial),
            deviceId: meta.deviceId ?? null,
            ipAddress: meta.ipAddress ?? null
          }
        });

        return createdMaterial;
      });

      return this.serializeMaterial(material);
    } catch (error) {
      this.rethrowKnownWriteError(error);
    }
  }

  async update(
    user: AuthUserProfile,
    materialId: string,
    updateMaterialDto: UpdateMaterialDto,
    meta: RequestMeta
  ) {
    const existingMaterial = await this.getMaterialForWrite(user, materialId);
    const nextValues = this.resolveUpdatedValues(existingMaterial, updateMaterialDto);

    if (
      nextValues.name === existingMaterial.name &&
      nextValues.defaultUnit === existingMaterial.defaultUnit &&
      nextValues.note === existingMaterial.note
    ) {
      return this.serializeMaterial(existingMaterial);
    }

    await this.ensureNoDuplicateMaterial({
      farmId: existingMaterial.farmId,
      name: nextValues.name,
      defaultUnit: nextValues.defaultUnit,
      excludeMaterialId: existingMaterial.id
    });

    try {
      const material = await this.prisma.$transaction(async (tx) => {
        const updatedMaterial = await tx.material.update({
          where: {
            id: existingMaterial.id
          },
          data: nextValues
        });

        await tx.auditLog.create({
          data: {
            farmId: updatedMaterial.farmId,
            userId: user.id,
            action: 'UPDATE_MATERIAL',
            entityType: 'MATERIAL',
            entityId: updatedMaterial.id,
            oldValueJson: this.buildAuditPayload(existingMaterial),
            newValueJson: this.buildAuditPayload(updatedMaterial),
            deviceId: meta.deviceId ?? null,
            ipAddress: meta.ipAddress ?? null
          }
        });

        return updatedMaterial;
      });

      return this.serializeMaterial(material);
    } catch (error) {
      this.rethrowKnownWriteError(error);
    }
  }

  async disable(user: AuthUserProfile, materialId: string, meta: RequestMeta) {
    const existingMaterial = await this.getMaterialForWrite(user, materialId);

    if (!existingMaterial.isActive) {
      return this.serializeMaterial(existingMaterial);
    }

    const material = await this.prisma.$transaction(async (tx) => {
      const disabledMaterial = await tx.material.update({
        where: {
          id: existingMaterial.id
        },
        data: {
          isActive: false
        }
      });

      await tx.auditLog.create({
        data: {
          farmId: disabledMaterial.farmId,
          userId: user.id,
          action: 'DISABLE_MATERIAL',
          entityType: 'MATERIAL',
          entityId: disabledMaterial.id,
          oldValueJson: this.buildAuditPayload(existingMaterial),
          newValueJson: this.buildAuditPayload(disabledMaterial),
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return disabledMaterial;
    });

    return this.serializeMaterial(material);
  }

  private async ensureNoDuplicateMaterial(input: {
    defaultUnit: string;
    excludeMaterialId?: string;
    farmId: string;
    name: string;
  }): Promise<void> {
    const duplicateMaterial = await this.prisma.material.findFirst({
      where: {
        farmId: input.farmId,
        id: input.excludeMaterialId
          ? {
              not: input.excludeMaterialId
            }
          : undefined,
        name: {
          equals: input.name,
          mode: 'insensitive'
        },
        defaultUnit: {
          equals: input.defaultUnit,
          mode: 'insensitive'
        }
      }
    });

    if (duplicateMaterial) {
      throw new ConflictException('Vật tư đã tồn tại với cùng đơn vị tính');
    }
  }

  private async getMaterialForWrite(
    user: AuthUserProfile,
    materialId: string
  ): Promise<MaterialRecord> {
    const material = await this.prisma.material.findUnique({
      where: {
        id: materialId
      }
    });

    if (!material) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    if (user.role !== Role.ADMIN && material.farmId !== user.farmId) {
      throw new ForbiddenException('Bạn không có quyền truy cập vật tư này');
    }

    return material;
  }

  private requireScopedFarmId(user: AuthUserProfile): string {
    if (!user.farmId) {
      throw new ForbiddenException('Tài khoản chưa được gán trại');
    }

    return user.farmId;
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
      throw new BadRequestException('Chưa có trại nào để tạo vật tư');
    }

    throw new BadRequestException(
      'Admin cần được gán trại hoặc API cần mở rộng để chọn trại cụ thể'
    );
  }

  private normalizeMaterialInput(input: {
    defaultUnit: string;
    name: string;
    note?: string;
  }) {
    return {
      name: input.name.trim(),
      defaultUnit: input.defaultUnit.trim(),
      note: this.normalizeNote(input.note)
    };
  }

  private normalizeNote(note?: string | null): string | null {
    if (note === undefined || note === null) {
      return null;
    }

    const trimmed = note.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveUpdatedValues(
    existingMaterial: MaterialRecord,
    updateMaterialDto: UpdateMaterialDto
  ) {
    return {
      name:
        updateMaterialDto.name !== undefined
          ? updateMaterialDto.name.trim()
          : existingMaterial.name,
      defaultUnit:
        updateMaterialDto.defaultUnit !== undefined
          ? updateMaterialDto.defaultUnit.trim()
          : existingMaterial.defaultUnit,
      note:
        updateMaterialDto.note !== undefined
          ? this.normalizeNote(updateMaterialDto.note)
          : existingMaterial.note
    };
  }

  private buildAuditPayload(material: MaterialPayload) {
    return {
      id: material.id,
      farmId: material.farmId,
      name: material.name,
      defaultUnit: material.defaultUnit,
      note: material.note,
      isActive: material.isActive
    };
  }

  private serializeMaterial(material: MaterialRecord) {
    return {
      id: material.id,
      farmId: material.farmId,
      name: material.name,
      defaultUnit: material.defaultUnit,
      note: material.note,
      isActive: material.isActive,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt
    };
  }

  private rethrowKnownWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Vật tư đã tồn tại với cùng đơn vị tính');
    }

    throw error;
  }
}
