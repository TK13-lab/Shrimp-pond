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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUserProfile, HttpRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialsDto } from './dto/query-materials.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findAll(
    @CurrentUser() user: AuthUserProfile,
    @Query() query: QueryMaterialsDto
  ) {
    return this.materialsService.findAll(user, query);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @CurrentUser() user: AuthUserProfile,
    @Body() createMaterialDto: CreateMaterialDto,
    @Req() request: HttpRequest
  ) {
    return this.materialsService.create(user, createMaterialDto, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Req() request: HttpRequest
  ) {
    return this.materialsService.update(user, materialId, updateMaterialDto, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
  }

  @Patch(':id/disable')
  @Roles(Role.ADMIN)
  disable(
    @CurrentUser() user: AuthUserProfile,
    @Param('id', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Req() request: HttpRequest
  ) {
    return this.materialsService.disable(user, materialId, {
      deviceId: this.getHeaderValue(request, 'x-device-id'),
      ipAddress: this.getRequestIp(request)
    });
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
