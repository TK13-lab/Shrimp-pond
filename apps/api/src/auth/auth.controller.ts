import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthUserProfile, HttpRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() request: HttpRequest) {
    return this.authService.login(loginDto, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  me(@CurrentUser() user: AuthUserProfile) {
    return this.authService.getMe(user);
  }

  @Get('manager-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  managerCheck(@CurrentUser() user: AuthUserProfile) {
    return {
      message: 'Manager access granted',
      user
    };
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
