import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MaterialsController],
  providers: [MaterialsService]
})
export class MaterialsModule {}
