import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthUserProfile, AccessTokenPayload } from './auth.types';

type RequestMeta = {
  deviceId?: string | null;
  ipAddress?: string | null;
};

type UserRecord = Pick<
  User,
  'farmId' | 'fullName' | 'id' | 'isActive' | 'passwordHash' | 'role' | 'username'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(loginDto: LoginDto, meta: RequestMeta) {
    const username = loginDto.username.trim();
    const userRecord = await this.prisma.user.findUnique({
      where: {
        username
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        passwordHash: true,
        role: true,
        farmId: true,
        isActive: true
      }
    });

    const user = await this.assertValidCredentials(userRecord, loginDto.password);

    const accessToken = await this.createAccessToken(user);
    const refreshToken = await this.prisma.$transaction(async (tx) => {
      const issuedRefreshToken = await this.createRefreshToken(tx, user.id);

      await tx.auditLog.create({
        data: {
          farmId: user.farmId,
          userId: user.id,
          action: 'LOGIN',
          entityType: 'AUTH',
          entityId: user.id,
          newValueJson: {
            role: user.role,
            username: user.username
          },
          deviceId: meta.deviceId ?? null,
          ipAddress: meta.ipAddress ?? null
        }
      });

      return issuedRefreshToken;
    });

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user)
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const record = await this.validateRefreshToken(refreshTokenDto.refreshToken);
    const user = record.user;

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    const accessToken = await this.createAccessToken(user);
    const refreshToken = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: {
          id: record.id
        },
        data: {
          revokedAt: new Date()
        }
      });

      return this.createRefreshToken(tx, user.id);
    });

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user)
    };
  }

  async logout(rawRefreshToken: string) {
    const parsed = this.parseRefreshToken(rawRefreshToken);

    if (!parsed) {
      return {
        message: 'Đăng xuất thành công'
      };
    }

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        id: parsed.id
      }
    });

    if (!refreshToken) {
      return {
        message: 'Đăng xuất thành công'
      };
    }

    const matches = await compare(rawRefreshToken, refreshToken.tokenHash);

    if (matches && !refreshToken.revokedAt) {
      await this.prisma.refreshToken.update({
        where: {
          id: refreshToken.id
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    return {
      message: 'Đăng xuất thành công'
    };
  }

  getMe(user: AuthUserProfile) {
    return user;
  }

  private async assertValidCredentials(
    user: UserRecord | null,
    password: string
  ): Promise<UserRecord> {
    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches || !user.isActive) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return user;
  }

  private async createAccessToken(user: UserRecord): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      farmId: user.farmId
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: Math.floor(
        this.parseDurationToMs(
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')
        ) / 1000
      )
    });
  }

  private async createRefreshToken(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<string> {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const refreshToken = `${id}.${secret}`;
    const tokenHash = await hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + this.parseDurationToMs(this.getRefreshTokenExpiry())
    );

    await tx.refreshToken.create({
      data: {
        id,
        userId,
        tokenHash,
        expiresAt
      }
    });

    return refreshToken;
  }

  private async validateRefreshToken(rawRefreshToken: string) {
    const parsed = this.parseRefreshToken(rawRefreshToken);

    if (!parsed) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        id: parsed.id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            passwordHash: true,
            role: true,
            farmId: true,
            isActive: true
          }
        }
      }
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    if (refreshToken.revokedAt || refreshToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    const matches = await compare(rawRefreshToken, refreshToken.tokenHash);

    if (!matches) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return refreshToken;
  }

  private parseRefreshToken(token: string): { id: string; secret: string } | null {
    const [id, secret] = token.split('.');

    if (!id || !secret) {
      return null;
    }

    return {
      id,
      secret
    };
  }

  private getRefreshTokenExpiry(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private parseDurationToMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());

    if (!match) {
      throw new Error(`Unsupported duration format: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }
  }

  private serializeUser(user: UserRecord): AuthUserProfile {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      farmId: user.farmId
    };
  }
}
