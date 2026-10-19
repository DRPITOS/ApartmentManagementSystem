import { Controller, Get } from '@nestjs/common';
import { RedisCacheService } from './cache/redis-cache.service.js';

@Controller()
export class AppController {
  constructor(private readonly cacheService: RedisCacheService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'Apartment Utility & Room Management System API',
      timestamp: new Date().toISOString(),
      cache: this.cacheService.getStatus(),
    };
  }
}
