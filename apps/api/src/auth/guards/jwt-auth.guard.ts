import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessTokenPayload, AuthenticatedRequest } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Thiếu access token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        farmId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    request.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      farmId: user.farmId
    };

    return true;
  }

  private extractBearerToken(
    authorizationHeader?: string | string[]
  ): string | null {
    if (!authorizationHeader || Array.isArray(authorizationHeader)) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
