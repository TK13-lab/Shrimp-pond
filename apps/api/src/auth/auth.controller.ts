import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';

import { AccessTokenGuard } from './access-token.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthUserProfile } from './auth.types';

type HeaderValue = string | string[] | undefined;

type HttpRequest = {
  headers: Record<string, HeaderValue>;
  ip?: string | null;
};

type RequestWithUser = HttpRequest & {
  user?: AuthUserProfile;
};

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
  @UseGuards(AccessTokenGuard)
  me(@Req() request: RequestWithUser) {
    return this.authService.getMe(request.user as AuthUserProfile);
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
