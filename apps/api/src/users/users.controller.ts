import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthUserProfile, HttpRequest } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() user: AuthUserProfile,
    @Body() createUserDto: CreateUserDto,
    @Req() request: HttpRequest
  ) {
    return this.usersService.create(user, createUserDto, this.getRequestMeta(request));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: HttpRequest
  ) {
    return this.usersService.update(
      user,
      targetUserId,
      updateUserDto,
      this.getRequestMeta(request)
    );
  }

  @Patch(':id/disable')
  @Roles(Role.ADMIN)
  disable(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Req() request: HttpRequest
  ) {
    return this.usersService.disable(
      user,
      targetUserId,
      this.getRequestMeta(request)
    );
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN)
  resetPassword(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Body() resetPasswordDto: ResetUserPasswordDto,
    @Req() request: HttpRequest
  ) {
    return this.usersService.resetPassword(
      user,
      targetUserId,
      resetPasswordDto,
      this.getRequestMeta(request)
    );
  }

  private getRequestMeta(request: HttpRequest) {
    return {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
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
