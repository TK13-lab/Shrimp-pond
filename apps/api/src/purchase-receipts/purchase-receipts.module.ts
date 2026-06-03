import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchaseReceiptsController } from './purchase-receipts.controller';
import { PurchaseReceiptsService } from './purchase-receipts.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PurchaseReceiptsController],
  providers: [PurchaseReceiptsService]
})
export class PurchaseReceiptsModule {}
