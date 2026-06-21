import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';

import { AuthUserProfile } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type RequestMeta = {
  deviceId?: string | null;
  ipAddress?: string | null;
};

type UserRecord = Pick<
  User,
  | 'createdAt'
  | 'farmId'
  | 'fullName'
  | 'id'
  | 'isActive'
  | 'phone'
  | 'role'
  | 'updatedAt'
  | 'username'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          username: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          fullName: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          phone: {
            contains: query.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.active !== undefined) {
      where.isActive = query.active;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { username: 'asc' }]
    });

    return {
      items: users.map((user) => this.serializeUser(user))
    };
  }

  async create(
    actor: AuthUserProfile,
    createUserDto: CreateUserDto,
    meta: RequestMeta
  ) {
    const normalized = await this.normalizeCreateInput(createUserDto);
    const passwordHash = await hash(createUserDto.password, 10);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            farmId: normalized.farmId,
            fullName: normalized.fullName,
            username: normalized.username,
            phone: normalized.phone,
            passwordHash,
            role: normalized.role,
            isActive: true
          }
        });

        await tx.auditLog.create({
          data: {
            farmId: createdUser.farmId,
            userId: actor.id,
            action: 'CREATE_USER',
            entityType: 'USER',
            entityId: createdUser.id,
            oldValueJson: Prisma.JsonNull,
            newValueJson: this.buildAuditPayload(createdUser),
            deviceId: meta.deviceId ?? null,
            ipAddress: meta.ipAddress ?? null
          }
        });

        return createdUser;
      });

      return this.serializeUser(user);
    } catch (error) {
      this.rethrowKnownWriteError(error);
    }
  }

  async update(
    actor: AuthUserProfile,
    targetUserId: string,
    updateUserDto: UpdateUserDto,
    meta: RequestMeta
  ) {
    const existingUser = await this.getUserOrThrow(targetUserId);
    const nextValues = await this.resolveUpdatedValues(existingUser, updateUserDto);

    if (
      nextValues.fullName === existingUser.fullName &&
      nextValues.phone === existingUser.phone &&
      nextValues.role === existingUser.role &&
      nextValues.farmId === existingUser.farmId
    ) {
      return this.serializeUser(existingUser);
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: existingUser.id
        },
        data: nextValues
      });

      await tx.auditLog.create({
        data: {
          farmId: user.farmId,
          userId: actor.id,
          action: 'UPDATE_USER',
          entityType: 'USER',
          entityId: user.id,
          oldValueJson: this.buildAuditPayload(existingUser),
          newValueJson: this.buildAuditPayload(user),
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return user;
    });

    return this.serializeUser(updatedUser);
  }

  async disable(
    actor: AuthUserProfile,
    targetUserId: string,
    meta: RequestMeta
  ) {
    if (actor.id === targetUserId) {
      throw new ForbiddenException('Admin không thể tự khóa tài khoản đang dùng');
    }

    const existingUser = await this.getUserOrThrow(targetUserId);

    if (!existingUser.isActive) {
      return this.serializeUser(existingUser);
    }

    const disabledUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          isActive: false
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          farmId: user.farmId,
          userId: actor.id,
          action: 'DISABLE_USER',
          entityType: 'USER',
          entityId: user.id,
          oldValueJson: this.buildAuditPayload(existingUser),
          newValueJson: this.buildAuditPayload(user),
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return user;
    });

    return this.serializeUser(disabledUser);
  }

  async resetPassword(
    actor: AuthUserProfile,
    targetUserId: string,
    resetPasswordDto: ResetUserPasswordDto,
    meta: RequestMeta
  ) {
    const existingUser = await this.getUserOrThrow(targetUserId);
    const passwordHash = await hash(resetPasswordDto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          passwordHash
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: updatedUser.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          farmId: updatedUser.farmId,
          userId: actor.id,
          action: 'RESET_USER_PASSWORD',
          entityType: 'USER',
          entityId: updatedUser.id,
          oldValueJson: {
            passwordChanged: false
          },
          newValueJson: {
            passwordChanged: true,
            username: updatedUser.username
          },
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return updatedUser;
    });

    return this.serializeUser(user);
  }

  private async normalizeCreateInput(input: CreateUserDto) {
    const username = input.username.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const role = input.role;
    const farmId = await this.resolveFarmIdForRole(role, input.farmId);

    return {
      farmId,
      fullName,
      username,
      phone: this.normalizeOptionalString(input.phone),
      role
    };
  }

  private async resolveUpdatedValues(
    existingUser: UserRecord,
    input: UpdateUserDto
  ) {
    const role = input.role ?? existingUser.role;
    const farmId =
      input.role !== undefined || input.farmId !== undefined
        ? await this.resolveFarmIdForRole(role, input.farmId ?? existingUser.farmId)
        : existingUser.farmId;

    return {
      farmId,
      fullName:
        input.fullName !== undefined ? input.fullName.trim() : existingUser.fullName,
      phone:
        input.phone !== undefined
          ? this.normalizeOptionalString(input.phone)
          : existingUser.phone,
      role
    };
  }

  private async resolveFarmIdForRole(
    role: Role,
    requestedFarmId?: string | null
  ): Promise<string | null> {
    if (role === Role.ADMIN) {
      return requestedFarmId ? this.assertFarmExists(requestedFarmId) : null;
    }

    if (requestedFarmId) {
      return this.assertFarmExists(requestedFarmId);
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
      throw new BadRequestException('Chưa có trại nào để gán cho tài khoản');
    }

    throw new BadRequestException(
      'Vui lòng chọn trại cụ thể cho tài khoản manager/staff'
    );
  }

  private async assertFarmExists(farmId: string): Promise<string> {
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    if (!farm) {
      throw new BadRequestException('Không tìm thấy trại đang hoạt động');
    }

    return farm.id;
  }

  private async getUserOrThrow(userId: string): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return user;
  }

  private normalizeOptionalString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private buildAuditPayload(user: UserRecord) {
    return {
      id: user.id,
      farmId: user.farmId,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    };
  }

  private serializeUser(user: UserRecord) {
    return {
      id: user.id,
      farmId: user.farmId,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private rethrowKnownWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    throw error;
  }
}
