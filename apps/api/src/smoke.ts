import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrapSmoke(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn']
  });

  await app.close();
}

void bootstrapSmoke();
