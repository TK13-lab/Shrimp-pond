import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { service: string; status: string } {
    return {
      service: 'shrimp-pond-api',
      status: 'ok'
    };
  }
}
